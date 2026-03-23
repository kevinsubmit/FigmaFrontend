package com.nailsdash.android.ui.screen

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.data.model.AppNotification
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.NotificationsFilter
import com.nailsdash.android.ui.state.NotificationsViewModel
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

private val NotificationGold = Color(0xFFD4AF37)
private val NotificationBg = Color(0xFF000000)
private val NotificationCardBg = Color(0xFF111111)
private val NotificationText = Color.White
private val NotificationSecondaryText = Color.White.copy(alpha = 0.68f)

@Composable
fun NotificationsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    onOpenAppointment: (Int) -> Unit,
    notificationsViewModel: NotificationsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) notificationsViewModel.loadIfNeeded(bearerToken)
    }
    LaunchedEffect(notificationsViewModel.errorMessage) {
        val message = notificationsViewModel.errorMessage?.trim().takeIf { !it.isNullOrEmpty() }
        if (message != null) {
            noticeMessage = message
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(NotificationBg),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
        ) {
            NotificationsTopBar(
                unreadCount = notificationsViewModel.unreadCount,
                canMarkAllRead = notificationsViewModel.items.any { !it.is_read },
                onBack = onBack,
                onMarkAllRead = {
                    if (bearerToken != null) notificationsViewModel.markAllRead(bearerToken)
                },
            )
            NotificationsFilterBar(
                selectedFilter = notificationsViewModel.selectedFilter,
                unreadCount = notificationsViewModel.unreadCount,
                onSelect = { filter ->
                    if (bearerToken != null) {
                        notificationsViewModel.selectFilter(filter, bearerToken)
                    }
                },
            )
            NotificationsPushBar(
                pushEnabled = notificationsViewModel.pushEnabled,
                isUpdating = notificationsViewModel.isUpdatingPushPreference,
                onToggle = { enabled ->
                    if (bearerToken != null) {
                        notificationsViewModel.updatePushPreference(enabled, bearerToken)
                    }
                },
            )

            if (!notificationsViewModel.isLoading && notificationsViewModel.items.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 20.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = NotificationCardBg),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp, horizontal = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Filled.NotificationsOff,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.34f),
                                modifier = Modifier.size(36.dp),
                            )
                            Text(
                                text = "No notifications",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = NotificationText,
                            )
                            Text(
                                text = if (notificationsViewModel.selectedFilter == NotificationsFilter.Unread) {
                                    "You're all caught up!"
                                } else {
                                    "You'll see notifications here"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.56f),
                            )
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
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

        if (notificationsViewModel.isLoading) {
            NotificationLoadingOverlay()
        }

        noticeMessage?.let { message ->
            NotificationNoticeDialog(
                message = message,
                onDismiss = {
                    noticeMessage = null
                    if (AppSessionViewModel.shouldForceLogoutAfterSensitiveAuthAlert(message)) {
                        sessionViewModel.forceLogout(message)
                    }
                },
            )
        }
    }
}

@Composable
private fun NotificationsTopBar(
    unreadCount: Int,
    canMarkAllRead: Boolean,
    onBack: () -> Unit,
    onMarkAllRead: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.width(76.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(38.dp)
                    .background(Color.White.copy(alpha = 0.07f), CircleShape),
            ) {
                Icon(
                    imageVector = Icons.Filled.ChevronLeft,
                    contentDescription = "Back",
                    tint = Color.White,
                )
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = "Notifications",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = NotificationText,
            )
            if (unreadCount > 0) {
                Text(
                    text = "$unreadCount unread",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.64f),
                )
            }
        }

        Box(
            modifier = Modifier.width(76.dp),
            contentAlignment = Alignment.CenterEnd,
        ) {
            if (canMarkAllRead) {
                TextButton(onClick = onMarkAllRead) {
                    Text(
                        text = "Mark all",
                        color = NotificationGold,
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                    )
                }
            }
        }
    }
    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
}

@Composable
private fun NotificationsFilterBar(
    selectedFilter: NotificationsFilter,
    unreadCount: Int,
    onSelect: (NotificationsFilter) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        NotificationsFilterButton(
            label = "All",
            selected = selectedFilter == NotificationsFilter.All,
            onClick = { onSelect(NotificationsFilter.All) },
            modifier = Modifier.weight(1f),
        )
        val unreadLabel = if (unreadCount > 0) "Unread ($unreadCount)" else "Unread"
        NotificationsFilterButton(
            label = unreadLabel,
            selected = selectedFilter == NotificationsFilter.Unread,
            onClick = { onSelect(NotificationsFilter.Unread) },
            modifier = Modifier.weight(1f),
        )
    }
    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
}

@Composable
private fun NotificationsFilterButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor by animateColorAsState(
        targetValue = if (selected) NotificationGold else Color.White.copy(alpha = 0.05f),
        animationSpec = tween(durationMillis = 180),
        label = "notificationFilterContainerColor",
    )
    val contentColor by animateColorAsState(
        targetValue = if (selected) Color.Black else Color.White.copy(alpha = 0.78f),
        animationSpec = tween(durationMillis = 180),
        label = "notificationFilterContentColor",
    )
    val pillScale by animateFloatAsState(
        targetValue = if (selected) 1f else 0.97f,
        animationSpec = spring(dampingRatio = 0.78f, stiffness = 520f),
        label = "notificationFilterScale",
    )

    Button(
        onClick = onClick,
        modifier = modifier
            .height(36.dp)
            .scale(pillScale),
        shape = RoundedCornerShape(999.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (selected) Color.Transparent else NotificationGold.copy(alpha = 0.22f),
        ),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
        )
    }
}

@Composable
private fun NotificationsPushBar(
    pushEnabled: Boolean,
    isUpdating: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = "Push Notifications",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = NotificationText,
            )
            Text(
                text = if (pushEnabled) "Enabled" else "Disabled",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.58f),
            )
        }
        Switch(
            checked = pushEnabled,
            onCheckedChange = onToggle,
            enabled = !isUpdating,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.Black,
                checkedTrackColor = NotificationGold,
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = Color.White.copy(alpha = 0.32f),
            ),
        )
    }
    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
}

@Composable
private fun NotificationCard(
    item: AppNotification,
    onTap: () -> Unit,
    onMarkRead: () -> Unit,
    onDelete: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val cardScale by animateFloatAsState(
        targetValue = if (pressed) 0.985f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "notificationCardScale",
    )
    val cardElevation by animateDpAsState(
        targetValue = if (pressed) 2.dp else 6.dp,
        animationSpec = tween(durationMillis = 120),
        label = "notificationCardElevation",
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .scale(cardScale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onTap,
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (item.is_read) Color.White.copy(alpha = 0.05f) else NotificationGold.copy(alpha = 0.10f),
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (item.is_read) Color.White.copy(alpha = 0.10f) else NotificationGold.copy(alpha = 0.32f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = cardElevation),
    ) {
        Box {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color.White.copy(alpha = 0.08f), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = iconForType(item.type),
                            contentDescription = null,
                            tint = NotificationGold,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = item.title,
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = NotificationText,
                        )
                        Text(
                            text = item.message,
                            style = MaterialTheme.typography.bodySmall,
                            color = NotificationSecondaryText,
                            maxLines = 2,
                        )
                        Text(
                            text = relativeTimeText(item.created_at),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.50f),
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (!item.is_read) {
                        Button(
                            onClick = onMarkRead,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White.copy(alpha = 0.08f),
                                contentColor = Color.White,
                            ),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Check,
                                    contentDescription = null,
                                    modifier = Modifier.size(13.dp),
                                )
                                Text(
                                    text = "Mark as read",
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                            }
                        }
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }

                    Button(
                        onClick = onDelete,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF6B6B).copy(alpha = 0.10f),
                            contentColor = Color(0xFFFF9A9A),
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Delete,
                            contentDescription = "Delete",
                            modifier = Modifier.size(13.dp),
                        )
                    }
                }
            }

            if (!item.is_read) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                        .size(8.dp)
                        .background(NotificationGold, CircleShape),
                )
            }
        }
    }
}

@Composable
private fun NotificationLoadingOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.42f)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = NotificationCardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, NotificationGold.copy(alpha = 0.30f)),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = NotificationGold,
                )
                Text(
                    text = "Loading notifications...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = NotificationText,
                )
            }
        }
    }
}

@Composable
private fun NotificationNoticeDialog(
    message: String,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NotificationCardBg,
        titleContentColor = NotificationText,
        textContentColor = NotificationSecondaryText,
        title = {
            Text(
                text = "Notice",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            )
        },
        text = {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
            )
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK", color = NotificationGold)
            }
        },
    )
}

private fun iconForType(type: String): ImageVector {
    val normalized = type.lowercase()
    return when {
        normalized.contains("appointment_created") ||
            normalized.contains("appointment_confirmed") ||
            normalized.contains("appointment_completed") -> Icons.Filled.CalendarMonth

        normalized.contains("appointment_reminder") -> Icons.Filled.AccessTime
        else -> Icons.Filled.Notifications
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
