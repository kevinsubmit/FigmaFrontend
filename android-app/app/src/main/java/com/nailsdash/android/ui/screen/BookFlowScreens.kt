package com.nailsdash.android.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.BookAppointmentViewModel
import com.nailsdash.android.ui.state.BookingStyleReference
import com.nailsdash.android.ui.state.StoreDetailViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun StoreDetailScreen(
    storeId: Int,
    sessionViewModel: AppSessionViewModel,
    onBookNow: (storeId: Int, preselectedServiceId: Int?) -> Unit,
    storeDetailViewModel: StoreDetailViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val styleReference = sessionViewModel.bookingStyleReference

    LaunchedEffect(storeId, bearerToken) {
        storeDetailViewModel.loadStore(storeId = storeId, bearerToken = bearerToken)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Step 02 - Book Services", style = MaterialTheme.typography.headlineSmall)
        }

        if (styleReference != null) {
            item {
                BookingStyleReferenceCard(
                    reference = styleReference,
                    onClear = { sessionViewModel.clearBookingStyleReference() },
                )
            }
        }

        val store = storeDetailViewModel.store
        if (store != null) {
            item {
                Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(store.name, style = MaterialTheme.typography.titleLarge)
                        Text(store.formattedAddress, style = MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${storeDetailViewModel.ratingText()} ★")
                            Text(storeDetailViewModel.reviewCountText())
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    if (bearerToken != null) {
                                        storeDetailViewModel.toggleFavorite(store.id, bearerToken)
                                    } else {
                                        sessionViewModel.updateAuthMessage("Please sign in to save favorites.")
                                    }
                                },
                                enabled = !storeDetailViewModel.isFavoriteLoading,
                            ) {
                                Text(if (storeDetailViewModel.isFavorited) "Favorited" else "Favorite")
                            }
                            Button(
                                onClick = {
                                    onBookNow(store.id, storeDetailViewModel.selectedServiceId)
                                },
                            ) {
                                Text("Book Now")
                            }
                        }
                    }
                }
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(storeDetailViewModel.visibleTabs()) { tab ->
                        AssistChip(
                            onClick = { storeDetailViewModel.pickTab(tab) },
                            label = { Text(tab) },
                        )
                    }
                }
            }

            when (storeDetailViewModel.currentTabLabel()) {
                "Services" -> {
                    items(storeDetailViewModel.services, key = { it.id }) { service ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    storeDetailViewModel.selectService(service.id)
                                },
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(service.name, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "$${String.format(Locale.US, "%.2f", service.price)} • ${service.duration_minutes} min",
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                if (storeDetailViewModel.selectedServiceId == service.id) {
                                    Text(
                                        "Selected for booking",
                                        color = MaterialTheme.colorScheme.primary,
                                        style = MaterialTheme.typography.labelMedium,
                                    )
                                }
                            }
                        }
                    }
                }

                "Reviews" -> {
                    if (storeDetailViewModel.reviews.isEmpty()) {
                        item { Text("No reviews yet.") }
                    }
                    items(storeDetailViewModel.reviews, key = { it.id }) { review ->
                        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text("${review.rating} ★")
                                Text(review.comment ?: "")
                                review.user_name?.let { Text(it, style = MaterialTheme.typography.labelSmall) }
                            }
                        }
                    }
                }

                "Portfolio" -> {
                    if (storeDetailViewModel.portfolio.isEmpty()) {
                        item { Text("No portfolio images yet.") }
                    }
                    items(storeDetailViewModel.portfolio, key = { it.id }) { row ->
                        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(row.title ?: "Portfolio #${row.id}")
                                Text(row.description ?: "")
                                Text(row.image_url, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }

                else -> {
                    item {
                        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                store.phone?.let { Text("Phone: $it") }
                                store.email?.let { Text("Email: $it") }
                                store.description?.let { Text(it) }
                                if (storeDetailViewModel.storeHours.isNotEmpty()) {
                                    Text("Business Hours", style = MaterialTheme.typography.titleMedium)
                                    storeDetailViewModel.storeHours.sortedBy { it.day_of_week }.forEach { hour ->
                                        Text("${dayLabel(hour.day_of_week)}: ${hour.open_time ?: "-"} - ${hour.close_time ?: "-"}")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (storeDetailViewModel.isLoading && store == null) {
            item { CircularProgressIndicator() }
        }

        storeDetailViewModel.errorMessage?.let { message ->
            item {
                Text(message, color = MaterialTheme.colorScheme.error)
            }
        }

        item {
            Button(
                onClick = {
                    onBookNow(storeId, storeDetailViewModel.selectedServiceId)
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Book This Store")
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BookAppointmentScreen(
    storeId: Int,
    preselectedServiceId: Int?,
    sessionViewModel: AppSessionViewModel,
    onBookSuccess: () -> Unit,
    bookAppointmentViewModel: BookAppointmentViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val styleReference = sessionViewModel.bookingStyleReference
    var autoInjectedReferenceNote by remember(storeId) { mutableStateOf<String?>(null) }
    var showBookingSuccessOverlay by remember(storeId) { mutableStateOf(false) }
    var isTransitioningAfterSuccess by remember(storeId) { mutableStateOf(false) }
    val uiScope = rememberCoroutineScope()

    LaunchedEffect(storeId, preselectedServiceId) {
        bookAppointmentViewModel.loadData(storeId = storeId, preselectedServiceId = preselectedServiceId)
    }

    LaunchedEffect(styleReference?.pinId) {
        val current = bookAppointmentViewModel.notes.trim()
        if (styleReference == null) {
            if (autoInjectedReferenceNote != null && current == autoInjectedReferenceNote) {
                bookAppointmentViewModel.notes = ""
            }
            autoInjectedReferenceNote = null
            return@LaunchedEffect
        }

        val nextNote = styleReference.noteText
        if (current.isEmpty() || (autoInjectedReferenceNote != null && current == autoInjectedReferenceNote)) {
            bookAppointmentViewModel.notes = nextNote
            autoInjectedReferenceNote = nextNote
        }
    }

    val dateCandidates = remember(bookAppointmentViewModel.activeZoneId) {
        val today = LocalDate.now(bookAppointmentViewModel.activeZoneId)
        (0..20).map { today.plusDays(it.toLong()) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Text("Step 03 - Confirm Appointment", style = MaterialTheme.typography.headlineSmall)
            }

            val detail = bookAppointmentViewModel.storeDetail
            if (detail != null) {
                item {
                    Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            Text(detail.name, style = MaterialTheme.typography.titleLarge)
                            Text(detail.formattedAddress, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }

            if (styleReference != null) {
                item {
                    BookingStyleReferenceCard(
                        reference = styleReference,
                        onClear = { sessionViewModel.clearBookingStyleReference() },
                    )
                }
            }

            item {
                Text("Select Service", style = MaterialTheme.typography.titleMedium)
            }

            item {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    bookAppointmentViewModel.services.forEach { service ->
                        val selected = service.id == bookAppointmentViewModel.selectedServiceId
                        FilterChip(
                            selected = selected,
                            onClick = { bookAppointmentViewModel.chooseService(service.id) },
                            label = {
                                Text(
                                    "${service.name} • $${String.format(Locale.US, "%.2f", service.price)}",
                                )
                            },
                        )
                    }
                }
            }

            item {
                Text("Select Technician", style = MaterialTheme.typography.titleMedium)
            }

            item {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = bookAppointmentViewModel.selectedTechnicianId == null,
                        onClick = { bookAppointmentViewModel.chooseTechnician(null) },
                        label = { Text("Any") },
                    )
                    bookAppointmentViewModel.technicians.forEach { tech ->
                        FilterChip(
                            selected = tech.id == bookAppointmentViewModel.selectedTechnicianId,
                            onClick = { bookAppointmentViewModel.chooseTechnician(tech.id) },
                            label = { Text(tech.name) },
                        )
                    }
                }
            }

            item {
                Text("Select Date", style = MaterialTheme.typography.titleMedium)
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(dateCandidates) { date ->
                        val selected = date == bookAppointmentViewModel.selectedDate
                        FilterChip(
                            selected = selected,
                            onClick = { bookAppointmentViewModel.chooseDate(date) },
                            label = { Text(date.format(DATE_LABEL_FORMATTER)) },
                        )
                    }
                }
            }

            item {
                Text("Select Time", style = MaterialTheme.typography.titleMedium)
            }

            if (bookAppointmentViewModel.isLoadingSlots) {
                item { CircularProgressIndicator() }
            } else if (bookAppointmentViewModel.availableSlots.isEmpty()) {
                item {
                    Text(
                        bookAppointmentViewModel.slotHintMessage ?: "No available times for this date.",
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            } else {
                item {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        maxItemsInEachRow = 4,
                    ) {
                        bookAppointmentViewModel.availableSlots.forEach { slot ->
                            val selected = slot == bookAppointmentViewModel.selectedSlot
                            FilterChip(
                                selected = selected,
                                onClick = { bookAppointmentViewModel.selectSlot(slot) },
                                label = { Text(bookAppointmentViewModel.displayTime(slot)) },
                            )
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = bookAppointmentViewModel.notes,
                    onValueChange = { bookAppointmentViewModel.notes = it },
                    label = { Text("Notes (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                )
            }

            bookAppointmentViewModel.errorMessage?.let { message ->
                item {
                    Text(message, color = MaterialTheme.colorScheme.error)
                }
            }

            bookAppointmentViewModel.successMessage?.let { message ->
                item {
                    Text(message, color = MaterialTheme.colorScheme.primary)
                }
            }

            if (bookAppointmentViewModel.isLoading) {
                item { CircularProgressIndicator() }
            }

            item {
                Button(
                    onClick = {
                        if (bearerToken != null) {
                            bookAppointmentViewModel.submit(bearerToken) {
                                if (isTransitioningAfterSuccess) return@submit
                                isTransitioningAfterSuccess = true
                                showBookingSuccessOverlay = true
                                uiScope.launch {
                                    delay(1500)
                                    showBookingSuccessOverlay = false
                                    delay(120)
                                    onBookSuccess()
                                    isTransitioningAfterSuccess = false
                                }
                            }
                        } else {
                            sessionViewModel.updateAuthMessage("Session expired, please sign in again.")
                        }
                    },
                    enabled = !bookAppointmentViewModel.isSubmitting && !isTransitioningAfterSuccess,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        if (bookAppointmentViewModel.isSubmitting || isTransitioningAfterSuccess) {
                            "Booking..."
                        } else {
                            "Confirm Appointment"
                        },
                    )
                }
            }
        }

        if (showBookingSuccessOverlay) {
            BookingSuccessOverlay(modifier = Modifier.align(Alignment.Center))
        }
    }
}

@Composable
private fun BookingSuccessOverlay(modifier: Modifier = Modifier) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.38f)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(18.dp),
            modifier = modifier,
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = "Success",
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text("Appointment booked", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Redirecting to appointments...",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

private fun dayLabel(dayOfWeek: Int): String {
    return when (dayOfWeek) {
        0 -> "Mon"
        1 -> "Tue"
        2 -> "Wed"
        3 -> "Thu"
        4 -> "Fri"
        5 -> "Sat"
        6 -> "Sun"
        else -> "Day"
    }
}

private val DATE_LABEL_FORMATTER: DateTimeFormatter =
    DateTimeFormatter.ofPattern("EEE, MMM d")
