package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.AppNotification
import com.nailsdash.android.data.repository.NotificationsRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

enum class NotificationsFilter(val label: String, val unreadOnly: Boolean) {
    All("All", false),
    Unread("Unread", true),
}

class NotificationsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = NotificationsRepository()

    var items by mutableStateOf(emptyList<AppNotification>())
        private set

    var selectedFilter by mutableStateOf(NotificationsFilter.All)
        private set

    var unreadCount by mutableStateOf(0)
        private set

    var pushEnabled by mutableStateOf(true)
        private set

    var isUpdatingPushPreference by mutableStateOf(false)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun load(bearerToken: String) {
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val notificationsTask = async {
                    repository.getNotifications(
                        bearerToken = bearerToken,
                        unreadOnly = selectedFilter.unreadOnly,
                    )
                }
                val unreadTask = async { repository.getUnreadCount(bearerToken) }
                val preferencesTask = async { repository.getPreferences(bearerToken) }

                val notificationsResult = notificationsTask.await()
                val unreadResult = unreadTask.await()
                val preferencesResult = preferencesTask.await()

                notificationsResult.onSuccess { items = it }
                    .onFailure { errorMessage = it.message }

                unreadResult.onSuccess { unreadCount = it.unread_count }
                    .onFailure { if (errorMessage == null) errorMessage = it.message }

                preferencesResult.onSuccess { pushEnabled = it.push_enabled }
                    .onFailure { if (errorMessage == null) errorMessage = it.message }
            }
            isLoading = false
        }
    }

    fun selectFilter(filter: NotificationsFilter, bearerToken: String) {
        if (filter == selectedFilter) return
        selectedFilter = filter
        load(bearerToken)
    }

    fun markAsRead(notificationId: Int, bearerToken: String) {
        val idx = items.indexOfFirst { it.id == notificationId }
        if (idx < 0 || items[idx].is_read) return

        viewModelScope.launch {
            repository.markAsRead(
                bearerToken = bearerToken,
                notificationId = notificationId,
            ).onSuccess { updated ->
                if (selectedFilter == NotificationsFilter.Unread) {
                    items = items.filterNot { it.id == notificationId }
                } else {
                    val mutable = items.toMutableList()
                    mutable[idx] = updated
                    items = mutable
                }
                unreadCount = maxOf(unreadCount - 1, 0)
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
            }
        }
    }

    fun markAllRead(bearerToken: String) {
        if (items.isEmpty()) return

        viewModelScope.launch {
            repository.markAllRead(bearerToken)
                .onSuccess {
                    if (selectedFilter == NotificationsFilter.Unread) {
                        items = emptyList()
                    } else {
                        items = items.map { row ->
                            if (row.is_read) row else row.copy(is_read = true)
                        }
                    }
                    unreadCount = 0
                    errorMessage = null
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
        }
    }

    fun deleteNotification(notificationId: Int, bearerToken: String) {
        val wasUnread = items.firstOrNull { it.id == notificationId }?.is_read == false

        viewModelScope.launch {
            repository.deleteNotification(
                bearerToken = bearerToken,
                notificationId = notificationId,
            ).onSuccess {
                items = items.filterNot { it.id == notificationId }
                if (wasUnread) unreadCount = maxOf(unreadCount - 1, 0)
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
            }
        }
    }

    fun handleTap(item: AppNotification, bearerToken: String, onOpenAppointment: (Int) -> Unit) {
        viewModelScope.launch {
            if (!item.is_read) {
                markAsRead(item.id, bearerToken)
            }
            item.appointment_id?.let { onOpenAppointment(it) }
        }
    }

    fun updatePushPreference(enabled: Boolean, bearerToken: String) {
        val previous = pushEnabled
        pushEnabled = enabled
        isUpdatingPushPreference = true

        viewModelScope.launch {
            repository.updatePreferences(
                bearerToken = bearerToken,
                pushEnabled = enabled,
            ).onSuccess {
                pushEnabled = it.push_enabled
                errorMessage = null
            }.onFailure { err ->
                pushEnabled = previous
                errorMessage = err.message
            }
            isUpdatingPushPreference = false
        }
    }
}
