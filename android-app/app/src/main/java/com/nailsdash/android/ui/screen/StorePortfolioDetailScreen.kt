package com.nailsdash.android.ui.screen

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImagePainter
import coil.compose.rememberAsyncImagePainter
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.repository.StoresRepository
import com.nailsdash.android.utils.AssetUrlResolver
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

private val PortfolioDetailBackground = Color(0xFF050505)
private val PortfolioDetailPanel = Color(0xF5141414)
private val PortfolioDetailGold = Color(0xFFD4AF37)

@Composable
fun StorePortfolioDetailScreen(
    storeId: Int,
    portfolioId: Int,
    onBack: () -> Unit,
    onBookServices: () -> Unit,
) {
    val repository = remember { StoresRepository() }
    var portfolioItems by remember(storeId) { mutableStateOf<List<StorePortfolio>>(emptyList()) }
    var selectedIndex by remember(portfolioId) { mutableStateOf(0) }
    var isLoading by remember(storeId, portfolioId) { mutableStateOf(true) }
    var errorMessage by remember(storeId, portfolioId) { mutableStateOf<String?>(null) }

    LaunchedEffect(storeId, portfolioId) {
        isLoading = true
        errorMessage = null
        coroutineScope {
            val storeTask = async { repository.getStoreDetail(storeId) }
            val portfolioTask = async { repository.getStorePortfolio(storeId) }

            storeTask.await().onFailure { if (errorMessage == null) errorMessage = it.message }

            portfolioTask.await()
                .onSuccess { items ->
                    portfolioItems = items
                    val index = items.indexOfFirst { it.id == portfolioId }
                    selectedIndex = when {
                        items.isEmpty() -> 0
                        index >= 0 -> index
                        else -> 0
                    }
                }
                .onFailure { if (errorMessage == null) errorMessage = it.message }
        }
        isLoading = false
    }

    val currentItem = portfolioItems.getOrNull(selectedIndex)
    val counterText = if (portfolioItems.isEmpty()) "0/0" else "${selectedIndex + 1}/${portfolioItems.size}"
    val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()

    Scaffold(
        containerColor = PortfolioDetailBackground,
        bottomBar = {
            if (currentItem != null) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(PortfolioDetailPanel)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                ) {
                    Button(
                        onClick = onBookServices,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PortfolioDetailGold,
                            contentColor = Color.Black,
                        ),
                        shape = RoundedCornerShape(18.dp),
                    ) {
                        Text(
                            text = "Book Services",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(PortfolioDetailBackground)
                .padding(bottom = innerPadding.calculateBottomPadding()),
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(28.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                }
                currentItem == null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(horizontal = 24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Photo,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.82f),
                            modifier = Modifier.size(28.dp),
                        )
                        Text(
                            text = errorMessage ?: "Portfolio image unavailable.",
                            color = Color.White.copy(alpha = 0.84f),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        OutlinedButton(onClick = onBack) {
                            Text("Back")
                        }
                    }
                }
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(top = topInset + 16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.56f))
                                    .clickable(onClick = onBack)
                                    .padding(10.dp),
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White,
                                )
                            }

                            Spacer(modifier = Modifier.weight(1f))

                            Text(
                                text = counterText,
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = Color.White.copy(alpha = 0.92f),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(Color.Black.copy(alpha = 0.56f))
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                            )

                            Spacer(modifier = Modifier.width(10.dp))

                            IconButton(
                                onClick = onBack,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.56f)),
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Close,
                                    contentDescription = "Close",
                                    tint = Color.White,
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(520.dp),
                        ) {
                            val imageUrl = AssetUrlResolver.resolveURL(currentItem.image_url)
                            val painter = rememberAsyncImagePainter(model = imageUrl)
                            Image(
                                painter = painter,
                                contentDescription = currentItem.title ?: "Portfolio image",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black),
                            )
                            when (painter.state) {
                                is AsyncImagePainter.State.Success -> Unit
                                is AsyncImagePainter.State.Loading,
                                is AsyncImagePainter.State.Empty,
                                -> {
                                    CircularProgressIndicator(
                                        modifier = Modifier
                                            .align(Alignment.Center)
                                            .size(28.dp),
                                        strokeWidth = 2.dp,
                                        color = Color.White,
                                    )
                                }
                                is AsyncImagePainter.State.Error -> {
                                    Column(
                                        modifier = Modifier.align(Alignment.Center),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Photo,
                                            contentDescription = null,
                                            tint = Color.White.copy(alpha = 0.82f),
                                            modifier = Modifier.size(28.dp),
                                        )
                                        Text(
                                            text = "Image unavailable",
                                            color = Color.White.copy(alpha = 0.80f),
                                            style = MaterialTheme.typography.bodySmall,
                                        )
                                    }
                                }
                            }

                        }
                    }
                }
            }
        }
    }
}
