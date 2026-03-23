package com.nailsdash.android.data.repository

import com.nailsdash.android.core.cache.KeyedMutex
import com.nailsdash.android.core.cache.TimedMemoryCache
import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.model.AppointmentCancelRequest
import com.nailsdash.android.data.model.AppointmentCreateRequest
import com.nailsdash.android.data.model.AppointmentGroupCreateRequest
import com.nailsdash.android.data.model.AppointmentGroupResponse
import com.nailsdash.android.data.model.AppointmentRescheduleRequest
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.AppointmentServiceItemCreateRequest
import com.nailsdash.android.data.model.AppointmentServiceSummary
import com.nailsdash.android.data.network.ServiceLocator

class AppointmentsRepository {
    private val api get() = ServiceLocator.api
    private val storesRepository = StoresRepository()

    private data class AppointmentListKey(
        val bearerToken: String,
        val skip: Int,
        val limit: Int,
    )

    private data class AppointmentDetailKey(
        val bearerToken: String,
        val appointmentId: Int,
    )

    private data class AppointmentServiceSummaryKey(
        val bearerToken: String,
        val appointmentId: Int,
    )

    suspend fun createAppointment(
        bearerToken: String,
        request: AppointmentCreateRequest,
    ): Result<Appointment> = runCatching {
        api.createAppointment(bearerToken = bearerToken, request = request)
    }.mapFailure().onSuccess {
        invalidateAppointmentCaches()
    }

    suspend fun addAppointmentServiceItem(
        bearerToken: String,
        appointmentId: Int,
        serviceId: Int,
        amount: Double,
    ): Result<AppointmentServiceSummary> = runCatching {
        api.addAppointmentServiceItem(
            bearerToken = bearerToken,
            appointmentId = appointmentId,
            request = AppointmentServiceItemCreateRequest(
                service_id = serviceId,
                amount = amount,
            ),
        )
    }.mapFailure().onSuccess {
        invalidateAppointmentCaches()
    }

    suspend fun createAppointmentGroup(
        bearerToken: String,
        request: AppointmentGroupCreateRequest,
    ): Result<AppointmentGroupResponse> = runCatching {
        api.createAppointmentGroup(bearerToken = bearerToken, request = request)
    }.mapFailure().onSuccess {
        invalidateAppointmentCaches()
    }

    suspend fun getMyAppointments(
        bearerToken: String,
        skip: Int = 0,
        limit: Int = 100,
    ): Result<List<Appointment>> {
        val cacheKey = AppointmentListKey(
            bearerToken = bearerToken,
            skip = skip,
            limit = limit,
        )
        appointmentsCache.get(cacheKey)?.let { return Result.success(it) }
        return appointmentListLocks.withLock(cacheKey) {
            appointmentsCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                val loaded = api.getMyAppointments(bearerToken = bearerToken, skip = skip, limit = limit)
                enrichAppointments(bearerToken = bearerToken, appointments = loaded)
            }.mapFailure().onSuccess { appointmentsCache.put(cacheKey, it) }
        }
    }

    suspend fun getAppointment(
        bearerToken: String,
        appointmentId: Int,
    ): Result<Appointment> {
        val cacheKey = AppointmentDetailKey(
            bearerToken = bearerToken,
            appointmentId = appointmentId,
        )
        appointmentDetailCache.get(cacheKey)?.let { return Result.success(it) }
        return appointmentDetailLocks.withLock(cacheKey) {
            appointmentDetailCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                val loaded = api.getAppointment(bearerToken = bearerToken, appointmentId = appointmentId)
                enrichAppointment(bearerToken = bearerToken, appointment = loaded)
            }.mapFailure().onSuccess { appointmentDetailCache.put(cacheKey, it) }
        }
    }

    suspend fun getAppointmentServiceSummary(
        bearerToken: String,
        appointmentId: Int,
    ): Result<AppointmentServiceSummary> {
        val cacheKey = AppointmentServiceSummaryKey(
            bearerToken = bearerToken,
            appointmentId = appointmentId,
        )
        appointmentServiceSummaryCache.get(cacheKey)?.let { return Result.success(it) }
        return appointmentServiceSummaryLocks.withLock(cacheKey) {
            appointmentServiceSummaryCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                api.getAppointmentServiceSummary(
                    bearerToken = bearerToken,
                    appointmentId = appointmentId,
                )
            }.mapFailure().onSuccess { appointmentServiceSummaryCache.put(cacheKey, it) }
        }
    }

    suspend fun cancelAppointment(
        bearerToken: String,
        appointmentId: Int,
        reason: String?,
    ): Result<Appointment> = runCatching {
        api.cancelAppointment(
            bearerToken = bearerToken,
            appointmentId = appointmentId,
            request = AppointmentCancelRequest(cancel_reason = reason),
        )
    }.mapFailure().onSuccess {
        invalidateAppointmentCaches()
    }

    suspend fun rescheduleAppointment(
        bearerToken: String,
        appointmentId: Int,
        newDate: String,
        newTime: String,
    ): Result<Appointment> = runCatching {
        api.rescheduleAppointment(
            bearerToken = bearerToken,
            appointmentId = appointmentId,
            request = AppointmentRescheduleRequest(new_date = newDate, new_time = newTime),
        )
    }.mapFailure().onSuccess {
        invalidateAppointmentCaches()
    }

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }

    private fun invalidateAppointmentCaches() {
        appointmentsCache.clear()
        appointmentDetailCache.clear()
        appointmentServiceSummaryCache.clear()
    }

    private suspend fun enrichAppointments(
        bearerToken: String,
        appointments: List<Appointment>,
    ): List<Appointment> {
        if (appointments.isEmpty()) return appointments
        val storeServicesCache = mutableMapOf<Int, List<ServiceItem>>()
        return appointments.map { appointment ->
            enrichAppointment(
                bearerToken = bearerToken,
                appointment = appointment,
                storeServicesCache = storeServicesCache,
            )
        }
    }

    private suspend fun enrichAppointment(
        bearerToken: String,
        appointment: Appointment,
        storeServicesCache: MutableMap<Int, List<ServiceItem>> = mutableMapOf(),
    ): Appointment {
        val summary = getAppointmentServiceSummary(
            bearerToken = bearerToken,
            appointmentId = appointment.id,
        ).getOrNull() ?: return appointment

        val services = storeServicesCache.getOrPut(appointment.store_id) {
            storesRepository.getStoreServices(appointment.store_id).getOrDefault(emptyList())
        }
        val servicesById = services.associateBy { it.id }

        val serviceNames = summary.items.mapNotNull { item ->
            item.service_name
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
                ?: servicesById[item.service_id]?.name
        }.distinct()
        val totalDuration = summary.items.sumOf { item ->
            servicesById[item.service_id]?.duration_minutes
                ?: if (item.service_id == appointment.service_id) (appointment.service_duration ?: 0) else 0
        }
        val displayName = when {
            serviceNames.isEmpty() -> appointment.service_name
            serviceNames.size == 1 -> serviceNames.first()
            else -> serviceNames.joinToString(separator = ", ")
        }
        val totalAmount = summary.order_amount.takeIf { it > 0 } ?: appointment.order_amount ?: appointment.service_price
        val mergedDuration = totalDuration.takeIf { it > 0 } ?: appointment.service_duration

        return appointment.copy(
            order_amount = totalAmount,
            service_name = displayName,
            service_price = totalAmount,
            service_duration = mergedDuration,
        )
    }

    private companion object {
        private const val CACHE_TTL_MS = 30 * 1000L
        private val appointmentsCache = TimedMemoryCache<AppointmentListKey, List<Appointment>>(CACHE_TTL_MS, maxEntries = 16)
        private val appointmentListLocks = KeyedMutex<AppointmentListKey>()
        private val appointmentDetailCache = TimedMemoryCache<AppointmentDetailKey, Appointment>(CACHE_TTL_MS, maxEntries = 32)
        private val appointmentDetailLocks = KeyedMutex<AppointmentDetailKey>()
        private val appointmentServiceSummaryCache =
            TimedMemoryCache<AppointmentServiceSummaryKey, AppointmentServiceSummary>(CACHE_TTL_MS, maxEntries = 64)
        private val appointmentServiceSummaryLocks = KeyedMutex<AppointmentServiceSummaryKey>()
    }
}
