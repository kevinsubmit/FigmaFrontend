package com.nailsdash.android.ui.screen

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.ui.state.HomeViewModel
import com.nailsdash.android.utils.AssetUrlResolver

private val HomeGold = Color(0xFFD4AF37)
private val HomeHeaderFieldBackground = Color(0xFF1A1A1A)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    homeViewModel: HomeViewModel = viewModel(),
    onOpenPin: (Int) -> Unit = {},
) {
    LaunchedEffect(Unit) {
        homeViewModel.loadIfNeeded()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
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
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
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
                    .padding(top = 10.dp),
            ) {
                items(homeViewModel.tags, key = { it }) { tag ->
                    val selected = homeViewModel.selectedTag == tag
                    val tagInteraction = remember(tag) { MutableInteractionSource() }
                    Box(
                        modifier = Modifier
                            .heightIn(min = 40.dp)
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
            homeViewModel.errorMessage?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 2.dp),
                )
            }

            if (homeViewModel.isLoading && homeViewModel.pins.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.padding(8.dp), color = HomeGold)
            }

            val emptyMessage = if (homeViewModel.searchQuery.isBlank() && homeViewModel.selectedTag == "All") {
                "No images yet. New inspiration will appear here."
            } else {
                "No images found. Try another search keyword or tag."
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 12.dp, bottom = 26.dp),
            ) {
                itemsIndexed(homeViewModel.pins, key = { _, item -> item.id }) { index, pin ->
                    if (index == homeViewModel.pins.lastIndex) {
                        homeViewModel.loadMoreIfNeeded(pin.id)
                    }

                    HomePinCard(pin = pin, onClick = { onOpenPin(pin.id) })
                }

                if (!homeViewModel.isLoading && homeViewModel.pins.isEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                            Text(
                                emptyMessage,
                                modifier = Modifier.padding(12.dp),
                            )
                        }
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
}

@Composable
private fun HomePinCard(
    pin: HomeFeedPin,
    onClick: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(22.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box {
            AsyncImage(
                model = remember(pin.image_url) { AssetUrlResolver.resolveURL(pin.image_url) },
                contentDescription = pin.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp),
            )
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.58f)),
                        ),
                    ),
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = pin.title.ifBlank { "Inspiration" },
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                pin.tags.firstOrNull()?.takeIf { it.isNotBlank() }?.let { firstTag ->
                    Text(
                        text = "#$firstTag",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.88f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}
