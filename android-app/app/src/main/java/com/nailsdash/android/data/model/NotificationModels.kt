package com.nailsdash.android.data.model

data class NotificationPreferences(
    val push_enabled: Boolean,
)

data class NotificationPreferencesUpdateRequest(
    val push_enabled: Boolean,
)

data class AppNotification(
    val id: Int,
    val type: String,
    val title: String,
    val message: String,
    val appointment_id: Int? = null,
    val is_read: Boolean,
    val created_at: String,
    val read_at: String? = null,
)

data class MarkAllReadResponse(
    val marked_count: Int,
)
