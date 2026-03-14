package com.nailsdash.android.ui.screen

import androidx.compose.animation.animateColorAsState
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.LocationOn
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.ui.state.DealsSegment
import com.nailsdash.android.ui.state.DealsViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil

private val DealsGold = Color(0xFFD4AF37)
private val DealsBackground = Color.Black
private val DealsCardBackground = Color(0xFF111111)

@Composable
fun DealsScreen(
    dealsViewModel: DealsViewModel = viewModel(),
    onOpenStore: (Int) -> Unit = {},
    onBrowseStores: () -> Unit = {},
) {
    var noticeMessage by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        dealsViewModel.load()
    }
    LaunchedEffect(dealsViewModel.errorMessage) {
        val message = dealsViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    val rows = dealsViewModel.filteredPromotions()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DealsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            DealsHeader(
                selectedSegment = dealsViewModel.selectedSegment,
                onSelectSegment = { dealsViewModel.selectedSegment = it },
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 26.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (!dealsViewModel.isLoading && rows.isEmpty()) {
                    item {
                        DealsEmptyStateCard()
                    }
                } else {
                    itemsIndexed(
                        items = rows,
                        key = { _, item -> item.id },
                    ) { index, promotion ->
                        val store = promotion.store_id?.let { dealsViewModel.storesById[it] }
                        DealCard(
                            promotion = promotion,
                            store = store,
                            index = index,
                            totalCount = rows.size,
                            onOpenStore = onOpenStore,
                            onBrowseStores = onBrowseStores,
                        )
                    }
                }
            }
        }

        if (dealsViewModel.isLoading) {
            DealsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            AlertDialog(
                onDismissRequest = { noticeMessage = null },
                confirmButton = {
                    TextButton(onClick = { noticeMessage = null }) {
                        Text("OK")
                    }
                },
                title = { Text("Notice") },
                text = { Text(message) },
            )
        }
    }
}

@Composable
private fun DealsHeader(
    selectedSegment: DealsSegment,
    onSelectSegment: (DealsSegment) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.Black, Color.Black.copy(alpha = 0.96f)),
                ),
            ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 4.dp, end = 16.dp, bottom = 6.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = "Limited-time offers",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 30.sp,
                ),
                color = Color.White,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp)
                    .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(12.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                DealsSegment.entries.forEach { segment ->
                    val selected = selectedSegment == segment
                    val segmentInteraction = remember(segment) { MutableInteractionSource() }
                    val chipScale by animateFloatAsState(
                        targetValue = if (selected) 1f else 0.97f,
                        animationSpec = spring(dampingRatio = 0.78f, stiffness = 520f),
                        label = "dealsSegmentScale",
                    )
                    val chipBg by animateColorAsState(
                        targetValue = if (selected) DealsGold else Color.Transparent,
                        animationSpec = tween(durationMillis = 180),
                        label = "dealsSegmentBg",
                    )
                    val chipText by animateColorAsState(
                        targetValue = if (selected) Color.Black else Color.White.copy(alpha = 0.86f),
                        animationSpec = tween(durationMillis = 180),
                        label = "dealsSegmentText",
                    )

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp)
                            .scale(chipScale)
                            .background(chipBg, RoundedCornerShape(10.dp))
                            .border(
                                width = 1.dp,
                                color = if (selected) Color.Transparent else DealsGold.copy(alpha = 0.24f),
                                shape = RoundedCornerShape(10.dp),
                            )
                            .clickable(
                                interactionSource = segmentInteraction,
                                indication = null,
                            ) { onSelectSegment(segment) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = segment.label,
                            style = MaterialTheme.typography.labelLarge.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                            ),
                            color = chipText,
                        )
                    }
                }
            }
        }

        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
    }
}

@Composable
private fun DealsEmptyStateCard() {
    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DealsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, DealsGold.copy(alpha = 0.18f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(Color.White.copy(alpha = 0.05f), CircleShape)
                    .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.LocalOffer,
                    contentDescription = null,
                    tint = DealsGold,
                    modifier = Modifier.size(26.dp),
                )
            }
            Text(
                text = "No active deals right now",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = Color.White.copy(alpha = 0.90f),
            )
            Text(
                text = "Check back soon for new offers.",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.72f),
            )
        }
    }
}

@Composable
private fun DealCard(
    promotion: Promotion,
    store: Store?,
    index: Int,
    totalCount: Int,
    onOpenStore: (Int) -> Unit,
    onBrowseStores: () -> Unit,
) {
    val hasStoreTarget = promotion.store_id != null
    val cover = AssetUrlResolver.resolveURL(promotion.image_url ?: store?.image_url)
    val scopeLabel = if (hasStoreTarget) "STORE DEAL" else "PLATFORM DEAL"
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val cardScale by animateFloatAsState(
        targetValue = if (pressed) 0.988f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "dealCardScale",
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .scale(cardScale)
            .zIndex((totalCount - index).toFloat()),
        colors = CardDefaults.cardColors(containerColor = DealsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, DealsGold.copy(alpha = 0.20f)),
        elevation = CardDefaults.cardElevation(defaultElevation = if (pressed) 3.dp else 7.dp),
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(DealsGold.copy(alpha = 0.42f)),
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(168.dp)
                    .clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        onClick = {},
                    ),
            ) {
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
                                colors = listOf(Color.Black.copy(alpha = 0.06f), Color.Black.copy(alpha = 0.82f)),
                            ),
                        ),
                )

                Text(
                    text = formatOffer(promotion),
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                    color = Color.Black,
                    modifier = Modifier
                        .padding(10.dp)
                        .background(DealsGold, CircleShape)
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                )
            }

            Column(
                modifier = Modifier.padding(start = 14.dp, top = 12.dp, end = 14.dp, bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Text(
                            text = promotion.title,
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = Color.White,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = if (hasStoreTarget) store?.name ?: "Store Offer" else "Platform Offer",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            ),
                            color = Color.White.copy(alpha = 0.78f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    DealPill(
                        text = scopeLabel,
                        textColor = Color.White.copy(alpha = 0.72f),
                    )
                }

                DealMetaRow(
                    icon = Icons.Outlined.AccessTime,
                    text = formatExpiry(promotion.end_at),
                    iconTint = Color.White.copy(alpha = 0.74f),
                    textColor = Color.White.copy(alpha = 0.74f),
                )

                store?.formattedAddress?.takeIf { it.isNotBlank() }?.let { address ->
                    DealMetaRow(
                        icon = Icons.Outlined.LocationOn,
                        text = address,
                        iconTint = DealsGold,
                        textColor = Color.White.copy(alpha = 0.72f),
                        textStyle = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    promotion.service_rules.firstOrNull()?.let { firstRule ->
                        DealPill(text = formatPriceRange(firstRule.min_price, firstRule.max_price))
                    }
                    DealPill(
                        text = promotion.type.uppercase(Locale.US),
                        textColor = Color.White.copy(alpha = 0.68f),
                    )
                }

                promotion.rules?.takeIf { it.isNotBlank() }?.let { rulesText ->
                    Text(
                        text = rulesText.trim(),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.66f),
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                if (hasStoreTarget) {
                    val bookCtaInteraction = remember(promotion.id) { MutableInteractionSource() }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(999.dp))
                            .background(DealsGold),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 46.dp)
                                .clickable(
                                    interactionSource = bookCtaInteraction,
                                    indication = null,
                                ) { promotion.store_id?.let(onOpenStore) }
                                .padding(horizontal = 14.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Book Now",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp,
                                ),
                                color = Color.Black,
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = Color.Black,
                            )
                        }
                    }
                } else {
                    val browseCtaInteraction = remember(promotion.id) { MutableInteractionSource() }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(999.dp))
                            .background(Color.White.copy(alpha = 0.04f))
                            .border(
                                width = 1.dp,
                                color = DealsGold.copy(alpha = 0.28f),
                                shape = RoundedCornerShape(999.dp),
                            ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 46.dp)
                                .clickable(
                                    interactionSource = browseCtaInteraction,
                                    indication = null,
                                    onClick = onBrowseStores,
                                )
                                .padding(horizontal = 14.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Browse Stores",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp,
                                ),
                                color = DealsGold,
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = DealsGold,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DealMetaRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    iconTint: Color,
    textColor: Color,
    textStyle: TextStyle = MaterialTheme.typography.labelSmall,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(999.dp))
            .padding(horizontal = 9.dp, vertical = 4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(12.dp),
        )
        Text(
            text = text,
            style = textStyle,
            color = textColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun DealPill(
    text: String,
    textColor: Color = Color.White,
) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
        color = textColor,
        modifier = Modifier
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun DealsLoadingOverlay() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = DealsCardBackground.copy(alpha = 0.96f)),
            border = androidx.compose.foundation.BorderStroke(1.dp, DealsGold.copy(alpha = 0.16f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = DealsGold,
                )
                Text(
                    text = "Loading deals...",
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                    ),
                    color = Color.White.copy(alpha = 0.62f),
                )
            }
        }
    }
}

private fun formatOffer(promotion: Promotion): String {
    return if (promotion.discount_type.lowercase() == "percentage") {
        "${promotion.discount_value.toInt()}% OFF"
    } else {
        "$${String.format(Locale.US, "%.0f", promotion.discount_value)} OFF"
    }
}

private fun formatPriceRange(min: Double?, max: Double?): String {
    if (min == null && max == null) return "All prices"
    if (min != null && max != null) return "$${min.toInt()} - $${max.toInt()}"
    if (min != null) return "From $${min.toInt()}"
    return "Up to $${max?.toInt() ?: 0}"
}

private fun formatExpiry(endAt: String): String {
    val endDate = parsePromotionEndDate(endAt) ?: return "Ends soon"
    val now = LocalDate.now()
    val diffDays = java.time.temporal.ChronoUnit.DAYS.between(now, endDate).toInt()
    if (diffDays < 0) return "Expired"
    if (diffDays == 0) return "Ends today"
    if (diffDays < 7) return "Ends in ${ceil(diffDays.toDouble()).toInt()} days"
    return "Ends on ${endDate.format(DEAL_MONTH_DAY_FORMATTER)}"
}

private fun parsePromotionEndDate(raw: String): LocalDate? {
    val value = raw.trim()
    if (value.isEmpty()) return null

    runCatching { OffsetDateTime.parse(value).toLocalDate() }
        .getOrNull()
        ?.let { return it }

    val datePart = value.take(10)
    return runCatching { LocalDate.parse(datePart) }.getOrNull()
}

private val DEAL_MONTH_DAY_FORMATTER: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMM d", Locale.US)
