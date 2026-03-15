package com.nailsdash.android.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EventBusy
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.AttachMoney
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.AppointmentSegment
import com.nailsdash.android.ui.state.AppointmentsViewModel
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val AppointmentsGold = Color(0xFFD4AF37)
private val AppointmentsPageBackground = Color(0xFF000000)
private val AppointmentsCardBackground = Color(0xFF141414)
private val AppointmentsPrimaryText = Color.White
private val AppointmentsSecondaryText = Color.White.copy(alpha = 0.72f)
private val AppointmentsMutedText = Color.White.copy(alpha = 0.62f)
private val AppointmentsHairline = Color.White.copy(alpha = 0.08f)
private val AppointmentsPanelBackground = Color.White.copy(alpha = 0.03f)

@Composable
fun AppointmentsScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenAppointment: (appointmentId: Int) -> Unit = {},
    onOpenBook: () -> Unit = {},
    appointmentsViewModel: AppointmentsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val context = LocalContext.current
    var mapTarget by remember { mutableStateOf<AppointmentsMapTarget?>(null) }
    var noticeMessage by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) {
            appointmentsViewModel.load(bearerToken)
        }
    }
    LaunchedEffect(appointmentsViewModel.errorMessage) {
        val message = appointmentsViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    val displayItems = appointmentsViewModel.filteredItems()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppointmentsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            AppointmentsHeader(
                selectedSegment = appointmentsViewModel.selectedSegment,
                upcomingCount = appointmentsViewModel.upcomingCount(),
                onSelectSegment = { appointmentsViewModel.selectedSegment = it },
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(start = 16.dp, top = 10.dp, end = 16.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                appointmentsViewModel.errorMessage
                    ?.trim()
                    ?.takeIf { it.isNotEmpty() }
                    ?.let { message ->
                        Text(
                            text = message,
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                            color = Color.Red.copy(alpha = 0.9f),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 2.dp),
                        )
                    }

                if (!appointmentsViewModel.isLoading && displayItems.isEmpty()) {
                    EmptyAppointmentsState(
                        isUpcoming = appointmentsViewModel.selectedSegment == AppointmentSegment.Upcoming,
                        onBookNow = onOpenBook,
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(displayItems, key = { it.id }) { appointment ->
                            val displayAddress = resolvedStoreAddress(
                                item = appointment,
                                storeAddressByStoreId = appointmentsViewModel.storeAddressByStoreId,
                            )
                            AppointmentCard(
                                item = appointment,
                                resolvedStoreAddress = displayAddress,
                                onOpenAppointment = onOpenAppointment,
                                onOpenMaps = { storeName, address ->
                                    mapTarget = AppointmentsMapTarget(
                                        placeTitle = storeName?.trim()?.takeIf { it.isNotBlank() } ?: "Store",
                                        address = address,
                                    )
                                },
                            )
                        }
                    }
                }
            }
        }

        if (appointmentsViewModel.isLoading) {
            AppointmentsLoadingOverlay()
        }
    }

    mapTarget?.let { target ->
        MapChooserBottomSheet(
            placeTitle = target.placeTitle,
            onDismiss = { mapTarget = null },
            onChoose = { option ->
                openMapWithOption(
                    context = context,
                    option = option,
                    placeTitle = target.placeTitle,
                    address = target.address,
                )
                mapTarget = null
            },
        )
    }

    noticeMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { noticeMessage = null },
            properties = DialogProperties(
                dismissOnBackPress = false,
                dismissOnClickOutside = false,
            ),
            confirmButton = {
                TextButton(
                    onClick = {
                        noticeMessage = null
                        if (AppSessionViewModel.shouldForceLogoutAfterSensitiveAuthAlert(message)) {
                            sessionViewModel.forceLogout(message)
                        }
                    },
                ) {
                    Text("OK")
                }
            },
            title = { Text("Message") },
            text = { Text(message) },
        )
    }
}

@Composable
private fun AppointmentsHeader(
    selectedSegment: AppointmentSegment,
    upcomingCount: Int,
    onSelectSegment: (AppointmentSegment) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f))
            .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 6.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = "My Appointments",
            style = MaterialTheme.typography.headlineLarge.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 30.sp,
            ),
            color = AppointmentsPrimaryText,
        )
        Text(
            text = "Manage upcoming and past bookings",
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
            color = AppointmentsMutedText,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp)
                .background(
                    color = Color.White.copy(alpha = 0.04f),
                    shape = RoundedCornerShape(12.dp),
                )
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            AppointmentSegment.entries.forEach { segment ->
                val selected = selectedSegment == segment
                val count = if (segment == AppointmentSegment.Upcoming) upcomingCount else null
                AppointmentSegmentButton(
                    label = segment.label,
                    count = count,
                    selected = selected,
                    onClick = { onSelectSegment(segment) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
    HorizontalDivider(color = AppointmentsHairline)
}

@Composable
private fun AppointmentSegmentButton(
    label: String,
    count: Int?,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember(label) { MutableInteractionSource() }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(
                if (selected) AppointmentsGold else Color.Transparent,
                RoundedCornerShape(10.dp),
            )
            .border(
                width = 1.dp,
                color = if (selected) Color.Transparent else AppointmentsGold.copy(alpha = 0.24f),
                shape = RoundedCornerShape(10.dp),
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            )
            .heightIn(min = 40.dp)
            .padding(horizontal = 10.dp, vertical = 9.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
            ),
            color = if (selected) Color(0xFF1A1A1A) else Color.White.copy(alpha = 0.86f),
        )
        if (count != null && count > 0) {
            Box(
                modifier = Modifier
                    .padding(start = 6.dp)
                    .background(
                        color = if (selected) {
                            Color.Black.copy(alpha = 0.14f)
                        } else {
                            Color.White.copy(alpha = 0.10f)
                        },
                        shape = RoundedCornerShape(999.dp),
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) {
                Text(
                    text = count.toString(),
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = if (selected) Color.Black else Color.White.copy(alpha = 0.88f),
                )
            }
        }
    }
}

@Composable
private fun EmptyAppointmentsState(
    isUpcoming: Boolean,
    onBookNow: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 10.dp, top = 56.dp, end = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .width(64.dp)
                .height(64.dp)
                .background(
                    color = Color.White.copy(alpha = 0.05f),
                    shape = CircleShape,
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.12f),
                    shape = CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.EventBusy,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.66f),
                modifier = Modifier.size(26.dp),
            )
        }
        Text(
            text = if (isUpcoming) "No upcoming appointments" else "No past appointments",
            style = MaterialTheme.typography.bodyMedium.copy(
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
            ),
            color = AppointmentsSecondaryText,
        )
        if (isUpcoming) {
            val bookNowInteraction = remember { MutableInteractionSource() }
            Box(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(AppointmentsGold)
                    .clickable(
                        interactionSource = bookNowInteraction,
                        indication = null,
                        onClick = onBookNow,
                    )
                    .heightIn(min = 46.dp)
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Book Now",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = Color.Black,
                )
            }
        }
    }
}

@Composable
private fun AppointmentCard(
    item: Appointment,
    resolvedStoreAddress: String?,
    onOpenAppointment: (appointmentId: Int) -> Unit,
    onOpenMaps: (storeName: String?, address: String) -> Unit,
) {
    val isUpcoming = isUpcomingAppointment(item)
    val isPast = !isUpcoming
    val status = effectiveStatus(item)
    val statusColor = statusColor(status)
    val cardShape = RoundedCornerShape(18.dp)
    val cardTapInteraction = remember(item.id) { MutableInteractionSource() }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(if (isPast) 0.72f else 1f),
    ) {
        Card(
            shape = cardShape,
            colors = CardDefaults.cardColors(containerColor = AppointmentsCardBackground),
            border = BorderStroke(
                width = 1.dp,
                color = AppointmentsGold.copy(alpha = if (isPast) 0.12f else 0.2f),
            ),
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    enabled = isUpcoming,
                    interactionSource = cardTapInteraction,
                    indication = null,
                ) { onOpenAppointment(item.id) },
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                AppointmentsCardBackground,
                                Color.White.copy(alpha = 0.01f),
                            ),
                        ),
                    )
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = statusLabel(status),
                        color = statusColor,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        modifier = Modifier
                            .background(statusColor.copy(alpha = 0.14f), RoundedCornerShape(999.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                    )
                    if (isUpcoming) {
                        Icon(
                            imageVector = Icons.Filled.ChevronRight,
                            contentDescription = "Open",
                            tint = Color.White.copy(alpha = 0.75f),
                            modifier = Modifier.size(12.dp),
                        )
                    }
                }

                AppointmentInfoBlock {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(
                            Icons.Filled.Storefront,
                            contentDescription = null,
                            tint = AppointmentsGold.copy(alpha = 0.95f),
                            modifier = Modifier.size(12.dp),
                        )
                        Text(
                            text = item.store_name ?: "Store #${item.store_id}",
                            style = MaterialTheme.typography.titleMedium,
                            color = AppointmentsPrimaryText,
                        )
                    }
                    resolvedStoreAddress?.let { address ->
                        val addressInteraction = remember(item.id, address) { MutableInteractionSource() }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(
                                Icons.Outlined.LocationOn,
                                contentDescription = null,
                                tint = AppointmentsGold,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                text = address,
                                style = MaterialTheme.typography.bodySmall,
                                color = AppointmentsSecondaryText,
                                textDecoration = TextDecoration.Underline,
                                modifier = Modifier.clickable(
                                    interactionSource = addressInteraction,
                                    indication = null,
                                ) { onOpenMaps(item.store_name, address) },
                            )
                        }
                    }
                }

                AppointmentInfoBlock {
                    val technicianName = item.technician_name
                        ?.trim()
                        ?.takeIf { it.isNotEmpty() }
                    val technicianText = technicianName ?: "Any technician"
                    val technicianIcon = if (technicianName != null) {
                        Icons.Outlined.Person
                    } else {
                        Icons.AutoMirrored.Outlined.HelpOutline
                    }
                    val technicianTextColor = if (technicianName != null) {
                        AppointmentsSecondaryText
                    } else {
                        Color.White.copy(alpha = 0.58f)
                    }

                    Text(
                        text = item.service_name ?: "Service #${item.service_id}",
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = AppointmentsPrimaryText,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item.order_amount?.let { amount ->
                            AppointmentMetaTag(
                                icon = Icons.Outlined.AttachMoney,
                                text = "$${String.format(Locale.US, "%.2f", amount)}",
                                textColor = AppointmentsGold,
                            )
                        }
                        item.service_duration?.let { duration ->
                            AppointmentMetaTag(
                                icon = Icons.Outlined.AccessTime,
                                text = "$duration min",
                                textColor = AppointmentsSecondaryText,
                            )
                        }
                    }
                    AppointmentMetaTag(
                        icon = technicianIcon,
                        text = technicianText,
                        textColor = technicianTextColor,
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppointmentPill(icon = Icons.Outlined.CalendarMonth, value = formatDate(item.appointment_date))
                    AppointmentPill(icon = Icons.Outlined.AccessTime, value = formatTime(item.appointment_time))
                }
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .height(1.dp)
                .background(
                    AppointmentsGold.copy(alpha = if (isPast) 0.22f else 0.34f),
                ),
        )
        Box(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 6.dp)
                .width(3.dp)
                .height(28.dp)
                .background(statusColor.copy(alpha = 0.95f), RoundedCornerShape(999.dp)),
        )
    }
}

@Composable
private fun AppointmentInfoBlock(
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(AppointmentsPanelBackground, RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        content = content,
    )
}

@Composable
private fun AppointmentMetaTag(
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    text: String,
    textColor: Color,
) {
    Row(
        modifier = Modifier
            .background(
                color = Color.White.copy(alpha = 0.04f),
                shape = RoundedCornerShape(999.dp),
            )
            .padding(horizontal = 10.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = textColor,
                modifier = Modifier.size(12.dp),
            )
        }
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = textColor,
        )
    }
}

@Composable
private fun AppointmentPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.9f),
            modifier = Modifier.size(12.dp),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodySmall,
            color = AppointmentsPrimaryText,
        )
    }
}

@Composable
private fun AppointmentsLoadingOverlay() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = AppointmentsCardBackground.copy(alpha = 0.96f)),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = AppointmentsGold,
                )
                Text(
                    "Loading...",
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = AppointmentsMutedText,
                )
            }
        }
    }
}

private fun isUpcomingAppointment(item: Appointment): Boolean {
    val status = item.status.lowercase()
    if (status == "cancelled" || status == "completed") return false

    val dateTime = parseAppointmentDateTime(
        appointmentDate = item.appointment_date,
        appointmentTime = item.appointment_time,
    ) ?: return false
    return dateTime >= LocalDateTime.now()
}

private fun effectiveStatus(item: Appointment): String {
    val raw = item.status.lowercase()
    if (!isUpcomingAppointment(item) && (raw == "pending" || raw == "confirmed")) {
        return "expired"
    }
    return raw
}

private fun statusLabel(raw: String): String {
    if (raw == "expired") return "Expired"
    return raw.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
}

private fun statusColor(raw: String): Color {
    return when (raw.lowercase()) {
        "pending" -> Color(0xFFFFCC00)
        "confirmed" -> Color(0xFF34C759)
        "completed" -> Color(0xFF0A84FF)
        "cancelled" -> Color(0xFFFF3B30)
        "expired" -> Color(0xFF8E8E93)
        else -> Color(0xFFFF9500)
    }
}

private fun formatDate(raw: String): String {
    return runCatching {
        LocalDate.parse(raw).format(DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US))
    }.getOrElse { raw }
}

private fun formatTime(raw: String): String {
    val normalized = when {
        raw.length >= 8 -> raw.take(8)
        raw.length == 5 -> "$raw:00"
        else -> raw
    }
    return runCatching {
        LocalTime.parse(normalized).format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
    }.getOrElse { raw }
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

private fun resolvedStoreAddress(
    item: Appointment,
    storeAddressByStoreId: Map<Int, String>,
): String? {
    val mapped = storeAddressByStoreId[item.store_id]?.trim()
    if (!mapped.isNullOrEmpty()) return mapped

    val fallback = item.store_address?.trim()
    if (!fallback.isNullOrEmpty()) return fallback

    return null
}

private data class AppointmentsMapTarget(
    val placeTitle: String,
    val address: String,
)
