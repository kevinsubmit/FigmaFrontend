import Foundation

protocol AppointmentsServiceProtocol {
    func createAppointment(token: String, request: AppointmentCreateRequest) async throws -> AppointmentDTO
    func createAppointmentGroup(token: String, request: AppointmentGroupCreateRequest) async throws -> AppointmentGroupResponseDTO
    func getMyAppointments(token: String, skip: Int, limit: Int) async throws -> [AppointmentDTO]
    func getAppointment(token: String, appointmentID: Int) async throws -> AppointmentDTO
    func cancelAppointment(token: String, appointmentID: Int, reason: String?) async throws -> AppointmentDTO
    func rescheduleAppointment(token: String, appointmentID: Int, newDate: String, newTime: String) async throws -> AppointmentDTO
    func getStoreServices(storeID: Int) async throws -> [ServiceDTO]
    func getStoreDetail(storeID: Int) async throws -> StoreDetailDTO
    func getStoreTechnicians(storeID: Int) async throws -> [TechnicianDTO]
    func getStoreHours(storeID: Int) async throws -> [StoreHourDTO]
    func getTechnicianAvailableSlots(technicianID: Int, date: String, serviceID: Int) async throws -> [TechnicianAvailableSlotDTO]
}

extension AppointmentsServiceProtocol {
    func getMyAppointments(token: String, limit: Int) async throws -> [AppointmentDTO] {
        try await getMyAppointments(token: token, skip: 0, limit: limit)
    }
}

struct AppointmentsService: AppointmentsServiceProtocol {
    private enum CacheTTL {
        static let myAppointments: TimeInterval = 30
        static let appointmentDetail: TimeInterval = 30
        static let storeServices: TimeInterval = 180
        static let storeDetail: TimeInterval = 180
        static let storeTechnicians: TimeInterval = 120
        static let storeHours: TimeInterval = 300
        static let availableSlots: TimeInterval = 20
    }

    private static let myAppointmentsCache = TimedAsyncRequestCache<String, [AppointmentDTO]>()
    private static let appointmentDetailCache = TimedAsyncRequestCache<String, AppointmentDTO>()
    private static let storeServicesCache = TimedAsyncRequestCache<Int, [ServiceDTO]>()
    private static let storeDetailCache = TimedAsyncRequestCache<Int, StoreDetailDTO>()
    private static let storeTechniciansCache = TimedAsyncRequestCache<Int, [TechnicianDTO]>()
    private static let storeHoursCache = TimedAsyncRequestCache<Int, [StoreHourDTO]>()
    private static let availableSlotsCache = TimedAsyncRequestCache<String, [TechnicianAvailableSlotDTO]>()

    func createAppointment(token: String, request: AppointmentCreateRequest) async throws -> AppointmentDTO {
        let created: AppointmentDTO = try await APIClient.shared.request(
            path: "/appointments/",
            method: "POST",
            token: token,
            body: request
        )
        Self.invalidateAppointmentCaches(for: token)
        return created
    }

    func createAppointmentGroup(token: String, request: AppointmentGroupCreateRequest) async throws -> AppointmentGroupResponseDTO {
        let created: AppointmentGroupResponseDTO = try await APIClient.shared.request(
            path: "/appointments/groups",
            method: "POST",
            token: token,
            body: request
        )
        Self.invalidateAppointmentCaches(for: token)
        return created
    }

    func getMyAppointments(token: String, skip: Int = 0, limit: Int = 100) async throws -> [AppointmentDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/appointments/?skip=\(skip)&limit=\(limit)"
        return try await Self.myAppointmentsCache.value(for: cacheKey, ttl: CacheTTL.myAppointments) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getAppointment(token: String, appointmentID: Int) async throws -> AppointmentDTO {
        let cacheKey = "\(token)|\(appointmentID)"
        return try await Self.appointmentDetailCache.value(for: cacheKey, ttl: CacheTTL.appointmentDetail) {
            try await APIClient.shared.request(path: "/appointments/\(appointmentID)", token: token)
        }
    }

    func cancelAppointment(token: String, appointmentID: Int, reason: String?) async throws -> AppointmentDTO {
        let payload = AppointmentCancelRequest(cancel_reason: reason)
        let updated: AppointmentDTO = try await APIClient.shared.request(
            path: "/appointments/\(appointmentID)/cancel",
            method: "POST",
            token: token,
            body: payload
        )
        Self.invalidateAppointmentCaches(for: token, appointmentID: appointmentID)
        return updated
    }

    func rescheduleAppointment(token: String, appointmentID: Int, newDate: String, newTime: String) async throws -> AppointmentDTO {
        let payload = AppointmentRescheduleRequest(new_date: newDate, new_time: newTime)
        let updated: AppointmentDTO = try await APIClient.shared.request(
            path: "/appointments/\(appointmentID)/reschedule",
            method: "POST",
            token: token,
            body: payload
        )
        Self.invalidateAppointmentCaches(for: token, appointmentID: appointmentID)
        return updated
    }

    func getStoreServices(storeID: Int) async throws -> [ServiceDTO] {
        try await Self.storeServicesCache.value(for: storeID, ttl: CacheTTL.storeServices) {
            try await APIClient.shared.request(path: "/stores/\(storeID)/services")
        }
    }

    func getStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        try await Self.storeDetailCache.value(for: storeID, ttl: CacheTTL.storeDetail) {
            try await APIClient.shared.request(path: "/stores/\(storeID)")
        }
    }

    func getStoreTechnicians(storeID: Int) async throws -> [TechnicianDTO] {
        try await Self.storeTechniciansCache.value(for: storeID, ttl: CacheTTL.storeTechnicians) {
            try await APIClient.shared.request(path: "/technicians?skip=0&limit=100&store_id=\(storeID)")
        }
    }

    func getStoreHours(storeID: Int) async throws -> [StoreHourDTO] {
        try await Self.storeHoursCache.value(for: storeID, ttl: CacheTTL.storeHours) {
            try await APIClient.shared.request(path: "/stores/\(storeID)/hours")
        }
    }

    func getTechnicianAvailableSlots(technicianID: Int, date: String, serviceID: Int) async throws -> [TechnicianAvailableSlotDTO] {
        let path = "/technicians/\(technicianID)/available-slots?date=\(date)&service_id=\(serviceID)"
        return try await Self.availableSlotsCache.value(for: path, ttl: CacheTTL.availableSlots) {
            try await APIClient.shared.request(path: path)
        }
    }

    private static func invalidateAppointmentCaches(for token: String, appointmentID: Int? = nil) {
        myAppointmentsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
        if let appointmentID {
            appointmentDetailCache.removeValue(for: "\(token)|\(appointmentID)")
        } else {
            appointmentDetailCache.removeValues { key in
                key.hasPrefix("\(token)|")
            }
        }
    }
}
