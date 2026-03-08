package com.nailsdash.android.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.data.model.AppNotification
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.NotificationsFilter
import com.nailsdash.android.ui.state.NotificationsViewModel
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@Composable
fun NotificationsScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenAppointment: (Int) -> Unit,
    notificationsViewModel: NotificationsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) notificationsViewModel.load(bearerToken)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("Notifications", style = MaterialTheme.typography.headlineSmall)
                if (notificationsViewModel.unreadCount > 0) {
                    Text(
                        "${notificationsViewModel.unreadCount} unread",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            if (notificationsViewModel.items.any { !it.is_read }) {
                Button(
                    onClick = {
                        if (bearerToken != null) notificationsViewModel.markAllRead(bearerToken)
                    },
                ) {
                    Text("Mark all read")
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NotificationsFilter.entries.forEach { filter ->
                val label = if (filter == NotificationsFilter.Unread && notificationsViewModel.unreadCount > 0) {
                    "${filter.label} (${notificationsViewModel.unreadCount})"
                } else {
                    filter.label
                }
                AssistChip(
                    onClick = {
                        if (bearerToken != null) {
                            notificationsViewModel.selectFilter(filter, bearerToken)
                        }
                    },
                    label = { Text(label) },
                )
            }
        }

        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("Push Notifications", fontWeight = FontWeight.SemiBold)
                    Text(if (notificationsViewModel.pushEnabled) "Enabled" else "Disabled")
                }
                Switch(
                    checked = notificationsViewModel.pushEnabled,
                    onCheckedChange = { enabled ->
                        if (bearerToken != null) {
                            notificationsViewModel.updatePushPreference(enabled, bearerToken)
                        }
                    },
                    enabled = !notificationsViewModel.isUpdatingPushPreference,
                )
            }
        }

        notificationsViewModel.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        if (notificationsViewModel.isLoading && notificationsViewModel.items.isEmpty()) {
            CircularProgressIndicator()
        }

        if (!notificationsViewModel.isLoading && notificationsViewModel.items.isEmpty()) {
            Text(
                if (notificationsViewModel.selectedFilter == NotificationsFilter.Unread) {
                    "You're all caught up!"
                } else {
                    "No notifications."
                },
            )
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(notificationsViewModel.items, key = { it.id }) { item ->
                NotificationCard(
                    item = item,
                    onTap = {
                        if (bearerToken != null) {
                            notificationsViewModel.handleTap(
                                item = item,
                                bearerToken = bearerToken,
                                onOpenAppointment = onOpenAppointment,
                            )
                        }
                    },
                    onMarkRead = {
                        if (bearerToken != null) {
                            notificationsViewModel.markAsRead(item.id, bearerToken)
                        }
                    },
                    onDelete = {
                        if (bearerToken != null) {
                            notificationsViewModel.deleteNotification(item.id, bearerToken)
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun NotificationCard(
    item: AppNotification,
    onTap: () -> Unit,
    onMarkRead: () -> Unit,
    onDelete: () -> Unit,
) {
    val readTint = if (item.is_read) 0.05f else 0.14f

    Card(
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onTap() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(item.title, fontWeight = FontWeight.SemiBold)
            Text(item.message, style = MaterialTheme.typography.bodyMedium)
            Text(relativeTimeText(item.created_at), style = MaterialTheme.typography.labelSmall)
            Text(
                iconLabel(item.type),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary.copy(alpha = readTint + 0.45f),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!item.is_read) {
                    Button(onClick = onMarkRead, modifier = Modifier.weight(1f)) {
                        Text("Mark as read")
                    }
                }
                Button(onClick = onDelete) {
                    Text("Delete")
                }
            }
        }
    }
}

private fun iconLabel(type: String): String {
    val normalized = type.lowercase()
    return when {
        normalized.contains("appointment_created") ||
            normalized.contains("appointment_confirmed") ||
            normalized.contains("appointment_completed") -> "calendar"

        normalized.contains("appointment_reminder") -> "clock"
        else -> "bell"
    }
}

private fun relativeTimeText(raw: String): String {
    val date = runCatching { OffsetDateTime.parse(raw) }.getOrNull() ?: return raw
    val now = OffsetDateTime.now()
    val minutes = java.time.Duration.between(date, now).toMinutes().coerceAtLeast(0)
    val hours = minutes / 60
    val days = hours / 24

    return when {
        minutes < 1 -> "Just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days < 7 -> "${days}d ago"
        else -> date.format(DateTimeFormatter.ofPattern("MMM d"))
    }
}
