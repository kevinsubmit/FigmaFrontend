package com.nailsdash.android.data.model

data class AppointmentCreateRequest(
    val store_id: Int,
    val service_id: Int,
    val technician_id: Int? = null,
    val appointment_date: String,
    val appointment_time: String,
    val notes: String? = null,
)

data class AppointmentGroupGuestCreateRequest(
    val service_id: Int,
    val technician_id: Int? = null,
    val notes: String? = null,
    val guest_name: String? = null,
    val guest_phone: String? = null,
)

data class AppointmentGroupCreateRequest(
    val store_id: Int,
    val appointment_date: String,
    val appointment_time: String,
    val host_service_id: Int,
    val host_technician_id: Int? = null,
    val host_notes: String? = null,
    val guests: List<AppointmentGroupGuestCreateRequest> = emptyList(),
)

data class AppointmentGroupResponse(
    val group_id: Int,
    val group_code: String? = null,
    val host_appointment: Appointment,
    val guest_appointments: List<Appointment>,
)

data class AppointmentCancelRequest(
    val cancel_reason: String? = null,
)

data class AppointmentRescheduleRequest(
    val new_date: String,
    val new_time: String,
)

data class Appointment(
    val id: Int,
    val order_number: String? = null,
    val store_id: Int,
    val service_id: Int,
    val technician_id: Int? = null,
    val appointment_date: String,
    val appointment_time: String,
    val status: String,
    val order_amount: Double? = null,
    val notes: String? = null,
    val store_name: String? = null,
    val store_address: String? = null,
    val service_name: String? = null,
    val service_price: Double? = null,
    val service_duration: Int? = null,
    val technician_name: String? = null,
    val review_id: Int? = null,
    val completed_at: String? = null,
    val created_at: String? = null,
    val cancel_reason: String? = null,
)

data class Technician(
    val id: Int,
    val store_id: Int,
    val name: String,
    val is_active: Int,
    val avatar_url: String? = null,
)

data class ServiceItem(
    val id: Int,
    val store_id: Int,
    val name: String,
    val price: Double,
    val duration_minutes: Int,
    val is_active: Int,
)

data class TechnicianAvailableSlot(
    val start_time: String,
    val end_time: String,
    val duration_minutes: Int,
)
