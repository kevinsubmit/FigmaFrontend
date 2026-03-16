package com.nailsdash.android.ui.screen

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.AppointmentDetailViewModel
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay

private enum class AppointmentDetailActionSheet {
    Cancel,
    Reschedule,
}

private data class AppointmentDetailToast(
    val id: Long,
    val message: String,
    val isError: Boolean,
)

private val DetailGold = Color(0xFFD4AF37)
private val DetailPageBackground = Color(0xFF000000)
private val DetailCardBackground = Color(0xFF141414)
private val DetailPrimaryText = Color.White
private val DetailSecondaryText = Color.White.copy(alpha = 0.78f)
private val DetailMutedText = Color.White.copy(alpha = 0.65f)
private val DetailHairline = Color.White.copy(alpha = 0.08f)
private val DetailCardStroke = DetailGold.copy(alpha = 0.22f)
private val DetailPanelBackground = Color.White.copy(alpha = 0.04f)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentDetailScreen(
    appointmentId: Int,
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit,
    appointmentDetailViewModel: AppointmentDetailViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val context = LocalContext.current
    var mapTarget by remember(appointmentId) { mutableStateOf<AppointmentDetailMapTarget?>(null) }
    var activeSheet by remember(appointmentId) { mutableStateOf<AppointmentDetailActionSheet?>(null) }
    var toast by remember(appointmentId) { mutableStateOf<AppointmentDetailToast?>(null) }

    LaunchedEffect(bearerToken, appointmentId) {
        if (bearerToken != null) {
            appointmentDetailViewModel.load(
                bearerToken = bearerToken,
                appointmentId = appointmentId,
            )
        }
    }

    LaunchedEffect(appointmentDetailViewModel.successMessage) {
        if (!appointmentDetailViewModel.successMessage.isNullOrBlank()) {
            activeSheet = null
        }
    }

    LaunchedEffect(appointmentDetailViewModel.errorMessage) {
        val message = appointmentDetailViewModel.errorMessage?.trim().orEmpty()
        if (message.isEmpty()) return@LaunchedEffect
        val payload = AppointmentDetailToast(
            id = System.currentTimeMillis(),
            message = message,
            isError = true,
        )
        toast = payload
        delay(2200)
        if (toast?.id == payload.id) toast = null
    }

    LaunchedEffect(appointmentDetailViewModel.successMessage) {
        val message = appointmentDetailViewModel.successMessage?.trim().orEmpty()
        if (message.isEmpty()) return@LaunchedEffect
        val payload = AppointmentDetailToast(
            id = System.currentTimeMillis(),
            message = message,
            isError = false,
        )
        toast = payload
        delay(2200)
        if (toast?.id == payload.id) toast = null
    }

    val item = appointmentDetailViewModel.appointment
    val currentStatus = item?.status?.lowercase().orEmpty()
    val canManage = canManageAppointment(currentStatus)
    val disabledReason = actionDisabledReason(currentStatus)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DetailPageBackground),
    ) {
        Scaffold(
            containerColor = DetailPageBackground,
            topBar = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    TopAppBar(
                        title = {
                            Text(
                                "Appointment Details",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = DetailPrimaryText,
                            )
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color.Black.copy(alpha = 0.96f),
                            titleContentColor = DetailPrimaryText,
                            actionIconContentColor = DetailPrimaryText,
                        ),
                        actions = {
                            IconButton(
                                onClick = onBack,
                                modifier = Modifier
                                    .background(Color.White.copy(alpha = 0.08f), CircleShape),
                            ) {
                                Icon(Icons.Filled.Close, contentDescription = "Close")
                            }
                        },
                    )
                    HorizontalDivider(color = DetailHairline)
                }
            },
            bottomBar = {
                if (item != null) {
                    AppointmentDetailActionBar(
                        canManage = canManage,
                        isSubmitting = appointmentDetailViewModel.isSubmitting,
                        disabledReason = disabledReason,
                        onOpenReschedule = { activeSheet = AppointmentDetailActionSheet.Reschedule },
                        onOpenCancel = { activeSheet = AppointmentDetailActionSheet.Cancel },
                    )
                }
            },
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (item != null) {
                    val status = item.status.lowercase()
                    val statusColor = statusColor(status)
                    val storeDisplayName = item.store_name?.trim().takeUnless { it.isNullOrEmpty() } ?: "Store"

                    AppointmentDetailCardContainer {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "STATUS",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = DetailMutedText,
                            )
                            Text(
                                text = statusLabel(status),
                                color = statusColor,
                                style = MaterialTheme.typography.labelMedium,
                                modifier = Modifier
                                    .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(999.dp))
                                    .padding(horizontal = 10.dp, vertical = 4.dp),
                            )
                        }
                        Text(
                            storeDisplayName,
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = DetailPrimaryText,
                        )
                        Text(
                            item.service_name?.trim().takeUnless { it.isNullOrEmpty() } ?: "Service",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DetailSecondaryText,
                        )
                    }

                    AppointmentDetailCardContainer {
                        AppointmentDetailRow(
                            icon = Icons.Filled.CalendarMonth,
                            title = "DATE",
                            value = formatDate(item.appointment_date),
                        )
                        AppointmentDetailRow(
                            icon = Icons.Filled.AccessTime,
                            title = "TIME",
                            value = formatTime(item.appointment_time),
                        )
                        AppointmentDetailRow(
                            icon = Icons.Filled.Person,
                            title = "TECHNICIAN",
                            value = item.technician_name?.ifBlank { "Any technician" } ?: "Any technician",
                        )
                        item.order_number?.let {
                            AppointmentDetailRow(
                                icon = Icons.Filled.Storefront,
                                title = "ORDER",
                                value = "#$it",
                            )
                        }
                    }

                    val storeAddress = appointmentDetailViewModel.resolvedStoreAddress ?: item.store_address
                    storeAddress?.takeIf { it.isNotBlank() }?.let { address ->
                        AppointmentDetailCardContainer {
                            Text(
                                "LOCATION",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = DetailMutedText,
                            )
                            Text(
                                storeDisplayName,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = DetailPrimaryText,
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(
                                    Icons.Filled.LocationOn,
                                    contentDescription = null,
                                    tint = DetailGold,
                                )
                                Text(
                                    text = address,
                                    textDecoration = TextDecoration.Underline,
                                    color = DetailSecondaryText,
                                    modifier = Modifier.padding(start = 2.dp),
                                )
                            }
                            Button(
                                onClick = {
                                    mapTarget = AppointmentDetailMapTarget(
                                        address = address,
                                    )
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DetailGold,
                                    contentColor = Color.Black,
                                ),
                            ) {
                                Text("Open in Maps")
                            }
                        }
                    }

                    item.notes?.takeIf { it.isNotBlank() }?.let { notes ->
                        AppointmentDetailCardContainer {
                            Text(
                                "NOTES",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = DetailMutedText,
                            )
                            Text(
                                notes,
                                style = MaterialTheme.typography.bodyMedium,
                                color = DetailPrimaryText,
                            )
                        }
                    }

                    item.cancel_reason?.takeIf { it.isNotBlank() }?.let { reason ->
                        AppointmentDetailCardContainer {
                            Text(
                                "CANCEL REASON",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = Color(0xFFFF8A8A),
                            )
                            Text(
                                reason,
                                style = MaterialTheme.typography.bodyMedium,
                                color = DetailPrimaryText,
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item.service_price?.let {
                            AssistChip(
                                onClick = {},
                                enabled = false,
                                label = { Text("$${String.format(Locale.US, "%.2f", it)}") },
                                colors = AssistChipDefaults.assistChipColors(
                                    disabledContainerColor = DetailPanelBackground,
                                    disabledLabelColor = DetailGold,
                                ),
                            )
                        }
                        item.service_duration?.let {
                            AssistChip(
                                onClick = {},
                                enabled = false,
                                label = { Text("$it min") },
                                colors = AssistChipDefaults.assistChipColors(
                                    disabledContainerColor = DetailPanelBackground,
                                    disabledLabelColor = DetailSecondaryText,
                                ),
                            )
                        }
                    }
                }
            }
        }

        if (appointmentDetailViewModel.isLoading) {
            LoadingOverlay()
        }

        toast?.let { payload ->
            AppointmentDetailToastView(
                message = payload.message,
                isError = payload.isError,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 20.dp, start = 16.dp, end = 16.dp),
            )
        }
    }

    mapTarget?.let { target ->
        MapChooserBottomSheet(
            onDismiss = { mapTarget = null },
            onChoose = { option ->
                openMapWithOption(
                    context = context,
                    option = option,
                    address = target.address,
                )
                mapTarget = null
            },
        )
    }

    when (activeSheet) {
        AppointmentDetailActionSheet.Cancel -> {
            CancelAppointmentSheet(
                cancelReason = appointmentDetailViewModel.cancelReason,
                isSubmitting = appointmentDetailViewModel.isSubmitting,
                canCancel = canManage,
                disabledReason = disabledReason,
                onCancelReasonChange = { appointmentDetailViewModel.cancelReason = it },
                onDismiss = { activeSheet = null },
                onConfirm = {
                    if (bearerToken != null) {
                        appointmentDetailViewModel.cancel(bearerToken)
                    }
                },
            )
        }

        AppointmentDetailActionSheet.Reschedule -> {
            RescheduleAppointmentSheet(
                date = appointmentDetailViewModel.rescheduleDate,
                time = appointmentDetailViewModel.rescheduleTime,
                isSubmitting = appointmentDetailViewModel.isSubmitting,
                canReschedule = canManage,
                disabledReason = disabledReason,
                onDateChange = { appointmentDetailViewModel.rescheduleDate = it },
                onTimeChange = { appointmentDetailViewModel.rescheduleTime = it },
                onDismiss = { activeSheet = null },
                onConfirm = {
                    if (bearerToken != null) {
                        appointmentDetailViewModel.reschedule(bearerToken)
                    }
                },
            )
        }

        null -> Unit
    }
}

@Composable
private fun AppointmentDetailCardContainer(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DetailCardBackground),
        border = BorderStroke(1.dp, DetailCardStroke),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            DetailCardBackground,
                            Color.White.copy(alpha = 0.01f),
                        ),
                    ),
                )
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = content,
        )
    }
}

@Composable
private fun AppointmentDetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = DetailGold,
        )
        Text(
            "$title:",
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
            color = DetailMutedText,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = DetailPrimaryText,
        )
    }
}

@Composable
private fun LoadingOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.18f)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = DetailCardBackground),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(2.dp),
                    color = DetailGold,
                )
                Text(
                    "Loading...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = DetailPrimaryText,
                )
            }
        }
    }
}

@Composable
private fun AppointmentDetailToastView(
    message: String,
    isError: Boolean,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    if (isError) {
                        Color(0xFF5C2424)
                    } else {
                        DetailPanelBackground
                    },
                )
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (isError) Icons.Filled.Close else Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = if (isError) Color(0xFFFFC9C9) else DetailGold,
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isError) Color(0xFFFFDCDC) else DetailPrimaryText,
            )
        }
    }
}

@Composable
private fun AppointmentDetailActionBar(
    canManage: Boolean,
    isSubmitting: Boolean,
    disabledReason: String?,
    onOpenReschedule: () -> Unit,
    onOpenCancel: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f))
            .border(BorderStroke(1.dp, DetailHairline))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = disabledReason ?: "You can still reschedule or cancel before the cutoff.",
            style = MaterialTheme.typography.bodySmall,
            color = if (disabledReason == null) {
                DetailMutedText
            } else {
                Color(0xFFFF8A8A)
            },
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(
                onClick = onOpenReschedule,
                enabled = canManage && !isSubmitting,
                modifier = Modifier.weight(1f),
                border = BorderStroke(1.dp, DetailGold.copy(alpha = 0.28f)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = DetailPrimaryText),
            ) {
                Text("Reschedule")
            }
            Button(
                onClick = onOpenCancel,
                enabled = canManage && !isSubmitting,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF8A2E2E),
                    contentColor = DetailPrimaryText,
                ),
            ) {
                Text("Cancel")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RescheduleAppointmentSheet(
    date: String,
    time: String,
    isSubmitting: Boolean,
    canReschedule: Boolean,
    disabledReason: String?,
    onDateChange: (String) -> Unit,
    onTimeChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    val context = LocalContext.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.Black.copy(alpha = 0.96f),
        contentColor = DetailPrimaryText,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Reschedule",
                    style = MaterialTheme.typography.titleLarge,
                    color = DetailPrimaryText,
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.background(Color.White.copy(alpha = 0.08f), CircleShape),
                ) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", tint = DetailPrimaryText)
                }
            }
            Text(
                "Choose a new date and time for this appointment.",
                style = MaterialTheme.typography.bodyMedium,
                color = DetailMutedText,
            )

            OutlinedButton(
                onClick = {
                    showDatePickerDialog(
                        context = context,
                        initial = parsePickerDate(date),
                    ) { selected ->
                        onDateChange(selected.format(DateTimeFormatter.ISO_LOCAL_DATE))
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, DetailGold.copy(alpha = 0.22f)),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.CalendarMonth, contentDescription = null, tint = DetailGold)
                    Text(
                        "DATE: ${pickerDateLabel(date)}",
                        color = DetailPrimaryText,
                    )
                }
            }

            OutlinedButton(
                onClick = {
                    showTimePickerDialog(
                        context = context,
                        initial = parsePickerTime(time),
                    ) { selected ->
                        onTimeChange(selected.format(DateTimeFormatter.ofPattern("HH:mm", Locale.US)))
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, DetailGold.copy(alpha = 0.22f)),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.AccessTime, contentDescription = null, tint = DetailGold)
                    Text(
                        "TIME: ${pickerTimeLabel(time)}",
                        color = DetailPrimaryText,
                    )
                }
            }

            if (!disabledReason.isNullOrBlank()) {
                Text(
                    text = disabledReason,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFFF8A8A),
                )
            }

            Button(
                onClick = onConfirm,
                enabled = canReschedule && !isSubmitting,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = DetailGold,
                    contentColor = Color.Black,
                ),
            ) {
                Text(if (isSubmitting) "Submitting..." else "Save Time")
            }
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = DetailPrimaryText),
            ) {
                Text("Close")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CancelAppointmentSheet(
    cancelReason: String,
    isSubmitting: Boolean,
    canCancel: Boolean,
    disabledReason: String?,
    onCancelReasonChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.Black.copy(alpha = 0.96f),
        contentColor = DetailPrimaryText,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Cancel Appointment",
                    style = MaterialTheme.typography.titleLarge,
                    color = DetailPrimaryText,
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.background(Color.White.copy(alpha = 0.08f), CircleShape),
                ) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", tint = DetailPrimaryText)
                }
            }
            Text(
                "Add a reason if needed, then confirm cancellation.",
                style = MaterialTheme.typography.bodyMedium,
                color = DetailMutedText,
            )

            OutlinedTextField(
                value = cancelReason,
                onValueChange = onCancelReasonChange,
                label = { Text("Cancel reason (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 4,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = DetailPanelBackground,
                    unfocusedContainerColor = DetailPanelBackground,
                    focusedBorderColor = DetailGold.copy(alpha = 0.22f),
                    unfocusedBorderColor = DetailGold.copy(alpha = 0.18f),
                    focusedTextColor = DetailPrimaryText,
                    unfocusedTextColor = DetailPrimaryText,
                    focusedLabelColor = DetailMutedText,
                    unfocusedLabelColor = DetailMutedText,
                    cursorColor = DetailGold,
                ),
            )

            if (!disabledReason.isNullOrBlank()) {
                Text(
                    text = disabledReason,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFFF8A8A),
                )
            }

            Button(
                onClick = onConfirm,
                enabled = canCancel && !isSubmitting,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF8A2E2E),
                    contentColor = DetailPrimaryText,
                ),
            ) {
                Text(if (isSubmitting) "Submitting..." else "Cancel Booking")
            }
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = DetailPrimaryText),
            ) {
                Text("Close")
            }
        }
    }
}

private fun showDatePickerDialog(
    context: Context,
    initial: LocalDate,
    onSelected: (LocalDate) -> Unit,
) {
    DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            onSelected(LocalDate.of(year, month + 1, dayOfMonth))
        },
        initial.year,
        initial.monthValue - 1,
        initial.dayOfMonth,
    ).show()
}

private fun showTimePickerDialog(
    context: Context,
    initial: LocalTime,
    onSelected: (LocalTime) -> Unit,
) {
    TimePickerDialog(
        context,
        { _, hourOfDay, minute ->
            onSelected(LocalTime.of(hourOfDay, minute))
        },
        initial.hour,
        initial.minute,
        false,
    ).show()
}

private fun parsePickerDate(raw: String): LocalDate {
    return runCatching {
        LocalDate.parse(raw.trim())
    }.getOrElse { LocalDate.now() }
}

private fun parsePickerTime(raw: String): LocalTime {
    val value = raw.trim()
    if (value.isBlank()) return LocalTime.now().withSecond(0).withNano(0)
    return runCatching {
        LocalTime.parse(value)
    }.getOrElse {
        LocalTime.now().withSecond(0).withNano(0)
    }
}

private fun pickerDateLabel(raw: String): String {
    val value = raw.trim()
    if (value.isBlank()) return "Select date"
    return runCatching {
        LocalDate.parse(value).format(DateTimeFormatter.ofPattern("EEE, MMM d, yyyy", Locale.US))
    }.getOrElse { value }
}

private fun pickerTimeLabel(raw: String): String {
    val value = raw.trim()
    if (value.isBlank()) return "Select time"
    return runCatching {
        LocalTime.parse(value).format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
    }.getOrElse { value }
}

private fun canManageAppointment(status: String): Boolean {
    return status != "cancelled" && status != "completed"
}

private fun actionDisabledReason(status: String): String? {
    return when (status) {
        "cancelled" -> "This appointment is already cancelled."
        "completed" -> "Completed appointments can't be changed."
        else -> null
    }
}

private fun statusLabel(raw: String): String {
    return raw.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
}

private fun statusColor(raw: String): Color {
    return when (raw.lowercase()) {
        "pending" -> Color(0xFFFFC107)
        "confirmed" -> Color(0xFF4CAF50)
        "completed" -> Color(0xFF42A5F5)
        "cancelled" -> Color(0xFFEF5350)
        "expired" -> Color(0xFF9E9E9E)
        else -> Color(0xFFFF9800)
    }
}

private fun formatDate(raw: String): String {
    return runCatching {
        val date = LocalDate.parse(raw)
        date.format(DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US))
    }.getOrElse { raw }
}

private fun formatTime(raw: String): String {
    val normalized = when {
        raw.length >= 8 -> raw.take(8)
        raw.length == 5 -> "$raw:00"
        else -> raw
    }
    return runCatching {
        val time = LocalTime.parse(normalized)
        time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
    }.getOrElse { raw }
}

private data class AppointmentDetailMapTarget(
    val address: String,
)
