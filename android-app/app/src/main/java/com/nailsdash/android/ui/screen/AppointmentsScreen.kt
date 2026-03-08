package com.nailsdash.android.ui.screen

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
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.ui.state.AppointmentSegment
import com.nailsdash.android.ui.state.AppointmentsViewModel
import com.nailsdash.android.ui.state.AppSessionViewModel

@Composable
fun AppointmentsScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenAppointment: (appointmentId: Int) -> Unit = {},
    appointmentsViewModel: AppointmentsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    LaunchedEffect(bearerToken) {
        if (bearerToken != null) {
            appointmentsViewModel.load(bearerToken)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("My Appointments", style = MaterialTheme.typography.headlineSmall)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AppointmentSegment.entries.forEach { segment ->
                val label = if (segment == AppointmentSegment.Upcoming) {
                    "${segment.label} (${appointmentsViewModel.upcomingCount()})"
                } else {
                    segment.label
                }
                AssistChip(
                    onClick = { appointmentsViewModel.selectedSegment = segment },
                    label = { Text(label) },
                )
            }
        }

        appointmentsViewModel.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        if (appointmentsViewModel.isLoading && appointmentsViewModel.items.isEmpty()) {
            CircularProgressIndicator()
        }

        val displayItems = appointmentsViewModel.filteredItems()
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(displayItems, key = { it.id }) { appointment ->
                AppointmentCard(
                    item = appointment,
                    onOpenAppointment = onOpenAppointment,
                )
            }
        }

        if (!appointmentsViewModel.isLoading && displayItems.isEmpty()) {
            Text("No appointments in this section.")
        }
    }
}

@Composable
private fun AppointmentCard(
    item: Appointment,
    onOpenAppointment: (appointmentId: Int) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenAppointment(item.id) },
        shape = RoundedCornerShape(14.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(item.store_name ?: "Store #${item.store_id}", style = MaterialTheme.typography.titleMedium)
            Text(item.service_name ?: "Service #${item.service_id}", style = MaterialTheme.typography.bodyMedium)
            Text("${item.appointment_date} ${item.appointment_time}", style = MaterialTheme.typography.bodySmall)
            Text("Status: ${item.status}", style = MaterialTheme.typography.bodySmall)
            item.order_number?.let { Text("Order: $it", style = MaterialTheme.typography.labelSmall) }
        }
    }
}
