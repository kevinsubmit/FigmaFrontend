package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.benchmark.BenchmarkFixtures
import com.nailsdash.android.benchmark.BenchmarkOverrides
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.repository.AppointmentsRepository
import com.nailsdash.android.data.repository.StoresRepository
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

enum class AppointmentSegment(val label: String) {
    Upcoming("Upcoming"),
    Past("Past"),
}

class AppointmentsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AppointmentsRepository()
    private val storesRepository = StoresRepository()
    private val initialPageSize = 12
    private val loadMorePageSize = 8
    private val prefetchDistance = 4
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false
    private var offset = 0
    private var loadRequestVersion = 0

    var items by mutableStateOf(emptyList<Appointment>())
        private set

    private var upcomingItems by mutableStateOf(emptyList<Appointment>())
    private var pastItems by mutableStateOf(emptyList<Appointment>())

    var isLoading by mutableStateOf(false)
        private set

    var isLoadingMore by mutableStateOf(false)
        private set

    var hasMore by mutableStateOf(true)
        private set

    var initialLoadResolved by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var storeAddressByStoreId by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    var storeNameByStoreId by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    var selectedSegment by mutableStateOf(AppointmentSegment.Upcoming)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) {
            initialLoadResolved = true
            return
        }
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        loadPage(reset = true, bearerToken = bearerToken)
    }

    fun onSegmentSelected(segment: AppointmentSegment) {
        if (selectedSegment == segment) return
        selectedSegment = segment
    }

    fun loadMoreIfNeeded(currentIndex: Int) {
        val visibleItems = filteredItems()
        val bearerToken = loadedBearerToken ?: return
        if (hasMore.not() || isLoading || isLoadingMore || visibleItems.isEmpty()) return
        if (currentIndex < (visibleItems.lastIndex - prefetchDistance).coerceAtLeast(0)) return
        loadPage(reset = false, bearerToken = bearerToken)
    }

    fun loadMoreForSelectedSegmentIfNeeded() {
        if (!hasLoadedOnce) return
        val bearerToken = loadedBearerToken ?: return
        if (filteredItems().isNotEmpty() || hasMore.not() || isLoading || isLoadingMore) return
        loadPage(reset = false, bearerToken = bearerToken)
    }

    fun filteredItems(): List<Appointment> {
        return when (selectedSegment) {
            AppointmentSegment.Upcoming -> upcomingItems
            AppointmentSegment.Past -> pastItems
        }
    }

    fun upcomingCount(): Int = upcomingItems.size

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

    private fun loadPage(
        reset: Boolean,
        bearerToken: String,
    ) {
        val requestVersion = if (reset) {
            ++loadRequestVersion
        } else {
            if (loadRequestVersion == 0) {
                loadRequestVersion = 1
            }
            loadRequestVersion
        }
        val pageSize = if (reset) initialPageSize else loadMorePageSize
        val skip = if (reset) 0 else offset

        if (reset) {
            isLoading = true
            offset = 0
            hasMore = true
            initialLoadResolved = false
        } else {
            isLoadingMore = true
        }

        viewModelScope.launch {
            if (BenchmarkOverrides.isEnabled()) {
                val allRows = BenchmarkFixtures.appointments
                val pagedRows = allRows.drop(skip).take(pageSize)
                val mergedItems = if (reset) {
                    pagedRows
                } else {
                    (items + pagedRows).distinctBy { it.id }
                }
                applyItems(mergedItems)
                storeAddressByStoreId = mergedItems
                    .mapNotNull { item -> normalizedText(item.store_address)?.let { item.store_id to it } }
                    .toMap()
                storeNameByStoreId = mergedItems
                    .mapNotNull { item -> normalizedText(item.store_name)?.let { item.store_id to it } }
                    .toMap()
                offset = skip + pagedRows.size
                hasMore = offset < allRows.size
                errorMessage = null
                if (reset) {
                    isLoading = false
                    initialLoadResolved = true
                } else {
                    isLoadingMore = false
                }
                return@launch
            }

            repository.getMyAppointments(
                bearerToken = bearerToken,
                skip = skip,
                limit = pageSize,
            ).onSuccess { rows ->
                if (requestVersion != loadRequestVersion) return@onSuccess
                val mergedItems = if (reset) {
                    rows
                } else {
                    (items + rows).distinctBy { it.id }
                }
                applyItems(mergedItems)
                offset = skip + rows.size
                hasMore = rows.size == pageSize
                errorMessage = null
                if (reset && mergedItems.isEmpty()) {
                    storeAddressByStoreId = emptyMap()
                    storeNameByStoreId = emptyMap()
                }
                enrichAppointments(
                    appointments = if (reset) mergedItems else rows,
                    requestVersion = requestVersion,
                )
            }.onFailure { err ->
                if (requestVersion != loadRequestVersion) return@onFailure
                if (reset) {
                    applyItems(emptyList())
                    storeAddressByStoreId = emptyMap()
                    storeNameByStoreId = emptyMap()
                }
                errorMessage = err.message
            }

            if (requestVersion != loadRequestVersion) return@launch
            if (reset) {
                isLoading = false
                initialLoadResolved = true
            } else {
                isLoadingMore = false
            }
        }
    }

    private suspend fun enrichAppointments(
        appointments: List<Appointment>,
        requestVersion: Int,
    ) {
        enrichStoreFallbacks(
            appointments = appointments,
            requestVersion = requestVersion,
        )
        enrichServiceFallbacks(
            appointments = appointments,
            requestVersion = requestVersion,
        )
    }

    private suspend fun enrichStoreFallbacks(
        appointments: List<Appointment>,
        requestVersion: Int,
    ) = coroutineScope {
        val storeIds = appointments
            .filter {
                normalizedText(it.store_name) == null || normalizedText(it.store_address) == null
            }
            .map { it.store_id }
            .toSet()
            .filterNot { storeId ->
                storeNameByStoreId[storeId] != null && storeAddressByStoreId[storeId] != null
            }

        if (storeIds.isEmpty()) return@coroutineScope

        val existingAddresses = storeAddressByStoreId
        val existingNames = storeNameByStoreId
        val addressMap = mutableMapOf<Int, String>()
        val nameMap = mutableMapOf<Int, String>()
        val tasks = storeIds.map { storeId ->
            async {
                storesRepository.getStoreDetail(storeId).getOrNull()?.let { detail ->
                    storeId to Pair(
                        detail.name.trim().ifEmpty { null },
                        detail.formattedAddress.trim().ifEmpty { null },
                    )
                }
            }
        }

        tasks.forEach { task ->
            val resolved = task.await() ?: return@forEach
            val (storeId, payload) = resolved
            val (name, address) = payload
            if (name != null) {
                nameMap[storeId] = name
            }
            if (address != null) {
                addressMap[storeId] = address
            }
        }

        if (requestVersion != loadRequestVersion) return@coroutineScope
        if (nameMap.isEmpty() && addressMap.isEmpty()) return@coroutineScope

        val mergedAddresses = existingAddresses + addressMap
        val mergedNames = existingNames + nameMap
        storeAddressByStoreId = mergedAddresses
        storeNameByStoreId = mergedNames
        applyItems(
            items.map { item ->
                item.copy(
                    store_name = normalizedText(item.store_name) ?: mergedNames[item.store_id],
                    store_address = normalizedText(item.store_address) ?: mergedAddresses[item.store_id],
                )
            },
        )
    }

    private suspend fun enrichServiceFallbacks(
        appointments: List<Appointment>,
        requestVersion: Int,
    ) = coroutineScope {
        val storeIdsNeedingServices = appointments
            .filter {
                normalizedText(it.service_name) == null ||
                    it.service_price == null ||
                    it.service_duration == null
            }
            .map { it.store_id }
            .distinct()

        if (storeIdsNeedingServices.isEmpty()) return@coroutineScope

        val servicesByStoreId = mutableMapOf<Int, Map<Int, Triple<String, Double, Int>>>()
        val tasks = storeIdsNeedingServices.map { storeId ->
            async {
                storeId to storesRepository.getStoreServices(storeId).getOrNull()
            }
        }

        tasks.forEach { task ->
            val (storeId, services) = task.await()
            if (services != null) {
                servicesByStoreId[storeId] = services.associate { service ->
                    service.id to Triple(service.name, service.price, service.duration_minutes)
                }
            }
        }

        if (requestVersion != loadRequestVersion) return@coroutineScope
        if (servicesByStoreId.isEmpty()) return@coroutineScope

        applyItems(
            items.map { item ->
                val matched = servicesByStoreId[item.store_id]?.get(item.service_id) ?: return@map item
                item.copy(
                    service_name = normalizedText(item.service_name) ?: matched.first,
                    service_price = item.service_price ?: matched.second,
                    service_duration = item.service_duration ?: matched.third,
                )
            },
        )
    }

    private fun applyItems(newItems: List<Appointment>) {
        items = newItems
        upcomingItems = newItems.filter(::isUpcoming)
        pastItems = newItems.filterNot(::isUpcoming)
    }

    private fun normalizedText(value: String?): String? {
        val trimmed = value?.trim().orEmpty()
        return trimmed.ifEmpty { null }
    }
}
