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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreImage
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
    storesViewModel: StoresViewModel = viewModel(),
) {
    val context = LocalContext.current
    var mapTarget by remember { mutableStateOf<Store?>(null) }
    var mapError by remember { mutableStateOf<String?>(null) }
    val requestLocationPermission = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val location = resolveLastKnownLocation(context)
            if (location != null) {
                storesViewModel.updateUserLocation(location.latitude, location.longitude)
            } else {
                storesViewModel.onLocationUnavailable("Location unavailable, showing recommended salons.")
            }
        } else {
            storesViewModel.onLocationUnavailable("Location permission denied. Using recommended salons.")
        }
        if (storesViewModel.stores.isEmpty()) {
            storesViewModel.load()
        }
    }

    LaunchedEffect(Unit) {
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(StoreListBackground),
        ) {
            StoreListTopHeader()
            StoreSortHeader(
                selected = storesViewModel.selectedSort,
                onSelect = storesViewModel::onSortSelected,
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                storesViewModel.errorMessage?.let { StoreListMessageBanner(it, isError = true) }
                storesViewModel.locationStatus?.let { StoreListMessageBanner(it, isError = false) }
                mapError?.let { StoreListMessageBanner(it, isError = true) }
            }

            if (storesViewModel.isLoading && storesViewModel.stores.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = StoreListGold)
                }
            } else if (storesViewModel.stores.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                ) {
                    StoreListEmptyCard()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(storesViewModel.stores, key = { it.id }) { store ->
                        storesViewModel.loadStoreRatingIfNeeded(store.id)
                        storesViewModel.loadStoreImagesIfNeeded(store.id)
                        StoreListCard(
                            store = store,
                            rating = storesViewModel.displayRating(store),
                            images = storesViewModel.storeImages[store.id].orEmpty(),
                            onOpenStore = { onOpenStore(store.id) },
                            onOpenMap = { mapTarget = store },
                        )
                    }
                }
            }
        }
    }

    mapTarget?.let { target ->
        MapChooserBottomSheet(
            placeTitle = target.name,
            onDismiss = { mapTarget = null },
            onChoose = { option ->
                val opened = openMapWithOption(
                    context = context,
                    option = option,
                    placeTitle = target.name,
                    address = target.formattedAddress,
                    latitude = target.latitude,
                    longitude = target.longitude,
                )
                mapTarget = null
                if (!opened) {
                    mapError = "No map app available on this device."
                } else {
                    mapError = null
                }
            },
        )
    }
}

@Composable
private fun StoreListTopHeader() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp, bottom = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = "STEP 01",
            color = StoreListGold,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            letterSpacing = 2.2.sp,
        )
        Text(
            text = "Choose a salon",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
        )
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
private fun StoreListMessageBanner(
    message: String,
    isError: Boolean,
) {
    val tone = if (isError) Color(0xFFFF8F8F) else Color.White.copy(alpha = 0.74f)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(tone.copy(alpha = if (isError) 0.10f else 0.08f), RoundedCornerShape(12.dp))
            .border(1.dp, tone.copy(alpha = 0.24f), RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = if (isError) Icons.Filled.LocationOn else Icons.Filled.Star,
            contentDescription = null,
            tint = tone,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = message,
            color = tone,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun StoreListEmptyCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
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
    onOpenMap: () -> Unit,
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
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onOpenStore,
            ),
        shape = RoundedCornerShape(16.dp),
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
                store.distance?.let { miles ->
                    val text = if (miles < 0.1) "<0.1 mi" else String.format(Locale.US, "%.1f mi", miles)
                    Text(
                        text = text,
                        color = Color.Black,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp,
                        modifier = Modifier
                            .padding(10.dp)
                            .background(Color.White.copy(alpha = 0.88f), CircleShape)
                            .padding(horizontal = 9.dp, vertical = 4.dp)
                            .align(Alignment.TopEnd),
                    )
                }
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
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = store.formattedAddress,
                    color = Color.White.copy(alpha = 0.64f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Normal,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(
                    onClick = onOpenMap,
                    modifier = Modifier.height(40.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = 0.06f),
                        contentColor = Color.White.copy(alpha = 0.88f),
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, StoreListGold.copy(alpha = 0.22f)),
                ) {
                    Icon(
                        imageVector = Icons.Filled.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(15.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "Map", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = onOpenStore,
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = StoreListGold,
                        contentColor = Color.Black,
                    ),
                ) {
                    Text(
                        text = "View Services",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun StoreImageBlock(
    imageUrl: String?,
    modifier: Modifier = Modifier,
) {
    val imageModel = AssetUrlResolver.resolveURL(imageUrl)
    if (imageModel != null) {
        AsyncImage(
            model = imageModel,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier,
        )
    } else {
        Box(
            modifier = modifier.background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF272110),
                        Color(0xFF181818),
                        Color.Black,
                    ),
                ),
            ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "NailsDash",
                color = Color.White.copy(alpha = 0.42f),
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
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
    Card(
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.96f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp, start = 12.dp, end = 12.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Spacer(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color.White.copy(alpha = 0.12f)),
            )
            content()
        }
    }
}
