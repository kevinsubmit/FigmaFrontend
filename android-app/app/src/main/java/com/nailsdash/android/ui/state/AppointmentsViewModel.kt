package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.repository.AppointmentsRepository
import com.nailsdash.android.data.repository.StoresRepository
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import kotlinx.coroutines.launch

enum class AppointmentSegment(val label: String) {
    Upcoming("Upcoming"),
    Past("Past"),
}

class AppointmentsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AppointmentsRepository()
    private val storesRepository = StoresRepository()

    var items by mutableStateOf(emptyList<Appointment>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var storeAddressByStoreId by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    var selectedSegment by mutableStateOf(AppointmentSegment.Upcoming)

    fun load(bearerToken: String) {
        isLoading = true
        viewModelScope.launch {
            repository.getMyAppointments(bearerToken = bearerToken, limit = 100)
                .onSuccess {
                    items = it
                    loadStoreAddressFallbacks(it)
                    errorMessage = null
                }
                .onFailure { err ->
                    items = emptyList()
                    storeAddressByStoreId = emptyMap()
                    errorMessage = err.message
                }
            isLoading = false
        }
    }

    fun filteredItems(): List<Appointment> {
        return when (selectedSegment) {
            AppointmentSegment.Upcoming -> items.filter { isUpcoming(it) }
            AppointmentSegment.Past -> items.filter { !isUpcoming(it) }
        }
    }

    fun upcomingCount(): Int = items.count { isUpcoming(it) }

    private fun isUpcoming(item: Appointment): Boolean {
        val status = item.status.lowercase()
        if (status == "cancelled" || status == "completed") return false

        val dateTime = parseAppointmentDateTime(
            appointmentDate = item.appointment_date,
            appointmentTime = item.appointment_time,
        ) ?: return false
        return !dateTime.isBefore(LocalDateTime.now())
    }

    private fun parseAppointmentDateTime(
        appointmentDate: String,
        appointmentTime: String,
    ): LocalDateTime? {
        val date = runCatching { LocalDate.parse(appointmentDate.trim()) }.getOrNull() ?: return null
        val timeParts = appointmentTime
            .trim()
            .split(":")
            .mapNotNull { it.toIntOrNull() }
        if (timeParts.isEmpty()) return null
        val hour = timeParts.getOrNull(0) ?: return null
        val minute = timeParts.getOrNull(1) ?: 0
        val second = timeParts.getOrNull(2) ?: 0
        if (hour !in 0..23 || minute !in 0..59 || second !in 0..59) return null
        return LocalDateTime.of(date, LocalTime.of(hour, minute, second))
    }

    private suspend fun loadStoreAddressFallbacks(appointments: List<Appointment>) {
        val storeIds = appointments.map { it.store_id }.toSet()
        if (storeIds.isEmpty()) {
            storeAddressByStoreId = emptyMap()
            return
        }

        val existing = storeAddressByStoreId
        storesRepository.getStores(sortBy = "recommended", limit = 100)
            .onSuccess { stores ->
                val addressMap = buildMap<Int, String> {
                    stores.forEach { store ->
                        if (store.id in storeIds) {
                            val fullAddress = store.formattedAddress.trim()
                            if (fullAddress.isNotEmpty()) {
                                put(store.id, fullAddress)
                            }
                        }
                    }
                }
                storeAddressByStoreId = addressMap
            }
            .onFailure {
                // Keep existing mapping if fallback lookup fails.
                storeAddressByStoreId = existing
            }
    }
}
