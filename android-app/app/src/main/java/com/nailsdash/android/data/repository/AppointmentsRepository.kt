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
import com.nailsdash.android.data.network.ServiceLocator

class AppointmentsRepository {
    private val api get() = ServiceLocator.api

    private data class AppointmentListKey(
        val bearerToken: String,
        val skip: Int,
        val limit: Int,
    )

    private data class AppointmentDetailKey(
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
                api.getMyAppointments(bearerToken = bearerToken, skip = skip, limit = limit)
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
                api.getAppointment(bearerToken = bearerToken, appointmentId = appointmentId)
            }.mapFailure().onSuccess { appointmentDetailCache.put(cacheKey, it) }
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
    }

    private companion object {
        private const val CACHE_TTL_MS = 30 * 1000L
        private val appointmentsCache = TimedMemoryCache<AppointmentListKey, List<Appointment>>(CACHE_TTL_MS, maxEntries = 16)
        private val appointmentListLocks = KeyedMutex<AppointmentListKey>()
        private val appointmentDetailCache = TimedMemoryCache<AppointmentDetailKey, Appointment>(CACHE_TTL_MS, maxEntries = 32)
        private val appointmentDetailLocks = KeyedMutex<AppointmentDetailKey>()
    }
}
