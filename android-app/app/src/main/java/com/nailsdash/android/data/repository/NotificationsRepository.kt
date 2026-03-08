package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.AppNotification
import com.nailsdash.android.data.model.MarkAllReadResponse
import com.nailsdash.android.data.model.NotificationPreferences
import com.nailsdash.android.data.model.NotificationPreferencesUpdateRequest
import com.nailsdash.android.data.model.UnreadCount
import com.nailsdash.android.data.network.ServiceLocator

class NotificationsRepository {
    private val api get() = ServiceLocator.api

    suspend fun getNotifications(
        bearerToken: String,
        unreadOnly: Boolean,
    ): Result<List<AppNotification>> = runCatching {
        api.getNotifications(
            bearerToken = bearerToken,
            skip = 0,
            limit = 100,
            unreadOnly = unreadOnly,
        )
    }.mapFailure()

    suspend fun getUnreadCount(bearerToken: String): Result<UnreadCount> =
        runCatching { api.getUnreadNotificationCount(bearerToken) }.mapFailure()

    suspend fun getPreferences(bearerToken: String): Result<NotificationPreferences> =
        runCatching { api.getNotificationPreferences(bearerToken) }.mapFailure()

    suspend fun updatePreferences(
        bearerToken: String,
        pushEnabled: Boolean,
    ): Result<NotificationPreferences> = runCatching {
        api.updateNotificationPreferences(
            bearerToken = bearerToken,
            request = NotificationPreferencesUpdateRequest(push_enabled = pushEnabled),
        )
    }.mapFailure()

    suspend fun markAsRead(
        bearerToken: String,
        notificationId: Int,
    ): Result<AppNotification> = runCatching {
        api.markNotificationRead(
            bearerToken = bearerToken,
            notificationId = notificationId,
        )
    }.mapFailure()

    suspend fun markAllRead(bearerToken: String): Result<MarkAllReadResponse> =
        runCatching { api.markAllNotificationsRead(bearerToken) }.mapFailure()

    suspend fun deleteNotification(
        bearerToken: String,
        notificationId: Int,
    ): Result<Unit> = runCatching {
        api.deleteNotification(
            bearerToken = bearerToken,
            notificationId = notificationId,
        )
    }.mapFailure()

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }
}
