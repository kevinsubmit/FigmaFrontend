import Foundation

struct AppointmentCreateRequest: Encodable {
    let store_id: Int
    let service_id: Int
    let technician_id: Int?
    let appointment_date: String
    let appointment_time: String
    let notes: String?
}

struct AppointmentGroupGuestCreateRequest: Encodable {
    let service_id: Int
    let technician_id: Int?
    let notes: String?
    let guest_name: String?
    let guest_phone: String?
}

struct AppointmentGroupCreateRequest: Encodable {
    let store_id: Int
    let appointment_date: String
    let appointment_time: String
    let host_service_id: Int
    let host_technician_id: Int?
    let host_notes: String?
    let guests: [AppointmentGroupGuestCreateRequest]
}

struct AppointmentGroupResponseDTO: Decodable {
    let group_id: Int
    let group_code: String?
    let host_appointment: AppointmentDTO
    let guest_appointments: [AppointmentDTO]
}

struct AppointmentCancelRequest: Encodable {
    let cancel_reason: String?
}

struct AppointmentRescheduleRequest: Encodable {
    let new_date: String
    let new_time: String
}

struct AppointmentDTO: Decodable, Identifiable {
    let id: Int
    let order_number: String?
    let store_id: Int
    let service_id: Int
    let technician_id: Int?
    let appointment_date: String
    let appointment_time: String
    let status: String
    let notes: String?
    let store_name: String?
    let store_address: String?
    let service_name: String?
    let service_price: Double?
    let service_duration: Int?
    let technician_name: String?
    let created_at: String?
    let cancel_reason: String?
}

struct TechnicianDTO: Decodable, Identifiable {
    let id: Int
    let store_id: Int
    let name: String
    let is_active: Int
    let avatar_url: String?
}

struct ServiceDTO: Decodable, Identifiable {
    let id: Int
    let store_id: Int
    let name: String
    let price: Double
    let duration_minutes: Int
    let is_active: Int
}

struct TechnicianAvailableSlotDTO: Decodable, Hashable {
    let start_time: String
    let end_time: String
    let duration_minutes: Int
}
