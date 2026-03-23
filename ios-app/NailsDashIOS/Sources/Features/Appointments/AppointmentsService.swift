import Foundation

protocol AppointmentsServiceProtocol {
    func createAppointment(token: String, request: AppointmentCreateRequest) async throws -> AppointmentDTO
    func addAppointmentServiceItem(token: String, appointmentID: Int, serviceID: Int, amount: Double) async throws -> AppointmentServiceSummaryDTO
    func getAppointmentServiceSummary(token: String, appointmentID: Int) async throws -> AppointmentServiceSummaryDTO
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
        static let appointmentServiceSummary: TimeInterval = 30
        static let storeServices: TimeInterval = 180
        static let storeDetail: TimeInterval = 180
        static let storeTechnicians: TimeInterval = 120
        static let storeHours: TimeInterval = 300
        static let availableSlots: TimeInterval = 20
    }

    private static let myAppointmentsCache = TimedAsyncRequestCache<String, [AppointmentDTO]>()
    private static let appointmentDetailCache = TimedAsyncRequestCache<String, AppointmentDTO>()
    private static let appointmentServiceSummaryCache = TimedAsyncRequestCache<String, AppointmentServiceSummaryDTO>()
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

    func addAppointmentServiceItem(token: String, appointmentID: Int, serviceID: Int, amount: Double) async throws -> AppointmentServiceSummaryDTO {
        let payload = AppointmentServiceItemCreateRequest(service_id: serviceID, amount: amount)
        let summary: AppointmentServiceSummaryDTO = try await APIClient.shared.request(
            path: "/appointments/\(appointmentID)/services",
            method: "POST",
            token: token,
            body: payload
        )
        Self.invalidateAppointmentCaches(for: token, appointmentID: appointmentID)
        return summary
    }

    func getAppointmentServiceSummary(token: String, appointmentID: Int) async throws -> AppointmentServiceSummaryDTO {
        let cacheKey = "\(token)|\(appointmentID)"
        return try await Self.appointmentServiceSummaryCache.value(for: cacheKey, ttl: CacheTTL.appointmentServiceSummary) {
            try await APIClient.shared.request(
                path: "/appointments/\(appointmentID)/services",
                token: token
            )
        }
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
            let loaded: [AppointmentDTO] = try await APIClient.shared.request(path: path, token: token)
            var enriched: [AppointmentDTO] = []
            enriched.reserveCapacity(loaded.count)
            for appointment in loaded {
                enriched.append(await enrichAppointment(token: token, appointment: appointment))
            }
            return enriched
        }
    }

    func getAppointment(token: String, appointmentID: Int) async throws -> AppointmentDTO {
        let cacheKey = "\(token)|\(appointmentID)"
        return try await Self.appointmentDetailCache.value(for: cacheKey, ttl: CacheTTL.appointmentDetail) {
            let loaded: AppointmentDTO = try await APIClient.shared.request(path: "/appointments/\(appointmentID)", token: token)
            return await enrichAppointment(token: token, appointment: loaded)
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
        return await enrichAppointment(token: token, appointment: updated)
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
        return await enrichAppointment(token: token, appointment: updated)
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
        appointmentServiceSummaryCache.removeValues { key in
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

    private func enrichAppointment(token: String, appointment: AppointmentDTO) async -> AppointmentDTO {
        guard let summary = try? await getAppointmentServiceSummary(token: token, appointmentID: appointment.id) else {
            return appointment
        }
        let services = (try? await getStoreServices(storeID: appointment.store_id)) ?? []
        let servicesByID = Dictionary(uniqueKeysWithValues: services.map { ($0.id, $0) })
        let serviceNames = summary.items.compactMap { item -> String? in
            let name = item.service_name?.trimmingCharacters(in: .whitespacesAndNewlines)
            return (name?.isEmpty == false ? name : servicesByID[item.service_id]?.name)
        }
        let uniqueNames = Array(NSOrderedSet(array: serviceNames)) as? [String] ?? serviceNames
        let totalDuration = summary.items.reduce(0) { partial, item in
            partial + (servicesByID[item.service_id]?.duration_minutes ?? ((item.service_id == appointment.service_id) ? (appointment.service_duration ?? 0) : 0))
        }
        let displayName: String?
        if uniqueNames.isEmpty {
            displayName = appointment.service_name
        } else if uniqueNames.count == 1 {
            displayName = uniqueNames[0]
        } else {
            displayName = uniqueNames.joined(separator: ", ")
        }
        let totalAmount = summary.order_amount > 0 ? summary.order_amount : (appointment.order_amount ?? appointment.service_price)
        let mergedDuration = totalDuration > 0 ? totalDuration : appointment.service_duration

        return AppointmentDTO(
            id: appointment.id,
            order_number: appointment.order_number,
            store_id: appointment.store_id,
            service_id: appointment.service_id,
            technician_id: appointment.technician_id,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: appointment.status,
            order_amount: totalAmount,
            notes: appointment.notes,
            store_name: appointment.store_name,
            store_address: appointment.store_address,
            service_name: displayName,
            service_price: totalAmount,
            service_duration: mergedDuration,
            technician_name: appointment.technician_name,
            review_id: appointment.review_id,
            completed_at: appointment.completed_at,
            created_at: appointment.created_at,
            cancel_reason: appointment.cancel_reason
        )
    }
}
