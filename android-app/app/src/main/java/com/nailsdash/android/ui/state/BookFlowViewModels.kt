package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.AppointmentCreateRequest
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.model.StoreHour
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.model.StoreRatingSummary
import com.nailsdash.android.data.model.StoreReview
import com.nailsdash.android.data.model.Technician
import com.nailsdash.android.data.model.TechnicianAvailableSlot
import com.nailsdash.android.data.repository.AppointmentsRepository
import com.nailsdash.android.data.repository.StoresRepository
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class StoreDetailViewModel(application: Application) : AndroidViewModel(application) {
    private val storesRepository = StoresRepository()

    var store by mutableStateOf<StoreDetail?>(null)
        private set

    var services by mutableStateOf(emptyList<ServiceItem>())
        private set

    var reviews by mutableStateOf(emptyList<StoreReview>())
        private set

    var portfolio by mutableStateOf(emptyList<StorePortfolio>())
        private set

    var ratingSummary by mutableStateOf<StoreRatingSummary?>(null)
        private set

    var storeHours by mutableStateOf(emptyList<StoreHour>())
        private set

    var selectedServiceId by mutableStateOf<Int?>(null)
        private set

    var isFavorited by mutableStateOf(false)
        private set

    var isFavoriteLoading by mutableStateOf(false)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    private var selectedTab by mutableStateOf("Services")

    fun loadStore(storeId: Int, bearerToken: String?) {
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val detailTask = async { storesRepository.getStoreDetail(storeId) }
                val servicesTask = async { storesRepository.getStoreServices(storeId) }
                val reviewsTask = async { storesRepository.getStoreReviews(storeId) }
                val portfolioTask = async { storesRepository.getStorePortfolio(storeId) }
                val ratingTask = async { storesRepository.getStoreRating(storeId) }
                val hoursTask = async { storesRepository.getStoreHours(storeId) }

                val detailResult = detailTask.await()
                detailResult.onSuccess { store = it }
                    .onFailure {
                        errorMessage = it.message
                    }

                servicesTask.await()
                    .onSuccess { rows ->
                        services = rows.filter { it.is_active == 1 }
                        if (selectedServiceId == null) {
                            selectedServiceId = services.firstOrNull()?.id
                        }
                    }
                    .onFailure { if (errorMessage == null) errorMessage = it.message }

                reviewsTask.await().onSuccess { reviews = it }
                portfolioTask.await().onSuccess { portfolio = it }
                ratingTask.await().onSuccess { ratingSummary = it }
                hoursTask.await().onSuccess { storeHours = it }

                if (bearerToken != null) {
                    storesRepository.checkFavorite(storeId, bearerToken)
                        .onSuccess { isFavorited = it.is_favorited }
                }
            }
            isLoading = false
        }
    }

    fun pickTab(label: String) {
        selectedTab = label
    }

    fun currentTabLabel(): String {
        return selectedTab
    }

    fun visibleTabs(): List<String> = listOf("Services", "Reviews", "Portfolio", "Details")

    fun selectService(serviceId: Int) {
        selectedServiceId = serviceId
        selectedTab = "Services"
    }

    fun selectedServiceOrNull(): ServiceItem? = services.firstOrNull { it.id == selectedServiceId }

    fun ratingText(): String {
        val rating = ratingSummary?.average_rating ?: store?.rating ?: 0.0
        return String.format(Locale.US, "%.1f", rating)
    }

    fun reviewCountText(): String {
        val count = ratingSummary?.total_reviews ?: store?.review_count ?: 0
        return "$count reviews"
    }

    fun toggleFavorite(storeId: Int, bearerToken: String) {
        if (isFavoriteLoading) return
        isFavoriteLoading = true
        viewModelScope.launch {
            val next = !isFavorited
            storesRepository.setFavorite(storeId, bearerToken, next)
                .onSuccess {
                    isFavorited = next
                    errorMessage = null
                }
                .onFailure { errorMessage = it.message }
            isFavoriteLoading = false
        }
    }
}

class BookAppointmentViewModel(application: Application) : AndroidViewModel(application) {
    private val storesRepository = StoresRepository()
    private val appointmentsRepository = AppointmentsRepository()

    var storeDetail by mutableStateOf<StoreDetail?>(null)
        private set

    var services by mutableStateOf(emptyList<ServiceItem>())
        private set

    var technicians by mutableStateOf(emptyList<Technician>())
        private set

    var storeHours by mutableStateOf(emptyList<StoreHour>())
        private set

    var selectedServiceId by mutableStateOf<Int?>(null)
        private set

    var selectedTechnicianId by mutableStateOf<Int?>(null)

    var selectedDate by mutableStateOf(LocalDate.now())

    var availableSlots by mutableStateOf(emptyList<String>())
        private set

    var selectedSlot by mutableStateOf<String?>(null)

    var notes by mutableStateOf("")

    var isLoading by mutableStateOf(false)
        private set

    var isLoadingSlots by mutableStateOf(false)
        private set

    var isSubmitting by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var slotHintMessage by mutableStateOf<String?>(null)
        private set

    var successMessage by mutableStateOf<String?>(null)
        private set

    var activeZoneId by mutableStateOf(ZoneId.systemDefault())
        private set

    private var activeStoreId: Int? = null

    fun loadData(storeId: Int, preselectedServiceId: Int? = null) {
        activeStoreId = storeId
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val storeTask = async { storesRepository.getStoreDetail(storeId) }
                val servicesTask = async { storesRepository.getStoreServices(storeId) }
                val techTask = async { storesRepository.getStoreTechnicians(storeId) }
                val hoursTask = async { storesRepository.getStoreHours(storeId) }

                storeTask.await().onSuccess { detail ->
                    storeDetail = detail
                    activeZoneId = parseZoneId(detail.time_zone)
                    selectedDate = LocalDate.now(activeZoneId)
                }.onFailure { errorMessage = it.message }

                servicesTask.await().onSuccess { rows ->
                    services = rows.filter { it.is_active == 1 }
                    val fallback = services.firstOrNull()?.id
                    selectedServiceId = when {
                        preselectedServiceId != null && services.any { it.id == preselectedServiceId } -> preselectedServiceId
                        selectedServiceId != null && services.any { it.id == selectedServiceId } -> selectedServiceId
                        else -> fallback
                    }
                }.onFailure { if (errorMessage == null) errorMessage = it.message }

                techTask.await().onSuccess { rows ->
                    technicians = rows.filter { it.is_active == 1 }
                    if (selectedTechnicianId != null && technicians.none { it.id == selectedTechnicianId }) {
                        selectedTechnicianId = null
                    }
                }

                hoursTask.await().onSuccess { storeHours = it }
            }

            isLoading = false
            reloadAvailableSlotsInternal()
        }
    }

    fun chooseService(serviceId: Int) {
        selectedServiceId = serviceId
        reloadAvailableSlots()
    }

    fun chooseTechnician(technicianId: Int?) {
        selectedTechnicianId = technicianId
        reloadAvailableSlots()
    }

    fun chooseDate(date: LocalDate) {
        selectedDate = date
        reloadAvailableSlots()
    }

    fun selectSlot(slot: String) {
        selectedSlot = slot
    }

    fun reloadAvailableSlots() {
        viewModelScope.launch {
            reloadAvailableSlotsInternal()
        }
    }

    private suspend fun reloadAvailableSlotsInternal() {
        val serviceId = selectedServiceId
        val storeId = activeStoreId
        if (serviceId == null || storeId == null) {
            availableSlots = emptyList()
            selectedSlot = null
            return
        }

        isLoadingSlots = true
        slotHintMessage = null
        successMessage = null

        if (isStoreClosed(selectedDate)) {
            availableSlots = emptyList()
            selectedSlot = null
            slotHintMessage = "The salon is closed on this date."
            errorMessage = null
            isLoadingSlots = false
            return
        }

        val dateText = selectedDate.format(DATE_FORMATTER)
        val slotRows: List<TechnicianAvailableSlot> = try {
            if (selectedTechnicianId != null) {
                storesRepository.getTechnicianAvailableSlots(
                    technicianId = selectedTechnicianId!!,
                    date = dateText,
                    serviceId = serviceId,
                ).getOrThrow()
            } else {
                val activeTechIds = technicians.map { it.id }
                if (activeTechIds.isEmpty()) {
                    availableSlots = emptyList()
                    selectedSlot = null
                    slotHintMessage = "No available technicians for this store."
                    isLoadingSlots = false
                    return
                }
                coroutineScope {
                    val tasks = activeTechIds.map { technicianId ->
                        async {
                            storesRepository.getTechnicianAvailableSlots(
                                technicianId = technicianId,
                                date = dateText,
                                serviceId = serviceId,
                            )
                        }
                    }
                    tasks.flatMap { task -> task.await().getOrElse { emptyList() } }
                }
            }
        } catch (error: Exception) {
            availableSlots = emptyList()
            selectedSlot = null
            errorMessage = error.message
            slotHintMessage = slotHintFrom(error.message)
            isLoadingSlots = false
            return
        }

        val normalized = normalizeSlots(slotRows.map { it.start_time })
        val filtered = filterPastSlots(normalized)

        availableSlots = filtered
        selectedSlot = selectedSlot?.takeIf { it in filtered } ?: filtered.firstOrNull()

        if (filtered.isEmpty()) {
            slotHintMessage = "No available times for this date."
        } else {
            errorMessage = null
            slotHintMessage = null
        }

        isLoadingSlots = false
    }

    fun submit(bearerToken: String, onSuccess: () -> Unit) {
        val storeId = activeStoreId
        val serviceId = selectedServiceId
        val slot = selectedSlot ?: availableSlots.firstOrNull()

        successMessage = null
        errorMessage = null

        if (storeId == null || serviceId == null) {
            errorMessage = "Please select a service."
            return
        }

        if (slot == null) {
            if (isStoreClosed(selectedDate)) {
                val msg = "The salon is closed on this date."
                slotHintMessage = msg
                errorMessage = msg
            } else {
                val msg = "No available times for this date."
                slotHintMessage = msg
                errorMessage = msg
            }
            return
        }

        val slotDateTime = slotToDateTime(slot)
        if (!slotDateTime.isAfter(LocalDateTime.now(activeZoneId))) {
            val msg = "Past time cannot be booked. Please choose a future time."
            slotHintMessage = msg
            errorMessage = msg
            return
        }

        isSubmitting = true
        viewModelScope.launch {
            val request = AppointmentCreateRequest(
                store_id = storeId,
                service_id = serviceId,
                technician_id = selectedTechnicianId,
                appointment_date = selectedDate.format(DATE_FORMATTER),
                appointment_time = slotToRequestTime(slot),
                notes = notes.trim().takeIf { it.isNotEmpty() },
            )

            appointmentsRepository.createAppointment(
                bearerToken = bearerToken,
                request = request,
            ).onSuccess { created ->
                successMessage = "Appointment created: #${created.order_number ?: created.id}"
                errorMessage = null
                slotHintMessage = null
                onSuccess()
            }.onFailure { err ->
                errorMessage = err.message
                slotHintMessage = slotHintFrom(err.message)
                successMessage = null
            }

            isSubmitting = false
        }
    }

    fun selectedServiceOrNull(): ServiceItem? =
        services.firstOrNull { it.id == selectedServiceId }

    fun selectedTechnicianLabel(): String {
        val match = technicians.firstOrNull { it.id == selectedTechnicianId }
        return match?.name ?: "Any"
    }

    fun displayTime(slot: String): String {
        return runCatching {
            val localTime = LocalTime.parse(slot.take(5), SLOT_FORMATTER)
            localTime.format(DISPLAY_SLOT_FORMATTER)
        }.getOrElse { slot }
    }

    private fun parseZoneId(storeTimeZone: String?): ZoneId {
        val raw = storeTimeZone?.trim().orEmpty()
        if (raw.isEmpty()) return ZoneId.systemDefault()
        return runCatching { ZoneId.of(raw) }.getOrDefault(ZoneId.systemDefault())
    }

    private fun isStoreClosed(date: LocalDate): Boolean {
        if (storeHours.isEmpty()) return false
        val dayIndex = toStoreDayIndex(date.dayOfWeek)
        val hours = storeHours.firstOrNull { it.day_of_week == dayIndex } ?: return false
        if (hours.is_closed) return true
        val open = hours.open_time?.trim().orEmpty()
        val close = hours.close_time?.trim().orEmpty()
        return open.isEmpty() || close.isEmpty()
    }

    private fun toStoreDayIndex(dayOfWeek: DayOfWeek): Int {
        return if (dayOfWeek == DayOfWeek.SUNDAY) 6 else dayOfWeek.value - 1
    }

    private fun normalizeSlots(rawSlots: List<String>): List<String> {
        val normalized = rawSlots.mapNotNull { value ->
            val trimmed = value.trim()
            when {
                trimmed.matches(Regex("^\\d{2}:\\d{2}$")) -> trimmed
                trimmed.matches(Regex("^\\d{2}:\\d{2}:\\d{2}$")) -> trimmed.take(5)
                else -> null
            }
        }.toSet()

        return normalized.sortedBy { LocalTime.parse(it, SLOT_FORMATTER) }
    }

    private fun filterPastSlots(slots: List<String>): List<String> {
        val today = LocalDate.now(activeZoneId)
        if (selectedDate != today) return slots

        val now = LocalTime.now(activeZoneId)
        return slots.filter { slot ->
            runCatching { LocalTime.parse(slot, SLOT_FORMATTER).isAfter(now) }.getOrDefault(false)
        }
    }

    private fun slotHintFrom(message: String?): String? {
        val normalized = message?.lowercase().orEmpty()
        if (normalized.isEmpty()) return null

        return when {
            normalized.contains("closed") -> "The salon is closed on this date."
            normalized.contains("blocked") -> "This time slot is blocked by the store. Please choose another time."
            normalized.contains("past") || normalized.contains("future time") -> "Past time cannot be booked. Please choose a future time."
            normalized.contains("not available") || normalized.contains("no available") -> "No available times for this date."
            normalized.contains("daily booking limit") -> "Daily booking limit reached. Please choose another day."
            else -> null
        }
    }

    private fun slotToDateTime(slot: String): LocalDateTime {
        val time = LocalTime.parse(slot.take(5), SLOT_FORMATTER)
        return LocalDateTime.of(selectedDate, time)
    }

    private fun slotToRequestTime(slot: String): String {
        return if (slot.length == 5) "$slot:00" else slot
    }

    companion object {
        private val DATE_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
        private val SLOT_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
        private val DISPLAY_SLOT_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("h:mm a")
    }
}
