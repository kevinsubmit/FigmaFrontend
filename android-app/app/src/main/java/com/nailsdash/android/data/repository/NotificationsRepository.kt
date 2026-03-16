package com.nailsdash.android.data.repository

import com.nailsdash.android.core.cache.TimedMemoryCache
import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.AppNotification
import com.nailsdash.android.data.model.MarkAllReadResponse
import com.nailsdash.android.data.model.NotificationPreferences
import com.nailsdash.android.data.model.NotificationPreferencesUpdateRequest
import com.nailsdash.android.data.model.UnreadCount
import com.nailsdash.android.data.network.ServiceLocator

class NotificationsRepository {
    private val api get() = ServiceLocator.api

    private data class NotificationsListKey(
        val bearerToken: String,
        val unreadOnly: Boolean,
    )

    private data class TokenKey(
        val bearerToken: String,
    )

    suspend fun getNotifications(
        bearerToken: String,
        unreadOnly: Boolean,
    ): Result<List<AppNotification>> {
        val cacheKey = NotificationsListKey(bearerToken, unreadOnly)
        notificationsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching {
            api.getNotifications(
                bearerToken = bearerToken,
                skip = 0,
                limit = 100,
                unreadOnly = unreadOnly,
            )
        }.mapFailure().onSuccess { notificationsCache.put(cacheKey, it) }
    }

    suspend fun getUnreadCount(bearerToken: String): Result<UnreadCount> {
        val cacheKey = TokenKey(bearerToken)
        unreadCountCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getUnreadNotificationCount(bearerToken) }
            .mapFailure()
            .onSuccess { unreadCountCache.put(cacheKey, it) }
    }

    suspend fun getPreferences(bearerToken: String): Result<NotificationPreferences> {
        val cacheKey = TokenKey(bearerToken)
        preferencesCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getNotificationPreferences(bearerToken) }
            .mapFailure()
            .onSuccess { preferencesCache.put(cacheKey, it) }
    }

    suspend fun updatePreferences(
        bearerToken: String,
        pushEnabled: Boolean,
    ): Result<NotificationPreferences> = runCatching {
        api.updateNotificationPreferences(
            bearerToken = bearerToken,
            request = NotificationPreferencesUpdateRequest(push_enabled = pushEnabled),
        )
    }.mapFailure().onSuccess {
        preferencesCache.clear()
    }

    suspend fun markAsRead(
        bearerToken: String,
        notificationId: Int,
    ): Result<AppNotification> = runCatching {
        api.markNotificationRead(
            bearerToken = bearerToken,
            notificationId = notificationId,
        )
    }.mapFailure().onSuccess {
        notificationsCache.clear()
        unreadCountCache.clear()
    }

    suspend fun markAllRead(bearerToken: String): Result<MarkAllReadResponse> =
        runCatching { api.markAllNotificationsRead(bearerToken) }
            .mapFailure()
            .onSuccess {
                notificationsCache.clear()
                unreadCountCache.clear()
            }

    suspend fun deleteNotification(
        bearerToken: String,
        notificationId: Int,
    ): Result<Unit> = runCatching {
        api.deleteNotification(
            bearerToken = bearerToken,
            notificationId = notificationId,
        )
    }.mapFailure().onSuccess {
        notificationsCache.clear()
        unreadCountCache.clear()
    }

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }

    private companion object {
        private const val CACHE_TTL_MS = 30 * 1000L
        private val notificationsCache = TimedMemoryCache<NotificationsListKey, List<AppNotification>>(CACHE_TTL_MS, maxEntries = 8)
        private val unreadCountCache = TimedMemoryCache<TokenKey, UnreadCount>(CACHE_TTL_MS, maxEntries = 4)
        private val preferencesCache = TimedMemoryCache<TokenKey, NotificationPreferences>(CACHE_TTL_MS, maxEntries = 4)
    }
}
