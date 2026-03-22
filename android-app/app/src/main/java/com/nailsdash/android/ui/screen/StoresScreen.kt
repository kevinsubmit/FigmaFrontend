package com.nailsdash.android.ui.screen

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImagePainter
import coil.compose.rememberAsyncImagePainter
import com.nailsdash.android.benchmark.BenchmarkOverrides
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreImage
import com.nailsdash.android.ui.component.ImagePrefetchEffect
import com.nailsdash.android.ui.component.ReportScreenDrawnWhen
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.StoreSortOption
import com.nailsdash.android.ui.state.StoresViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import java.util.Locale

private val StoreListBackground = Color.Black
private val StoreListCardBackground = Color(0xFF111111)
private val StoreListGold = Color(0xFFD4AF37)
private val StoreListCardStroke = StoreListGold.copy(alpha = 0.22f)

@Composable
fun StoresScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenStore: (storeId: Int) -> Unit = {},
    onBack: () -> Unit = {},
    hideTabBar: Boolean = false,
    showBackButton: Boolean = true,
    storesViewModel: StoresViewModel = viewModel(),
) {
    val context = LocalContext.current
    var noticeMessage by rememberSaveable { mutableStateOf<String?>(null) }
    var pendingNearestSelection by rememberSaveable { mutableStateOf(false) }
    val requestLocationPermission = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val location = resolveLastKnownLocation(context)
            if (location != null) {
                storesViewModel.updateUserLocation(location.latitude, location.longitude)
                if (pendingNearestSelection) {
                    storesViewModel.onSortSelected(StoreSortOption.Nearest)
                }
            } else if (pendingNearestSelection) {
                storesViewModel.onSortSelected(StoreSortOption.Recommended)
                noticeMessage = "Location unavailable. Please enable location services and try Nearest again."
            }
        } else if (pendingNearestSelection) {
            storesViewModel.onSortSelected(StoreSortOption.Recommended)
            noticeMessage = "Location permission is required to sort by Nearest."
        }
        pendingNearestSelection = false
        if (storesViewModel.stores.isEmpty()) {
            storesViewModel.load()
        }
    }
    val applyNearestSortOrExplain = {
        if (hasLocationPermission(context)) {
            val location = resolveLastKnownLocation(context)
            if (location != null) {
                storesViewModel.updateUserLocation(location.latitude, location.longitude)
                storesViewModel.onSortSelected(StoreSortOption.Nearest)
            } else {
                storesViewModel.onSortSelected(StoreSortOption.Recommended)
                noticeMessage = "Location unavailable. Please enable location services and try Nearest again."
            }
            pendingNearestSelection = false
        } else {
            pendingNearestSelection = true
            requestLocationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    LaunchedEffect(Unit) {
        if (BenchmarkOverrides.isEnabled()) {
            storesViewModel.load(force = true)
            return@LaunchedEffect
        }
        if (hasLocationPermission(context)) {
            val location = resolveLastKnownLocation(context)
            if (location != null) {
                storesViewModel.updateUserLocation(location.latitude, location.longitude)
            } else {
                storesViewModel.load()
            }
        } else {
            storesViewModel.load()
            requestLocationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }
    LaunchedEffect(storesViewModel.errorMessage) {
        val message = storesViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    ReportScreenDrawnWhen(
        isReady = storesViewModel.initialLoadResolved && !storesViewModel.isLoading,
    )

    val styleReference = sessionViewModel.bookingStyleReference

    Scaffold(
        bottomBar = {
            if (styleReference != null) {
                BookingStyleReferenceBottomBar {
                    BookingStyleReferenceCard(
                        reference = styleReference,
                        onClear = { sessionViewModel.clearBookingStyleReference() },
                    )
                }
            }
        },
        containerColor = StoreListBackground,
    ) { innerPadding ->
        ImagePrefetchEffect(
            urls = storesViewModel.stores.flatMap { store ->
                storeCardImages(
                    store = store,
                    images = storesViewModel.storeImages[store.id].orEmpty(),
                ).mapNotNull(AssetUrlResolver::resolveURL)
            },
            maxCount = 14,
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = innerPadding.calculateBottomPadding())
                .background(StoreListBackground),
        ) {
            StoreListHeaderBlock(
                selected = storesViewModel.selectedSort,
                onSelect = { option ->
                    if (option == StoreSortOption.Nearest) {
                        applyNearestSortOrExplain()
                    } else {
                        pendingNearestSelection = false
                        storesViewModel.onSortSelected(option)
                    }
                },
                showBackButton = showBackButton,
                onBack = {
                    if (!hideTabBar) {
                        sessionViewModel.resetBookFlowSource()
                    }
                    onBack()
                },
            )

            Box(modifier = Modifier.fillMaxSize()) {
                if (storesViewModel.stores.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                    ) {
                        if (!storesViewModel.isLoading) {
                            StoreListEmptyCard()
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 14.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        itemsIndexed(storesViewModel.stores, key = { _, item -> item.id }) { index, store ->
                            storesViewModel.loadMoreIfNeeded(index)
                            storesViewModel.loadStoreRatingIfNeeded(store.id)
                            storesViewModel.loadStoreImagesIfNeeded(store.id)
                            StoreListCard(
                                store = store,
                                rating = storesViewModel.displayRating(store),
                                images = storesViewModel.storeImages[store.id].orEmpty(),
                                onOpenStore = { onOpenStore(store.id) },
                            )
                        }

                        if (storesViewModel.isLoadingMore) {
                            item {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        strokeWidth = 2.dp,
                                        color = StoreListGold,
                                    )
                                }
                            }
                        }
                    }
                }

                if (storesViewModel.isLoading) {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = StoreListCardBackground),
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
                                color = StoreListGold,
                            )
                            Text(
                                text = "Loading stores...",
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
private fun StoreListHeaderBlock(
    selected: StoreSortOption,
    onSelect: (StoreSortOption) -> Unit,
    showBackButton: Boolean,
    onBack: () -> Unit,
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
        StoreListTopHeader(
            showBackButton = showBackButton,
            onBack = onBack,
        )
        StoreSortHeader(selected = selected, onSelect = onSelect)
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
    }
}

@Composable
private fun StoreListTopHeader(
    showBackButton: Boolean,
    onBack: () -> Unit,
) {
    val backInteraction = remember { MutableInteractionSource() }

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
                text = "STEP 01",
                color = StoreListGold,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                lineHeight = 11.sp,
                letterSpacing = 2.2.sp,
            )
            Text(
                text = "Choose a salon",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                lineHeight = 17.sp,
            )
        }

        if (showBackButton) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .size(38.dp)
                    .background(Color.White.copy(alpha = 0.07f), CircleShape)
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
}

@Composable
private fun StoreSortHeader(
    selected: StoreSortOption,
    onSelect: (StoreSortOption) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(start = 16.dp, top = 4.dp, end = 16.dp, bottom = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        StoreSortOption.entries.forEach { option ->
            val active = option == selected
            val optionInteraction = remember(option) { MutableInteractionSource() }
            val optionScale by animateFloatAsState(
                targetValue = if (active) 1f else 0.97f,
                animationSpec = spring(dampingRatio = 0.78f, stiffness = 520f),
                label = "storeSortOptionScale",
            )
            val containerColor by animateColorAsState(
                targetValue = if (active) StoreListGold else Color.White.copy(alpha = 0.04f),
                animationSpec = tween(durationMillis = 180),
                label = "storeSortOptionContainerColor",
            )
            val contentColor by animateColorAsState(
                targetValue = if (active) Color.Black else Color.White.copy(alpha = 0.86f),
                animationSpec = tween(durationMillis = 180),
                label = "storeSortOptionContentColor",
            )
            Box(
                modifier = Modifier
                    .heightIn(min = 40.dp)
                    .scale(optionScale)
                    .clip(RoundedCornerShape(999.dp))
                    .background(containerColor)
                    .border(
                        width = 1.dp,
                        color = if (active) Color.Transparent else StoreListGold.copy(alpha = 0.24f),
                        shape = RoundedCornerShape(999.dp),
                    )
                    .clickable(
                        interactionSource = optionInteraction,
                        indication = null,
                        onClick = { onSelect(option) },
                    )
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = option.label,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = contentColor,
                )
            }
        }
    }
}

@Composable
private fun StoreListEmptyCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = StoreListCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, StoreListCardStroke),
    ) {
        Text(
            text = "No stores available right now.",
            color = Color.White.copy(alpha = 0.74f),
            modifier = Modifier.padding(14.dp),
        )
    }
}

@Composable
private fun StoreListCard(
    store: Store,
    rating: Double,
    images: List<StoreImage>,
    onOpenStore: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val imageUrls = storeCardImages(store, images)
    val hero = imageUrls.firstOrNull()
    val thumbs = imageUrls.drop(1).take(4)
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val cardScale by animateFloatAsState(
        targetValue = if (pressed) 0.985f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "storeCardScale",
    )
    val cardElevation by animateDpAsState(
        targetValue = if (pressed) 3.dp else 7.dp,
        animationSpec = tween(durationMillis = 120),
        label = "storeCardElevation",
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(cardScale)
            .semantics { contentDescription = "benchmark-store-${store.id}" }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onOpenStore,
            ),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = StoreListCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, StoreListCardStroke),
        elevation = CardDefaults.cardElevation(defaultElevation = cardElevation),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(232.dp)
                    .padding(horizontal = 10.dp, vertical = 10.dp)
                    .clip(RoundedCornerShape(12.dp)),
            ) {
                StoreImageBlock(
                    imageUrl = hero,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.76f)),
                                startY = 180f,
                            ),
                        ),
                )
                Text(
                    text = String.format(Locale.US, "%.1f★", rating),
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .padding(10.dp)
                        .background(StoreListGold, CircleShape)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                        .align(Alignment.TopStart),
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                repeat(4) { index ->
                    StoreImageBlock(
                        imageUrl = thumbs.getOrNull(index),
                        modifier = Modifier
                            .weight(1f)
                            .height(82.dp)
                            .clip(RoundedCornerShape(10.dp)),
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 12.dp, top = 12.dp, end = 12.dp, bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    text = store.name,
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = store.formattedAddress,
                    color = Color.White.copy(alpha = 0.64f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Normal,
                    lineHeight = 18.sp,
                )
            }
        }
    }
}

@Composable
private fun StoreImageBlock(
    imageUrl: String?,
    modifier: Modifier = Modifier,
) {
    val imageModel = remember(imageUrl) { AssetUrlResolver.resolveURL(imageUrl) }
    val imagePainter = rememberAsyncImagePainter(model = imageModel)

    Box(modifier = modifier) {
        if (imageModel != null) {
            Image(
                painter = imagePainter,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
        }

        when {
            imageModel == null -> {
                StoreFallbackCover(modifier = Modifier.matchParentSize())
            }
            imagePainter.state is AsyncImagePainter.State.Success -> Unit
            imagePainter.state is AsyncImagePainter.State.Loading ||
                imagePainter.state is AsyncImagePainter.State.Empty -> {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(Color.White.copy(alpha = 0.04f)),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = StoreListGold,
                    )
                }
            }
            imagePainter.state is AsyncImagePainter.State.Error -> {
                StoreFallbackCover(modifier = Modifier.matchParentSize())
            }
        }
    }
}

@Composable
private fun StoreFallbackCover(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.background(
            Brush.linearGradient(
                colors = listOf(
                    Color(0xFF272110),
                    Color(0xFF141414),
                    Color.Black,
                ),
            ),
        ),
    )
}

private fun storeCardImages(store: Store, images: List<StoreImage>): List<String> {
    val mapped = images.mapNotNull { it.image_url.takeIf(String::isNotBlank) }
    if (mapped.isNotEmpty()) return mapped.take(5)
    val fallback = store.image_url?.takeIf { it.isNotBlank() } ?: return emptyList()
    return listOf(fallback)
}

private fun hasLocationPermission(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
}

private fun resolveLastKnownLocation(context: Context): Location? {
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
    val providers = listOf(
        LocationManager.GPS_PROVIDER,
        LocationManager.NETWORK_PROVIDER,
        LocationManager.PASSIVE_PROVIDER,
    )
    return providers
        .asSequence()
        .mapNotNull { provider ->
            runCatching { manager.getLastKnownLocation(provider) }.getOrNull()
        }
        .maxByOrNull { it.time }
}

@Composable
private fun BookingStyleReferenceBottomBar(
    content: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f)),
    ) {
        Spacer(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.08f)),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 10.dp, end = 16.dp, bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            content()
        }
    }
}
