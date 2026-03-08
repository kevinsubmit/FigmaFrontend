package com.nailsdash.android.ui.screen

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.ui.state.HomeViewModel
import com.nailsdash.android.utils.AssetUrlResolver

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
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OutlinedTextField(
            value = homeViewModel.searchDraft,
            onValueChange = { homeViewModel.searchDraft = it },
            label = { Text("Search by title") },
            placeholder = { Text("e.g. Classic French Set") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            singleLine = true,
            shape = RoundedCornerShape(999.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { homeViewModel.applySearch() }),
            trailingIcon = {
                Box {
                    if (homeViewModel.searchDraft.isNotEmpty()) {
                        IconButton(
                            onClick = { homeViewModel.clearSearch() },
                            modifier = Modifier.align(Alignment.CenterEnd),
                        ) {
                            Icon(Icons.Filled.Clear, contentDescription = "Clear search")
                        }
                    } else {
                        IconButton(
                            onClick = { homeViewModel.applySearch() },
                            modifier = Modifier.align(Alignment.CenterEnd),
                        ) {
                            Icon(Icons.Filled.Search, contentDescription = "Search")
                        }
                    }
                }
            },
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 2.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(homeViewModel.tags, key = { it }) { tag ->
                FilterChip(
                    selected = homeViewModel.selectedTag == tag,
                    onClick = { homeViewModel.selectTag(tag) },
                    label = { Text(tag) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.52f),
                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                )
            }
        }

        homeViewModel.errorMessage?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
        }

        if (homeViewModel.isLoading && homeViewModel.pins.isEmpty()) {
            CircularProgressIndicator(modifier = Modifier.padding(8.dp))
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
                    CircularProgressIndicator(modifier = Modifier.padding(vertical = 8.dp))
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
