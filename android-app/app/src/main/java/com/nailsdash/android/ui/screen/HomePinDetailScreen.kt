package com.nailsdash.android.ui.screen

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import android.provider.MediaStore
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.HomePinDetailViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
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
    var isDownloading by remember { mutableStateOf(false) }
    var utilityMessage by remember { mutableStateOf<String?>(null) }
    var utilityMessageIsError by remember { mutableStateOf(false) }

    LaunchedEffect(pinId) {
        homePinDetailViewModel.load(pinId = pinId)
    }

    LaunchedEffect(pinId, bearerToken, homePinDetailViewModel.pin?.id) {
        homePinDetailViewModel.loadFavoriteState(bearerToken)
    }

    LaunchedEffect(homePinDetailViewModel.actionMessage) {
        val message = homePinDetailViewModel.actionMessage ?: return@LaunchedEffect
        delay(2000)
        if (homePinDetailViewModel.actionMessage == message) {
            homePinDetailViewModel.consumeActionMessage()
        }
    }

    LaunchedEffect(utilityMessage) {
        val message = utilityMessage ?: return@LaunchedEffect
        delay(2000)
        if (utilityMessage == message) {
            utilityMessage = null
        }
    }

    val pin = homePinDetailViewModel.pin

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Design Detail") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            pin?.let { sharePin(context = context, pin = it) }
                        },
                        enabled = pin != null,
                    ) {
                        Icon(Icons.Filled.Share, contentDescription = "Share")
                    }
                    IconButton(
                        onClick = {
                            val currentPin = pin ?: return@IconButton
                            if (isDownloading) return@IconButton
                            isDownloading = true
                            scope.launch {
                                downloadPinImageToGallery(context = context, pin = currentPin)
                                    .onSuccess {
                                        utilityMessageIsError = false
                                        utilityMessage = "Image downloaded."
                                    }
                                    .onFailure { err ->
                                        utilityMessageIsError = true
                                        utilityMessage = if (err is SecurityException) {
                                            "Storage permission required on this Android version."
                                        } else {
                                            err.message ?: "Failed to download image."
                                        }
                                    }
                                isDownloading = false
                            }
                        },
                        enabled = pin != null && !isDownloading,
                    ) {
                        if (isDownloading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Icon(Icons.Filled.Download, contentDescription = "Download image")
                        }
                    }
                    IconButton(
                        onClick = {
                            if (bearerToken == null) {
                                sessionViewModel.updateAuthMessage("Please sign in to save favorites.")
                            } else {
                                homePinDetailViewModel.toggleFavorite(bearerToken)
                            }
                        },
                        enabled = pin != null && !homePinDetailViewModel.isFavoriteLoading,
                    ) {
                        if (homePinDetailViewModel.isFavoriteLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Icon(
                                imageVector = if (homePinDetailViewModel.isFavorited) {
                                    Icons.Filled.Favorite
                                } else {
                                    Icons.Filled.FavoriteBorder
                                },
                                contentDescription = "Favorite",
                                tint = if (homePinDetailViewModel.isFavorited) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                            )
                        }
                    }
                },
            )
        },
        bottomBar = {
            Button(
                onClick = {
                    pin?.let(onChooseSalon)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                enabled = pin != null,
            ) {
                Text("Choose a salon")
            }
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (homePinDetailViewModel.isLoading && pin == null) {
                item {
                    CircularProgressIndicator(modifier = Modifier.padding(8.dp))
                }
            }

            homePinDetailViewModel.errorMessage?.let { message ->
                item {
                    Text(
                        text = message,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            homePinDetailViewModel.actionMessage?.let { message ->
                item {
                    Text(
                        text = message,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            utilityMessage?.let { message ->
                item {
                    Text(
                        text = message,
                        color = if (utilityMessageIsError) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.primary
                        },
                    )
                }
            }

            if (pin != null) {
                item {
                    HeroPinCard(pin = pin)
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = pin.title,
                            style = MaterialTheme.typography.headlineSmall,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis,
                        )

                        pin.description?.trim()?.takeIf { it.isNotEmpty() }?.let {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }

                        if (pin.tags.isNotEmpty()) {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(pin.tags.filter { it.isNotBlank() }, key = { it }) { tag ->
                                    AssistChip(
                                        onClick = {},
                                        enabled = false,
                                        label = { Text(tag) },
                                    )
                                }
                            }
                        }
                    }
                }

                if (homePinDetailViewModel.relatedPins.isNotEmpty()) {
                    item {
                        Text("Similar ideas", style = MaterialTheme.typography.titleMedium)
                    }

                    items(
                        items = homePinDetailViewModel.relatedPins.chunked(2),
                        key = { row -> row.joinToString(separator = "-") { it.id.toString() } },
                    ) { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
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
            }
        }
    }
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

@Composable
private fun HeroPinCard(pin: HomeFeedPin) {
    Card(
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box {
            AsyncImage(
                model = remember(pin.image_url) { AssetUrlResolver.resolveURL(pin.image_url) },
                contentDescription = pin.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(360.dp),
            )
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.68f)),
                        ),
                    ),
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = "CHOSEN DESIGN",
                    color = Color.White.copy(alpha = 0.72f),
                    style = MaterialTheme.typography.labelMedium,
                )
                Text(
                    text = pin.title,
                    color = Color.White,
                    style = MaterialTheme.typography.titleLarge,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
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
