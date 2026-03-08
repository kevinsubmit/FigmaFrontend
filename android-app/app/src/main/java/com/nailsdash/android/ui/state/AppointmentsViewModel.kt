package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.repository.AppointmentsRepository
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

enum class AppointmentSegment(val label: String) {
    Upcoming("Upcoming"),
    Past("Past"),
}

class AppointmentsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AppointmentsRepository()

    var items by mutableStateOf(emptyList<Appointment>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var selectedSegment by mutableStateOf(AppointmentSegment.Upcoming)

    fun load(bearerToken: String) {
        isLoading = true
        viewModelScope.launch {
            repository.getMyAppointments(bearerToken = bearerToken, limit = 100)
                .onSuccess {
                    items = it
                    errorMessage = null
                }
                .onFailure { err ->
                    items = emptyList()
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

        return try {
            val dateTime = LocalDateTime.parse(
                "${item.appointment_date}T${item.appointment_time.take(8)}",
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            )
            dateTime.isAfter(LocalDateTime.now())
        } catch (_: Exception) {
            false
        }
    }
}
