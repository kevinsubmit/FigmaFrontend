package com.nailsdash.android.ui.screen
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import coil.compose.AsyncImagePainter
import coil.compose.rememberAsyncImagePainter
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.model.StoreHour
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.model.StoreReview
import com.nailsdash.android.data.model.Technician
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.BookAppointmentViewModel
import com.nailsdash.android.ui.state.BookingStyleReference
import com.nailsdash.android.ui.state.StoreDetailViewModel
import com.nailsdash.android.utils.AppDateTimeFormatterCache
import com.nailsdash.android.utils.AssetUrlResolver
import java.net.URI
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class BookingTypeSelection {
    Single,
    Group,
}

enum class BookAppointmentPresentationStyle {
    FullPage,
    BottomSheet,
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreDetailScreen(
    storeId: Int,
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit,
    onBookingCompleted: () -> Unit,
    requestedTabLabel: String? = null,
    onRequestedTabConsumed: () -> Unit = {},
    onOpenPortfolio: (Int) -> Unit = {},
    storeDetailViewModel: StoreDetailViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val styleReference = sessionViewModel.bookingStyleReference
    val selectedServices = storeDetailViewModel.selectedServices()
    val selectedTab = storeDetailViewModel.currentTabLabel()
    val uiScope = rememberCoroutineScope()
    val context = LocalContext.current
    var showMapChooser by remember(storeId) { mutableStateOf(false) }
    var mapLaunchError by remember(storeId) { mutableStateOf<String?>(null) }
    var noticeMessage by remember(storeId) { mutableStateOf<String?>(null) }
    var favoriteToast by remember(storeId) { mutableStateOf<StoreDetailToastPayload?>(null) }
    var showFullHours by remember(storeId) { mutableStateOf(false) }
    var showBookServicesSheet by remember(storeId) { mutableStateOf(false) }
    var bookSheetServiceIds by remember(storeId) { mutableStateOf<List<Int>>(emptyList()) }
    var showReviewGallery by remember(storeId) { mutableStateOf(false) }
    var reviewGalleryImages by remember(storeId) { mutableStateOf<List<String>>(emptyList()) }
    var reviewGalleryStartIndex by remember(storeId) { mutableStateOf(0) }
    val bookSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    fun showFavoriteToast(message: String, isError: Boolean) {
        favoriteToast = StoreDetailToastPayload(message = message, isError = isError)
    }

    val onToggleFavorite: () -> Unit = {
        val activeStore = storeDetailViewModel.store
        if (activeStore != null && bearerToken != null) {
            if (!storeDetailViewModel.isFavoriteLoading) {
                uiScope.launch {
                    val wasFavorited = storeDetailViewModel.isFavorited
                    storeDetailViewModel.toggleFavorite(activeStore.id, bearerToken)
                        .onSuccess { latestState ->
                            if (latestState != wasFavorited) {
                                showFavoriteToast(
                                    message = if (latestState) {
                                        "Added to favorites."
                                    } else {
                                        "Removed from favorites."
                                    },
                                    isError = false,
                                )
                            }
                        }
                        .onFailure { err ->
                            showFavoriteToast(
                                message = err.message ?: "Failed to update favorite state.",
                                isError = true,
                            )
                        }
                }
            }
        } else {
            showFavoriteToast("Please sign in to save favorites.", isError = true)
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
    LaunchedEffect(requestedTabLabel) {
        val target = requestedTabLabel?.trim().orEmpty()
        if (target.isNotEmpty()) {
            storeDetailViewModel.pickTab(target)
            onRequestedTabConsumed()
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
    LaunchedEffect(favoriteToast?.id) {
        val payload = favoriteToast ?: return@LaunchedEffect
        delay(2200)
        if (favoriteToast?.id == payload.id) {
            favoriteToast = null
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BookingBackground),
    ) {
        Scaffold(
            containerColor = BookingBackground,
            bottomBar = {
                if (selectedTab == "Services" && selectedServices.isNotEmpty()) {
                    StoreDetailSelectedServicesBar(
                        services = selectedServices,
                        onContinue = {
                            bookSheetServiceIds = selectedServices.map { it.id }
                            showBookServicesSheet = true
                        },
                    )
                }
            },
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = innerPadding.calculateBottomPadding())
                    .background(BookingBackground),
            ) {
                StoreDetailTopBar(onBack = onBack)

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {

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
                                itemsIndexed(storeDetailViewModel.services, key = { _, service -> service.id }) { index, service ->
                                    val selected = storeDetailViewModel.selectedServiceIds.contains(service.id)
                                    StoreServiceRow(
                                        service = service,
                                        selected = selected,
                                        showDivider = index != storeDetailViewModel.services.lastIndex,
                                        onToggle = { storeDetailViewModel.toggleServiceSelection(service.id) },
                                    )
                                }
                            }

                            "Reviews" -> {
                                item {
                                    StoreDetailReviewsSection(
                                        ratingText = storeDetailViewModel.ratingText(),
                                        reviewCountText = storeDetailViewModel.reviewCountText(),
                                        reviews = storeDetailViewModel.reviews,
                                        onOpenReviewImage = { imageUrls, startIndex ->
                                            if (imageUrls.isNotEmpty()) {
                                                reviewGalleryImages = imageUrls
                                                reviewGalleryStartIndex = startIndex.coerceIn(0, imageUrls.lastIndex)
                                                showReviewGallery = true
                                            }
                                        },
                                    )
                                }
                            }

                    "Portfolio" -> {
                        if (storeDetailViewModel.portfolio.isEmpty()) {
                            item {
                                Text(
                                    text = "No portfolio images yet.",
                                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                                    color = BookingSecondaryText,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 24.dp),
                                    textAlign = TextAlign.Center,
                                )
                            }
                        } else {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 2.dp, vertical = 6.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    storeDetailViewModel.portfolio.chunked(2).forEach { rowItems ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            StorePortfolioCard(
                                                row = rowItems.first(),
                                                onClick = { onOpenPortfolio(rowItems.first().id) },
                                                modifier = Modifier.weight(1f),
                                            )
                                            if (rowItems.size > 1) {
                                                StorePortfolioCard(
                                                    row = rowItems[1],
                                                    onClick = { onOpenPortfolio(rowItems[1].id) },
                                                    modifier = Modifier.weight(1f),
                                                )
                                            } else {
                                                Spacer(modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                }
                            }
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

        if (showBookServicesSheet && bookSheetServiceIds.isNotEmpty()) {
            ModalBottomSheet(
                onDismissRequest = { showBookServicesSheet = false },
                sheetState = bookSheetState,
                dragHandle = null,
                containerColor = Color(0xFF121212),
                contentColor = Color.White,
            ) {
                BookAppointmentScreen(
                    storeId = storeId,
                    preselectedServiceId = bookSheetServiceIds.firstOrNull(),
                    preselectedServiceIds = bookSheetServiceIds,
                    sessionViewModel = sessionViewModel,
                    presentationStyle = BookAppointmentPresentationStyle.BottomSheet,
                    onClose = { showBookServicesSheet = false },
                    onBookSuccess = {
                        showBookServicesSheet = false
                        onBookingCompleted()
                    },
                )
            }
        }

        if (showReviewGallery && reviewGalleryImages.isNotEmpty()) {
            StoreReviewImageViewerDialog(
                imageUrls = reviewGalleryImages,
                initialIndex = reviewGalleryStartIndex,
                onDismiss = { showReviewGallery = false },
            )
        }

        favoriteToast?.let { payload ->
            StoreDetailToast(
                payload = payload,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 56.dp, start = 12.dp, end = 12.dp),
            )
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
                verticalArrangement = Arrangement.spacedBy(1.dp),
            ) {
                Text(
                    text = "STEP 02",
                    style = MaterialTheme.typography.labelSmall.copy(
                        letterSpacing = 2.2.sp,
                        fontSize = 11.sp,
                        lineHeight = 11.sp,
                    ),
                    color = BookingGold,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Book Services",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        lineHeight = 17.sp,
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
                val labelColor = if (selected) {
                    Color.White
                } else {
                    Color.White.copy(alpha = 0.56f)
                }
                val indicatorColor = if (selected) {
                    BookingGold
                } else {
                    Color.Transparent
                }
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
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
                            fontSize = 12.sp,
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
                            .background(indicatorColor),
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
    showDivider: Boolean,
    onToggle: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(if (selected) BookingGold.copy(alpha = 0.08f) else Color.Transparent)
                .clickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onClick = onToggle,
                )
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = service.name,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = if (selected) BookingGold else Color.White,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "$${String.format(Locale.US, "%.2f", service.price)}+",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = Color.White,
                    )
                    Box(
                        modifier = Modifier
                            .size(3.dp)
                            .background(
                                color = Color.White.copy(alpha = 0.35f),
                                shape = CircleShape,
                            ),
                    )
                    Text(
                        text = "${service.duration_minutes}m",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                        color = BookingSecondaryText,
                    )
                }
            }

            Row(
                modifier = Modifier
                    .heightIn(min = 40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selected) BookingGold else Color.Transparent)
                    .border(
                        width = if (selected) 0.dp else 1.dp,
                        color = BookingGold,
                        shape = RoundedCornerShape(10.dp),
                    )
                    .clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        onClick = onToggle,
                    )
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (selected) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = null,
                        modifier = Modifier.size(10.dp),
                        tint = Color.Black,
                    )
                }
                Text(
                    text = if (selected) "ADDED" else "ADD",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = if (selected) Color.Black else BookingGold,
                )
            }
        }

        if (showDivider) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color.White.copy(alpha = 0.08f)),
            )
        }
    }
}

@Composable
private fun StoreDetailSelectedServicesBar(
    services: List<ServiceItem>,
    onContinue: () -> Unit,
) {
    val serviceCountText = "${services.size} ${if (services.size == 1) "SERVICE" else "SERVICES"} SELECTED"
    val priceText = selectedServicesPriceText(services)
    val durationText = selectedServicesDurationText(services)
    val continueInteraction = remember { MutableInteractionSource() }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.12f)),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = serviceCountText,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.2.sp,
                    ),
                    color = BookingSecondaryText,
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(
                            text = priceText,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                            ),
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = "Est. Total",
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                            color = BookingSecondaryText,
                            maxLines = 1,
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(28.dp)
                            .background(Color.White.copy(alpha = 0.18f)),
                    )

                    Icon(
                        imageVector = Icons.Filled.AccessTime,
                        contentDescription = null,
                        tint = BookingGold,
                        modifier = Modifier.size(13.dp),
                    )
                    Text(
                        text = durationText,
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                        color = BookingSecondaryText,
                    )
                }
            }

            Box(
                modifier = Modifier
                    .widthIn(min = 180.dp)
                    .height(66.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(BookingGold)
                    .clickable(
                        interactionSource = continueInteraction,
                        indication = null,
                        onClick = onContinue,
                    )
                    .padding(horizontal = 22.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Continue",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = Color.Black,
                )
            }
        }
    }
}

private fun formatStoreDetailDuration(minutes: Int): String {
    val hours = minutes / 60
    val mins = minutes % 60
    return if (hours > 0) {
        "${hours}h ${mins}m"
    } else {
        "${mins}m"
    }
}

private fun selectedServicesTotalPrice(services: List<ServiceItem>): Double = services.sumOf { it.price }

private fun selectedServicesTotalDurationMinutes(services: List<ServiceItem>): Int =
    services.sumOf { it.duration_minutes }

private fun selectedServicesPriceText(
    services: List<ServiceItem>,
    fallback: String = "$0.00+",
): String {
    val total = selectedServicesTotalPrice(services)
    return if (total > 0.0) "$${String.format(Locale.US, "%.2f", total)}+" else fallback
}

private fun selectedServicesDurationText(
    services: List<ServiceItem>,
    fallback: String = "0m",
): String {
    val totalMinutes = selectedServicesTotalDurationMinutes(services)
    return if (totalMinutes > 0) formatStoreDetailDuration(totalMinutes) else fallback
}

private fun selectedServicesSummaryTitle(
    services: List<ServiceItem>,
    fallback: String = "Select service",
): String {
    if (services.isEmpty()) return fallback
    return if (services.size == 1) {
        services.first().name
    } else {
        "${services.first().name} +${services.size - 1}"
    }
}

private fun selectedServicesSummarySubtext(
    services: List<ServiceItem>,
    fallback: String = "Choose from store service list",
): String {
    if (services.isEmpty()) return fallback
    return "${selectedServicesPriceText(services, "$0.00+")} • ${selectedServicesDurationText(services, "0m")}"
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
private fun StoreDetailReviewsSection(
    ratingText: String,
    reviewCountText: String,
    reviews: List<StoreReview>,
    onOpenReviewImage: (List<String>, Int) -> Unit,
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = BookingCardBackground),
        border = BorderStroke(1.dp, BookingGold.copy(alpha = 0.22f)),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = BookingGold,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    text = ratingText,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = Color.White,
                )
                Text(
                    text = "• $reviewCountText",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = BookingSecondaryText,
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color.White.copy(alpha = 0.08f)),
            )

            if (reviews.isEmpty()) {
                Text(
                    text = "No reviews yet.",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = BookingSecondaryText,
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    reviews.forEach { review ->
                        StoreReviewCard(
                            review = review,
                            onOpenReviewImage = onOpenReviewImage,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StoreReviewCard(
    review: StoreReview,
    onOpenReviewImage: (List<String>, Int) -> Unit,
) {
    Card(
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color.White.copy(alpha = 0.02f),
        ),
        border = BorderStroke(
            width = 1.dp,
            color = Color.White.copy(alpha = 0.06f),
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
                            .background(Color.White.copy(alpha = 0.08f))
                            .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.08f))
                            .border(1.dp, Color.White.copy(alpha = 0.12f), CircleShape),
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
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = reviewDateLabel(review.created_at),
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                            color = BookingSecondaryText,
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        val rounded = review.rating.toInt().coerceIn(0, 5)
                        (1..5).forEach { idx ->
                            Text(
                                text = if (idx <= rounded) "★" else "☆",
                                color = BookingGold,
                            )
                        }
                    }
                }
            }

            val comment = review.comment?.trim().orEmpty()
            if (comment.isNotEmpty()) {
                Text(
                    text = comment,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = BookingSecondaryText,
                )
            }

            val reviewImages = review.images.orEmpty()
                .mapNotNull { AssetUrlResolver.resolveURL(it) }
            if (reviewImages.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    itemsIndexed(reviewImages) { index, imageUrl ->
                        val imageInteraction = remember(imageUrl) { MutableInteractionSource() }
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = "Review image ${index + 1}",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(74.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(
                                    width = 1.dp,
                                    color = Color.White.copy(alpha = 0.08f),
                                    shape = RoundedCornerShape(8.dp),
                                )
                                .clickable(
                                    interactionSource = imageInteraction,
                                    indication = null,
                                ) {
                                    onOpenReviewImage(reviewImages, index)
                                },
                        )
                    }
                }
            }

            val replyContent = review.reply?.content?.trim().orEmpty()
            if (replyContent.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color.White.copy(alpha = 0.05f))
                        .padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = "Reply from ${review.reply?.admin_name?.takeIf { it.isNotBlank() } ?: "Store"}",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = Color.White.copy(alpha = 0.9f),
                    )
                    Text(
                        text = replyContent,
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                        color = BookingSecondaryText,
                    )
                }
            }
        }
    }
}

@Composable
private fun StoreReviewImageViewerDialog(
    imageUrls: List<String>,
    initialIndex: Int,
    onDismiss: () -> Unit,
) {
    if (imageUrls.isEmpty()) return

    val safeIndex = initialIndex.coerceIn(0, imageUrls.lastIndex)
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = safeIndex)
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)
    val galleryScope = rememberCoroutineScope()
    val currentIndex by remember {
        derivedStateOf { listState.firstVisibleItemIndex.coerceIn(0, imageUrls.lastIndex) }
    }
    val closeInteraction = remember { MutableInteractionSource() }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            LazyRow(
                state = listState,
                flingBehavior = flingBehavior,
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                itemsIndexed(imageUrls) { index, imageUrl ->
                    Box(
                        modifier = Modifier
                            .fillParentMaxWidth()
                            .fillMaxSize()
                            .background(Color.Black),
                        contentAlignment = Alignment.Center,
                    ) {
                        val imagePainter = rememberAsyncImagePainter(model = imageUrl)
                        Image(
                            painter = imagePainter,
                            contentDescription = "Review image ${index + 1}",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize(),
                        )
                        when (imagePainter.state) {
                            is AsyncImagePainter.State.Success -> Unit
                            is AsyncImagePainter.State.Loading,
                            is AsyncImagePainter.State.Empty,
                            -> {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        strokeWidth = 2.dp,
                                        color = Color.White,
                                    )
                                }
                            }
                            is AsyncImagePainter.State.Error -> {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center,
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Photo,
                                        contentDescription = null,
                                        tint = Color.White.copy(alpha = 0.82f),
                                        modifier = Modifier.size(24.dp),
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Image unavailable",
                                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                                        color = Color.White.copy(alpha = 0.80f),
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 20.dp, end = 16.dp),
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "${(currentIndex + 1).coerceAtMost(imageUrls.size)}/${imageUrls.size}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = Color.White.copy(alpha = 0.9f),
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color.Black.copy(alpha = 0.50f))
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                )

                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.55f))
                        .clickable(
                            interactionSource = closeInteraction,
                            indication = null,
                            onClick = onDismiss,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Close viewer",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            if (imageUrls.size > 1) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    imageUrls.indices.forEach { idx ->
                        val selected = idx == currentIndex
                        val dotWidth by animateDpAsState(
                            targetValue = if (selected) 14.dp else 6.dp,
                            label = "reviewViewerDotWidth",
                        )
                        val dotColor by animateColorAsState(
                            targetValue = if (selected) {
                                Color.White.copy(alpha = 0.92f)
                            } else {
                                Color.White.copy(alpha = 0.46f)
                            },
                            label = "reviewViewerDotColor",
                        )
                        Box(
                            modifier = Modifier
                                .width(dotWidth)
                                .height(6.dp)
                                .background(dotColor, RoundedCornerShape(999.dp))
                                .clickable {
                                    if (idx != currentIndex) {
                                        galleryScope.launch { listState.animateScrollToItem(idx) }
                                    }
                                },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StorePortfolioCard(
    row: StorePortfolio,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val image = AssetUrlResolver.resolveURL(row.image_url)
    Card(
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
            .fillMaxWidth()
            .height(214.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.02f)),
        border = BorderStroke(
            width = 1.dp,
            color = Color.White.copy(alpha = 0.08f),
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
                        .background(Color.Gray.copy(alpha = 0.20f)),
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.55f)),
                            startY = 0f,
                        ),
                    ),
            )
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
                horizontalArrangement = Arrangement.spacedBy(0.dp),
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
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colorStops = arrayOf(
                                0.5f to Color.Transparent,
                                1f to Color.Black.copy(alpha = 0.55f),
                            ),
                        ),
                    ),
            )

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
                        modifier = Modifier.size(16.dp),
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
                                BookingGold
                            } else {
                                Color.White.copy(alpha = 0.5f)
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
    AppDateTimeFormatterCache.formatLongDate(text)?.let { formatted ->
        return formatted
    }
    if (text.length >= 10) return text.take(10)
    return if (text.isNotEmpty()) text else "-"
}

@Composable
private fun BookingStoreHeroCard(store: StoreDetail) {
    val resolvedUrls = remember(store.images) {
        store.images
            .mapNotNull { img -> AssetUrlResolver.resolveURL(img.image_url) }
            .distinct()
    }
    val listState = rememberLazyListState()
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)
    val currentIndex by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex.coerceIn(0, (resolvedUrls.size - 1).coerceAtLeast(0))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 2.dp, vertical = 2.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (resolvedUrls.isNotEmpty()) {
            Card(
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp),
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    LazyRow(
                        state = listState,
                        flingBehavior = flingBehavior,
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        itemsIndexed(resolvedUrls) { index, imageUrl ->
                            AsyncImage(
                                model = imageUrl,
                                contentDescription = "${store.name} image ${index + 1}",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillParentMaxWidth()
                                    .fillMaxSize(),
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.45f)),
                                ),
                            ),
                    )

                    if (resolvedUrls.size > 1) {
                        Row(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(end = 10.dp, bottom = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            resolvedUrls.indices.forEach { idx ->
                                val selected = idx == currentIndex
                                val dotWidth by animateDpAsState(
                                    targetValue = if (selected) 14.dp else 6.dp,
                                    label = "bookingHeroIndicatorWidth",
                                )
                                val dotColor by animateColorAsState(
                                    targetValue = if (selected) BookingGold else Color.White.copy(alpha = 0.5f),
                                    label = "bookingHeroIndicatorColor",
                                )
                                Box(
                                    modifier = Modifier
                                        .width(dotWidth)
                                        .height(6.dp)
                                        .background(dotColor, RoundedCornerShape(999.dp)),
                                )
                            }
                        }
                    }
                }
            }
        }

        Text(
            text = store.name,
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = Color.White,
        )
        Text(
            text = store.formattedAddress,
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
            color = BookingSecondaryText,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = "Store rating",
                tint = BookingGold,
                modifier = Modifier.size(12.dp),
            )
            Text(
                text = String.format(Locale.US, "%.1f", store.rating),
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = Color.White,
            )
            Text(
                text = "(${store.review_count} reviews)",
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                color = BookingGold,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BookAppointmentScreen(
    storeId: Int,
    preselectedServiceId: Int?,
    preselectedServiceIds: List<Int> = emptyList(),
    sessionViewModel: AppSessionViewModel,
    presentationStyle: BookAppointmentPresentationStyle = BookAppointmentPresentationStyle.FullPage,
    onClose: (() -> Unit)? = null,
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
    var showServicePickerMenu by remember(storeId) { mutableStateOf(false) }
    val uiScope = rememberCoroutineScope()

    LaunchedEffect(storeId, preselectedServiceId, preselectedServiceIds.joinToString(",")) {
        bookAppointmentViewModel.loadData(storeId = storeId, preselectedServiceId = preselectedServiceId)

        val preferredServiceIds = if (preselectedServiceIds.isNotEmpty()) {
            preselectedServiceIds
        } else {
            preselectedServiceId?.let { listOf(it) } ?: emptyList()
        }

        val validServiceIds = preferredServiceIds
            .distinct()
            .filter { preferredId ->
                bookAppointmentViewModel.services.any { service -> service.id == preferredId }
            }

        if (validServiceIds.isNotEmpty()) {
            val hostServiceId = validServiceIds.first()
            if (bookAppointmentViewModel.selectedServiceId != hostServiceId) {
                bookAppointmentViewModel.chooseService(hostServiceId)
            } else {
                bookAppointmentViewModel.reloadAvailableSlots()
            }

            val guestServiceIds = validServiceIds.drop(1)
            if (guestServiceIds.isNotEmpty()) {
                bookingType = BookingTypeSelection.Group
                guestRows = guestServiceIds.mapIndexed { index, serviceId ->
                    GroupGuestRow(id = index.toLong() + 1L, serviceId = serviceId)
                }
                nextGuestRowId = guestRows.size.toLong() + 1L
            } else {
                bookingType = BookingTypeSelection.Single
                guestRows = emptyList()
                nextGuestRowId = 1L
            }
        }
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
    val sheetHeaderServiceChips = remember(
        preselectedServiceIds,
        bookAppointmentViewModel.services,
        selectedService?.id,
    ) {
        val preferredChips = preselectedServiceIds
            .distinct()
            .mapNotNull { serviceId ->
                bookAppointmentViewModel.services.firstOrNull { it.id == serviceId }
        }
        if (preferredChips.isEmpty()) listOfNotNull(selectedService) else preferredChips
    }
    val summaryServices = remember(sheetHeaderServiceChips, selectedService?.id) {
        if (sheetHeaderServiceChips.isNotEmpty()) {
            sheetHeaderServiceChips
        } else {
            listOfNotNull(selectedService)
        }
    }
    val selectedServiceSubtext = selectedServicesSummarySubtext(summaryServices)
    val successServicesText = remember(sheetHeaderServiceChips, selectedService?.name) {
        val names = sheetHeaderServiceChips.map { it.name }
        when {
            names.isEmpty() -> selectedService?.name ?: "-"
            names.size == 1 -> "Host: ${names.first()}"
            else -> names.joinToString(separator = ", ")
        }
    }
    val successTotalText = remember(summaryServices) {
        selectedServicesPriceText(summaryServices)
    }
    val selectedTime = bookAppointmentViewModel.selectedSlot?.let { bookAppointmentViewModel.displayTime(it) } ?: "Select a time"
    val successTimeText = remember(
        bookAppointmentViewModel.selectedDate,
        bookAppointmentViewModel.selectedSlot,
        selectedTime,
    ) {
        val dateText = bookAppointmentViewModel.selectedDate.format(BOOKING_SUCCESS_DATE_FORMATTER)
        val timeText = selectedTime
        "$dateText at $timeText"
    }
    val summaryPriceText = selectedServicesPriceText(summaryServices, "-")
    val isBottomSheetPresentation = presentationStyle == BookAppointmentPresentationStyle.BottomSheet
    val guestServicesComplete = guestRows.isNotEmpty() && guestRows.all { it.serviceId != null }
    val canSubmit = selectedService != null &&
        bookAppointmentViewModel.selectedSlot != null &&
        (bookingType == BookingTypeSelection.Single || guestServicesComplete)

    val summaryServiceTitle = when {
        selectedService == null -> "Select a service"
        bookingType == BookingTypeSelection.Group && guestRows.isNotEmpty() ->
            "${selectedService.name} + ${guestRows.size} guest${if (guestRows.size > 1) "s" else ""}"
        summaryServices.size > 1 -> selectedServicesSummaryTitle(summaryServices)
        else -> selectedService.name
    }
    val slotHintText = when {
        bookAppointmentViewModel.availableSlots.isEmpty() ->
            "Times are based on store hours and staff availability."
        !bookAppointmentViewModel.slotHintMessage.isNullOrBlank() ->
            bookAppointmentViewModel.slotHintMessage!!
        else ->
            "Times are based on store hours and staff availability."
    }
    val blockedSlotWarning = bookAppointmentViewModel.slotHintMessage
        ?.takeIf {
            it.isNotBlank() &&
                bookAppointmentViewModel.availableSlots.isNotEmpty() &&
                it.lowercase(Locale.US).contains("blocked")
        }
    val confirmButtonTitle = if (isBottomSheetPresentation) "Confirm Appointment" else "Create Appointment"
    val handleConfirmBooking: () -> Unit = {
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
                bookAppointmentViewModel.submit(
                    bearerToken = bearerToken,
                    additionalServices = summaryServices,
                    onSuccess = onSubmitSuccess,
                )
            }
        } else {
            sessionViewModel.updateAuthMessage("Session expired, please sign in again.")
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BookingBackground),
    ) {
        Scaffold(
            containerColor = BookingBackground,
            bottomBar = {
                if (!isBottomSheetPresentation) {
                    BookingBottomBar(
                        serviceTitle = summaryServiceTitle,
                        selectedTime = selectedTime,
                        priceText = summaryPriceText,
                        isSubmitting = bookAppointmentViewModel.isSubmitting || isTransitioningAfterSuccess,
                        enabled = canSubmit,
                        confirmButtonLabel = confirmButtonTitle,
                        onConfirm = handleConfirmBooking,
                    )
                }
            },
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = innerPadding.calculateBottomPadding()),
            ) {
                if (!isBottomSheetPresentation) {
                    BookingFullPageTopBar(
                        step = "STEP 02",
                        title = "Book Services",
                        onBack = onClose,
                    )
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp)
                        .padding(top = if (isBottomSheetPresentation) 12.dp else 10.dp)
                        .padding(bottom = if (isBottomSheetPresentation) 8.dp else 28.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (isBottomSheetPresentation) {
                        item {
                            BookingBottomSheetHeader()
                        }
                    }

                val detail = bookAppointmentViewModel.storeDetail
                if (!isBottomSheetPresentation && detail != null) {
                    item {
                        BookingStoreHeroCard(store = detail)
                    }
                }

                if (isBottomSheetPresentation) {
                    item {
                        BookingSheetServicesHeaderCard(
                            selectedService = selectedService,
                            selectedServiceChips = sheetHeaderServiceChips,
                        )
                    }
                } else {
                    item {
                        BookingSectionCard(
                            title = "Select Service",
                        ) {
                            val serviceRowInteraction = remember { MutableInteractionSource() }
                            Box(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(min = 44.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.White.copy(alpha = 0.04f))
                                        .border(
                                            width = 1.dp,
                                            color = BookingGold.copy(alpha = 0.26f),
                                            shape = RoundedCornerShape(12.dp),
                                        )
                                        .clickable(
                                            interactionSource = serviceRowInteraction,
                                            indication = null,
                                        ) {
                                            showServicePickerMenu = true
                                        }
                                        .padding(horizontal = 14.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Column(
                                        modifier = Modifier.weight(1f),
                                        verticalArrangement = Arrangement.spacedBy(2.dp),
                                    ) {
                                        Text(
                                            text = selectedService?.name ?: "Select Service",
                                            style = MaterialTheme.typography.titleSmall.copy(
                                                fontSize = 17.sp,
                                                fontWeight = FontWeight.SemiBold,
                                            ),
                                            color = Color.White,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                        Text(
                                            text = selectedServiceSubtext,
                                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                                            color = BookingSecondaryText,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                    Icon(
                                        imageVector = Icons.Filled.ChevronRight,
                                        contentDescription = "Open service selector",
                                        tint = BookingSecondaryText,
                                        modifier = Modifier.size(14.dp),
                                    )
                                }

                                DropdownMenu(
                                    expanded = showServicePickerMenu,
                                    onDismissRequest = { showServicePickerMenu = false },
                                ) {
                                    bookAppointmentViewModel.services.forEach { service ->
                                        DropdownMenuItem(
                                            text = {
                                                Text(
                                                    "${service.name} • $${String.format(Locale.US, "%.2f", service.price)}",
                                                )
                                            },
                                            onClick = {
                                                bookAppointmentViewModel.chooseService(service.id)
                                                showServicePickerMenu = false
                                            },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                if (!isBottomSheetPresentation) {
                    item {
                        BookingTechnicianCard(
                            selectedTechnicianId = bookAppointmentViewModel.selectedTechnicianId,
                            technicians = bookAppointmentViewModel.technicians,
                            onChooseTechnician = { bookAppointmentViewModel.chooseTechnician(it) },
                        )
                    }
                }

                item {
                    BookingDateTimeCard(
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
                        isLoadingSlots = bookAppointmentViewModel.isLoadingSlots,
                        availableSlots = bookAppointmentViewModel.availableSlots,
                        selectedSlot = bookAppointmentViewModel.selectedSlot,
                        onSelectSlot = { slot ->
                            bookAppointmentViewModel.selectSlot(slot)
                        },
                        displaySlotTime = { slot ->
                            bookAppointmentViewModel.displayTime(slot)
                        },
                        slotHintText = slotHintText,
                        noSlotsMessage = bookAppointmentViewModel.slotHintMessage
                            ?: "No available times for this date.",
                        blockedSlotWarning = blockedSlotWarning,
                    )
                }

                if (isBottomSheetPresentation) {
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
                        if (bookingType == BookingTypeSelection.Group) {
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
                        BookingTechnicianCard(
                            selectedTechnicianId = bookAppointmentViewModel.selectedTechnicianId,
                            technicians = bookAppointmentViewModel.technicians,
                            onChooseTechnician = { bookAppointmentViewModel.chooseTechnician(it) },
                        )
                    }
                    item {
                        PayAtSalonCard()
                    }
                    item {
                        BookingBottomSheetSummaryAndActions(
                            storeDetail = detail,
                            selectedServices = summaryServices,
                            selectedTime = selectedTime,
                            priceText = summaryPriceText,
                            isSubmitting = bookAppointmentViewModel.isSubmitting || isTransitioningAfterSuccess,
                            enabled = canSubmit,
                            confirmButtonLabel = confirmButtonTitle,
                            onConfirm = handleConfirmBooking,
                            onChangeService = onClose,
                        )
                    }
                }

                if (!isBottomSheetPresentation) {
                    item {
                        BookingSectionCard(
                            title = "Notes",
                            subtitle = "Add special requests or reminders for the salon (optional).",
                        ) {
                            val notesShape = RoundedCornerShape(12.dp)
                            BasicTextField(
                                value = bookAppointmentViewModel.notes,
                                onValueChange = { bookAppointmentViewModel.notes = it },
                                textStyle = MaterialTheme.typography.bodyMedium.copy(
                                    color = Color.White,
                                    fontSize = 16.sp,
                                ),
                                cursorBrush = SolidColor(BookingGold),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 88.dp),
                                minLines = 4,
                                maxLines = 7,
                                decorationBox = { innerTextField ->
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(
                                                color = Color.White.copy(alpha = 0.04f),
                                                shape = notesShape,
                                            )
                                            .border(
                                                width = 1.dp,
                                                color = BookingGold.copy(alpha = 0.26f),
                                                shape = notesShape,
                                            )
                                            .padding(horizontal = 12.dp, vertical = 10.dp),
                                    ) {
                                        if (bookAppointmentViewModel.notes.isBlank()) {
                                            Text(
                                                text = "Optional notes",
                                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 16.sp),
                                                color = Color.White.copy(alpha = 0.64f),
                                            )
                                        }
                                        innerTextField()
                                    }
                                },
                            )
                        }
                    }
                }
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
            enter = fadeIn(animationSpec = tween(durationMillis = 200)),
            exit = fadeOut(animationSpec = tween(durationMillis = 150)),
            modifier = Modifier.align(Alignment.Center),
        ) {
            BookingSuccessOverlay(
                servicesText = successServicesText,
                totalText = successTotalText,
                timeText = successTimeText,
            )
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
    val shape = RoundedCornerShape(16.dp)
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
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        modifier = Modifier
                            .size(74.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BookingGold.copy(alpha = 0.13f))
                            .border(
                                width = 1.dp,
                                color = BookingGold.copy(alpha = 0.30f),
                                shape = RoundedCornerShape(12.dp),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Security,
                            contentDescription = "Secure payment",
                            tint = BookingGold,
                            modifier = Modifier.size(26.dp),
                        )
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Pay at Salon",
                                style = MaterialTheme.typography.titleMedium.copy(fontSize = 17.sp),
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            )
                            SafeSecureBadge()
                        }

                        Column(
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(
                                text = "Your appointment is secured instantly. No",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                ),
                                color = Color.White.copy(alpha = 0.64f),
                                maxLines = 2,
                            )
                            Text(
                                text = "prepayment or deposit is required today.",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                ),
                                color = Color.White.copy(alpha = 0.64f),
                                maxLines = 2,
                            )
                            Text(
                                text = "Just show up and pay after your service.",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                ),
                                color = Color.White.copy(alpha = 0.64f),
                                maxLines = 2,
                            )
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(Color.White.copy(alpha = 0.10f)),
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .width(94.dp)
                            .height(38.dp),
                    ) {
                        PaymentMethodBadge(
                            label = "C",
                            modifier = Modifier.align(Alignment.CenterStart),
                        )
                        PaymentMethodBadge(
                            label = "A",
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .offset(x = 28.dp),
                        )
                        PaymentMethodBadge(
                            label = "$",
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .offset(x = 56.dp),
                        )
                    }

                    Text(
                        text = "Accepted: Credit Card, Apple Pay, Cash",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        color = Color.White.copy(alpha = 0.56f),
                        fontStyle = FontStyle.Italic,
                        maxLines = 2,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun SafeSecureBadge() {
    val badgeShape = RoundedCornerShape(999.dp)

    Text(
        text = "Safe & Secure",
        style = MaterialTheme.typography.labelSmall.copy(
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        ),
        color = BookingGold,
        modifier = Modifier
            .clip(badgeShape)
            .background(Color.Black.copy(alpha = 0.22f))
            .border(
                width = 1.dp,
                color = BookingGold.copy(alpha = 0.36f),
                shape = badgeShape,
            )
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

@Composable
private fun PaymentMethodBadge(
    label: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(Color(0xFF1A2948))
            .border(
                width = 2.dp,
                color = Color.Black.copy(alpha = 0.78f),
                shape = CircleShape,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge.copy(
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = Color.White.copy(alpha = 0.85f),
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun BookingTechnicianCard(
    selectedTechnicianId: Int?,
    technicians: List<Technician>,
    onChooseTechnician: (Int?) -> Unit,
) {
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
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "SELECT TECHNICIAN",
                    style = MaterialTheme.typography.labelSmall.copy(
                        letterSpacing = 2.sp,
                        fontSize = 12.sp,
                    ),
                    color = BookingSecondaryText,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "OPTIONAL",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                    color = BookingGold,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(BookingGold.copy(alpha = 0.16f))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }

            Text(
                text = "Tap a preferred technician or choose Any.",
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                color = BookingSecondaryText,
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(horizontal = 2.dp),
            ) {
                item {
                    BookingTechnicianChip(
                        name = "Any",
                        selected = selectedTechnicianId == null,
                        onClick = { onChooseTechnician(null) },
                    )
                }
                items(technicians, key = { it.id }) { tech ->
                    BookingTechnicianChip(
                        name = tech.name,
                        selected = selectedTechnicianId == tech.id,
                        onClick = { onChooseTechnician(tech.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun BookingTechnicianChip(
    name: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val borderColor by animateColorAsState(
        targetValue = if (selected) BookingGold else Color.White.copy(alpha = 0.15f),
        animationSpec = tween(durationMillis = 150),
        label = "technicianChipBorderColor",
    )
    val fillColor by animateColorAsState(
        targetValue = if (selected) BookingGold.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.02f),
        animationSpec = tween(durationMillis = 150),
        label = "technicianChipFillColor",
    )
    val iconColor by animateColorAsState(
        targetValue = if (selected) BookingGold else Color.White.copy(alpha = 0.58f),
        animationSpec = tween(durationMillis = 150),
        label = "technicianChipIconColor",
    )
    val textColor by animateColorAsState(
        targetValue = if (selected) BookingGold else Color.White,
        animationSpec = tween(durationMillis = 150),
        label = "technicianChipTextColor",
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(7.dp),
        modifier = Modifier.clickable(
            interactionSource = interactionSource,
            indication = null,
            onClick = onClick,
        ),
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(fillColor)
                .border(2.dp, borderColor, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(20.dp),
            )
        }
        Text(
            text = name,
            style = MaterialTheme.typography.labelMedium.copy(
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = textColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(80.dp),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun BookingDateTimeCard(
    displayedMonth: YearMonth,
    today: LocalDate,
    selectedDate: LocalDate,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onSelectDate: (LocalDate) -> Unit,
    isLoadingSlots: Boolean,
    availableSlots: List<String>,
    selectedSlot: String?,
    onSelectSlot: (String) -> Unit,
    displaySlotTime: (String) -> String,
    slotHintText: String,
    noSlotsMessage: String,
    blockedSlotWarning: String?,
) {
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
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "SELECT DATE",
                style = MaterialTheme.typography.labelSmall.copy(
                    letterSpacing = 2.sp,
                    fontSize = 12.sp,
                ),
                color = BookingSecondaryText,
                fontWeight = FontWeight.Bold,
            )

            BookingCalendar(
                displayedMonth = displayedMonth,
                today = today,
                selectedDate = selectedDate,
                onPreviousMonth = onPreviousMonth,
                onNextMonth = onNextMonth,
                onSelectDate = onSelectDate,
            )

            Text(
                text = "SELECT TIME",
                style = MaterialTheme.typography.labelSmall.copy(
                    letterSpacing = 2.sp,
                    fontSize = 12.sp,
                ),
                color = BookingSecondaryText,
                fontWeight = FontWeight.Bold,
            )

            if (isLoadingSlots) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = BookingGold,
                    )
                    Text(
                        text = "Loading available times...",
                        color = BookingSecondaryText,
                    )
                }
            } else if (availableSlots.isEmpty()) {
                Text(
                    text = noSlotsMessage,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = Color.Red.copy(alpha = 0.95f),
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    availableSlots.chunked(4).forEach { rowSlots ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            rowSlots.forEach { slot ->
                                val selected = slot == selectedSlot
                                val interactionSource = remember(slot, selectedSlot) { MutableInteractionSource() }
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .heightIn(min = 40.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (selected) BookingGold else Color.White.copy(alpha = 0.04f))
                                        .border(
                                            width = 1.dp,
                                            color = if (selected) Color.Transparent else BookingGold.copy(alpha = 0.25f),
                                            shape = RoundedCornerShape(10.dp),
                                        )
                                        .clickable(
                                            interactionSource = interactionSource,
                                            indication = null,
                                            onClick = { onSelectSlot(slot) },
                                        )
                                        .padding(horizontal = 4.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = displaySlotTime(slot),
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium,
                                        ),
                                        color = if (selected) Color.Black else Color.White,
                                        maxLines = 1,
                                        softWrap = false,
                                    )
                                }
                            }
                            repeat(4 - rowSlots.size) {
                                Spacer(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(40.dp),
                                )
                            }
                        }
                    }
                }
            }

            Text(
                text = slotHintText.uppercase(Locale.US),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 11.sp,
                    letterSpacing = 1.6.sp,
                ),
                color = BookingSecondaryText,
                fontWeight = FontWeight.SemiBold,
            )

            if (!blockedSlotWarning.isNullOrBlank()) {
                Text(
                    text = blockedSlotWarning,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = Color.Red.copy(alpha = 0.92f),
                )
            }
        }
    }
}

@Composable
private fun BookingTypeCard(
    bookingType: BookingTypeSelection,
    onSelectSingle: () -> Unit,
    onSelectGroup: () -> Unit,
) {
    BookingSectionCard(
        title = "Booking Type",
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            BookingTypeOptionButton(
                label = "Single",
                selected = bookingType == BookingTypeSelection.Single,
                onClick = onSelectSingle,
                modifier = Modifier
                    .weight(1f)
            )
            BookingTypeOptionButton(
                label = "Group (Friends)",
                selected = bookingType == BookingTypeSelection.Group,
                onClick = onSelectGroup,
                modifier = Modifier
                    .weight(1f)
            )
        }
    }
}

@Composable
private fun BookingTypeOptionButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(10.dp)
    val interactionSource = remember { MutableInteractionSource() }
    val backgroundColor by animateColorAsState(
        targetValue = if (selected) {
            BookingGold.copy(alpha = 0.14f)
        } else {
            Color.White.copy(alpha = 0.04f)
        },
        animationSpec = tween(durationMillis = 150),
        label = "bookingTypeOptionBackground",
    )
    val borderColor by animateColorAsState(
        targetValue = if (selected) BookingGold else Color.White.copy(alpha = 0.16f),
        animationSpec = tween(durationMillis = 150),
        label = "bookingTypeOptionBorder",
    )
    val textColor by animateColorAsState(
        targetValue = if (selected) BookingGold else Color.White.copy(alpha = 0.8f),
        animationSpec = tween(durationMillis = 150),
        label = "bookingTypeOptionText",
    )

    Box(
        modifier = modifier
            .heightIn(min = 58.dp)
            .clip(shape)
            .background(backgroundColor)
            .border(1.dp, borderColor, shape)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
            color = textColor,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
        )
    }
}

@Composable
private fun GroupGuestServicesCard(
    services: List<ServiceItem>,
    guestRows: List<GroupGuestRow>,
    onUpdateGuestService: (rowId: Long, serviceId: Int) -> Unit,
    onAddGuest: () -> Unit,
    onRemoveGuest: (rowId: Long) -> Unit,
) {
    var expandedRowId by remember { mutableStateOf<Long?>(null) }

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
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Host uses selected service. Each guest needs one service.",
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                color = BookingSecondaryText,
            )

            guestRows.forEachIndexed { index, row ->
                val selectedGuestServiceName = services.firstOrNull { it.id == row.serviceId }?.name ?: "Select service"
                val servicePickerInteraction = remember(row.id) { MutableInteractionSource() }
                val removeInteraction = remember(row.id) { MutableInteractionSource() }
                val controlShape = RoundedCornerShape(10.dp)

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .animateContentSize(animationSpec = tween(durationMillis = 180)),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 44.dp)
                            .clip(controlShape)
                            .background(Color.White.copy(alpha = 0.02f))
                            .border(1.dp, Color.White.copy(alpha = 0.14f), controlShape)
                            .padding(horizontal = 14.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        Text(
                            text = "Guest ${index + 1}",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = Color.White.copy(alpha = 0.9f),
                            maxLines = 1,
                        )
                    }

                    Box(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 44.dp)
                                .clip(controlShape)
                                .background(Color.White.copy(alpha = 0.02f))
                                .border(1.dp, Color.White.copy(alpha = 0.14f), controlShape)
                                .clickable(
                                    interactionSource = servicePickerInteraction,
                                    indication = null,
                                ) {
                                    expandedRowId = row.id
                                }
                                .padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Text(
                                text = selectedGuestServiceName,
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = if (row.serviceId == null) {
                                    Color.White.copy(alpha = 0.72f)
                                } else {
                                    Color.White
                                },
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                            )
                            Icon(
                                imageVector = Icons.Filled.KeyboardArrowDown,
                                contentDescription = "Select service",
                                tint = BookingSecondaryText,
                                modifier = Modifier.size(16.dp),
                            )
                        }

                        DropdownMenu(
                            expanded = expandedRowId == row.id,
                            onDismissRequest = { expandedRowId = null },
                        ) {
                            services.forEach { service ->
                                DropdownMenuItem(
                                    text = { Text(service.name) },
                                    onClick = {
                                        onUpdateGuestService(row.id, service.id)
                                        expandedRowId = null
                                    },
                                )
                            }
                        }
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 34.dp)
                            .clip(controlShape)
                            .border(1.dp, Color.Red.copy(alpha = 0.9f), controlShape)
                            .clickable(
                                interactionSource = removeInteraction,
                                indication = null,
                            ) {
                                onRemoveGuest(row.id)
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Delete,
                            contentDescription = "Remove guest",
                            tint = Color.Red.copy(alpha = 0.9f),
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }

            val addGuestInteraction = remember { MutableInteractionSource() }
            Row(
                modifier = Modifier
                    .heightIn(min = 42.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .border(1.dp, BookingGold.copy(alpha = 0.45f), RoundedCornerShape(10.dp))
                    .clickable(
                        interactionSource = addGuestInteraction,
                        indication = null,
                        onClick = onAddGuest,
                    )
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "+",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Medium,
                    color = BookingGold,
                )
                Text(
                    text = "Add Guest",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = BookingGold,
                )
            }
        }
    }
}

@Composable
private fun BookingBottomSheetHeader() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.98f))
            .padding(top = 12.dp, bottom = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .width(168.dp)
                .height(12.dp)
                .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(999.dp)),
        )
        Box(
            modifier = Modifier
                .width(78.dp)
                .height(4.dp)
                .background(Color.White.copy(alpha = 0.22f), RoundedCornerShape(999.dp)),
        )
    }
}

@Composable
private fun BookingSheetServicesHeaderCard(
    selectedService: ServiceItem?,
    selectedServiceChips: List<ServiceItem>,
) {
    val summaryServices = if (selectedServiceChips.isNotEmpty()) selectedServiceChips else listOfNotNull(selectedService)
    val priceText = selectedServicesPriceText(summaryServices, "-")
    val durationText = selectedServicesDurationText(summaryServices, "-")
    val shimmer = rememberInfiniteTransition(label = "depositBadgeShimmer")
    val shimmerOffset by shimmer.animateFloat(
        initialValue = -180f,
        targetValue = 180f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1250, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "depositBadgeShimmerOffset",
    )
    val badgeShape = RoundedCornerShape(10.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 2.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "SERVICE SELECTION",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    letterSpacing = 2.sp,
                ),
                color = BookingSecondaryText,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )

            Box(
                modifier = Modifier
                    .width(120.dp)
                    .clip(badgeShape)
                    .background(BookingGold),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.White.copy(alpha = 0.58f),
                                    Color.Transparent,
                                ),
                                start = Offset(shimmerOffset, 0f),
                                end = Offset(shimmerOffset + 72f, 72f),
                            ),
                        ),
                )
                Text(
                    text = "NO DEPOSIT NEEDED",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 9.sp,
                        letterSpacing = 0.9.sp,
                    ),
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp, vertical = 6.dp),
                    maxLines = 1,
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = priceText,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = Color.White,
                maxLines = 1,
                textAlign = TextAlign.End,
                modifier = Modifier.widthIn(min = 72.dp),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LazyRow(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (selectedServiceChips.isEmpty()) {
                    item {
                        Text(
                            text = "Select service",
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                            color = Color.White.copy(alpha = 0.72f),
                        )
                    }
                } else {
                    items(selectedServiceChips, key = { it.id }) { service ->
                        Text(
                            text = service.name,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = Color.White.copy(alpha = 0.88f),
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .border(1.dp, Color.White.copy(alpha = 0.24f), RoundedCornerShape(10.dp))
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            maxLines = 1,
                        )
                    }
                }
            }

            Text(
                text = durationText,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = BookingSecondaryText,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun BookingBottomSheetSummaryAndActions(
    storeDetail: StoreDetail?,
    selectedServices: List<ServiceItem>,
    selectedTime: String,
    priceText: String,
    isSubmitting: Boolean,
    enabled: Boolean,
    confirmButtonLabel: String,
    onConfirm: () -> Unit,
    onChangeService: (() -> Unit)?,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.08f)),
        )
        if (storeDetail != null) {
            BookingAppointmentSummaryCard(
                storeDetail = storeDetail,
                selectedServices = selectedServices,
                selectedTime = selectedTime,
                priceText = priceText,
            )
        }
        val confirmInteraction = remember { MutableInteractionSource() }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp)
                .heightIn(min = 46.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    if (enabled) BookingGold else Color.White.copy(alpha = 0.10f),
                )
                .clickable(
                    interactionSource = confirmInteraction,
                    indication = null,
                    enabled = enabled && !isSubmitting,
                    onClick = onConfirm,
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = Color.Black,
                )
            } else {
                Text(
                    text = confirmButtonLabel,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (enabled) Color.Black else Color.White.copy(alpha = 0.66f),
                )
            }
        }
        if (onChangeService != null) {
            val changeServiceInteraction = remember { MutableInteractionSource() }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        interactionSource = changeServiceInteraction,
                        indication = null,
                        onClick = onChangeService,
                    )
                    .padding(vertical = 4.dp)
                    .navigationBarsPadding()
                    .padding(bottom = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Change Service",
                    color = Color.White.copy(alpha = 0.82f),
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun BookingAppointmentSummaryCard(
    storeDetail: StoreDetail,
    selectedServices: List<ServiceItem>,
    selectedTime: String,
    priceText: String,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = BookingCardBackground,
        ),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "APPOINTMENT SUMMARY",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        letterSpacing = 2.2.sp,
                    ),
                    color = BookingSecondaryText,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = priceText,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = BookingGold,
                )
            }
            BookingAppointmentSummaryRow(
                label = "Service",
                value = selectedServicesSummaryTitle(selectedServices),
            )
            BookingAppointmentSummaryRow(
                label = "Duration",
                value = selectedServicesDurationText(selectedServices, "-"),
            )
            BookingAppointmentSummaryRow(
                label = "Time",
                value = if (selectedTime == "Select a time") "Select date & time" else selectedTime,
            )
            BookingAppointmentSummaryRow(
                label = "Location",
                value = storeDetail.formattedAddress,
            )
        }
    }
}

@Composable
private fun BookingAppointmentSummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 14.sp),
            color = BookingSecondaryText,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.width(78.dp),
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = Color.White,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun BookingFullPageTopBar(
    step: String,
    title: String,
    onBack: (() -> Unit)?,
) {
    val backInteraction = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f))
            .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp),
    ) {
        Column(
            modifier = Modifier.align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(1.dp),
        ) {
            Text(
                text = step,
                style = MaterialTheme.typography.labelSmall.copy(
                    letterSpacing = 2.2.sp,
                    fontSize = 11.sp,
                    lineHeight = 11.sp,
                ),
                color = BookingGold,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    lineHeight = 17.sp,
                ),
                color = Color.White,
            )
        }

        if (onBack != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.07f))
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
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(Color.White.copy(alpha = 0.08f)),
    )
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
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 12.sp,
                    letterSpacing = 2.2.sp,
                ),
                color = BookingSecondaryText,
                fontWeight = FontWeight.Bold,
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
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
    val previousMonthInteraction = remember { MutableInteractionSource() }
    val nextMonthInteraction = remember { MutableInteractionSource() }

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
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = displayedMonth.atDay(1).format(MONTH_HEADER_FORMATTER),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                        color = Color.White,
                    )
                    Icon(
                        imageVector = Icons.Filled.ChevronRight,
                        contentDescription = null,
                        tint = BookingGold,
                        modifier = Modifier.size(14.dp),
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clickable(
                                interactionSource = previousMonthInteraction,
                                indication = null,
                                enabled = canGoPrevious,
                            ) { onPreviousMonth() },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.ChevronLeft,
                            contentDescription = "Previous month",
                            tint = if (canGoPrevious) {
                                BookingGold
                            } else {
                                Color.White.copy(alpha = 0.24f)
                            },
                            modifier = Modifier.size(18.dp),
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clickable(
                                interactionSource = nextMonthInteraction,
                                indication = null,
                                onClick = onNextMonth,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.ChevronRight,
                            contentDescription = "Next month",
                            tint = BookingGold,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                CALENDAR_WEEKDAY_HEADERS.forEach { dayLabel ->
                    Text(
                        text = dayLabel,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 11.sp,
                            letterSpacing = 0.6.sp,
                        ),
                        color = Color.White.copy(alpha = 0.36f),
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 18.dp),
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
                .height(40.dp),
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
    Box(
        modifier = Modifier
            .weight(1f)
            .height(40.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
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
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = textColor,
            )
        }
    }
}

@Composable
private fun BookingBottomBar(
    serviceTitle: String,
    selectedTime: String,
    priceText: String,
    isSubmitting: Boolean,
    enabled: Boolean,
    confirmButtonLabel: String,
    onConfirm: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(BookingBackground.copy(alpha = 0.96f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.08f)),
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(top = 10.dp),
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
                        .heightIn(min = 44.dp)
                        .padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AnimatedContent(
                        targetState = serviceTitle,
                        label = "bookingSummaryServiceTitle",
                        modifier = Modifier.weight(1f, fill = false),
                    ) { value ->
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Text(
                        text = "•",
                        color = BookingSecondaryText,
                        modifier = Modifier.padding(horizontal = 8.dp),
                    )
                    AnimatedContent(
                        targetState = selectedTime,
                        label = "bookingSummarySelectedTime",
                    ) { value ->
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                            color = BookingSecondaryText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    AnimatedContent(
                        targetState = priceText,
                        label = "bookingSummaryPriceText",
                    ) { value ->
                        Text(
                            text = value,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            color = BookingGold,
                        )
                    }
                }
            }

            val confirmInteraction = remember { MutableInteractionSource() }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .padding(bottom = 12.dp)
                    .heightIn(min = 46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (enabled) BookingGold else Color.White.copy(alpha = 0.10f),
                    )
                .clickable(
                    interactionSource = confirmInteraction,
                    indication = null,
                    enabled = enabled && !isSubmitting,
                    onClick = onConfirm,
                ),
                contentAlignment = Alignment.Center,
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = Color.Black,
                    )
                } else {
                    Text(
                        text = confirmButtonLabel,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (enabled) Color.Black else Color.White.copy(alpha = 0.66f),
                    )
                }
            }
        }
    }
}

@Composable
private fun BookingSuccessOverlay(
    servicesText: String,
    totalText: String,
    timeText: String,
    modifier: Modifier = Modifier,
) {
    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.96f)),
    ) {
        val compact = maxHeight < 760.dp
        val titleSize = if (compact) 42.sp else 52.sp
        val subtitleSize = if (compact) 16.sp else 17.sp
        val iconRingSize = if (compact) 92.dp else 104.dp
        val iconSize = if (compact) 50.dp else 56.dp
        val summaryLabelSize = if (compact) 16.sp else 17.sp
        val summaryValueSize = if (compact) 17.sp else 18.sp

        Column(
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = if (compact) 42.dp else 72.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .width(168.dp)
                        .height(12.dp)
                        .background(Color.White.copy(alpha = 0.92f), RoundedCornerShape(999.dp)),
                )
                Box(
                    modifier = Modifier
                        .width(78.dp)
                        .height(4.dp)
                        .background(Color.White.copy(alpha = 0.22f), RoundedCornerShape(999.dp)),
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(if (compact) 16.dp else 20.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(iconRingSize)
                        .clip(CircleShape)
                        .background(BookingGold.copy(alpha = 0.14f))
                        .border(1.dp, BookingGold.copy(alpha = 0.32f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = "Appointment set",
                        tint = BookingGold,
                        modifier = Modifier.size(iconSize),
                    )
                }

                Text(
                    text = "Appointment Set!",
                    style = MaterialTheme.typography.displayMedium.copy(
                        fontSize = titleSize,
                        fontWeight = FontWeight.Bold,
                    ),
                    color = Color.White,
                    maxLines = 1,
                )

                Text(
                    text = "We've sent a confirmation to your app notifications.",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = subtitleSize,
                        fontWeight = FontWeight.Medium,
                    ),
                    color = BookingSecondaryText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.widthIn(max = 330.dp),
                )

                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = BookingCardBackground),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
                    modifier = Modifier.widthIn(max = 430.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(
                            horizontal = if (compact) 14.dp else 16.dp,
                            vertical = if (compact) 14.dp else 16.dp,
                        ),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        BookingSuccessSummaryRow(
                            label = "Services",
                            value = servicesText,
                            labelSize = summaryLabelSize,
                            valueSize = summaryValueSize,
                        )
                        BookingSuccessSummaryRow(
                            label = "Total",
                            value = totalText,
                            highlight = true,
                            labelSize = summaryLabelSize,
                            valueSize = summaryValueSize,
                        )
                        BookingSuccessSummaryRow(
                            label = "Time",
                            value = timeText,
                            labelSize = summaryLabelSize,
                            valueSize = summaryValueSize,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun BookingSuccessSummaryRow(
    label: String,
    value: String,
    highlight: Boolean = false,
    labelSize: androidx.compose.ui.unit.TextUnit = 17.sp,
    valueSize: androidx.compose.ui.unit.TextUnit = 18.sp,
) {
    Box(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontSize = labelSize,
                    fontWeight = FontWeight.Medium,
                ),
                color = BookingSecondaryText,
            )
            Spacer(
                modifier = Modifier
                    .widthIn(min = 8.dp)
                    .weight(1f),
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontSize = valueSize,
                    fontWeight = FontWeight.Bold,
                ),
                color = if (highlight) BookingGold else Color.White,
                textAlign = TextAlign.End,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
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

@Composable
private fun StoreDetailToast(
    payload: StoreDetailToastPayload,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    if (payload.isError) Color(0xFFCC3D3D) else Color(0xFF2F9D57),
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = if (payload.isError) "!" else "✓",
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = payload.message,
                color = Color.White,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

private data class StoreDetailToastPayload(
    val message: String,
    val isError: Boolean,
    val id: Long = System.currentTimeMillis(),
)

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
private val BOOKING_SUCCESS_DATE_FORMATTER: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMM d", Locale.US)
