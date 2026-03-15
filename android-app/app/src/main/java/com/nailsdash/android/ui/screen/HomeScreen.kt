package com.nailsdash.android.ui.screen

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImagePainter
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.HomeViewModel
import com.nailsdash.android.utils.AssetUrlResolver

private val HomeGold = Color(0xFFD4AF37)
private val HomeHeaderFieldBackground = Color(0xFF1A1A1A)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    sessionViewModel: AppSessionViewModel,
    homeViewModel: HomeViewModel = viewModel(),
    onOpenPin: (Int) -> Unit = {},
) {
    var noticeMessage by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        homeViewModel.loadIfNeeded()
    }
    LaunchedEffect(homeViewModel.errorMessage) {
        val message = homeViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Black, Color.Black.copy(alpha = 0.96f)),
                        ),
                    ),
            ) {
                OutlinedTextField(
                    value = homeViewModel.searchDraft,
                    onValueChange = { homeViewModel.searchDraft = it },
                    placeholder = {
                        Text(
                            text = "Search by title (e.g. Classic French Set)",
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                            color = Color.White.copy(alpha = 0.58f),
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, top = 8.dp, end = 16.dp)
                        .height(44.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(999.dp),
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.None,
                        autoCorrectEnabled = false,
                        imeAction = ImeAction.Search,
                    ),
                    keyboardActions = KeyboardActions(onSearch = { homeViewModel.applySearch() }),
                    leadingIcon = {
                        val searchIconInteraction = remember { MutableInteractionSource() }
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .clickable(
                                    interactionSource = searchIconInteraction,
                                    indication = null,
                                ) { homeViewModel.applySearch() },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Search,
                                contentDescription = "Search",
                                tint = Color.White.copy(alpha = 0.72f),
                                modifier = Modifier.size(15.dp),
                            )
                        }
                    },
                    trailingIcon = {
                        if (homeViewModel.searchDraft.isNotEmpty()) {
                            val clearInteraction = remember { MutableInteractionSource() }
                            Box(
                                modifier = Modifier
                                    .size(26.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.07f))
                                    .clickable(
                                        interactionSource = clearInteraction,
                                        indication = null,
                                    ) { homeViewModel.clearSearch() },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Clear,
                                    contentDescription = "Clear search",
                                    tint = Color.White.copy(alpha = 0.72f),
                                    modifier = Modifier.size(12.dp),
                                )
                            }
                        }
                    },
                    textStyle = MaterialTheme.typography.bodyMedium.copy(
                        color = Color.White,
                        fontSize = 14.sp,
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = HomeHeaderFieldBackground,
                        unfocusedContainerColor = HomeHeaderFieldBackground,
                        focusedBorderColor = HomeGold.copy(alpha = 0.22f),
                        unfocusedBorderColor = HomeGold.copy(alpha = 0.22f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = HomeGold,
                    ),
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(start = 16.dp, top = 0.dp, end = 16.dp, bottom = 6.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp, bottom = 8.dp),
                ) {
                    items(homeViewModel.tags, key = { it }) { tag ->
                        val selected = homeViewModel.selectedTag == tag
                        val tagInteraction = remember(tag) { MutableInteractionSource() }
                        Box(
                            modifier = Modifier
                                .heightIn(min = 40.dp)
                                .shadow(
                                    elevation = if (selected) 6.dp else 0.dp,
                                    shape = RoundedCornerShape(999.dp),
                                    ambientColor = HomeGold.copy(alpha = 0.25f),
                                    spotColor = HomeGold.copy(alpha = 0.25f),
                                )
                                .clip(RoundedCornerShape(999.dp))
                                .background(if (selected) HomeGold else HomeHeaderFieldBackground)
                                .border(
                                    width = 1.dp,
                                    color = if (selected) Color.Transparent else HomeGold.copy(alpha = 0.26f),
                                    shape = RoundedCornerShape(999.dp),
                                )
                                .clickable(
                                    interactionSource = tagInteraction,
                                    indication = null,
                                ) { homeViewModel.selectTag(tag) }
                                .padding(horizontal = 14.dp, vertical = 9.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = tag,
                                style = MaterialTheme.typography.labelLarge.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                ),
                                color = if (selected) Color.Black else Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                homeViewModel.errorMessage
                    ?.trim()
                    ?.takeIf { it.isNotEmpty() }
                    ?.let { message ->
                        Text(
                            text = message,
                            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                            color = Color.Red.copy(alpha = 0.9f),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                val emptyTitle = if (homeViewModel.searchQuery.isBlank() && homeViewModel.selectedTag == "All") {
                    "No images yet"
                } else {
                    "No images found"
                }
                val emptySubtitle = if (homeViewModel.searchQuery.isBlank() && homeViewModel.selectedTag == "All") {
                    "New inspiration will appear here."
                } else {
                    "Try another search keyword."
                }

                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp),
                ) {
                    itemsIndexed(homeViewModel.pins, key = { _, item -> item.id }) { index, pin ->
                        if (index == homeViewModel.pins.lastIndex) {
                            homeViewModel.loadMoreIfNeeded(pin.id)
                        }

                        HomePinCard(pin = pin, onClick = { onOpenPin(pin.id) })
                    }

                    if (!homeViewModel.isLoading && homeViewModel.pins.isEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            HomeEmptyStateCard(
                                title = emptyTitle,
                                subtitle = emptySubtitle,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp),
                            )
                        }
                    }

                    if (homeViewModel.isLoadingMore) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            CircularProgressIndicator(modifier = Modifier.padding(vertical = 8.dp), color = HomeGold)
                        }
                    }
                }
            }
        }

        if (homeViewModel.isLoading) {
            HomeLoadingOverlay()
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
                title = { Text("Notice") },
                text = { Text(message) },
            )
        }
    }
}

@Composable
private fun HomeLoadingOverlay() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF111111).copy(alpha = 0.96f)),
            border = BorderStroke(1.dp, HomeGold.copy(alpha = 0.16f)),
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
                    color = HomeGold,
                )
                Text(
                    text = "Loading...",
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

@Composable
private fun HomeEmptyStateCard(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.03f)),
        border = BorderStroke(1.dp, HomeGold.copy(alpha = 0.16f)),
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
                    .background(HomeGold.copy(alpha = 0.12f), CircleShape)
                    .border(1.dp, HomeGold.copy(alpha = 0.32f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Image,
                    contentDescription = null,
                    tint = HomeGold,
                    modifier = Modifier.size(26.dp),
                )
            }
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = Color.White.copy(alpha = 0.90f),
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.72f),
            )
        }
    }
}

@Composable
private fun HomePinCard(
    pin: HomeFeedPin,
    onClick: () -> Unit,
) {
    val cardInteraction = remember(pin.id) { MutableInteractionSource() }
    val imageModel = remember(pin.image_url) { AssetUrlResolver.resolveURL(pin.image_url) }

    Card(
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.06f)),
        colors = CardDefaults.cardColors(containerColor = Color.Gray.copy(alpha = 0.08f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.clickable(
            interactionSource = cardInteraction,
            indication = null,
            onClick = onClick,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 4f),
        ) {
            SubcomposeAsyncImage(
                model = imageModel,
                contentDescription = pin.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            ) {
                when (painter.state) {
                    is AsyncImagePainter.State.Success -> {
                        SubcomposeAsyncImageContent()
                    }
                    is AsyncImagePainter.State.Loading,
                    is AsyncImagePainter.State.Empty,
                    -> {
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .background(Color.Gray.copy(alpha = 0.14f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = HomeGold,
                            )
                        }
                    }
                    is AsyncImagePainter.State.Error -> {
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .background(Color.Gray.copy(alpha = 0.20f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "Image unavailable",
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                                color = Color.White.copy(alpha = 0.72f),
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            }
        }
    }
}
