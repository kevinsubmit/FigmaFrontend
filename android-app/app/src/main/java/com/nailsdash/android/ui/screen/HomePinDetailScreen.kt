package com.nailsdash.android.ui.screen

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import android.provider.MediaStore
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.HomePinDetailViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val PinDetailGold = Color(0xFFD4AF37)
private val PinDetailCardBg = Color(0xFF111111)

@Composable
fun HomePinDetailScreen(
    pinId: Int,
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit,
    onOpenPin: (Int) -> Unit,
    onChooseSalon: (HomeFeedPin) -> Unit,
    homePinDetailViewModel: HomePinDetailViewModel = viewModel(),
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val bearerToken = sessionViewModel.accessTokenOrNull()
    var isDownloading by remember(pinId) { mutableStateOf(false) }
    var showShareMenu by remember(pinId) { mutableStateOf(false) }
    var toast by remember(pinId) { mutableStateOf<PinDetailToastPayload?>(null) }
    var heroScale by remember(pinId) { mutableStateOf(1f) }
    var heroOffset by remember(pinId) { mutableStateOf(Offset.Zero) }

    fun showToast(message: String, isError: Boolean) {
        toast = PinDetailToastPayload(message = message, isError = isError)
    }

    LaunchedEffect(pinId) {
        homePinDetailViewModel.load(pinId = pinId)
        heroScale = 1f
        heroOffset = Offset.Zero
    }

    LaunchedEffect(pinId, bearerToken, homePinDetailViewModel.pin?.id) {
        homePinDetailViewModel.loadFavoriteState(bearerToken)
    }

    LaunchedEffect(homePinDetailViewModel.errorMessage) {
        val message = homePinDetailViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            showToast(message = message, isError = true)
        }
    }

    LaunchedEffect(toast?.id) {
        val payload = toast ?: return@LaunchedEffect
        kotlinx.coroutines.delay(2000)
        if (toast?.id == payload.id) {
            toast = null
        }
    }

    val pin = homePinDetailViewModel.pin
    val topControlPadding = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 18.dp

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            userScrollEnabled = heroScale <= 1.01f,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (pin != null) {
                item {
                    HeroImageSection(
                        pin = pin,
                        scale = heroScale,
                        offset = heroOffset,
                        onUpdateTransform = { nextScale, nextOffset ->
                            heroScale = nextScale
                            heroOffset = nextOffset
                        },
                        onResetTransform = {
                            heroScale = 1f
                            heroOffset = Offset.Zero
                        },
                    )
                }

                item {
                    PinTitleSection(pin = pin)
                }

                if (homePinDetailViewModel.relatedPins.isNotEmpty()) {
                    item {
                        Text(
                            text = "Similar ideas",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 12.dp),
                        )
                    }

                    items(
                        items = homePinDetailViewModel.relatedPins.chunked(2),
                        key = { row -> row.joinToString(separator = "-") { it.id.toString() } },
                    ) { row ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            row.forEach { related ->
                                RelatedPinCard(
                                    pin = related,
                                    onClick = { onOpenPin(related.id) },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (row.size == 1) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(108.dp))
                }
            } else {
                item {
                    Spacer(modifier = Modifier.height(360.dp))
                }
            }
        }

        PinDetailTopOverlay(
            topPadding = topControlPadding,
            isFavoriteLoading = homePinDetailViewModel.isFavoriteLoading,
            isFavorited = homePinDetailViewModel.isFavorited,
            isDownloading = isDownloading,
            showShareMenu = showShareMenu,
            onBack = onBack,
            onOpenShareMenu = { showShareMenu = true },
            onDismissShareMenu = { showShareMenu = false },
            onShare = {
                pin?.let { sharePin(context = context, pin = it) }
            },
            onDownload = {
                val currentPin = pin ?: return@PinDetailTopOverlay
                if (isDownloading) return@PinDetailTopOverlay
                isDownloading = true
                scope.launch {
                    downloadPinImageToGallery(context = context, pin = currentPin)
                        .onSuccess {
                            showToast(message = "Image downloaded.", isError = false)
                        }
                        .onFailure { error ->
                            showToast(
                                message = if (error is SecurityException) {
                                    "Please allow photo access."
                                } else {
                                    error.message ?: "Failed to download image."
                                },
                                isError = true,
                            )
                        }
                    isDownloading = false
                }
            },
            onToggleFavorite = {
                if (bearerToken == null) {
                    showToast(message = "Please sign in to save favorites.", isError = true)
                } else {
                    if (homePinDetailViewModel.isFavoriteLoading) return@PinDetailTopOverlay
                    scope.launch {
                        val wasFavorited = homePinDetailViewModel.isFavorited
                        homePinDetailViewModel.toggleFavorite(bearerToken)
                        val latestError = homePinDetailViewModel.errorMessage?.trim().orEmpty()
                        if (latestError.isEmpty() && homePinDetailViewModel.isFavorited != wasFavorited) {
                            showToast(
                                message = if (homePinDetailViewModel.isFavorited) {
                                    "Added to favorites."
                                } else {
                                    "Removed from favorites."
                                },
                                isError = false,
                            )
                        }
                    }
                }
            },
        )

        if (homePinDetailViewModel.isLoading && pin == null) {
            Card(
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.align(Alignment.Center),
            ) {
                Row(
                    modifier = Modifier
                        .background(PinDetailCardBg)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = PinDetailGold,
                    )
                    Text("Loading design...", color = Color.White)
                }
            }
        }

        pin?.let { currentPin ->
            FloatingBookNowStrip(
                modifier = Modifier.align(Alignment.BottomCenter),
                onChooseSalon = { onChooseSalon(currentPin) },
            )
        }

        toast?.let { payload ->
            PinDetailToast(
                payload = payload,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 56.dp, start = 12.dp, end = 12.dp),
            )
        }
    }
}

@Composable
private fun HeroImageSection(
    pin: HomeFeedPin,
    scale: Float,
    offset: Offset,
    onUpdateTransform: (scale: Float, offset: Offset) -> Unit,
    onResetTransform: () -> Unit,
) {
    BoxWithConstraints(
        modifier = Modifier.fillMaxWidth(),
    ) {
        val heroHeight = (maxWidth * 1.12f).coerceIn(360.dp, 500.dp)
        var containerWidthPx by remember(pin.id) { mutableStateOf(0f) }
        var containerHeightPx by remember(pin.id) { mutableStateOf(0f) }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(heroHeight)
                .clipToBounds()
                .onSizeChanged { size ->
                    containerWidthPx = size.width.toFloat()
                    containerHeightPx = size.height.toFloat()
                }
                .pointerInput(scale, offset, containerWidthPx, containerHeightPx) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        if (containerWidthPx <= 0f || containerHeightPx <= 0f) return@detectTransformGestures
                        val nextScale = (scale * zoom).coerceIn(1f, 4f)
                        val rawOffset = if (nextScale <= 1.01f) {
                            Offset.Zero
                        } else {
                            offset + pan
                        }
                        val clampedOffset = clampedHeroOffset(
                            offset = rawOffset,
                            scale = nextScale,
                            containerWidthPx = containerWidthPx,
                            containerHeightPx = containerHeightPx,
                        )
                        onUpdateTransform(nextScale, clampedOffset)
                    }
                }
                .pointerInput(pin.id) {
                    detectTapGestures(
                        onDoubleTap = { onResetTransform() },
                    )
                },
        ) {
            AsyncImage(
                model = remember(pin.image_url) { AssetUrlResolver.resolveURL(pin.image_url) },
                contentDescription = pin.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                        translationX = offset.x
                        translationY = offset.y
                    },
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .align(Alignment.BottomCenter)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.72f)),
                        ),
                    ),
            )
        }
    }
}

@Composable
private fun PinTitleSection(pin: HomeFeedPin) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = "CHOSEN DESIGN",
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
            color = Color.White.copy(alpha = 0.50f),
            letterSpacing = 2.6.sp,
        )
        Text(
            text = pin.title,
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
            ),
            color = Color.White,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun PinDetailTopOverlay(
    topPadding: androidx.compose.ui.unit.Dp,
    isFavoriteLoading: Boolean,
    isFavorited: Boolean,
    isDownloading: Boolean,
    showShareMenu: Boolean,
    onBack: () -> Unit,
    onOpenShareMenu: () -> Unit,
    onDismissShareMenu: () -> Unit,
    onShare: () -> Unit,
    onDownload: () -> Unit,
    onToggleFavorite: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(130.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.75f), Color.Transparent),
                    ),
                ),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .padding(top = topPadding),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FloatingControlButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp),
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            Box {
                FloatingControlButton(onClick = onOpenShareMenu) {
                    Icon(
                        imageVector = Icons.Filled.Share,
                        contentDescription = "Share",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
                DropdownMenu(
                    expanded = showShareMenu,
                    onDismissRequest = onDismissShareMenu,
                    containerColor = PinDetailCardBg,
                ) {
                    DropdownMenuItem(
                        text = { Text("Share", color = Color.White) },
                        onClick = {
                            onDismissShareMenu()
                            onShare()
                        },
                    )
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = if (isDownloading) "Downloading..." else "Download image",
                                color = if (isDownloading) Color.White.copy(alpha = 0.56f) else Color.White,
                            )
                        },
                        enabled = !isDownloading,
                        onClick = {
                            onDismissShareMenu()
                            onDownload()
                        },
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            FloatingControlButton(
                onClick = onToggleFavorite,
                enabled = !isFavoriteLoading,
            ) {
                if (isFavoriteLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                } else {
                    Icon(
                        imageVector = if (isFavorited) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (isFavorited) PinDetailGold else Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun FloatingControlButton(
    onClick: () -> Unit,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled) 0.92f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "pinDetailControlScale",
    )

    Box(
        modifier = Modifier
            .size(40.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.62f))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
private fun FloatingBookNowStrip(
    modifier: Modifier = Modifier,
    onChooseSalon: () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.96f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.10f)),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = "BOOK THIS LOOK",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.50f),
                )
                Text(
                    text = "Find salons near you",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                )
            }
            Button(
                onClick = onChooseSalon,
                shape = RoundedCornerShape(999.dp),
            ) {
                Text(
                    text = "Choose a salon",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun PinDetailToast(
    payload: PinDetailToastPayload,
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

@Composable
private fun RelatedPinCard(
    pin: HomeFeedPin,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = modifier.clickable(onClick = onClick),
    ) {
        AsyncImage(
            model = remember(pin.image_url) { AssetUrlResolver.resolveURL(pin.image_url) },
            contentDescription = pin.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp),
        )
    }
}

private fun clampedHeroOffset(
    offset: Offset,
    scale: Float,
    containerWidthPx: Float,
    containerHeightPx: Float,
): Offset {
    if (scale <= 1.01f) return Offset.Zero
    val maxX = (((containerWidthPx * scale) - containerWidthPx) / 2f).coerceAtLeast(0f)
    val maxY = (((containerHeightPx * scale) - containerHeightPx) / 2f).coerceAtLeast(0f)
    return Offset(
        x = offset.x.coerceIn(-maxX, maxX),
        y = offset.y.coerceIn(-maxY, maxY),
    )
}

private fun sharePin(context: Context, pin: HomeFeedPin) {
    val shareText = AssetUrlResolver.resolveURL(pin.image_url) ?: pin.title
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, shareText)
    }
    context.startActivity(Intent.createChooser(intent, "Share design"))
}

private suspend fun downloadPinImageToGallery(context: Context, pin: HomeFeedPin): Result<Unit> {
    val imageUrl = AssetUrlResolver.resolveURL(pin.image_url)
        ?: return Result.failure(IllegalStateException("Image is unavailable."))

    return runCatching {
        withContext(Dispatchers.IO) {
            val request = ImageRequest.Builder(context)
                .data(imageUrl)
                .allowHardware(false)
                .build()
            val result = context.imageLoader.execute(request)
            val bitmap = (result.drawable as? BitmapDrawable)?.bitmap
                ?: throw IllegalStateException("Failed to load image.")
            saveBitmapToGallery(context = context, bitmap = bitmap, title = pin.title)
        }
    }
}

private fun saveBitmapToGallery(context: Context, bitmap: Bitmap, title: String) {
    val filename = buildString {
        append(sanitizeFileSegment(title).ifBlank { "nail_design" })
        append("_")
        append(System.currentTimeMillis())
        append(".jpg")
    }

    val resolver = context.contentResolver
    val values = ContentValues().apply {
        put(MediaStore.Images.Media.DISPLAY_NAME, filename)
        put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/NailsDash")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
    }

    val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    } else {
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI
    }

    val uri = resolver.insert(collection, values)
        ?: throw IllegalStateException("Unable to create media file.")

    try {
        resolver.openOutputStream(uri)?.use { stream ->
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)) {
                throw IllegalStateException("Failed to write image.")
            }
        } ?: throw IllegalStateException("Unable to open media stream.")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val done = ContentValues().apply {
                put(MediaStore.Images.Media.IS_PENDING, 0)
            }
            resolver.update(uri, done, null, null)
        }
    } catch (error: Exception) {
        resolver.delete(uri, null, null)
        throw error
    }
}

private fun sanitizeFileSegment(raw: String): String {
    return raw.trim()
        .replace(Regex("[^a-zA-Z0-9_\\-]+"), "_")
        .trim('_')
        .take(36)
}

private data class PinDetailToastPayload(
    val message: String,
    val isError: Boolean,
    val id: Long = System.currentTimeMillis(),
)
