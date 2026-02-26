import Foundation

protocol AppointmentsServiceProtocol {
    func createAppointment(token: String, request: AppointmentCreateRequest) async throws -> AppointmentDTO
    func createAppointmentGroup(token: String, request: AppointmentGroupCreateRequest) async throws -> AppointmentGroupResponseDTO
    func getMyAppointments(token: String, limit: Int) async throws -> [AppointmentDTO]
    func getAppointment(token: String, appointmentID: Int) async throws -> AppointmentDTO
    func cancelAppointment(token: String, appointmentID: Int, reason: String?) async throws -> AppointmentDTO
    func rescheduleAppointment(token: String, appointmentID: Int, newDate: String, newTime: String) async throws -> AppointmentDTO
    func getStoreServices(storeID: Int) async throws -> [ServiceDTO]
    func getStoreDetail(storeID: Int) async throws -> StoreDetailDTO
    func getStoreTechnicians(storeID: Int) async throws -> [TechnicianDTO]
    func getStoreHours(storeID: Int) async throws -> [StoreHourDTO]
    func getTechnicianAvailableSlots(technicianID: Int, date: String, serviceID: Int) async throws -> [TechnicianAvailableSlotDTO]
}

struct AppointmentsService: AppointmentsServiceProtocol {
    func createAppointment(token: String, request: AppointmentCreateRequest) async throws -> AppointmentDTO {
        try await APIClient.shared.request(path: "/appointments/", method: "POST", token: token, body: request)
    }

    func createAppointmentGroup(token: String, request: AppointmentGroupCreateRequest) async throws -> AppointmentGroupResponseDTO {
        try await APIClient.shared.request(path: "/appointments/groups", method: "POST", token: token, body: request)
    }

    func getMyAppointments(token: String, limit: Int = 100) async throws -> [AppointmentDTO] {
        try await APIClient.shared.request(path: "/appointments/?skip=0&limit=\(limit)", token: token)
    }

    func getAppointment(token: String, appointmentID: Int) async throws -> AppointmentDTO {
        try await APIClient.shared.request(path: "/appointments/\(appointmentID)", token: token)
    }

    func cancelAppointment(token: String, appointmentID: Int, reason: String?) async throws -> AppointmentDTO {
        let payload = AppointmentCancelRequest(cancel_reason: reason)
        return try await APIClient.shared.request(path: "/appointments/\(appointmentID)/cancel", method: "POST", token: token, body: payload)
    }

    func rescheduleAppointment(token: String, appointmentID: Int, newDate: String, newTime: String) async throws -> AppointmentDTO {
        let payload = AppointmentRescheduleRequest(new_date: newDate, new_time: newTime)
        return try await APIClient.shared.request(path: "/appointments/\(appointmentID)/reschedule", method: "POST", token: token, body: payload)
    }

    func getStoreServices(storeID: Int) async throws -> [ServiceDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/services")
    }

    func getStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        try await APIClient.shared.request(path: "/stores/\(storeID)")
    }

    func getStoreTechnicians(storeID: Int) async throws -> [TechnicianDTO] {
        try await APIClient.shared.request(path: "/technicians?skip=0&limit=100&store_id=\(storeID)")
    }

    func getStoreHours(storeID: Int) async throws -> [StoreHourDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/hours")
    }

    func getTechnicianAvailableSlots(technicianID: Int, date: String, serviceID: Int) async throws -> [TechnicianAvailableSlotDTO] {
        try await APIClient.shared.request(path: "/technicians/\(technicianID)/available-slots?date=\(date)&service_id=\(serviceID)")
    }
}
