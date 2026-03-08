package com.nailsdash.android.data.repository

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

    suspend fun createAppointment(
        bearerToken: String,
        request: AppointmentCreateRequest,
    ): Result<Appointment> = runCatching {
        api.createAppointment(bearerToken = bearerToken, request = request)
    }.mapFailure()

    suspend fun createAppointmentGroup(
        bearerToken: String,
        request: AppointmentGroupCreateRequest,
    ): Result<AppointmentGroupResponse> = runCatching {
        api.createAppointmentGroup(bearerToken = bearerToken, request = request)
    }.mapFailure()

    suspend fun getMyAppointments(
        bearerToken: String,
        limit: Int = 100,
    ): Result<List<Appointment>> = runCatching {
        api.getMyAppointments(bearerToken = bearerToken, skip = 0, limit = limit)
    }.mapFailure()

    suspend fun getAppointment(
        bearerToken: String,
        appointmentId: Int,
    ): Result<Appointment> = runCatching {
        api.getAppointment(bearerToken = bearerToken, appointmentId = appointmentId)
    }.mapFailure()

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
    }.mapFailure()

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
    }.mapFailure()

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }
}
