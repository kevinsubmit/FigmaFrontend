package com.nailsdash.android.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.AppointmentDetailViewModel

@Composable
fun AppointmentDetailScreen(
    appointmentId: Int,
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit,
    appointmentDetailViewModel: AppointmentDetailViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()

    LaunchedEffect(bearerToken, appointmentId) {
        if (bearerToken != null) {
            appointmentDetailViewModel.load(
                bearerToken = bearerToken,
                appointmentId = appointmentId,
            )
        }
    }

    val item = appointmentDetailViewModel.appointment

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Appointment Detail", style = MaterialTheme.typography.headlineSmall)
            Button(onClick = onBack) {
                Text("Back")
            }
        }

        if (appointmentDetailViewModel.isLoading && item == null) {
            CircularProgressIndicator()
        }

        if (item != null) {
            Text(item.store_name ?: "Store #${item.store_id}", style = MaterialTheme.typography.titleLarge)
            Text(item.service_name ?: "Service #${item.service_id}", style = MaterialTheme.typography.titleMedium)
            Text("Date: ${item.appointment_date}")
            Text("Time: ${item.appointment_time}")
            Text("Status: ${item.status}")
            item.order_number?.let { Text("Order: $it") }
            item.technician_name?.let { Text("Technician: $it") }
            appointmentDetailViewModel.resolvedStoreAddress?.let { Text("Address: $it") }
            item.notes?.takeIf { it.isNotBlank() }?.let { Text("Notes: $it") }
            item.cancel_reason?.takeIf { it.isNotBlank() }?.let { Text("Cancel reason: $it") }

            OutlinedTextField(
                value = appointmentDetailViewModel.cancelReason,
                onValueChange = { appointmentDetailViewModel.cancelReason = it },
                label = { Text("Cancel reason (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = {
                    if (bearerToken != null) {
                        appointmentDetailViewModel.cancel(bearerToken)
                    }
                },
                enabled = !appointmentDetailViewModel.isSubmitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (appointmentDetailViewModel.isSubmitting) "Submitting..." else "Cancel Appointment")
            }

            OutlinedTextField(
                value = appointmentDetailViewModel.rescheduleDate,
                onValueChange = { appointmentDetailViewModel.rescheduleDate = it },
                label = { Text("New date (yyyy-MM-dd)") },
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = appointmentDetailViewModel.rescheduleTime,
                onValueChange = { appointmentDetailViewModel.rescheduleTime = it },
                label = { Text("New time (HH:mm)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = {
                    if (bearerToken != null) {
                        appointmentDetailViewModel.reschedule(bearerToken)
                    }
                },
                enabled = !appointmentDetailViewModel.isSubmitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (appointmentDetailViewModel.isSubmitting) "Submitting..." else "Reschedule Appointment")
            }
        }

        appointmentDetailViewModel.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        appointmentDetailViewModel.successMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.primary)
        }
    }
}
