package com.nailsdash.android.ui.screen
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.model.StoreHour
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.model.StoreReview
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.BookAppointmentViewModel
import com.nailsdash.android.ui.state.BookingStyleReference
import com.nailsdash.android.ui.state.StoreDetailViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import java.net.URI
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class BookingTypeSelection {
    Single,
    Group,
}

private data class GroupGuestRow(
    val id: Long,
    val serviceId: Int? = null,
)

private val BookingGold = Color(0xFFD4AF37)
private val BookingBackground = Color.Black
private val BookingCardBackground = Color(0xFF111111)
private val BookingCardStroke = BookingGold.copy(alpha = 0.22f)
private val BookingSecondaryText = Color.White.copy(alpha = 0.64f)
private val StoreDetailDetailsCardBackground = Color(0xFF181818)
private const val StoreDetailMapBackgroundURL =
    "https://images.unsplash.com/photo-1664044056437-6330bcf8e2fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc3RyZWV0JTIwbWFwJTIwZ3JhcGhpYyUyMHRvcCUyMHZpZXd8ZW58MXx8fHwxNzY1OTM3MzkzfDA&ixlib=rb-4.1.0&q=80&w=1080"

@Composable
fun StoreDetailScreen(
    storeId: Int,
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit,
    onBookNow: (storeId: Int, preselectedServiceId: Int?) -> Unit,
    storeDetailViewModel: StoreDetailViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val styleReference = sessionViewModel.bookingStyleReference
    val selectedService = storeDetailViewModel.selectedServiceOrNull()
    val selectedTab = storeDetailViewModel.currentTabLabel()
    val context = LocalContext.current
    var showMapChooser by remember(storeId) { mutableStateOf(false) }
    var mapLaunchError by remember(storeId) { mutableStateOf<String?>(null) }
    var noticeMessage by remember(storeId) { mutableStateOf<String?>(null) }
    var showFullHours by remember(storeId) { mutableStateOf(false) }

    val onToggleFavorite: () -> Unit = {
        val activeStore = storeDetailViewModel.store
        if (activeStore != null && bearerToken != null) {
            storeDetailViewModel.toggleFavorite(activeStore.id, bearerToken)
        } else {
            sessionViewModel.updateAuthMessage("Please sign in to save favorites.")
        }
    }

    LaunchedEffect(storeId, bearerToken) {
        storeDetailViewModel.loadStore(storeId = storeId, bearerToken = bearerToken)
    }

    LaunchedEffect(selectedTab) {
        if (selectedTab != "Details") {
            showFullHours = false
        }
    }
    LaunchedEffect(storeDetailViewModel.errorMessage) {
        val message = storeDetailViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }
    LaunchedEffect(mapLaunchError) {
        val message = mapLaunchError?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            bottomBar = {
                if (selectedTab == "Services" && selectedService != null) {
                    Button(
                        onClick = { onBookNow(storeId, selectedService.id) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    ) {
                        Text(
                            "Book ${selectedService.name} • $${String.format(Locale.US, "%.2f", selectedService.price)}",
                        )
                    }
                }
            },
        ) { innerPadding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
            item {
                StoreDetailTopBar(onBack = onBack)
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
                if (store.images.isNotEmpty()) {
                    item {
                        StoreHeroCarousel(
                            imageUrls = store.images.map { it.image_url },
                            storeName = store.name,
                            isFavorited = storeDetailViewModel.isFavorited,
                            isFavoriteLoading = storeDetailViewModel.isFavoriteLoading,
                            onToggleFavorite = onToggleFavorite,
                        )
                    }
                }

                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 2.dp, vertical = 2.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = store.name,
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontSize = 34.sp,
                                fontWeight = FontWeight.Bold,
                            ),
                            color = Color.White,
                        )
                        Text(
                            text = store.formattedAddress,
                            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                            color = BookingSecondaryText,
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "★",
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                                color = BookingGold,
                            )
                            Text(
                                text = storeDetailViewModel.ratingText(),
                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = "(${storeDetailViewModel.reviewCountText()})",
                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                                color = BookingGold,
                            )
                        }
                    }
                }

                item {
                    StoreDetailTabBar(
                        tabs = storeDetailViewModel.visibleTabs(),
                        selectedTab = selectedTab,
                        onPickTab = storeDetailViewModel::pickTab,
                    )
                }

                when (selectedTab) {
                    "Services" -> {
                        if (storeDetailViewModel.services.isEmpty()) {
                            item {
                                Text(
                                    "No services available right now.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        items(storeDetailViewModel.services, key = { it.id }) { service ->
                            val selected = service.id == storeDetailViewModel.selectedServiceId
                            StoreServiceRow(
                                service = service,
                                selected = selected,
                                onSelect = { storeDetailViewModel.selectService(service.id) },
                            )
                        }
                    }

                    "Reviews" -> {
                        if (storeDetailViewModel.reviews.isEmpty()) {
                            item { Text("No reviews yet.") }
                        }
                        item {
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.20f),
                                ),
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("★", color = MaterialTheme.colorScheme.primary)
                                    Text(
                                        storeDetailViewModel.ratingText(),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "• ${storeDetailViewModel.reviewCountText()}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                        items(storeDetailViewModel.reviews, key = { it.id }) { review ->
                            StoreReviewCard(review = review)
                        }
                    }

                    "Portfolio" -> {
                        if (storeDetailViewModel.portfolio.isEmpty()) {
                            item { Text("No portfolio images yet.") }
                        }
                        items(storeDetailViewModel.portfolio, key = { it.id }) { row ->
                            StorePortfolioCard(row = row)
                        }
                    }

                    else -> {
                        item {
                            StoreDetailLocationCard(
                                store = store,
                                onOpenInMaps = { showMapChooser = true },
                            )
                        }

                        item {
                            StoreDetailContactHoursCard(
                                store = store,
                                storeHours = storeDetailViewModel.storeHours,
                                showFullHours = showFullHours,
                                onToggleShowFullHours = { showFullHours = !showFullHours },
                                onOpenDial = { phone ->
                                    val opened = openDialer(context = context, phone = phone)
                                    mapLaunchError = if (opened) null else "No phone app available on this device."
                                },
                                onOpenEmail = { email ->
                                    val opened = openEmailClient(context = context, email = email)
                                    mapLaunchError = if (opened) null else "No email app available on this device."
                                },
                            )
                        }

                        store.description?.takeIf { it.isNotBlank() }?.let { description ->
                            item {
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = StoreDetailDetailsCardBackground,
                                    ),
                                    border = BorderStroke(
                                        width = 1.dp,
                                        color = BookingGold.copy(alpha = 0.18f),
                                    ),
                                ) {
                                    Text(
                                        text = description.trim(),
                                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                                        color = BookingSecondaryText,
                                        modifier = Modifier.padding(14.dp),
                                    )
                                }
                            }
                        }

                        item {
                            StoreDetailReportRow(
                                onReport = { noticeMessage = "Report feature is coming soon." },
                            )
                        }
                    }
                }
            }

            }

            if (showMapChooser) {
                val store = storeDetailViewModel.store
                if (store != null) {
                    MapChooserBottomSheet(
                        onDismiss = { showMapChooser = false },
                        onChoose = { option ->
                            val opened = openMapWithOption(
                                context = context,
                                option = option,
                                address = store.formattedAddress,
                                latitude = store.latitude,
                                longitude = store.longitude,
                            )
                            mapLaunchError = if (opened) null else "No map app available on this device."
                            showMapChooser = false
                        },
                    )
                }
            }
        }

        if (storeDetailViewModel.isLoading) {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = BookingCardBackground),
                modifier = Modifier.align(Alignment.Center),
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = BookingGold,
                    )
                    Text(
                        text = "Loading store...",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = Color.White.copy(alpha = 0.72f),
                    )
                }
            }
        }
    }

    noticeMessage?.let { message ->
        AlertDialog(
            onDismissRequest = {
                noticeMessage = null
                mapLaunchError = null
            },
            properties = DialogProperties(
                dismissOnBackPress = false,
                dismissOnClickOutside = false,
            ),
            confirmButton = {
                TextButton(
                    onClick = {
                        noticeMessage = null
                        mapLaunchError = null
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
private fun StoreDetailTopBar(onBack: () -> Unit) {
    val backInteraction = remember { MutableInteractionSource() }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 8.dp, end = 16.dp, bottom = 8.dp),
        ) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = "STEP 02",
                    style = MaterialTheme.typography.labelSmall.copy(
                        letterSpacing = 2.2.sp,
                        fontSize = 11.sp,
                    ),
                    color = BookingGold,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Book Services",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                    ),
                    color = Color.White,
                )
            }

            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .size(38.dp)
                    .background(
                        color = Color.White.copy(alpha = 0.07f),
                        shape = CircleShape,
                    )
                    .clickable(
                        interactionSource = backInteraction,
                        indication = null,
                        onClick = onBack,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.ChevronLeft,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp),
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.08f)),
        )
    }
}

@Composable
private fun StoreDetailTabBar(
    tabs: List<String>,
    selectedTab: String,
    onPickTab: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black)
            .padding(top = 4.dp, bottom = 6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
        ) {
            tabs.forEach { tab ->
                val selected = selectedTab == tab
                val tabInteraction = remember(tab) { MutableInteractionSource() }
                val tabScale by animateFloatAsState(
                    targetValue = if (selected) 1f else 0.96f,
                    animationSpec = spring(dampingRatio = 0.78f, stiffness = 540f),
                    label = "storeTabScale",
                )
                val labelColor by animateColorAsState(
                    targetValue = if (selected) {
                        Color.White
                    } else {
                        Color.White.copy(alpha = 0.56f)
                    },
                    label = "storeTabLabelColor",
                )
                val indicatorColor by animateColorAsState(
                    targetValue = if (selected) {
                        BookingGold
                    } else {
                        Color.Transparent
                    },
                    label = "storeTabIndicatorColor",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
                        .scale(tabScale)
                        .clickable(
                            interactionSource = tabInteraction,
                            indication = null,
                        ) { onPickTab(tab) }
                        .padding(horizontal = 4.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = tab.uppercase(Locale.US),
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            letterSpacing = 1.5.sp,
                        ),
                        color = labelColor,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Box(
                        modifier = Modifier
                            .width(74.dp)
                            .height(3.dp)
                            .background(
                                color = indicatorColor,
                                shape = RoundedCornerShape(999.dp),
                            ),
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.14f)),
        )
    }
}

@Composable
private fun StoreServiceRow(
    service: ServiceItem,
    selected: Boolean,
    onSelect: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val rowScale by animateFloatAsState(
        targetValue = if (pressed) 0.986f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "storeServiceRowScale",
    )
    val rowElevation by animateDpAsState(
        targetValue = if (pressed) 1.dp else 4.dp,
        animationSpec = tween(durationMillis = 120),
        label = "storeServiceRowElevation",
    )

    Card(
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .scale(rowScale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onSelect,
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.22f)
            },
        ),
        border = BorderStroke(
            width = 1.dp,
            color = if (selected) {
                MaterialTheme.colorScheme.primary.copy(alpha = 0.42f)
            } else {
                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f)
            },
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = rowElevation),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = service.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "$${String.format(Locale.US, "%.2f", service.price)}+",
                        style = MaterialTheme.typography.labelMedium,
                    )
                    Box(
                        modifier = Modifier
                            .size(3.dp)
                            .background(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f),
                                shape = CircleShape,
                            ),
                    )
                    Text(
                        text = "${service.duration_minutes}m",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            FilterChip(
                selected = selected,
                onClick = onSelect,
                label = { Text(if (selected) "ADDED" else "ADD") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        }
    }
}

@Composable
private fun StoreDetailLocationCard(
    store: StoreDetail,
    onOpenInMaps: () -> Unit,
) {
    val outerShape = RoundedCornerShape(20.dp)
    val innerMaterialShape = RoundedCornerShape(24.dp)
    val innerPanelShape = RoundedCornerShape(22.dp)
    val ctaShape = RoundedCornerShape(999.dp)
    val mapsCtaInteraction = remember { MutableInteractionSource() }
    val storeAvatarUrl = remember(store.images) {
        store.images.firstOrNull()?.image_url?.let { AssetUrlResolver.resolveURL(it) }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(306.dp)
            .clip(outerShape)
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF232323),
                        Color(0xFF121212),
                    ),
                ),
            )
            .border(
                width = 1.dp,
                color = Color.White.copy(alpha = 0.16f),
                shape = outerShape,
            ),
    ) {
        AsyncImage(
            model = StoreDetailMapBackgroundURL,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.08f),
                            Color.Black.copy(alpha = 0.62f),
                        ),
                    ),
                ),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(14.dp)
                .background(
                    color = Color.White.copy(alpha = 0.08f),
                    shape = innerMaterialShape,
                )
                .background(
                    color = Color.Black.copy(alpha = 0.62f),
                    shape = innerMaterialShape,
                )
                .clip(innerPanelShape)
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.16f),
                    shape = innerPanelShape,
                )
                .padding(horizontal = 14.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (storeAvatarUrl != null) {
                    AsyncImage(
                        model = storeAvatarUrl,
                        contentDescription = store.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .border(
                                width = 1.dp,
                                color = Color.White.copy(alpha = 0.18f),
                                shape = CircleShape,
                            ),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.08f))
                            .border(
                                width = 1.dp,
                                color = Color.White.copy(alpha = 0.18f),
                                shape = CircleShape,
                            ),
                    )
                }

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Text(
                        text = store.name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = store.formattedAddress,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        color = Color.White.copy(alpha = 0.88f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp)
                    .clip(ctaShape)
                    .background(BookingGold)
                    .clickable(
                        interactionSource = mapsCtaInteraction,
                        indication = null,
                        onClick = onOpenInMaps,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = null,
                        tint = Color.Black,
                        modifier = Modifier
                            .size(16.dp)
                            .rotate(45f),
                    )
                    Text(
                        text = "Open in Maps",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                        color = Color.Black,
                    )
                }
            }
        }
    }
}

@Composable
private fun StoreDetailContactHoursCard(
    store: StoreDetail,
    storeHours: List<StoreHour>,
    showFullHours: Boolean,
    onToggleShowFullHours: () -> Unit,
    onOpenDial: (String) -> Unit,
    onOpenEmail: (String) -> Unit,
) {
    val todayHoursText = if (storeHours.isEmpty()) {
        normalizedContact(store.opening_hours) ?: "-"
    } else {
        val todayIndex = currentBackendWeekdayIndex(store.time_zone)
        hoursTextForDay(storeHours = storeHours, dayIndex = todayIndex)
    }
    val weekToggleInteraction = remember { MutableInteractionSource() }
    val chevronRotation by animateFloatAsState(
        targetValue = if (showFullHours) 180f else 0f,
        animationSpec = tween(durationMillis = 180),
        label = "storeDetailHoursChevronRotation",
    )

    Card(
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = StoreDetailDetailsCardBackground,
        ),
        border = BorderStroke(
            width = 1.dp,
            color = BookingGold.copy(alpha = 0.18f),
        ),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "CONTACT & BUSINESS HOURS",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 12.sp,
                    letterSpacing = 2.sp,
                ),
                color = BookingSecondaryText,
                fontWeight = FontWeight.SemiBold,
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Today",
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                    color = BookingSecondaryText,
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = todayHoursText,
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            if (storeHours.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .clickable(
                            interactionSource = weekToggleInteraction,
                            indication = null,
                            onClick = onToggleShowFullHours,
                        )
                        .padding(vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = "Show full week",
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                        color = BookingGold,
                        fontWeight = FontWeight.Medium,
                    )
                    Icon(
                        imageVector = Icons.Filled.KeyboardArrowDown,
                        contentDescription = null,
                        tint = BookingGold,
                        modifier = Modifier
                            .size(11.dp)
                            .rotate(chevronRotation),
                    )
                }
            }

            if (showFullHours && storeHours.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    (0..6).forEach { dayIndex ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = dayLabel(dayIndex),
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                                color = BookingSecondaryText,
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = hoursTextForDay(storeHours = storeHours, dayIndex = dayIndex),
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                                color = Color.White,
                            )
                        }
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color.White.copy(alpha = 0.08f)),
            )

            normalizedContact(store.phone)?.let { phone ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Phone,
                        contentDescription = null,
                        tint = BookingGold,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = phone,
                        style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                        color = Color.White,
                        modifier = Modifier.weight(1f),
                    )
                    if (phone.any { it.isDigit() }) {
                        StoreDetailContactActionChip(
                            label = "Call",
                            onClick = { onOpenDial(phone) },
                        )
                    }
                }
            }

            normalizedMailtoTarget(store.email)?.let { email ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Email,
                        contentDescription = null,
                        tint = BookingGold,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = email,
                        style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                        color = Color.White,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    StoreDetailContactActionChip(
                        label = "Email",
                        onClick = { onOpenEmail(email) },
                    )
                }
            }
        }
    }
}

@Composable
private fun StoreDetailContactActionChip(
    label: String,
    onClick: () -> Unit,
) {
    val chipInteraction = remember { MutableInteractionSource() }
    Text(
        text = label,
        style = MaterialTheme.typography.labelSmall.copy(
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        ),
        color = Color.White,
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .clickable(
                interactionSource = chipInteraction,
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

@Composable
private fun StoreDetailReportRow(onReport: () -> Unit) {
    val reportInteraction = remember { MutableInteractionSource() }
    Column(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.08f)),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = reportInteraction,
                    indication = null,
                    onClick = onReport,
                )
                .padding(vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Report",
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                color = BookingSecondaryText,
                fontWeight = FontWeight.Medium,
            )
            Spacer(modifier = Modifier.weight(1f))
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = BookingSecondaryText,
                modifier = Modifier.size(12.dp),
            )
        }
    }
}

@Composable
private fun StoreReviewCard(review: StoreReview) {
    Card(
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.18f),
        ),
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
        ),
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.Top,
            ) {
                val avatar = AssetUrlResolver.resolveURL(review.user_avatar)
                if (avatar != null) {
                    AsyncImage(
                        model = avatar,
                        contentDescription = review.user_name ?: "User",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    )
                }

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = review.user_name ?: "User",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = reviewDateLabel(review.created_at),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        val rounded = review.rating.toInt().coerceIn(0, 5)
                        (1..5).forEach { idx ->
                            Text(
                                text = if (idx <= rounded) "★" else "☆",
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }

            val comment = review.comment?.trim().orEmpty()
            if (comment.isNotEmpty()) {
                Text(
                    text = comment,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            val reviewImages = review.images.orEmpty()
                .mapNotNull { AssetUrlResolver.resolveURL(it) }
            if (reviewImages.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(reviewImages) { imageUrl ->
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = "Review image",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(74.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(
                                    width = 1.dp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
                                    shape = RoundedCornerShape(8.dp),
                                ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StorePortfolioCard(row: StorePortfolio) {
    val image = AssetUrlResolver.resolveURL(row.image_url)
    Card(
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(214.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.15f),
        ),
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
        ),
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            if (image != null) {
                AsyncImage(
                    model = image,
                    contentDescription = row.title ?: "Portfolio",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.48f)),
                        ),
                    ),
            )

            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = row.title ?: "Portfolio #${row.id}",
                    color = Color.White,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val desc = row.description?.trim().orEmpty()
                if (desc.isNotEmpty()) {
                    Text(
                        text = desc,
                        color = Color.White.copy(alpha = 0.88f),
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun StoreHeroCarousel(
    imageUrls: List<String>,
    storeName: String,
    isFavorited: Boolean,
    isFavoriteLoading: Boolean,
    onToggleFavorite: () -> Unit,
) {
    val resolvedUrls = remember(imageUrls) {
        imageUrls
            .mapNotNull { AssetUrlResolver.resolveURL(it) }
            .distinct()
    }
    if (resolvedUrls.isEmpty()) return

    val listState = rememberLazyListState()
    val heroScope = rememberCoroutineScope()
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)
    val currentIndex by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex.coerceIn(0, resolvedUrls.lastIndex)
        }
    }

    LaunchedEffect(currentIndex, resolvedUrls.size) {
        if (resolvedUrls.size <= 1) return@LaunchedEffect
        delay(3200)
        val nextIndex = (currentIndex + 1) % resolvedUrls.size
        listState.animateScrollToItem(nextIndex)
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        val favoriteInteraction = remember { MutableInteractionSource() }
        val favoritePressed by favoriteInteraction.collectIsPressedAsState()
        val favoriteScale by animateFloatAsState(
            targetValue = if (favoritePressed) 0.93f else 1f,
            animationSpec = tween(durationMillis = 110),
            label = "storeHeroFavoriteScale",
        )

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(226.dp),
        ) {
            LazyRow(
                state = listState,
                flingBehavior = flingBehavior,
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                itemsIndexed(resolvedUrls) { index, imageUrl ->
                    AsyncImage(
                        model = imageUrl,
                        contentDescription = "$storeName image ${index + 1}",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillParentMaxWidth()
                            .fillMaxSize(),
                    )
                }
            }

            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(10.dp)
                    .size(40.dp)
                    .scale(favoriteScale)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.62f))
                    .clickable(
                        interactionSource = favoriteInteraction,
                        indication = null,
                        enabled = !isFavoriteLoading,
                    ) { onToggleFavorite() },
                contentAlignment = Alignment.Center,
            ) {
                if (isFavoriteLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                } else {
                    Icon(
                        imageVector = if (isFavorited) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = if (isFavorited) "Favorited" else "Favorite",
                        tint = if (isFavorited) BookingGold else Color.White,
                    )
                }
            }

            if (resolvedUrls.size > 1) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    resolvedUrls.indices.forEach { idx ->
                        val selected = idx == currentIndex
                        val dotWidth by animateDpAsState(
                            targetValue = if (selected) 14.dp else 6.dp,
                            label = "heroIndicatorWidth",
                        )
                        val dotColor by animateColorAsState(
                            targetValue = if (selected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                Color.White.copy(alpha = 0.58f)
                            },
                            label = "heroIndicatorColor",
                        )
                        Box(
                            modifier = Modifier
                                .width(dotWidth)
                                .height(6.dp)
                                .background(
                                    color = dotColor,
                                    shape = RoundedCornerShape(999.dp),
                                )
                                .clickable {
                                    if (idx != currentIndex) {
                                        // Let users quickly jump to any photo indicator.
                                        heroScope.launch { listState.animateScrollToItem(idx) }
                                    }
                                },
                        )
                    }
                }
            }
        }
    }
}

private fun reviewDateLabel(raw: String?): String {
    val text = raw?.trim().orEmpty()
    if (text.length >= 10) return text.take(10)
    return if (text.isNotEmpty()) text else "-"
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
    var bookingType by remember(storeId) { mutableStateOf(BookingTypeSelection.Single) }
    var guestRows by remember(storeId) { mutableStateOf(emptyList<GroupGuestRow>()) }
    var nextGuestRowId by remember(storeId) { mutableStateOf(1L) }
    var noticeMessage by rememberSaveable(storeId) { mutableStateOf<String?>(null) }
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

    val todayInStoreZone = remember(bookAppointmentViewModel.activeZoneId) {
        LocalDate.now(bookAppointmentViewModel.activeZoneId)
    }
    var displayedMonth by remember(bookAppointmentViewModel.activeZoneId) {
        mutableStateOf(YearMonth.from(bookAppointmentViewModel.selectedDate))
    }

    LaunchedEffect(bookAppointmentViewModel.selectedDate) {
        val selectedMonth = YearMonth.from(bookAppointmentViewModel.selectedDate)
        if (selectedMonth != displayedMonth) {
            displayedMonth = selectedMonth
        }
    }
    LaunchedEffect(bookAppointmentViewModel.errorMessage) {
        val message = bookAppointmentViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    val selectedService = bookAppointmentViewModel.selectedServiceOrNull()
    val selectedTime = bookAppointmentViewModel.selectedSlot?.let { bookAppointmentViewModel.displayTime(it) } ?: "Select a time"
    val summaryPriceText = selectedService?.let {
        "$${String.format(Locale.US, "%.2f", it.price)}+"
    } ?: "-"
    val guestServicesComplete = guestRows.isNotEmpty() && guestRows.all { it.serviceId != null }
    val canSubmit = selectedService != null &&
        bookAppointmentViewModel.selectedSlot != null &&
        (bookingType == BookingTypeSelection.Single || guestServicesComplete)

    val summaryServiceTitle = when {
        selectedService == null -> "Select a service"
        bookingType == BookingTypeSelection.Group && guestRows.isNotEmpty() ->
            "${selectedService.name} + ${guestRows.size} guest${if (guestRows.size > 1) "s" else ""}"
        else -> selectedService.name
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BookingBackground),
    ) {
        Scaffold(
            containerColor = BookingBackground,
            bottomBar = {
                BookingBottomBar(
                    serviceTitle = summaryServiceTitle,
                    selectedTime = selectedTime,
                    priceText = summaryPriceText,
                    isSubmitting = bookAppointmentViewModel.isSubmitting || isTransitioningAfterSuccess,
                    enabled = canSubmit && !isTransitioningAfterSuccess,
                    onConfirm = {
                        if (bearerToken != null) {
                            val onSubmitSuccess: () -> Unit = {
                                if (!isTransitioningAfterSuccess) {
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
                            }

                            if (bookingType == BookingTypeSelection.Group) {
                                bookAppointmentViewModel.submitGroup(
                                    bearerToken = bearerToken,
                                    guestServiceIds = guestRows.mapNotNull { it.serviceId },
                                    onSuccess = onSubmitSuccess,
                                )
                            } else {
                                bookAppointmentViewModel.submit(bearerToken, onSubmitSuccess)
                            }
                        } else {
                            sessionViewModel.updateAuthMessage("Session expired, please sign in again.")
                        }
                    },
                )
            },
        ) { innerPadding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    StepHeader(step = "STEP 03", title = "Confirm Appointment")
                }

                val detail = bookAppointmentViewModel.storeDetail
                if (detail != null) {
                    item {
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = BookingCardBackground,
                            ),
                            border = BorderStroke(1.dp, BookingCardStroke),
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Text(
                                    text = detail.name,
                                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                                    color = Color.White,
                                )
                                Text(
                                    text = detail.formattedAddress,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = BookingSecondaryText,
                                )
                                Text(
                                    "Timezone: ${detail.time_zone ?: "Local"}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color.White.copy(alpha = 0.50f),
                                )
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
                    BookingSectionCard(
                        title = "Select Service",
                        subtitle = "Choose from store service list",
                    ) {
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
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BookingGold,
                                        selectedLabelColor = Color.Black,
                                    ),
                                )
                            }
                        }
                    }
                }

                item {
                    BookingSectionCard(
                        title = "Select Technician",
                        subtitle = "Optional",
                    ) {
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            FilterChip(
                                selected = bookAppointmentViewModel.selectedTechnicianId == null,
                                onClick = { bookAppointmentViewModel.chooseTechnician(null) },
                                label = { Text("Any") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BookingGold,
                                    selectedLabelColor = Color.Black,
                                ),
                            )
                            bookAppointmentViewModel.technicians.forEach { tech ->
                                FilterChip(
                                    selected = tech.id == bookAppointmentViewModel.selectedTechnicianId,
                                    onClick = { bookAppointmentViewModel.chooseTechnician(tech.id) },
                                    label = { Text(tech.name) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BookingGold,
                                        selectedLabelColor = Color.Black,
                                    ),
                                )
                            }
                        }
                    }
                }

                item {
                    BookingSectionCard(
                        title = "Select Date",
                    ) {
                        BookingCalendar(
                            displayedMonth = displayedMonth,
                            today = todayInStoreZone,
                            selectedDate = bookAppointmentViewModel.selectedDate,
                            onPreviousMonth = {
                                if (canGoToPreviousMonth(displayedMonth, todayInStoreZone)) {
                                    displayedMonth = displayedMonth.minusMonths(1)
                                }
                            },
                            onNextMonth = { displayedMonth = displayedMonth.plusMonths(1) },
                            onSelectDate = { date ->
                                bookAppointmentViewModel.chooseDate(date)
                            },
                        )
                    }
                }

                item {
                    BookingSectionCard(
                        title = "Select Time",
                        subtitle = "Times are based on store hours and staff availability.",
                    ) {
                        if (bookAppointmentViewModel.isLoadingSlots) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                CircularProgressIndicator()
                                Text("Loading available times...")
                            }
                        } else if (bookAppointmentViewModel.availableSlots.isEmpty()) {
                            Text(
                                bookAppointmentViewModel.slotHintMessage ?: "No available times for this date.",
                                color = MaterialTheme.colorScheme.error,
                            )
                        } else {
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
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = BookingGold,
                                            selectedLabelColor = Color.Black,
                                        ),
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    BookingTypeCard(
                        bookingType = bookingType,
                        onSelectSingle = { bookingType = BookingTypeSelection.Single },
                        onSelectGroup = {
                            bookingType = BookingTypeSelection.Group
                            if (guestRows.isEmpty()) {
                                guestRows = listOf(GroupGuestRow(id = nextGuestRowId))
                                nextGuestRowId += 1
                            }
                        },
                    )
                }

                item {
                    AnimatedVisibility(
                        visible = bookingType == BookingTypeSelection.Group,
                        enter = fadeIn(animationSpec = tween(durationMillis = 220)) +
                            expandVertically(animationSpec = tween(durationMillis = 240)),
                        exit = fadeOut(animationSpec = tween(durationMillis = 140)) +
                            shrinkVertically(animationSpec = tween(durationMillis = 180)),
                    ) {
                        GroupGuestServicesCard(
                            services = bookAppointmentViewModel.services,
                            guestRows = guestRows,
                            onUpdateGuestService = { rowId, serviceId ->
                                guestRows = guestRows.map { row ->
                                    if (row.id == rowId) row.copy(serviceId = serviceId) else row
                                }
                            },
                            onAddGuest = {
                                guestRows = guestRows + GroupGuestRow(id = nextGuestRowId)
                                nextGuestRowId += 1
                            },
                            onRemoveGuest = { rowId ->
                                guestRows = guestRows.filterNot { it.id == rowId }
                            },
                        )
                    }
                }

                item {
                    PayAtSalonCard()
                }

                item {
                    BookingSectionCard(
                        title = "Notes",
                        subtitle = "Add special requests or reminders for the salon (optional).",
                    ) {
                        OutlinedTextField(
                            value = bookAppointmentViewModel.notes,
                            onValueChange = { bookAppointmentViewModel.notes = it },
                            label = { Text("Optional notes", color = Color.White.copy(alpha = 0.64f)) },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedContainerColor = Color.White.copy(alpha = 0.04f),
                                unfocusedContainerColor = Color.White.copy(alpha = 0.04f),
                                focusedBorderColor = BookingGold.copy(alpha = 0.36f),
                                unfocusedBorderColor = BookingGold.copy(alpha = 0.22f),
                                cursorColor = BookingGold,
                            ),
                        )
                    }
                }

                item {
                    Text(
                        "By confirming, you agree to contact the salon if you need changes.",
                        style = MaterialTheme.typography.bodySmall,
                        color = BookingSecondaryText,
                    )
                }
            }
        }

        if (bookAppointmentViewModel.isLoading) {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = BookingCardBackground),
                modifier = Modifier.align(Alignment.Center),
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = BookingGold,
                    )
                    Text(
                        text = "Loading...",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = Color.White.copy(alpha = 0.72f),
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = showBookingSuccessOverlay,
            enter = fadeIn(animationSpec = tween(durationMillis = 200)) +
                scaleIn(initialScale = 0.97f, animationSpec = tween(durationMillis = 200)),
            exit = fadeOut(animationSpec = tween(durationMillis = 150)) +
                scaleOut(targetScale = 0.98f, animationSpec = tween(durationMillis = 150)),
            modifier = Modifier.align(Alignment.Center),
        ) {
            BookingSuccessOverlay()
        }
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
private fun PayAtSalonCard() {
    val shape = RoundedCornerShape(14.dp)
    Card(
        shape = shape,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            BookingCardBackground,
                            Color.White.copy(alpha = 0.03f),
                            BookingGold.copy(alpha = 0.08f),
                        ),
                    ),
                )
                .border(
                    width = 1.dp,
                    color = BookingGold.copy(alpha = 0.28f),
                    shape = shape,
                ),
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "PAY AT SALON",
                    style = MaterialTheme.typography.labelSmall,
                    color = BookingGold,
                    fontWeight = FontWeight.Bold,
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BookingGold.copy(alpha = 0.14f))
                            .border(
                                width = 1.dp,
                                color = BookingGold.copy(alpha = 0.30f),
                                shape = RoundedCornerShape(12.dp),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.CheckCircle,
                            contentDescription = "Safe",
                            tint = BookingGold,
                            modifier = Modifier.size(30.dp),
                        )
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Pay at Salon",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            )
                            SafeSecureBadge()
                        }

                        Text(
                            text = "Your appointment is secured instantly. No prepayment or deposit is required today.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BookingSecondaryText,
                        )
                        Text(
                            text = "Just show up and pay after your service.",
                            style = MaterialTheme.typography.bodySmall,
                            color = BookingSecondaryText,
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(Color.White.copy(alpha = 0.12f)),
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .width(86.dp)
                            .height(36.dp),
                    ) {
                        PaymentMethodBadge(
                            label = "C",
                            modifier = Modifier.align(Alignment.CenterStart),
                        )
                        PaymentMethodBadge(
                            label = "A",
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .offset(x = 18.dp),
                        )
                        PaymentMethodBadge(
                            label = "$",
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .offset(x = 36.dp),
                        )
                    }

                    Text(
                        text = "Accepted: Credit Card, Apple Pay, Cash",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.56f),
                        fontStyle = FontStyle.Italic,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun SafeSecureBadge() {
    val shimmer = rememberInfiniteTransition(label = "safeSecureShimmer")
    val shimmerOffset by shimmer.animateFloat(
        initialValue = -80f,
        targetValue = 160f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1300, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "safeSecureShimmerOffset",
    )
    val badgeShape = RoundedCornerShape(999.dp)

    Box(
        modifier = Modifier
            .clip(badgeShape)
            .background(BookingGold.copy(alpha = 0.16f))
            .border(
                width = 1.dp,
                color = BookingGold.copy(alpha = 0.36f),
                shape = badgeShape,
            ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.White.copy(alpha = 0.34f),
                            Color.Transparent,
                        ),
                        start = Offset(shimmerOffset, 0f),
                        end = Offset(shimmerOffset + 64f, 64f),
                    ),
                ),
        )
        Text(
            text = "SAFE & SECURE",
            style = MaterialTheme.typography.labelSmall,
            color = BookingGold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun PaymentMethodBadge(
    label: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(34.dp)
            .clip(CircleShape)
            .background(Color(0xFF1A2948))
            .border(
                width = 1.5.dp,
                color = Color.Black.copy(alpha = 0.72f),
                shape = CircleShape,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White.copy(alpha = 0.88f),
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun BookingTypeCard(
    bookingType: BookingTypeSelection,
    onSelectSingle: () -> Unit,
    onSelectGroup: () -> Unit,
) {
    val singleScale by animateFloatAsState(
        targetValue = if (bookingType == BookingTypeSelection.Single) 1.02f else 1f,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
        label = "bookingTypeSingleScale",
    )
    val groupScale by animateFloatAsState(
        targetValue = if (bookingType == BookingTypeSelection.Group) 1.02f else 1f,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
        label = "bookingTypeGroupScale",
    )

    BookingSectionCard(
        title = "Booking Type",
        subtitle = "Choose single booking or group booking with friends.",
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(
                selected = bookingType == BookingTypeSelection.Single,
                onClick = onSelectSingle,
                label = {
                    Text(
                        text = "Single",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = BookingGold,
                    selectedLabelColor = Color.Black,
                ),
                modifier = Modifier
                    .weight(1f)
                    .scale(singleScale),
            )
            FilterChip(
                selected = bookingType == BookingTypeSelection.Group,
                onClick = onSelectGroup,
                label = {
                    Text(
                        text = "Group (Friends)",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = BookingGold,
                    selectedLabelColor = Color.Black,
                ),
                modifier = Modifier
                    .weight(1f)
                    .scale(groupScale),
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GroupGuestServicesCard(
    services: List<ServiceItem>,
    guestRows: List<GroupGuestRow>,
    onUpdateGuestService: (rowId: Long, serviceId: Int) -> Unit,
    onAddGuest: () -> Unit,
    onRemoveGuest: (rowId: Long) -> Unit,
) {
    BookingSectionCard(
        title = "Group Guest Services",
        subtitle = "Host uses selected service. Each guest needs one service.",
    ) {
        if (guestRows.isEmpty()) {
            Text(
                "No guests added yet.",
                style = MaterialTheme.typography.bodySmall,
                color = BookingSecondaryText,
            )
        } else {
            guestRows.forEachIndexed { index, row ->
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White.copy(alpha = 0.02f),
                    ),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .animateContentSize(animationSpec = tween(durationMillis = 180)),
                ) {
                    Column(
                        modifier = Modifier.padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Guest ${index + 1}",
                            style = MaterialTheme.typography.titleSmall,
                            color = Color.White,
                        )
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            services.forEach { service ->
                                val isSelected = row.serviceId == service.id
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onUpdateGuestService(row.id, service.id) },
                                    label = { Text(service.name) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BookingGold,
                                        selectedLabelColor = Color.Black,
                                    ),
                                )
                            }
                        }
                        Button(
                            onClick = { onRemoveGuest(row.id) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Transparent,
                                contentColor = Color(0xFFE85A5A),
                            ),
                            border = BorderStroke(1.dp, Color(0xFFE85A5A).copy(alpha = 0.9f)),
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Text("Remove Guest")
                        }
                    }
                }
            }
        }

        Button(
            onClick = onAddGuest,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.Transparent,
                contentColor = BookingGold,
            ),
            border = BorderStroke(1.dp, BookingGold.copy(alpha = 0.45f)),
            shape = RoundedCornerShape(10.dp),
        ) {
            Text("Add Guest")
        }
    }
}

@Composable
private fun StepHeader(step: String, title: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f))
            .padding(top = 12.dp, bottom = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(1.dp),
    ) {
        Text(
            text = step,
            style = MaterialTheme.typography.labelSmall.copy(
                letterSpacing = 2.2.sp,
                fontSize = 11.sp,
            ),
            color = BookingGold,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
            ),
            color = Color.White,
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.08f)),
        )
    }
}

@Composable
private fun BookingSectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(animationSpec = tween(durationMillis = 220)),
        colors = CardDefaults.cardColors(
            containerColor = BookingCardBackground,
        ),
        border = BorderStroke(1.dp, BookingCardStroke),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = title.uppercase(Locale.US),
                style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.8.sp),
                color = BookingGold,
                fontWeight = FontWeight.Bold,
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = BookingSecondaryText,
                )
            }
            content()
        }
    }
}

@Composable
private fun BookingCalendar(
    displayedMonth: YearMonth,
    today: LocalDate,
    selectedDate: LocalDate,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onSelectDate: (LocalDate) -> Unit,
) {
    val monthDays = remember(displayedMonth) { calendarDaysForMonth(displayedMonth) }
    val canGoPrevious = remember(displayedMonth, today) {
        canGoToPreviousMonth(displayedMonth, today)
    }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White.copy(alpha = 0.04f),
        ),
        border = BorderStroke(1.dp, BookingGold.copy(alpha = 0.22f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = displayedMonth.atDay(1).format(MONTH_HEADER_FORMATTER),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = Color.White,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onPreviousMonth, enabled = canGoPrevious) {
                    Icon(
                        imageVector = Icons.Filled.ChevronLeft,
                        contentDescription = "Previous month",
                        tint = if (canGoPrevious) {
                            BookingGold
                        } else {
                            Color.White.copy(alpha = 0.24f)
                        },
                    )
                }
                IconButton(onClick = onNextMonth) {
                    Icon(
                        imageVector = Icons.Filled.ChevronRight,
                        contentDescription = "Next month",
                        tint = BookingGold,
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                CALENDAR_WEEKDAY_HEADERS.forEach { dayLabel ->
                    Text(
                        text = dayLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.36f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            monthDays.chunked(7).forEach { week ->
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    week.forEach { day ->
                        BookingCalendarDayCell(
                            day = day,
                            selectedDate = selectedDate,
                            today = today,
                            onSelectDate = onSelectDate,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RowScope.BookingCalendarDayCell(
    day: LocalDate?,
    selectedDate: LocalDate,
    today: LocalDate,
    onSelectDate: (LocalDate) -> Unit,
) {
    if (day == null) {
        Box(
            modifier = Modifier
                .weight(1f)
                .height(38.dp),
        )
        return
    }

    val isSelected = day == selectedDate
    val isPast = day.isBefore(today)
    val isToday = day == today
    val dayTextTarget = when {
        isPast -> Color.White.copy(alpha = 0.28f)
        isSelected -> Color.Black
        isToday -> BookingGold
        else -> Color.White
    }
    val textColor by animateColorAsState(
        targetValue = dayTextTarget,
        animationSpec = tween(durationMillis = 150),
        label = "calendarDayTextColor",
    )
    val borderColor by animateColorAsState(
        targetValue = if (!isSelected && isToday) {
            BookingGold.copy(alpha = 0.45f)
        } else {
            Color.Transparent
        },
        animationSpec = tween(durationMillis = 150),
        label = "calendarDayBorderColor",
    )
    val backgroundColor by animateColorAsState(
        targetValue = if (isSelected) BookingGold else Color.Transparent,
        animationSpec = tween(durationMillis = 150),
        label = "calendarDayBackgroundColor",
    )
    val dayScale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1f,
        animationSpec = spring(dampingRatio = 0.82f, stiffness = 650f),
        label = "calendarDayScale",
    )

    Box(
        modifier = Modifier
            .weight(1f)
            .height(38.dp)
            .scale(dayScale)
            .border(
                width = 1.dp,
                color = borderColor,
                shape = CircleShape,
            )
            .background(
                color = backgroundColor,
                shape = CircleShape,
            )
            .clickable(enabled = !isPast) {
                onSelectDate(day)
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = day.dayOfMonth.toString(),
            style = MaterialTheme.typography.bodyMedium,
            color = textColor,
            fontWeight = if (isSelected || isToday) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

@Composable
private fun BookingBottomBar(
    serviceTitle: String,
    selectedTime: String,
    priceText: String,
    isSubmitting: Boolean,
    enabled: Boolean,
    onConfirm: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(BookingBackground.copy(alpha = 0.96f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color.White.copy(alpha = 0.04f),
            ),
            border = BorderStroke(1.dp, BookingGold.copy(alpha = 0.16f)),
            modifier = Modifier
                .fillMaxWidth()
                .animateContentSize(animationSpec = tween(durationMillis = 180)),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    AnimatedContent(
                        targetState = serviceTitle,
                        label = "bookingSummaryServiceTitle",
                    ) { value ->
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White,
                            maxLines = 1,
                        )
                    }
                }
                Text("•", modifier = Modifier.padding(horizontal = 6.dp))
                Box(modifier = Modifier.weight(1f)) {
                    AnimatedContent(
                        targetState = selectedTime,
                        label = "bookingSummarySelectedTime",
                    ) { value ->
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodySmall,
                            color = BookingSecondaryText,
                            maxLines = 1,
                        )
                    }
                }
                Box(modifier = Modifier.width(68.dp)) {
                    AnimatedContent(
                        targetState = priceText,
                        label = "bookingSummaryPriceText",
                    ) { value ->
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodyMedium,
                            color = BookingGold,
                        )
                    }
                }
            }
        }

        Button(
            onClick = onConfirm,
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = BookingGold,
                contentColor = Color.Black,
                disabledContainerColor = Color.White.copy(alpha = 0.14f),
                disabledContentColor = Color.White.copy(alpha = 0.56f),
            ),
            shape = RoundedCornerShape(12.dp),
        ) {
            AnimatedContent(
                targetState = if (isSubmitting) "Booking..." else "Confirm Appointment",
                label = "bookingConfirmButtonLabel",
            ) { value ->
                Text(
                    text = value,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
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
            colors = CardDefaults.cardColors(containerColor = BookingCardBackground),
            border = BorderStroke(1.dp, BookingGold.copy(alpha = 0.24f)),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = "Success",
                    tint = BookingGold,
                )
                Text(
                    text = "Appointment booked",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                )
                Text(
                    "Redirecting to appointments...",
                    style = MaterialTheme.typography.bodySmall,
                    color = BookingSecondaryText,
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

private fun currentBackendWeekdayIndex(storeTimeZone: String?): Int {
    // java.time DayOfWeek: Monday = 1 ... Sunday = 7 -> backend: 0..6
    val zoneId = parseStoreZoneId(storeTimeZone)
    return LocalDate.now(zoneId).dayOfWeek.value - 1
}

private fun parseStoreZoneId(storeTimeZone: String?): ZoneId {
    val raw = storeTimeZone?.trim().orEmpty()
    if (raw.isEmpty()) return ZoneId.systemDefault()
    return runCatching { ZoneId.of(raw) }.getOrDefault(ZoneId.systemDefault())
}

private fun hoursTextForDay(
    storeHours: List<StoreHour>,
    dayIndex: Int,
): String {
    val row = storeHours.firstOrNull { it.day_of_week == dayIndex } ?: return "Closed"
    if (row.is_closed) return "Closed"
    val open = formatStoreHourLabel(row.open_time)
    val close = formatStoreHourLabel(row.close_time)
    if (open == "-" || close == "-") return "Closed"
    return "$open - $close"
}

private val STORE_HOUR_INPUT_FORMATTERS: List<DateTimeFormatter> =
    listOf(
        DateTimeFormatter.ofPattern("HH:mm:ss", Locale.US),
        DateTimeFormatter.ofPattern("HH:mm", Locale.US),
    )
private val STORE_HOUR_OUTPUT_FORMATTER: DateTimeFormatter =
    DateTimeFormatter.ofPattern("h:mm a", Locale.US)

private fun formatStoreHourLabel(raw: String?): String {
    val text = raw?.trim().orEmpty()
    if (text.isEmpty()) return "-"
    STORE_HOUR_INPUT_FORMATTERS.forEach { formatter ->
        runCatching { LocalTime.parse(text, formatter) }.getOrNull()?.let { parsed ->
            return parsed.format(STORE_HOUR_OUTPUT_FORMATTER)
        }
    }
    return text
}

private fun normalizedContact(value: String?): String? {
    val text = value?.trim().orEmpty()
    return text.takeIf { it.isNotEmpty() }
}

private fun normalizedMailtoTarget(value: String?): String? {
    val text = normalizedContact(value) ?: return null
    return runCatching {
        URI("mailto:$text")
        text
    }.getOrNull()
}

private fun openDialer(context: Context, phone: String): Boolean {
    val digits = phone.filter { it.isDigit() }
    if (digits.isBlank()) return false
    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$digits"))
    return runCatching {
        context.startActivity(intent)
        true
    }.getOrDefault(false)
}

private fun openEmailClient(context: Context, email: String): Boolean {
    val target = normalizedMailtoTarget(email) ?: return false
    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$target"))
    return runCatching {
        context.startActivity(intent)
        true
    }.getOrDefault(false)
}

private fun calendarDaysForMonth(month: YearMonth): List<LocalDate?> {
    val firstDay = month.atDay(1)
    val leadingEmpty = firstDay.dayOfWeek.value % 7
    val values = MutableList<LocalDate?>(leadingEmpty) { null }

    for (day in 1..month.lengthOfMonth()) {
        values.add(month.atDay(day))
    }

    val trailingEmpty = (7 - (values.size % 7)) % 7
    repeat(trailingEmpty) { values.add(null) }
    return values
}

private fun canGoToPreviousMonth(displayedMonth: YearMonth, today: LocalDate): Boolean {
    val previousMonthEnd = displayedMonth.minusMonths(1).atEndOfMonth()
    return !previousMonthEnd.isBefore(today)
}

private val CALENDAR_WEEKDAY_HEADERS: List<String> =
    listOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT")

private val MONTH_HEADER_FORMATTER: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US)
