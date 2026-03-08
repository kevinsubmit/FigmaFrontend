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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.StoreSortOption
import com.nailsdash.android.ui.state.StoresViewModel

@Composable
fun StoresScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenStore: (storeId: Int) -> Unit = {},
    storesViewModel: StoresViewModel = viewModel(),
) {
    LaunchedEffect(Unit) {
        storesViewModel.load()
    }

    val styleReference = sessionViewModel.bookingStyleReference

    Scaffold(
        bottomBar = {
            if (styleReference != null) {
                BookingStyleReferenceBottomBar {
                    BookingStyleReferenceCard(reference = styleReference, onClear = { sessionViewModel.clearBookingStyleReference() })
                }
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("Step 01 - Choose a salon", style = MaterialTheme.typography.headlineSmall)

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StoreSortOption.entries.forEach { option ->
                    AssistChip(
                        onClick = { storesViewModel.onSortSelected(option) },
                        label = { Text(option.label) },
                    )
                }
            }

            storesViewModel.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }

            if (storesViewModel.isLoading && storesViewModel.stores.isEmpty()) {
                CircularProgressIndicator()
            }

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(storesViewModel.stores, key = { it.id }) { store ->
                    storesViewModel.loadStoreRatingIfNeeded(store.id)
                    StoreCard(
                        store = store,
                        rating = storesViewModel.displayRating(store),
                        reviews = storesViewModel.displayReviewCount(store),
                        onOpenStore = onOpenStore,
                    )
                }
            }
        }
    }
}

@Composable
private fun BookingStyleReferenceBottomBar(
    content: @Composable () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp, start = 12.dp, end = 12.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            HorizontalDivider(color = Color.White.copy(alpha = 0.12f))
            content()
        }
    }
}

@Composable
private fun StoreCard(
    store: Store,
    rating: Double,
    reviews: Int,
    onOpenStore: (storeId: Int) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenStore(store.id) },
        shape = RoundedCornerShape(14.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(store.name, style = MaterialTheme.typography.titleMedium)
            Text("$rating ★ ($reviews reviews)", style = MaterialTheme.typography.bodyMedium)
            Text(store.formattedAddress, style = MaterialTheme.typography.bodySmall)
        }
    }
}
