package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.repository.AppointmentsRepository
import com.nailsdash.android.data.repository.StoresRepository
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

data class AppointmentServiceDisplayItem(
    val id: Int,
    val name: String,
    val amount: Double,
    val durationMinutes: Int?,
    val isPrimary: Boolean,
)

class AppointmentDetailViewModel(application: Application) : AndroidViewModel(application) {
    private val appointmentsRepository = AppointmentsRepository()
    private val storesRepository = StoresRepository()

    var appointment by mutableStateOf<Appointment?>(null)
        private set

    var resolvedStoreAddress by mutableStateOf<String?>(null)
        private set

    var serviceItems by mutableStateOf<List<AppointmentServiceDisplayItem>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var isSubmitting by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var successMessage by mutableStateOf<String?>(null)
        private set

    var cancelReason by mutableStateOf("")

    var rescheduleDate by mutableStateOf("")

    var rescheduleTime by mutableStateOf("")

    fun load(bearerToken: String, appointmentId: Int) {
        isLoading = true
        viewModelScope.launch {
            appointmentsRepository.getAppointment(
                bearerToken = bearerToken,
                appointmentId = appointmentId,
            ).onSuccess { fetched ->
                val merged = mergeDetailFields(primary = fetched, fallback = appointment)
                appointment = merged
                resolvedStoreAddress = normalizedAddress(merged.store_address)
                if (rescheduleDate.isBlank()) rescheduleDate = merged.appointment_date
                if (rescheduleTime.isBlank()) rescheduleTime = normalizeTimeForInput(merged.appointment_time)
                errorMessage = null
                enrichServiceFieldsIfNeeded()
                loadServiceItems(bearerToken)
                enrichStoreAddress()
            }.onFailure { err ->
                errorMessage = err.message
                serviceItems = emptyList()
            }
            isLoading = false
        }
    }

    fun cancel(bearerToken: String) {
        val current = appointment ?: return
        val status = current.status.lowercase()
        if (status == "cancelled") {
            errorMessage = "Appointment is already cancelled"
            return
        }
        if (status == "completed") {
            errorMessage = "Cannot cancel a completed appointment"
            return
        }

        isSubmitting = true
        successMessage = null
        errorMessage = null

        viewModelScope.launch {
            appointmentsRepository.cancelAppointment(
                bearerToken = bearerToken,
                appointmentId = current.id,
                reason = cancelReason.trim().takeIf { it.isNotEmpty() },
            ).onSuccess { updated ->
                appointment = mergeDetailFields(primary = updated, fallback = appointment)
                successMessage = "Appointment cancelled"
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
                successMessage = null
            }
            isSubmitting = false
        }
    }

    fun reschedule(bearerToken: String) {
        val current = appointment ?: return
        val status = current.status.lowercase()
        if (status == "cancelled") {
            errorMessage = "Cannot reschedule a cancelled appointment"
            return
        }
        if (status == "completed") {
            errorMessage = "Cannot reschedule a completed appointment"
            return
        }

        val date = rescheduleDate.trim()
        val time = normalizeTimeForInput(rescheduleTime)

        if (date.isBlank() || time.isBlank()) {
            errorMessage = "Please choose a future date and time."
            return
        }

        val parsed = parseDateTime(date, time)
        if (parsed == null || !parsed.isAfter(LocalDateTime.now())) {
            errorMessage = "Please choose a future date and time."
            return
        }

        isSubmitting = true
        successMessage = null
        errorMessage = null

        viewModelScope.launch {
            appointmentsRepository.rescheduleAppointment(
                bearerToken = bearerToken,
                appointmentId = current.id,
                newDate = date,
                newTime = time,
            ).onSuccess { updated ->
                appointment = mergeDetailFields(primary = updated, fallback = appointment)
                appointment?.let {
                    rescheduleDate = it.appointment_date
                    rescheduleTime = normalizeTimeForInput(it.appointment_time)
                }
                successMessage = "Appointment rescheduled"
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
                successMessage = null
            }
            isSubmitting = false
        }
    }

    private suspend fun enrichServiceFieldsIfNeeded() {
        val current = appointment ?: return
        val needName = current.service_name.isNullOrBlank()
        val needPrice = current.service_price == null
        val needDuration = current.service_duration == null
        if (!needName && !needPrice && !needDuration) return

        storesRepository.getStoreServices(current.store_id)
            .onSuccess { services ->
                val matched = services.firstOrNull { it.id == current.service_id } ?: return@onSuccess
                appointment = current.copy(
                    service_name = current.service_name ?: matched.name,
                    service_price = current.service_price ?: matched.price,
                    service_duration = current.service_duration ?: matched.duration_minutes,
                )
            }
    }

    private suspend fun enrichStoreAddress() {
        val current = appointment ?: return
        storesRepository.getStoreDetail(current.store_id)
            .onSuccess { detail ->
                val fullAddress = detail.formattedAddress.trim()
                val resolvedName = detail.name.trim().ifEmpty { null }
                val mergedAddress = if (fullAddress.isNotEmpty()) fullAddress else current.store_address
                resolvedStoreAddress = normalizedAddress(mergedAddress)
                appointment = current.copy(
                    store_name = normalizedStoreName(current.store_name) ?: resolvedName,
                    store_address = mergedAddress,
                )
            }
            .onFailure {
                resolvedStoreAddress = normalizedAddress(current.store_address)
            }
    }

    private suspend fun loadServiceItems(bearerToken: String) {
        val current = appointment ?: return
        val summary = appointmentsRepository.getAppointmentServiceSummary(
            bearerToken = bearerToken,
            appointmentId = current.id,
        ).getOrNull() ?: run {
            serviceItems = emptyList()
            return
        }

        val servicesById = storesRepository.getStoreServices(current.store_id)
            .getOrDefault(emptyList())
            .associateBy { it.id }
        val usePrimaryDurationFallback = summary.items.size == 1

        serviceItems = summary.items.map { item ->
            val matchedService = servicesById[item.service_id]
            val name = item.service_name
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
                ?: matchedService?.name
                ?: if (item.is_primary) current.service_name?.trim().orEmpty().ifEmpty { "Service" } else "Service"
            val duration = matchedService?.duration_minutes
                ?: if (item.is_primary && usePrimaryDurationFallback) current.service_duration else null
            AppointmentServiceDisplayItem(
                id = item.id,
                name = name,
                amount = item.amount,
                durationMinutes = duration,
                isPrimary = item.is_primary,
            )
        }
    }

    private fun mergeDetailFields(primary: Appointment, fallback: Appointment?): Appointment {
        if (fallback == null) return primary
        return primary.copy(
            order_number = primary.order_number ?: fallback.order_number,
            order_amount = primary.order_amount ?: fallback.order_amount,
            store_name = normalizedStoreName(primary.store_name) ?: normalizedStoreName(fallback.store_name),
            store_address = primary.store_address ?: fallback.store_address,
            service_name = primary.service_name ?: fallback.service_name,
            service_price = primary.service_price ?: fallback.service_price,
            service_duration = primary.service_duration ?: fallback.service_duration,
            technician_name = primary.technician_name ?: fallback.technician_name,
            created_at = primary.created_at ?: fallback.created_at,
        )
    }

    private fun parseDateTime(date: String, time: String): LocalDateTime? {
        return runCatching {
            LocalDateTime.parse("${date}T${normalizeTimeForInput(time)}", DATE_TIME_FORMATTER)
        }.getOrNull()
    }

    private fun normalizeTimeForInput(time: String): String {
        val value = time.trim()
        return when {
            value.matches(Regex("^\\d{2}:\\d{2}$")) -> value
            value.matches(Regex("^\\d{2}:\\d{2}:\\d{2}$")) -> value.take(5)
            else -> value
        }
    }

    private fun normalizedAddress(value: String?): String? {
        val trimmed = value?.trim().orEmpty()
        return trimmed.ifEmpty { null }
    }

    private fun normalizedStoreName(value: String?): String? {
        val trimmed = value?.trim().orEmpty()
        return trimmed.ifEmpty { null }
    }

    companion object {
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")
    }
}
