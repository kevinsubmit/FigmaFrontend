package com.nailsdash.android.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.ui.state.DealsSegment
import com.nailsdash.android.ui.state.DealsViewModel
import com.nailsdash.android.utils.AssetUrlResolver

@Composable
fun DealsScreen(
    dealsViewModel: DealsViewModel = viewModel(),
    onOpenStore: (Int) -> Unit = {},
    onBrowseStores: () -> Unit = {},
) {
    LaunchedEffect(Unit) {
        dealsViewModel.load()
    }

    val rows = dealsViewModel.filteredPromotions()

    Column(
        modifier = Modifier.padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "Limited-time offers",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(top = 4.dp),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            DealsSegment.entries.forEach { segment ->
                FilterChip(
                    selected = dealsViewModel.selectedSegment == segment,
                    onClick = { dealsViewModel.selectedSegment = segment },
                    label = { Text(segment.label) },
                )
            }
        }

        dealsViewModel.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        if (dealsViewModel.isLoading && dealsViewModel.promotions.isEmpty()) {
            CircularProgressIndicator()
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (!dealsViewModel.isLoading && rows.isEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "No active deals right now. Check back soon for new offers.",
                            modifier = Modifier.padding(14.dp),
                        )
                    }
                }
            } else {
                itemsIndexed(rows, key = { _, item -> item.id }) { index, promotion ->
                    val store = promotion.store_id?.let { dealsViewModel.storesById[it] }
                    DealCard(
                        promotion = promotion,
                        store = store,
                        onOpenStore = onOpenStore,
                        onBrowseStores = onBrowseStores,
                    )
                }
            }
        }
    }
}

@Composable
private fun DealCard(
    promotion: Promotion,
    store: Store?,
    onOpenStore: (Int) -> Unit,
    onBrowseStores: () -> Unit,
) {
    val hasStoreTarget = promotion.store_id != null
    val cover = AssetUrlResolver.resolveURL(promotion.image_url ?: store?.image_url)
    val scopeLabel = if (hasStoreTarget) "STORE DEAL" else "PLATFORM DEAL"

    Card(
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Transparent),
    ) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().height(176.dp)) {
                if (cover != null) {
                    AsyncImage(
                        model = cover,
                        contentDescription = promotion.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.matchParentSize(),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .matchParentSize()
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(
                                        Color(0xFF2D220A),
                                        Color(0xFF161616),
                                        Color(0xFF000000),
                                    ),
                                ),
                            ),
                    )
                }

                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f)),
                            ),
                        ),
                )

                Text(
                    text = formatOffer(promotion),
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.Black,
                    modifier = Modifier
                        .padding(10.dp)
                        .background(Color(0xFFE6C46A), shape = RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                )
            }

            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(promotion.title, style = MaterialTheme.typography.titleMedium)
                        Text(
                            if (hasStoreTarget) store?.name ?: "Store Offer" else "Platform Offer",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    Text(scopeLabel, style = MaterialTheme.typography.labelSmall)
                }

                Text(formatExpiry(promotion.end_at), style = MaterialTheme.typography.bodySmall)
                store?.formattedAddress?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    promotion.service_rules.firstOrNull()?.let { firstRule ->
                        DealPill(text = formatPriceRange(firstRule.min_price, firstRule.max_price))
                    }
                    DealPill(text = promotion.type.uppercase())
                }

                promotion.rules?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }

                if (hasStoreTarget) {
                    Button(
                        onClick = { promotion.store_id?.let(onOpenStore) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Book Now")
                    }
                } else {
                    Button(
                        onClick = onBrowseStores,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Browse Stores")
                    }
                }
            }
        }
    }
}

@Composable
private fun DealPill(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        modifier = Modifier
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(999.dp),
            )
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

private fun formatOffer(promotion: Promotion): String {
    return if (promotion.discount_type.lowercase() == "percentage") {
        "${promotion.discount_value.toInt()}% OFF"
    } else {
        "$${String.format("%.0f", promotion.discount_value)} OFF"
    }
}

private fun formatPriceRange(min: Double?, max: Double?): String {
    if (min == null && max == null) return "All prices"
    if (min != null && max != null) return "$${min.toInt()} - $${max.toInt()}"
    if (min != null) return "From $${min.toInt()}"
    return "Up to $${max?.toInt() ?: 0}"
}

private fun formatExpiry(endAt: String): String {
    val datePart = endAt.trim().take(10)
    return if (datePart.length == 10) "Ends on $datePart" else "Ends soon"
}
