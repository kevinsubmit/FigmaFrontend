package com.nailsdash.android.ui.screen

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.SouthEast
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Paid
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material.icons.outlined.Collections
import androidx.compose.material.icons.outlined.ConfirmationNumber as OutlinedTicketIcon
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.BuildConfig
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.model.CouponTemplate
import com.nailsdash.android.data.model.GiftCard
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.model.PointTransaction
import com.nailsdash.android.data.model.ReviewUploadImagePayload
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.UserReview
import com.nailsdash.android.data.model.UserCoupon
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.CouponsViewModel
import com.nailsdash.android.ui.state.GiftCardsViewModel
import com.nailsdash.android.ui.state.MyFavoritesViewModel
import com.nailsdash.android.ui.state.MyReviewsViewModel
import com.nailsdash.android.ui.state.OrderHistoryViewModel
import com.nailsdash.android.ui.state.PointsViewModel
import com.nailsdash.android.ui.state.ReferralViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

private val RewardsGold = Color(0xFFD4AF37)
private val RewardsPageBackground = Color(0xFF000000)
private val RewardsCardBackground = Color(0xFF111111)
private val RewardsPrimaryText = Color.White
private val RewardsSecondaryText = Color.White.copy(alpha = 0.72f)
private val RewardsMutedText = Color.White.copy(alpha = 0.52f)
private val RewardsSystemGreen = Color(0xFF34C759)
private val RewardsSystemRed = Color(0xFFFF3B30)
private val RewardsPagePadding = 16.dp
private val OrderHistoryCardCorner = 18.dp
private val RewardsShortDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("M/d/yy", Locale.US)
private val RewardsJoinedDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)
private val RewardsNaiveDateTimeParsers: List<DateTimeFormatter> = listOf(
    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
)

@Composable
private fun rememberPressScale(
    interactionSource: MutableInteractionSource,
    pressedScale: Float = 0.965f,
): Float {
    val pressed by interactionSource.collectIsPressedAsState()
    return animateFloatAsState(
        targetValue = if (pressed) pressedScale else 1f,
        animationSpec = tween(durationMillis = 110),
        label = "rewardsPressScale",
    ).value
}

@Composable
private fun RewardsTopBar(
    title: String,
    onBack: () -> Unit,
) {
    val backInteraction = remember { MutableInteractionSource() }
    val backScale = rememberPressScale(
        interactionSource = backInteraction,
        pressedScale = 0.94f,
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Black,
                        Color.Black.copy(alpha = 0.96f),
                    ),
                ),
            ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = RewardsPagePadding, end = RewardsPagePadding, top = 4.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .scale(backScale)
                    .clip(CircleShape)
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
                    tint = RewardsPrimaryText,
                    modifier = Modifier.size(16.dp),
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                ),
                color = RewardsPrimaryText,
                textAlign = TextAlign.Center,
                maxLines = 1,
            )

            Spacer(modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.size(38.dp))
        }
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
    }
}

@Composable
fun PointsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    pointsViewModel: PointsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token) {
        if (token != null) pointsViewModel.load(token)
    }
    LaunchedEffect(pointsViewModel.errorMessage, pointsViewModel.actionMessage) {
        val message = pointsViewModel.errorMessage?.trim().takeIf { !it.isNullOrEmpty() }
            ?: pointsViewModel.actionMessage?.trim().takeIf { !it.isNullOrEmpty() }
        if (message != null) {
            noticeMessage = message
        }
    }

    val available = pointsViewModel.balance?.available_points ?: 0
    val total = pointsViewModel.balance?.total_points ?: 0

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "My Points", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 8.dp,
                    bottom = 26.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(
                                elevation = 14.dp,
                                shape = RoundedCornerShape(18.dp),
                                ambientColor = Color.Black.copy(alpha = 0.35f),
                                spotColor = Color.Black.copy(alpha = 0.35f),
                            ),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.20f)),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color(0xFF171717),
                                            RewardsPageBackground,
                                        ),
                                    ),
                                )
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .drawBehind {
                                        drawRect(
                                            brush = Brush.radialGradient(
                                                colors = listOf(
                                                    RewardsGold.copy(alpha = 0.24f),
                                                    Color.Transparent,
                                                ),
                                                center = Offset(x = size.width / 2f, y = 0f),
                                                radius = size.maxDimension * 1.1f,
                                            ),
                                        )
                                    },
                            )
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .fillMaxWidth()
                                    .height(36.dp)
                                    .background(
                                        Brush.verticalGradient(
                                            colors = listOf(
                                                Color.White.copy(alpha = 0.12f),
                                                Color.Transparent,
                                            ),
                                        ),
                                    ),
                            )
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 34.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                Box(
                                    modifier = Modifier.size(108.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(108.dp)
                                            .border(
                                                width = 1.dp,
                                                color = Color.White.copy(alpha = 0.06f),
                                                shape = CircleShape,
                                            ),
                                    )
                                    Box(
                                        modifier = Modifier
                                            .size(96.dp)
                                            .border(
                                                width = 1.dp,
                                                color = RewardsGold.copy(alpha = 0.45f),
                                                shape = CircleShape,
                                            ),
                                    )
                                    Box(
                                        modifier = Modifier
                                            .size(96.dp)
                                            .background(RewardsGold.copy(alpha = 0.13f), CircleShape),
                                    )
                                    Icon(
                                        imageVector = Icons.Filled.Paid,
                                        contentDescription = null,
                                        tint = RewardsGold,
                                        modifier = Modifier.size(42.dp),
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 10.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = available.toString(),
                                        style = MaterialTheme.typography.displayLarge.copy(
                                            fontWeight = FontWeight.Black,
                                            fontSize = 64.sp,
                                        ),
                                        color = RewardsGold,
                                        maxLines = 1,
                                    )
                                }

                                Text(
                                    text = "Available Points",
                                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                                    color = RewardsPrimaryText.copy(alpha = 0.92f),
                                )

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .background(Color.Black.copy(alpha = 0.34f), RoundedCornerShape(999.dp))
                                        .padding(horizontal = 12.dp, vertical = 7.dp),
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.AutoAwesome,
                                        contentDescription = null,
                                        tint = RewardsGold,
                                        modifier = Modifier.size(12.dp),
                                    )
                                    Text(
                                        text = "Total Earned: $total",
                                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                                        color = RewardsSecondaryText,
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    RewardsUnifiedSectionHeader(title = "EXCHANGE COUPONS")
                }

                if (!pointsViewModel.isLoading && pointsViewModel.exchangeables.isEmpty()) {
                    item {
                        RewardsEmptyStateCard(
                            icon = Icons.Filled.ConfirmationNumber,
                            title = "No exchangeable coupons right now",
                            subtitle = "More rewards will appear here.",
                            compact = true,
                        )
                    }
                } else {
                    items(pointsViewModel.exchangeables, key = { it.id }) { coupon ->
                    val required = coupon.points_required ?: 0
                    val canRedeem = coupon.points_required != null &&
                        (pointsViewModel.balance?.available_points ?: 0) >= required
                    val redeeming = pointsViewModel.isRedeemingCouponId == coupon.id
                    val exchangeInteraction = remember(coupon.id) { MutableInteractionSource() }
                    val exchangeScale = rememberPressScale(
                        interactionSource = exchangeInteraction,
                        pressedScale = 0.96f,
                    )

                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
                    ) {
                        Box(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 168.dp)
                                    .background(
                                        Brush.horizontalGradient(
                                            colors = listOf(
                                                RewardsGold.copy(alpha = 0.46f),
                                                Color(0xFFAE8D2A).copy(alpha = 0.28f),
                                            ),
                                        ),
                                    )
                                    .padding(horizontal = RewardsPagePadding, vertical = 14.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(start = 2.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(
                                        text = pointsCouponDiscount(coupon),
                                        style = MaterialTheme.typography.displayMedium.copy(
                                            fontWeight = FontWeight.Black,
                                            fontSize = 36.sp,
                                        ),
                                        color = RewardsPrimaryText,
                                        maxLines = 1,
                                    )
                                    Text(
                                        text = coupon.name,
                                        style = MaterialTheme.typography.titleLarge.copy(
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 20.sp,
                                        ),
                                        color = RewardsPrimaryText.copy(alpha = 0.94f),
                                        maxLines = 1,
                                    )
                                    Text(
                                        text = "Min. spend $${String.format("%.0f", coupon.min_amount)}",
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Medium,
                                        ),
                                        color = RewardsPrimaryText.copy(alpha = 0.82f),
                                    )
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .background(Color.Black.copy(alpha = 0.26f), RoundedCornerShape(999.dp))
                                            .padding(horizontal = 8.dp, vertical = 4.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.AutoAwesome,
                                            contentDescription = null,
                                            tint = RewardsGold,
                                            modifier = Modifier.size(11.dp),
                                        )
                                        Text(
                                            text = "Need $required pts",
                                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                            color = RewardsPrimaryText.copy(alpha = 0.9f),
                                        )
                                    }
                                }

                                Box(
                                    modifier = Modifier
                                        .width(1.dp)
                                        .fillMaxHeight()
                                        .drawBehind {
                                            drawLine(
                                                color = Color.White.copy(alpha = 0.35f),
                                                start = Offset(0f, 0f),
                                                end = Offset(0f, size.height),
                                                strokeWidth = 1.dp.toPx(),
                                                pathEffect = PathEffect.dashPathEffect(
                                                    floatArrayOf(4.dp.toPx(), 4.dp.toPx()),
                                                ),
                                            )
                                        }
                                        .padding(vertical = 8.dp),
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.TopCenter)
                                            .size(11.dp)
                                            .offset(y = (-7).dp)
                                            .background(RewardsPageBackground.copy(alpha = 0.96f), CircleShape),
                                    )
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.BottomCenter)
                                            .size(11.dp)
                                            .offset(y = 7.dp)
                                            .background(RewardsPageBackground.copy(alpha = 0.96f), CircleShape),
                                    )
                                }

                                Column(
                                    modifier = Modifier
                                        .width(112.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Text(
                                        text = "Exchange",
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Medium,
                                        ),
                                        color = RewardsPrimaryText.copy(alpha = 0.9f),
                                    )
                                    Text(
                                        text = "$required pts",
                                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                        color = RewardsPrimaryText,
                                        modifier = Modifier
                                            .background(Color.Black.copy(alpha = 0.28f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 10.dp, vertical = 6.dp),
                                    )

                                    if (redeeming) {
                                        Box(
                                            modifier = Modifier
                                                .widthIn(min = 90.dp)
                                                .heightIn(min = 36.dp),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            CircularProgressIndicator(
                                                color = RewardsGold,
                                                modifier = Modifier.size(18.dp),
                                                strokeWidth = 2.dp,
                                            )
                                        }
                                    } else {
                                        Box(
                                            modifier = Modifier
                                                .scale(exchangeScale)
                                                .widthIn(min = 90.dp)
                                                .heightIn(min = 36.dp)
                                                .clip(RoundedCornerShape(999.dp))
                                                .background(
                                                    if (canRedeem) {
                                                        Color.White
                                                    } else {
                                                        Color.White.copy(alpha = 0.12f)
                                                    },
                                                )
                                                .clickable(
                                                    enabled = canRedeem,
                                                    interactionSource = exchangeInteraction,
                                                    indication = null,
                                                    onClick = {
                                                        if (token != null) pointsViewModel.exchange(token, coupon.id)
                                                    },
                                                )
                                                .padding(horizontal = 18.dp),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text(
                                                text = if (canRedeem) "Exchange" else "Locked",
                                                style = MaterialTheme.typography.titleSmall.copy(
                                                    fontSize = 15.sp,
                                                    fontWeight = FontWeight.Bold,
                                                ),
                                                color = if (canRedeem) Color.Black else RewardsPrimaryText.copy(alpha = 0.45f),
                                            )
                                        }
                                    }
                                }
                            }

                            Icon(
                                imageVector = Icons.Outlined.OutlinedTicketIcon,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.11f),
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(8.dp)
                                    .rotate(12f)
                                    .size(32.dp),
                            )
                        }
                    }
                    }
                }

                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.18f)),
                    ) {
                        Box(modifier = Modifier.fillMaxWidth()) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .fillMaxWidth()
                                    .height(1.dp)
                                    .background(RewardsGold.copy(alpha = 0.32f)),
                            )
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                RewardsUnifiedSectionHeader(title = "HISTORY")
                                if (!pointsViewModel.isLoading && pointsViewModel.transactions.isEmpty()) {
                                    RewardsEmptyStateCard(
                                        icon = Icons.Filled.History,
                                        title = "No transactions yet",
                                        subtitle = "Your points activity will appear here.",
                                        compact = true,
                                    )
                                } else {
                                    Column {
                                        pointsViewModel.transactions.forEachIndexed { index, item ->
                                            PointsHistoryRow(
                                                item = item,
                                                isLast = index == pointsViewModel.transactions.lastIndex,
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

        if (pointsViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}

@Composable
private fun RewardsUnifiedSectionHeader(
    title: String,
    trailing: String? = null,
    showsDivider: Boolean = false,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(if (showsDivider) 7.dp else 0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .background(RewardsGold, CircleShape),
            )
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                ),
                color = RewardsSecondaryText,
            )
            Spacer(modifier = Modifier.weight(1f))
            trailing?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = RewardsSecondaryText,
                )
            }
        }

        if (showsDivider) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                RewardsGold.copy(alpha = 0.22f),
                                Color.White.copy(alpha = 0.04f),
                            ),
                        ),
                    ),
            )
        }
    }
}

@Composable
private fun RewardsEmptyStateCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    compact: Boolean = false,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.03f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.16f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = RewardsPagePadding, vertical = if (compact) 20.dp else 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (compact) 10.dp else 12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(if (compact) 64.dp else 72.dp)
                    .background(RewardsGold.copy(alpha = 0.12f), CircleShape)
                    .border(1.dp, RewardsGold.copy(alpha = 0.32f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = RewardsGold,
                    modifier = Modifier.size(if (compact) 26.dp else 30.dp),
                )
            }
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = RewardsPrimaryText.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = RewardsSecondaryText,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun PointsHistoryRow(
    item: PointTransaction,
    isLast: Boolean,
) {
    val isPositive = item.type.lowercase() == "earn" || item.amount >= 0

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 2.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .background(
                    if (isPositive) RewardsSystemGreen.copy(alpha = 0.22f) else RewardsSystemRed.copy(alpha = 0.22f),
                    CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (isPositive) Icons.Filled.NorthEast else Icons.Filled.SouthEast,
                contentDescription = null,
                tint = if (isPositive) RewardsSystemGreen else RewardsSystemRed,
                modifier = Modifier.size(13.dp),
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = formattedPointsReason(item.reason),
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                ),
                color = RewardsPrimaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            item.description?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Normal,
                    ),
                    color = RewardsSecondaryText,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                text = displayDateOnly(item.created_at),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                ),
                color = RewardsSecondaryText,
            )
        }

        Text(
            text = if (item.amount > 0) "+${item.amount}" else item.amount.toString(),
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
            ),
            color = if (isPositive) RewardsSystemGreen else RewardsPrimaryText.copy(alpha = 0.9f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }

    if (!isLast) {
        HorizontalDivider(
            color = Color.White.copy(alpha = 0.10f),
            modifier = Modifier.padding(start = 44.dp),
        )
    }
}

@Composable
private fun RewardsLoadingOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.18f)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier.shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = Color.Black.copy(alpha = 0.28f),
                spotColor = Color.Black.copy(alpha = 0.28f),
            ),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = RewardsCardBackground.copy(alpha = 0.96f)),
            border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.16f)),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    color = RewardsGold,
                    strokeWidth = 2.2.dp,
                )
                Text(
                    text = "Loading...",
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = RewardsSecondaryText,
                )
            }
        }
    }
}

@Composable
private fun RewardsNoticeDialog(
    message: String,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Notice") },
        text = { Text(message) },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        },
    )
}

private fun formattedPointsReason(raw: String): String {
    val cleaned = raw
        .trim()
        .replace("_", " ")
        .replace("-", " ")
    if (cleaned.isBlank()) return "Points update"
    return cleaned.split(" ")
        .filter { it.isNotBlank() }
        .joinToString(" ") { word ->
            word.lowercase().replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }
}

private fun displayDateOnly(raw: String): String {
    val value = raw.trim()
    if (value.isBlank()) return value
    val localDate = parseRewardsLocalDate(value) ?: return value
    return runCatching { localDate.format(RewardsShortDateFormatter) }.getOrElse { value }
}

private fun displayJoinedDate(raw: String): String {
    val value = raw.trim()
    if (value.isBlank()) return value
    val localDate = parseRewardsLocalDate(value) ?: return value
    return runCatching { localDate.format(RewardsJoinedDateFormatter) }.getOrElse { value }
}

private fun parseRewardsLocalDate(raw: String): LocalDate? {
    runCatching {
        OffsetDateTime.parse(raw)
            .toInstant()
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
    }.getOrNull()?.let { return it }
    runCatching { Instant.parse(raw).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()?.let { return it }
    runCatching { LocalDate.parse(raw) }.getOrNull()?.let { return it }

    val candidates = listOf(raw, raw.replace(' ', 'T'))
    candidates.forEach { candidate ->
        RewardsNaiveDateTimeParsers.forEach { formatter ->
            runCatching {
                LocalDateTime.parse(candidate, formatter)
                    .atOffset(ZoneOffset.UTC)
                    .atZoneSameInstant(ZoneId.systemDefault())
                    .toLocalDate()
            }.getOrNull()?.let { return it }
        }
    }

    if (raw.length >= 10) {
        runCatching { LocalDate.parse(raw.substring(0, 10)) }.getOrNull()?.let { return it }
    }
    return null
}

private fun couponStatusTitle(value: String): String {
    return when (value.lowercase()) {
        "available" -> "Available"
        "used" -> "Used"
        "expired" -> "Expired"
        else -> value.replace('_', ' ').replaceFirstChar { it.uppercase() }
    }
}

private fun couponDiscount(coupon: CouponTemplate): String {
    return if (coupon.type.lowercase() == "percentage") {
        "${coupon.discount_value.toInt()}% OFF"
    } else {
        "$${String.format("%.0f", coupon.discount_value)} OFF"
    }
}

private fun pointsCouponDiscount(coupon: CouponTemplate): String {
    return if (coupon.type.lowercase() == "percentage") {
        "${coupon.discount_value.toInt()}% OFF"
    } else {
        "$${String.format("%.2f", coupon.discount_value)} OFF"
    }
}

private fun couponSubtitle(item: UserCoupon): String {
    val discountText = couponDiscount(item.coupon).lowercase().trim()
    val title = item.coupon.name.trim()
    if (title.isNotEmpty() && title.lowercase() != discountText) return title

    val desc = item.coupon.description?.trim().orEmpty()
    if (desc.isNotEmpty()) return desc

    return when (item.source?.lowercase()) {
        "points" -> "Points Exchange Coupon"
        "referral" -> "Referral Reward Coupon"
        "activity" -> "Activity Reward Coupon"
        else -> "Store Coupon"
    }
}

private fun couponDateLabel(item: UserCoupon): String {
    return if (item.status.lowercase() == "used" && item.used_at != null) {
        displayDateOnly(item.used_at)
    } else {
        displayDateOnly(item.expires_at)
    }
}

private fun giftStatusPriority(status: String): Int {
    return when (status.lowercase()) {
        "pending_transfer" -> 0
        "active" -> 1
        "revoked" -> 2
        else -> 3
    }
}

private fun giftStatusLabel(status: String): String {
    val cleaned = status.trim().replace('_', ' ')
    if (cleaned.isBlank()) return "Unknown"
    return cleaned.split(" ")
        .filter { it.isNotBlank() }
        .joinToString(" ") { word ->
            word.lowercase().replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }
}

private fun maskPhone(raw: String): String {
    val digits = raw.filter(Char::isDigit)
    if (digits.length <= 4) return raw
    return "***${digits.takeLast(4)}"
}

@Composable
private fun GiftSheetLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall.copy(
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
        ),
        color = RewardsSecondaryText,
    )
}

@Composable
private fun GiftSheetInputField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = singleLine,
        keyboardOptions = keyboardOptions,
        textStyle = MaterialTheme.typography.bodyMedium.copy(color = RewardsPrimaryText),
        cursorBrush = SolidColor(RewardsGold),
        modifier = modifier.fillMaxWidth(),
        decorationBox = { innerTextField ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.42f), RoundedCornerShape(12.dp))
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                if (value.isBlank()) {
                    Text(
                        text = placeholder,
                        style = MaterialTheme.typography.bodyMedium,
                        color = RewardsSecondaryText,
                    )
                }
                innerTextField()
            }
        },
    )
}

@Composable
fun CouponsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    couponsViewModel: CouponsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var useCouponId by remember { mutableStateOf<Int?>(null) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token, couponsViewModel.selectedStatus) {
        if (token != null) couponsViewModel.load(token)
    }
    LaunchedEffect(couponsViewModel.errorMessage) {
        val message = couponsViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    if (useCouponId != null) {
        RewardsNoticeDialog(
            message = "User Coupon ID: #$useCouponId",
            onDismiss = { useCouponId = null },
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "My Coupons", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 8.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                            .padding(3.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        listOf("available", "used", "expired").forEach { status ->
                            val selected = couponsViewModel.selectedStatus == status
                            val statusInteraction = remember(status) { MutableInteractionSource() }
                            val statusScale = rememberPressScale(
                                interactionSource = statusInteraction,
                                pressedScale = 0.97f,
                            )
                            val statusContainerColor by animateColorAsState(
                                targetValue = if (selected) RewardsGold else Color.White.copy(alpha = 0.03f),
                                animationSpec = tween(durationMillis = 140),
                                label = "couponStatusContainer",
                            )
                            val statusContentColor by animateColorAsState(
                                targetValue = if (selected) Color.Black else RewardsPrimaryText.copy(alpha = 0.75f),
                                animationSpec = tween(durationMillis = 140),
                                label = "couponStatusContent",
                            )
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .heightIn(min = 38.dp)
                                    .scale(statusScale)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(statusContainerColor, RoundedCornerShape(12.dp))
                                    .then(
                                        if (selected) {
                                            Modifier
                                        } else {
                                            Modifier.border(1.dp, Color.White.copy(alpha = 0.07f), RoundedCornerShape(12.dp))
                                        },
                                    )
                                    .clickable(
                                        interactionSource = statusInteraction,
                                        indication = null,
                                        onClick = { couponsViewModel.selectedStatus = status },
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = couponStatusTitle(status),
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                    color = statusContentColor,
                                )
                            }
                        }
                    }
                }

                if (!couponsViewModel.isLoading && couponsViewModel.coupons.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.padding(top = 18.dp, bottom = 10.dp),
                        ) {
                            RewardsEmptyStateCard(
                                icon = Icons.Filled.ConfirmationNumber,
                                title = "No ${couponStatusTitle(couponsViewModel.selectedStatus)} coupons",
                                subtitle = "Coupons from stores and rewards will appear here.",
                            )
                        }
                    }
                } else {
                    item {
                        Column(
                            modifier = Modifier.padding(horizontal = 1.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            couponsViewModel.coupons.forEach { item ->
                                val status = item.status.lowercase()
                                val isAvailable = status == "available"
                                val useInteraction = remember(item.id) { MutableInteractionSource() }
                                val useScale = rememberPressScale(
                                    interactionSource = useInteraction,
                                    pressedScale = 0.96f,
                                )

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .alpha(if (isAvailable) 1f else 0.65f),
                                ) {
                                    Card(
                                        shape = RoundedCornerShape(18.dp),
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.14f)),
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .heightIn(min = 162.dp)
                                                .background(Brush.horizontalGradient(couponGradientColors(item.coupon.category)))
                                                .padding(horizontal = RewardsPagePadding, vertical = 14.dp),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .padding(start = 2.dp),
                                                verticalArrangement = Arrangement.spacedBy(5.dp),
                                            ) {
                                                Text(
                                                    text = couponDiscount(item.coupon),
                                                    style = MaterialTheme.typography.displayMedium.copy(
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 44.sp,
                                                    ),
                                                    color = RewardsPrimaryText,
                                                    maxLines = 1,
                                                )
                                                Text(
                                                    text = couponSubtitle(item),
                                                    style = MaterialTheme.typography.titleLarge.copy(
                                                        fontWeight = FontWeight.SemiBold,
                                                        fontSize = 20.sp,
                                                    ),
                                                    color = RewardsPrimaryText.copy(alpha = 0.94f),
                                                    maxLines = 1,
                                                )
                                                Text(
                                                    text = "Min. spend $${String.format("%.0f", item.coupon.min_amount)}",
                                                    style = MaterialTheme.typography.bodyMedium.copy(
                                                        fontSize = 15.sp,
                                                        fontWeight = FontWeight.Medium,
                                                    ),
                                                    color = RewardsPrimaryText.copy(alpha = 0.80f),
                                                )
                                            }

                                            Box(
                                                modifier = Modifier
                                                    .width(1.dp)
                                                    .fillMaxHeight()
                                                    .drawBehind {
                                                        drawLine(
                                                            color = Color.White.copy(alpha = 0.35f),
                                                            start = Offset(0f, 0f),
                                                            end = Offset(0f, size.height),
                                                            strokeWidth = 1.dp.toPx(),
                                                            pathEffect = PathEffect.dashPathEffect(
                                                                floatArrayOf(4.dp.toPx(), 4.dp.toPx()),
                                                            ),
                                                        )
                                                    }
                                                    .padding(vertical = 7.dp),
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .align(Alignment.TopCenter)
                                                        .offset(y = (-6).dp)
                                                        .size(11.dp)
                                                        .background(Color.Black.copy(alpha = 0.96f), CircleShape),
                                                )
                                                Box(
                                                    modifier = Modifier
                                                        .align(Alignment.BottomCenter)
                                                        .offset(y = 6.dp)
                                                        .size(11.dp)
                                                        .background(Color.Black.copy(alpha = 0.96f), CircleShape),
                                                )
                                            }

                                            Column(
                                                modifier = Modifier
                                                    .width(108.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                            ) {
                                                Text(
                                                    text = if (status == "used") "Used" else "Expires",
                                                    style = MaterialTheme.typography.labelLarge.copy(
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                    ),
                                                    color = RewardsPrimaryText.copy(alpha = 0.90f),
                                                )
                                                Text(
                                                    text = couponDateLabel(item),
                                                    style = MaterialTheme.typography.labelSmall.copy(
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                    ),
                                                    color = RewardsPrimaryText,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    modifier = Modifier
                                                        .background(Color.Black.copy(alpha = 0.28f), RoundedCornerShape(8.dp))
                                                        .padding(horizontal = 10.dp, vertical = 6.dp),
                                                )
                                                if (isAvailable) {
                                                    Box(
                                                        modifier = Modifier
                                                            .scale(useScale)
                                                            .widthIn(min = 90.dp)
                                                            .heightIn(min = 36.dp)
                                                            .clip(RoundedCornerShape(999.dp))
                                                            .background(Color.White)
                                                            .clickable(
                                                                interactionSource = useInteraction,
                                                                indication = null,
                                                                onClick = { useCouponId = item.id },
                                                            )
                                                            .padding(horizontal = 18.dp),
                                                        contentAlignment = Alignment.Center,
                                                    ) {
                                                        Text(
                                                            text = "Use",
                                                            style = MaterialTheme.typography.titleSmall.copy(
                                                                fontSize = 15.sp,
                                                                fontWeight = FontWeight.SemiBold,
                                                            ),
                                                            color = Color.Black,
                                                        )
                                                    }
                                                } else if (status == "expired") {
                                                    Text(
                                                        text = "Expired",
                                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                                        color = Color(0xFFFF8A8A),
                                                    )
                                                } else {
                                                    Text(
                                                        text = "Used",
                                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                                        color = RewardsPrimaryText.copy(alpha = 0.7f),
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    Icon(
                                        imageVector = Icons.Outlined.OutlinedTicketIcon,
                                        contentDescription = null,
                                        tint = Color.White.copy(alpha = 0.10f),
                                        modifier = Modifier
                                            .align(Alignment.BottomEnd)
                                            .padding(8.dp)
                                            .size(36.dp)
                                            .rotate(12f),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (couponsViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}

private fun couponGradientColors(category: String?): List<Color> {
    return when (category?.lowercase().orEmpty()) {
        "newcomer" -> listOf(Color(0xFF6F52B5).copy(alpha = 0.45f), Color(0xFF355CA8).copy(alpha = 0.30f))
        "birthday" -> listOf(Color(0xFFB25087).copy(alpha = 0.45f), Color(0xFFB74646).copy(alpha = 0.30f))
        "referral" -> listOf(Color(0xFF3C8A66).copy(alpha = 0.42f), Color(0xFF2A8D88).copy(alpha = 0.30f))
        "activity" -> listOf(Color(0xFFB77935).copy(alpha = 0.45f), Color(0xFFC2A13B).copy(alpha = 0.30f))
        else -> listOf(RewardsGold.copy(alpha = 0.45f), Color(0xFFB5952F).copy(alpha = 0.24f))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GiftCardsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    giftCardsViewModel: GiftCardsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    val clipboardManager = LocalClipboardManager.current
    var claimCode by remember { mutableStateOf("") }
    var transferPhone by remember { mutableStateOf("") }
    var transferMessage by remember { mutableStateOf("") }
    var showClaimDialog by remember { mutableStateOf(false) }
    var sendCardId by remember { mutableStateOf<Int?>(null) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token) {
        if (token != null) giftCardsViewModel.load(token)
    }
    LaunchedEffect(giftCardsViewModel.errorMessage) {
        val message = giftCardsViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }
    LaunchedEffect(giftCardsViewModel.actionMessage) {
        val message = giftCardsViewModel.actionMessage?.trim().orEmpty()
        if (message.isEmpty()) return@LaunchedEffect
        noticeMessage = message

        if (showClaimDialog && !giftCardsViewModel.isClaiming) {
            showClaimDialog = false
            claimCode = ""
        }
        if (sendCardId != null && giftCardsViewModel.sendingCardId == null) {
            sendCardId = null
            transferPhone = ""
            transferMessage = ""
        }
    }

    val sortedCards = giftCardsViewModel.cards.sortedWith(
        compareBy<GiftCard> { giftStatusPriority(it.status) }
            .thenByDescending { it.created_at },
    )
    val totalBalance = sortedCards
        .filter { it.status.lowercase() == "active" }
        .sumOf { it.balance }
    val activeCount = sortedCards.count { it.status.lowercase() == "active" }
    val claimSheetActionInteraction = remember { MutableInteractionSource() }
    val claimSheetActionScale = rememberPressScale(
        interactionSource = claimSheetActionInteraction,
        pressedScale = 0.97f,
    )
    val sendSheetActionInteraction = remember { MutableInteractionSource() }
    val sendSheetActionScale = rememberPressScale(
        interactionSource = sendSheetActionInteraction,
        pressedScale = 0.97f,
    )

    if (showClaimDialog) {
        ModalBottomSheet(
            onDismissRequest = { showClaimDialog = false },
            containerColor = Color.Black,
            contentColor = RewardsPrimaryText,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(340.dp)
                    .padding(RewardsPagePadding),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Claim a Gift",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                        ),
                        color = RewardsPrimaryText,
                    )
                    Text(
                        text = "Close",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        ),
                        color = RewardsGold,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { showClaimDialog = false },
                    )
                }

                Text(
                    text = "Enter claim code",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        letterSpacing = 1.6.sp,
                    ),
                    color = RewardsSecondaryText,
                )

                GiftSheetInputField(
                    value = claimCode,
                    onValueChange = { claimCode = it.uppercase() },
                    placeholder = "Claim code",
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Characters,
                        autoCorrectEnabled = false,
                    ),
                )

                val isClaiming = giftCardsViewModel.isClaiming
                val claimButtonBg = RewardsGold
                val claimButtonFg = Color.Black
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .scale(claimSheetActionScale)
                        .clip(RoundedCornerShape(14.dp))
                        .background(claimButtonBg),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(
                                enabled = !isClaiming,
                                interactionSource = claimSheetActionInteraction,
                                indication = null,
                                onClick = {
                                    if (token != null) {
                                        giftCardsViewModel.claim(token, claimCode)
                                    }
                                },
                            )
                            .padding(vertical = 11.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (isClaiming) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(11.dp),
                                color = claimButtonFg,
                                strokeWidth = 1.6.dp,
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = null,
                                tint = claimButtonFg,
                                modifier = Modifier.size(12.dp),
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isClaiming) "Claiming..." else "Claim Gift Card",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 17.sp,
                            ),
                            color = claimButtonFg,
                        )
                    }
                }

                Text(
                    text = "Enter the code from SMS to claim a transferred gift card.",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                    color = RewardsSecondaryText,
                )

                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }

    val sendCard = sortedCards.firstOrNull { it.id == sendCardId }
    if (sendCardId != null && sendCard != null) {
        ModalBottomSheet(
            onDismissRequest = { sendCardId = null },
            containerColor = Color.Black,
            contentColor = RewardsPrimaryText,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(420.dp)
                    .padding(RewardsPagePadding),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Send Gift Card",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                        ),
                        color = RewardsPrimaryText,
                    )
                    Text(
                        text = "Close",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        ),
                        color = RewardsGold,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { sendCardId = null },
                    )
                }

                Card(
                    colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Balance",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                            ),
                            color = RewardsSecondaryText,
                        )
                        Text(
                            text = "$${String.format("%.2f", sendCard.balance)}",
                            color = RewardsGold,
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                            ),
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    GiftSheetLabel(text = "Recipient Phone")
                    GiftSheetInputField(
                        value = transferPhone,
                        onValueChange = { transferPhone = it },
                        placeholder = "Enter US phone",
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Number,
                            capitalization = KeyboardCapitalization.None,
                            autoCorrectEnabled = false,
                        ),
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    GiftSheetLabel(text = "Message (Optional)")
                    GiftSheetInputField(
                        value = transferMessage,
                        onValueChange = { transferMessage = it },
                        placeholder = "Write a message",
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                    )
                }

                val isSendingCurrentCard = giftCardsViewModel.sendingCardId == sendCard.id
                val isSendBusy = giftCardsViewModel.sendingCardId != null
                val sendButtonBg = RewardsGold
                val sendButtonFg = Color.Black
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .scale(sendSheetActionScale)
                        .clip(RoundedCornerShape(14.dp))
                        .background(sendButtonBg),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(
                                enabled = !isSendBusy,
                                interactionSource = sendSheetActionInteraction,
                                indication = null,
                                onClick = {
                                    if (token != null) {
                                        giftCardsViewModel.transfer(
                                            bearerToken = token,
                                            giftCardId = sendCard.id,
                                            recipientPhone = transferPhone,
                                            message = transferMessage.takeIf { it.isNotBlank() },
                                        )
                                    }
                                },
                            )
                            .padding(vertical = 11.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (isSendingCurrentCard) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(11.dp),
                                color = sendButtonFg,
                                strokeWidth = 1.6.dp,
                            )
                        } else {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = null,
                                tint = sendButtonFg,
                                modifier = Modifier.size(12.dp),
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isSendingCurrentCard) {
                                "Sending..."
                            } else {
                                "Send Digital Gift Card"
                            },
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 17.sp,
                            ),
                            color = sendButtonFg,
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "My Gift Cards", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 8.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {

            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(RewardsGold, CircleShape),
                    )
                    Text(
                        text = "DIGITAL ASSETS PURCHASED IN-SALON",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.6.sp,
                        ),
                        color = RewardsSecondaryText,
                    )
                }
            }

            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(
                            elevation = 12.dp,
                            shape = RoundedCornerShape(18.dp),
                            ambientColor = Color.Black.copy(alpha = 0.35f),
                            spotColor = Color.Black.copy(alpha = 0.35f),
                        ),
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                    border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.20f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        Color(0xFF1A1A1A),
                                        Color(0xFF252525),
                                    ),
                                ),
                            )
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .drawBehind {
                                    drawRect(
                                        brush = Brush.radialGradient(
                                            colors = listOf(
                                                RewardsGold.copy(alpha = 0.22f),
                                                Color.Transparent,
                                            ),
                                            center = Offset(x = size.width / 2f, y = 0f),
                                            radius = size.maxDimension * 1.05f,
                                        ),
                                    )
                                },
                        )
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .fillMaxWidth()
                                .height(32.dp)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.White.copy(alpha = 0.12f),
                                            Color.Transparent,
                                        ),
                                    ),
                                ),
                        )

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 28.dp, horizontal = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.CardGiftcard,
                                    contentDescription = null,
                                    tint = RewardsGold,
                                    modifier = Modifier.size(14.dp),
                                )
                                Text(
                                    text = "GIFT CARD WALLET",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 2.2.sp,
                                    ),
                                    color = RewardsSecondaryText,
                                )
                            }

                            Text(
                                text = "TOTAL BALANCE",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 2.4.sp,
                                ),
                                color = RewardsGold,
                            )

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(2.dp),
                                verticalAlignment = Alignment.Bottom,
                            ) {
                                Text(
                                    text = "$",
                                    style = MaterialTheme.typography.headlineMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 28.sp,
                                    ),
                                    color = RewardsGold,
                                    modifier = Modifier.alignByBaseline(),
                                )
                                Text(
                                    text = String.format("%.2f", totalBalance),
                                    style = MaterialTheme.typography.displayMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 46.sp,
                                    ),
                                    color = RewardsPrimaryText,
                                    maxLines = 1,
                                    modifier = Modifier.alignByBaseline(),
                                )
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .background(Color.Black.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
                                    .padding(horizontal = 12.dp, vertical = 7.dp),
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.CheckCircle,
                                    contentDescription = null,
                                    tint = RewardsGold,
                                    modifier = Modifier.size(12.dp),
                                )
                                Text(
                                    text = "${activeCount} Active",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                    color = RewardsSecondaryText,
                                )
                                Text(
                                    text = "•",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = RewardsSecondaryText.copy(alpha = 0.6f),
                                )
                                Text(
                                    text = "${sortedCards.size} Total",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                    color = RewardsSecondaryText,
                                )
                            }
                        }
                    }
                }
            }

            item {
                Box(modifier = Modifier.padding(top = 2.dp)) {
                    RewardsUnifiedSectionHeader(title = "MY COLLECTION", showsDivider = true)
                }
            }

            item {
                val claimInteraction = remember { MutableInteractionSource() }
                val claimScale = rememberPressScale(
                    interactionSource = claimInteraction,
                    pressedScale = 0.97f,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 1.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "${sortedCards.size} cards",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = RewardsSecondaryText,
                    )

                    Spacer(modifier = Modifier.weight(1f))

                    Box(
                        modifier = Modifier
                            .scale(claimScale)
                            .clip(RoundedCornerShape(999.dp))
                            .background(Color.Black.copy(alpha = 0.45f))
                            .border(
                                width = 1.dp,
                                color = RewardsGold.copy(alpha = 0.35f),
                                shape = RoundedCornerShape(999.dp),
                            )
                            .clickable(
                                interactionSource = claimInteraction,
                                indication = null,
                                onClick = { showClaimDialog = true },
                            ),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.ConfirmationNumber,
                                contentDescription = null,
                                tint = RewardsGold,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                text = "CLAIM",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.1.sp,
                                ),
                                color = RewardsGold,
                            )
                        }
                    }
                }
            }

            if (!giftCardsViewModel.isLoading && sortedCards.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
                    ) {
                        RewardsEmptyStateCard(
                            icon = Icons.Filled.CardGiftcard,
                            title = "No gift cards found",
                            subtitle = "Claim or receive gift cards to see them here.",
                        )
                    }
                }
            } else {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 1.dp, end = 1.dp, top = 3.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        sortedCards.forEach { card ->
                            GiftCardCollectionCard(
                                card = card,
                                revokingCardId = giftCardsViewModel.revokingCardId,
                                onCopyCode = { code ->
                                    clipboardManager.setText(AnnotatedString(code))
                                    noticeMessage = "Card code copied."
                                },
                                onSend = {
                                    sendCardId = card.id
                                    transferPhone = ""
                                    transferMessage = ""
                                },
                                onRevoke = {
                                    if (token != null) {
                                        giftCardsViewModel.revoke(token, card.id)
                                    }
                                },
                            )
                        }
                    }
                }
            }

            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = RewardsGold.copy(alpha = 0.08f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.18f)),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .background(RewardsGold.copy(alpha = 0.12f), CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Security,
                                contentDescription = null,
                                tint = RewardsGold,
                                modifier = Modifier.size(16.dp),
                            )
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(
                                text = "IN-STORE REDEMPTION",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.6.sp,
                                ),
                                color = RewardsGold,
                            )
                            Text(
                                text = "Show your gift card code to the receptionist at checkout and the amount will be deducted from your final bill.",
                                style = MaterialTheme.typography.bodySmall,
                                color = RewardsSecondaryText,
                            )
                        }
                    }
                }
            }
        }

        if (giftCardsViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}
}

@Composable
private fun GiftCardCollectionCard(
    modifier: Modifier = Modifier,
    card: GiftCard,
    revokingCardId: Int?,
    onCopyCode: (String) -> Unit,
    onSend: () -> Unit,
    onRevoke: () -> Unit,
) {
    val status = card.status.lowercase()
    val statusColor = giftStatusToneColor(status)
    val copyInteraction = remember(card.id) { MutableInteractionSource() }
    val copyScale = rememberPressScale(
        interactionSource = copyInteraction,
        pressedScale = 0.9f,
    )
    val sendInteraction = remember(card.id) { MutableInteractionSource() }
    val sendScale = rememberPressScale(
        interactionSource = sendInteraction,
        pressedScale = 0.97f,
    )
    val revokeInteraction = remember(card.id) { MutableInteractionSource() }
    val revokeScale = rememberPressScale(
        interactionSource = revokeInteraction,
        pressedScale = 0.97f,
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(18.dp),
                ambientColor = Color.Black.copy(alpha = 0.25f),
                spotColor = Color.Black.copy(alpha = 0.25f),
            ),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.20f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(giftCardSurfaceGradient())),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                RewardsGold.copy(alpha = 0.16f),
                                Color.Transparent,
                            ),
                            center = Offset.Zero,
                            radius = 420f,
                        ),
                    ),
            )

            Box(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .height(24.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.10f),
                                Color.Transparent,
                            ),
                        ),
                    ),
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = RewardsPagePadding, vertical = 13.dp),
                verticalArrangement = Arrangement.spacedBy(11.dp),
            ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.CardGiftcard,
                        contentDescription = null,
                        tint = RewardsGold,
                        modifier = Modifier.size(13.dp),
                    )
                    Text(
                        text = "GIFT CARD",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.4.sp,
                        ),
                        color = RewardsSecondaryText,
                    )
                }
                Text(
                    text = giftStatusLabel(status),
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = statusColor,
                    modifier = Modifier
                        .background(statusColor.copy(alpha = 0.18f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    text = "$",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                    ),
                    color = RewardsGold,
                    modifier = Modifier.alignByBaseline(),
                )
                Text(
                    text = String.format("%.2f", card.balance),
                    style = MaterialTheme.typography.displaySmall.copy(
                        fontWeight = FontWeight.Black,
                        fontSize = 38.sp,
                    ),
                    color = RewardsPrimaryText,
                    maxLines = 1,
                    modifier = Modifier.alignByBaseline(),
                )
            }

            Text(
                text = "Available Balance",
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                color = RewardsSecondaryText,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.44f), RoundedCornerShape(11.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "#",
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                    color = RewardsGold,
                )
                Text(
                    text = card.card_number,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = RewardsGold,
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 8.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Box(
                    modifier = Modifier
                        .scale(copyScale)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(alpha = 0.08f))
                        .clickable(
                            interactionSource = copyInteraction,
                            indication = null,
                        ) { onCopyCode(card.card_number) }
                        .padding(7.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.ContentCopy,
                        contentDescription = "Copy card code",
                        tint = RewardsPrimaryText.copy(alpha = 0.9f),
                        modifier = Modifier.size(14.dp),
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.CalendarMonth,
                        contentDescription = null,
                        tint = RewardsSecondaryText,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        text = "Issued ${displayDateOnly(card.created_at)}",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = RewardsSecondaryText,
                    )
                }

                card.expires_at?.let { expires ->
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.labelSmall,
                        color = RewardsMutedText,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.AccessTime,
                            contentDescription = null,
                            tint = RewardsSecondaryText,
                            modifier = Modifier.size(12.dp),
                        )
                        Text(
                            text = "Exp ${displayDateOnly(expires)}",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = RewardsSecondaryText,
                        )
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
            }

            card.recipient_phone?.takeIf { it.isNotBlank() }?.let { recipient ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Person,
                        contentDescription = null,
                        tint = RewardsSecondaryText,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        text = "Recipient ${maskPhone(recipient)}",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = RewardsSecondaryText,
                    )
                }
            }

            when (status) {
                "active" -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .scale(sendScale)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.Black.copy(alpha = 0.42f))
                            .border(
                                width = 1.dp,
                                color = RewardsGold.copy(alpha = 0.35f),
                                shape = RoundedCornerShape(12.dp),
                            ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(
                                    interactionSource = sendInteraction,
                                    indication = null,
                                    onClick = onSend,
                                )
                                .padding(vertical = 9.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = null,
                                tint = RewardsGold,
                                modifier = Modifier.size(12.dp),
                            )
                            Spacer(modifier = Modifier.width(5.dp))
                            Text(
                                text = "SEND THIS CARD",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.8.sp,
                                ),
                                color = RewardsGold,
                            )
                        }
                    }
                }

                "pending_transfer" -> {
                    val isRevoking = revokingCardId == card.id
                    val revokeTextColor = Color(0xFFFF3B30).copy(alpha = 0.9f)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .scale(revokeScale)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFFF3B30).copy(alpha = 0.10f))
                            .border(
                                width = 1.dp,
                                color = Color(0xFFFF3B30).copy(alpha = 0.45f),
                                shape = RoundedCornerShape(12.dp),
                            ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(
                                    enabled = !isRevoking,
                                    interactionSource = revokeInteraction,
                                    indication = null,
                                    onClick = onRevoke,
                                )
                                .padding(vertical = 9.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (isRevoking) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(9.dp),
                                    strokeWidth = 1.6.dp,
                                    color = Color(0xFFFF3B30),
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "CANCELING...",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.8.sp,
                                    ),
                                    color = revokeTextColor,
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .background(revokeTextColor.copy(alpha = 0.18f), CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Close,
                                        contentDescription = null,
                                        tint = revokeTextColor,
                                        modifier = Modifier.size(8.dp),
                                    )
                                }
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "CANCEL TRANSFER",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.8.sp,
                                    ),
                                    color = revokeTextColor,
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

private fun giftCardSurfaceGradient(): List<Color> {
    return listOf(
        RewardsCardBackground,
        Color(0xFF1E1B13),
    )
}

private fun giftStatusToneColor(status: String): Color {
    return when (status) {
        "pending_transfer" -> RewardsGold
        "active" -> Color(0xFF34C759)
        "used" -> Color(0xFFFF9500)
        "revoked" -> Color(0xFFFF3B30)
        "expired" -> Color(0xFF8E8E93)
        else -> RewardsSecondaryText
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    orderHistoryViewModel: OrderHistoryViewModel = viewModel(),
) {
    val context = LocalContext.current
    val uiScope = rememberCoroutineScope()
    val token = sessionViewModel.accessTokenOrNull()
    var reviewingItem by remember { mutableStateOf<Appointment?>(null) }
    var reviewRating by remember { mutableStateOf(5) }
    var reviewComment by remember { mutableStateOf("") }
    var reviewDraftImages by remember { mutableStateOf(emptyList<ReviewDraftImage>()) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }
    val reviewImagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        uiScope.launch {
            val remainingSlots = (MaxReviewImageCount - reviewDraftImages.size).coerceAtLeast(0)
            if (remainingSlots <= 0) {
                noticeMessage = "Maximum 5 images allowed."
                return@launch
            }

            val selectedUris = uris.take(remainingSlots)
            val newDrafts = withContext(Dispatchers.IO) {
                selectedUris.mapNotNull { uri ->
                    loadReviewDraftImage(context = context, uri = uri)
                }
            }
            if (newDrafts.isNotEmpty()) {
                reviewDraftImages = reviewDraftImages + newDrafts
            }
            if (newDrafts.size < selectedUris.size) {
                noticeMessage = "Some images couldn't be processed. Use images under 5MB."
            }
            if (uris.size > remainingSlots) {
                noticeMessage = "Maximum 5 images allowed."
            }
        }
    }

    LaunchedEffect(token) {
        if (token != null) orderHistoryViewModel.load(token)
    }
    LaunchedEffect(orderHistoryViewModel.errorMessage, orderHistoryViewModel.actionMessage) {
        val message = orderHistoryViewModel.errorMessage?.trim().takeIf { !it.isNullOrEmpty() }
            ?: orderHistoryViewModel.actionMessage?.trim().takeIf { !it.isNullOrEmpty() }
        if (message != null) {
            noticeMessage = message
        }
    }

    val dismissReviewComposer: () -> Unit = {
        reviewingItem = null
        reviewComment = ""
        reviewRating = 5
        reviewDraftImages = emptyList()
    }

    if (reviewingItem != null) {
        val current = reviewingItem
        val reviewSheetScrollState = rememberScrollState()
        val isSubmittingCurrentReview = current?.id != null &&
            orderHistoryViewModel.submittingReviewAppointmentId == current.id
        val isReviewSubmissionBusy = isSubmittingCurrentReview || orderHistoryViewModel.isUploadingReviewImages
        val reviewCloseInteraction = remember { MutableInteractionSource() }
        val addPhotosInteraction = remember { MutableInteractionSource() }
        val reviewCancelInteraction = remember { MutableInteractionSource() }
        val reviewSubmitInteraction = remember { MutableInteractionSource() }

        ModalBottomSheet(
            onDismissRequest = dismissReviewComposer,
            containerColor = Color.Black,
            contentColor = RewardsPrimaryText,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(reviewSheetScrollState)
                    .padding(
                        start = RewardsPagePadding,
                        end = RewardsPagePadding,
                        top = 18.dp,
                        bottom = 12.dp,
                    ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Write a Review",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 17.sp,
                        ),
                        color = RewardsPrimaryText,
                    )
                    Text(
                        text = "Close",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        ),
                        color = Color.White.copy(alpha = 0.74f),
                        modifier = Modifier.clickable(
                            interactionSource = reviewCloseInteraction,
                            indication = null,
                            onClick = dismissReviewComposer,
                        ),
                    )
                }

                Text(
                    text = "Reviews are available within 30 days after your appointment.",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                    color = RewardsSecondaryText,
                )

                if (current != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(
                                current.store_name ?: "Salon",
                                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                                color = RewardsPrimaryText,
                            )
                            Text(
                                current.service_name ?: "Service",
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                                color = RewardsSecondaryText,
                            )
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Rating",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        ),
                        color = RewardsPrimaryText.copy(alpha = 0.62f),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (1..5).forEach { star ->
                            val starInteraction = remember(star) { MutableInteractionSource() }
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clickable(
                                        interactionSource = starInteraction,
                                        indication = null,
                                    ) { reviewRating = star },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = if (star <= reviewRating) Icons.Filled.Star else Icons.Filled.StarBorder,
                                    contentDescription = null,
                                    tint = if (star <= reviewRating) RewardsGold else Color.White.copy(alpha = 0.34f),
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Comment (Optional)",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        ),
                        color = RewardsPrimaryText.copy(alpha = 0.62f),
                    )
                    BasicTextField(
                        value = reviewComment,
                        onValueChange = { reviewComment = it },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = RewardsPrimaryText),
                        cursorBrush = SolidColor(RewardsGold),
                        modifier = Modifier.fillMaxWidth(),
                        decorationBox = { innerTextField ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 120.dp, max = 180.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(RewardsCardBackground)
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                                    .padding(8.dp),
                            ) {
                                innerTextField()
                            }
                        },
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Photos (Optional, max 5)",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        ),
                        color = RewardsPrimaryText.copy(alpha = 0.62f),
                    )

                    if (reviewDraftImages.isNotEmpty()) {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(3),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 220.dp),
                        ) {
                            gridItems(reviewDraftImages, key = { it.id }) { item ->
                                val removeImageInteraction = remember(item.id) { MutableInteractionSource() }
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(92.dp)
                                        .clip(RoundedCornerShape(12.dp)),
                                ) {
                                    AsyncImage(
                                        model = item.uri,
                                        contentDescription = "Selected photo",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(6.dp)
                                            .size(22.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.68f), CircleShape)
                                            .clickable(
                                                interactionSource = removeImageInteraction,
                                                indication = null,
                                                onClick = {
                                                    reviewDraftImages = reviewDraftImages.filterNot { it.id == item.id }
                                                },
                                            ),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Close,
                                            contentDescription = "Remove image",
                                            tint = Color.White,
                                            modifier = Modifier.size(11.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (reviewDraftImages.size < MaxReviewImageCount) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(RewardsCardBackground)
                                .drawBehind {
                                    drawRoundRect(
                                        color = Color.White.copy(alpha = 0.16f),
                                        cornerRadius = CornerRadius(12.dp.toPx(), 12.dp.toPx()),
                                        style = Stroke(
                                            width = 1.dp.toPx(),
                                            pathEffect = PathEffect.dashPathEffect(
                                                floatArrayOf(6.dp.toPx(), 4.dp.toPx()),
                                            ),
                                        ),
                                    )
                                }
                                .clickable(
                                    enabled = !orderHistoryViewModel.isUploadingReviewImages,
                                    interactionSource = addPhotosInteraction,
                                    indication = null,
                                    onClick = { reviewImagePickerLauncher.launch("image/*") },
                                )
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (orderHistoryViewModel.isUploadingReviewImages) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    color = RewardsGold,
                                    strokeWidth = 2.dp,
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Outlined.Collections,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = RewardsPrimaryText.copy(alpha = 0.86f),
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (orderHistoryViewModel.isUploadingReviewImages) "Uploading..." else "Add Photos",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp,
                                ),
                                color = RewardsPrimaryText.copy(alpha = 0.86f),
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.08f))
                            .clickable(
                                interactionSource = reviewCancelInteraction,
                                indication = null,
                                onClick = dismissReviewComposer,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "Cancel",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            ),
                            color = RewardsPrimaryText.copy(alpha = 0.80f),
                        )
                    }
                    val canSubmitReview = current != null && !isReviewSubmissionBusy
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(RewardsGold)
                            .clickable(
                                enabled = canSubmitReview,
                                interactionSource = reviewSubmitInteraction,
                                indication = null,
                                onClick = {
                                    val appointment = current ?: return@clickable
                                    if (token != null) {
                                        orderHistoryViewModel.createReview(
                                            bearerToken = token,
                                            appointmentId = appointment.id,
                                            rating = reviewRating.toDouble(),
                                            comment = reviewComment.takeIf { it.isNotBlank() },
                                            imageFiles = reviewDraftImages.map { image ->
                                                ReviewUploadImagePayload(
                                                    imageData = image.data,
                                                    fileName = image.fileName,
                                                    mimeType = image.mimeType,
                                                )
                                            },
                                            onCreated = dismissReviewComposer,
                                        )
                                    }
                                },
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (isSubmittingCurrentReview) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.Black.copy(alpha = 0.85f),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text = "Submit",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                ),
                                color = Color.Black.copy(alpha = 0.88f),
                            )
                        }
                    }
                }

            }
        }
    }

    val totalSpend = orderHistoryViewModel.items.sumOf { maxOf(it.service_price ?: 0.0, 0.0) }
    val completedCount = orderHistoryViewModel.items.size

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "Transaction History", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 8.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OrderHistorySummaryMetric(
                        title = "Total Spend",
                        value = "$${String.format("%.2f", totalSpend)}",
                        icon = Icons.Filled.AttachMoney,
                        highlighted = true,
                        modifier = Modifier.weight(1f),
                    )
                    OrderHistorySummaryMetric(
                        title = "Total Visits",
                        value = completedCount.toString(),
                        icon = Icons.Filled.CalendarMonth,
                        highlighted = false,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            item {
                RewardsUnifiedSectionHeader(
                    title = "RECENT ACTIVITY",
                    trailing = if (completedCount > 0) "$completedCount completed" else null,
                    showsDivider = true,
                )
            }

            if (!orderHistoryViewModel.isLoading && orderHistoryViewModel.items.isEmpty()) {
                item {
                    RewardsEmptyStateCard(
                        icon = Icons.Filled.History,
                        title = "No transactions yet",
                        subtitle = "Completed orders will appear here.",
                    )
                }
            } else {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        orderHistoryViewModel.items.forEach { item ->
                            OrderHistoryActivityCard(
                                item = item,
                                onReview = {
                                    reviewingItem = item
                                    reviewRating = 5
                                    reviewComment = ""
                                    reviewDraftImages = emptyList()
                                },
                            )
                        }
                    }
                }
            }
        }

        if (orderHistoryViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}
}

@Composable
private fun OrderHistorySummaryMetric(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    highlighted: Boolean,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(OrderHistoryCardCorner),
        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.18f)),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.6.sp,
                ),
                color = RewardsSecondaryText,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                color = if (highlighted) RewardsGold else RewardsPrimaryText,
                maxLines = 1,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = RewardsGold,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = "Completed orders",
                    style = MaterialTheme.typography.labelSmall,
                    color = RewardsSecondaryText,
                )
            }
        }
    }
}

@Composable
private fun OrderHistoryActivityCard(
    item: Appointment,
    onReview: () -> Unit,
) {
    val canReview = canReviewAppointment(item)
    val amount = maxOf(item.service_price ?: 0.0, 0.0)

    Card(
        shape = RoundedCornerShape(OrderHistoryCardCorner),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.16f)),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = item.store_name ?: "Salon",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        ),
                        color = RewardsPrimaryText,
                        maxLines = 1,
                    )
                    item.order_number?.takeIf { it.isNotBlank() }?.let { order ->
                        Text(
                            text = "Order $order",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 1.1.sp,
                            ),
                            color = Color.White.copy(alpha = 0.55f),
                            maxLines = 1,
                        )
                    }
                    item.store_address?.trim()?.takeIf { it.isNotEmpty() }?.let { address ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.LocationOn,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.48f),
                                modifier = Modifier.size(11.dp),
                            )
                            Text(
                                text = address,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.60f),
                                maxLines = 1,
                            )
                        }
                    }
                }

                Text(
                    text = "$${String.format("%.2f", amount)}",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                    ),
                    color = RewardsGold,
                )
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = item.service_name ?: "Service",
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                    ),
                    color = Color.White.copy(alpha = 0.88f),
                    maxLines = 1,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "${formatAppointmentDate(item.appointment_date)} · ${formatAppointmentTime(item.appointment_time)}",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                    color = RewardsSecondaryText,
                    maxLines = 1,
                )
            }

            if (item.status.lowercase() == "completed") {
                HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Review",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        ),
                        color = Color.White.copy(alpha = 0.68f),
                    )

                    when {
                        canReview -> {
                            val reviewActionInteraction = remember(item.id) { MutableInteractionSource() }
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(RewardsGold.copy(alpha = 0.12f))
                                    .clickable(
                                        interactionSource = reviewActionInteraction,
                                        indication = null,
                                        onClick = onReview,
                                    )
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                                    .border(
                                        width = 1.dp,
                                        color = RewardsGold.copy(alpha = 0.42f),
                                        shape = RoundedCornerShape(999.dp),
                                    ),
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Star,
                                    contentDescription = null,
                                    tint = RewardsGold,
                                    modifier = Modifier.size(11.dp),
                                )
                                Text(
                                    text = "Review",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                    ),
                                    color = RewardsGold,
                                )
                            }
                        }

                        item.review_id != null -> {
                            Text(
                                text = "Reviewed",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp,
                                ),
                                color = RewardsGold,
                            )
                        }

                        else -> {
                            Text(
                                text = "Review window closed",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp,
                                ),
                                color = Color.White.copy(alpha = 0.56f),
                            )
                        }
                    }
                }
            }
        }
    }
}

private const val MaxReviewImageCount = 5
private const val MaxReviewImageBytes = 5 * 1024 * 1024

private data class ReviewDraftImage(
    val id: String = UUID.randomUUID().toString(),
    val uri: Uri,
    val data: ByteArray,
    val fileName: String,
    val mimeType: String = "image/jpeg",
)

private fun loadReviewDraftImage(context: Context, uri: Uri): ReviewDraftImage? {
    val rawData = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    val optimizedData = optimizeReviewImageData(rawData) ?: return null
    return ReviewDraftImage(
        uri = uri,
        data = optimizedData,
        fileName = resolveReviewImageFileName(context, uri),
    )
}

private fun resolveReviewImageFileName(context: Context, uri: Uri): String {
    val displayName = context.contentResolver.query(
        uri,
        arrayOf(OpenableColumns.DISPLAY_NAME),
        null,
        null,
        null,
    )?.use { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
    }
    val baseName = displayName
        ?.substringBeforeLast('.')
        ?.trim()
        .orEmpty()
        .ifBlank { "review_${System.currentTimeMillis()}" }
        .replace(Regex("[^A-Za-z0-9_-]"), "_")
    return "${baseName}_${UUID.randomUUID().toString().take(8)}.jpg"
}

private fun optimizeReviewImageData(rawData: ByteArray): ByteArray? {
    val bitmap = BitmapFactory.decodeByteArray(rawData, 0, rawData.size) ?: return null
    return try {
        compressBitmapUnderLimit(bitmap = bitmap, maxBytes = MaxReviewImageBytes)
    } finally {
        if (!bitmap.isRecycled) {
            bitmap.recycle()
        }
    }
}

private fun compressBitmapUnderLimit(bitmap: Bitmap, maxBytes: Int): ByteArray? {
    val qualityLevels = intArrayOf(90, 82, 74, 66, 58, 50, 42)
    var currentBitmap = bitmap
    var attempt = 0
    while (attempt < 5) {
        for (quality in qualityLevels) {
            val output = ByteArrayOutputStream()
            val compressed = currentBitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)
            if (!compressed) continue
            val bytes = output.toByteArray()
            if (bytes.size <= maxBytes) {
                if (currentBitmap !== bitmap && !currentBitmap.isRecycled) {
                    currentBitmap.recycle()
                }
                return bytes
            }
        }

        val nextWidth = (currentBitmap.width * 0.85f).toInt()
        val nextHeight = (currentBitmap.height * 0.85f).toInt()
        if (nextWidth < 240 || nextHeight < 240) break

        val scaled = Bitmap.createScaledBitmap(currentBitmap, nextWidth, nextHeight, true)
        if (currentBitmap !== bitmap && !currentBitmap.isRecycled) {
            currentBitmap.recycle()
        }
        currentBitmap = scaled
        attempt += 1
    }

    if (currentBitmap !== bitmap && !currentBitmap.isRecycled) {
        currentBitmap.recycle()
    }
    return null
}

private fun canReviewAppointment(item: Appointment): Boolean {
    if (item.status.lowercase() != "completed") return false
    if (item.review_id != null) return false
    return isReviewWindowOpen(item.appointment_date, item.appointment_time, 30)
}

private fun isReviewWindowOpen(
    appointmentDate: String,
    appointmentTime: String,
    reviewWindowDays: Long,
): Boolean {
    val baseDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime) ?: return false
    val cutoff = baseDateTime.plusDays(reviewWindowDays)
    return !LocalDateTime.now().isAfter(cutoff)
}

private fun parseAppointmentDateTime(date: String, time: String): LocalDateTime? {
    val normalizedTime = normalizeAppointmentTime(time) ?: return null
    val raw = "${date.trim()}T$normalizedTime"
    return runCatching {
        LocalDateTime.parse(raw, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"))
    }.recoverCatching {
        LocalDateTime.parse(raw, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"))
    }.getOrNull()
}

private fun normalizeAppointmentTime(raw: String): String? {
    val value = raw.trim()
    if (value.isBlank()) return null
    return when {
        value.length >= 8 -> value.take(8)
        value.length == 5 -> "$value:00"
        else -> value
    }
}

private fun formatAppointmentDate(raw: String): String {
    val value = raw.trim()
    return runCatching {
        LocalDate.parse(value).format(DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US))
    }.getOrElse { value }
}

private fun formatAppointmentTime(raw: String): String {
    val normalized = normalizeAppointmentTime(raw) ?: return raw.trim()
    return runCatching {
        LocalTime.parse(normalized).format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
    }.getOrElse { raw.trim() }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    myReviewsViewModel: MyReviewsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var showEditDialog by remember { mutableStateOf(false) }
    var editingReview by remember { mutableStateOf<UserReview?>(null) }
    var editRating by remember { mutableStateOf(5) }
    var editComment by remember { mutableStateOf("") }
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token) {
        if (token != null) myReviewsViewModel.load(token)
    }
    LaunchedEffect(myReviewsViewModel.errorMessage, myReviewsViewModel.actionMessage) {
        val message = myReviewsViewModel.errorMessage?.trim().takeIf { !it.isNullOrEmpty() }
            ?: myReviewsViewModel.actionMessage?.trim().takeIf { !it.isNullOrEmpty() }
        if (message != null) {
            noticeMessage = message
        }
    }

    if (showEditDialog && editingReview != null) {
        val current = editingReview
        val closeInteraction = remember { MutableInteractionSource() }
        val cancelInteraction = remember { MutableInteractionSource() }
        val updateInteraction = remember { MutableInteractionSource() }
        ModalBottomSheet(
            onDismissRequest = {
                showEditDialog = false
                editingReview = null
            },
            containerColor = Color.Black,
            contentColor = RewardsPrimaryText,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 18.dp, bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Edit Review",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 17.sp,
                        ),
                        color = RewardsPrimaryText,
                    )
                    Text(
                        text = "Close",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        ),
                        color = Color.White.copy(alpha = 0.74f),
                        modifier = Modifier.clickable(
                            interactionSource = closeInteraction,
                            indication = null,
                            onClick = {
                                showEditDialog = false
                                editingReview = null
                            },
                        ),
                    )
                }

                Text(
                    text = "Rating",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                    ),
                    color = RewardsPrimaryText.copy(alpha = 0.62f),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    (1..5).forEach { star ->
                        val starInteraction = remember(star) { MutableInteractionSource() }
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clickable(
                                    interactionSource = starInteraction,
                                    indication = null,
                                ) { editRating = star },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = if (star <= editRating) Icons.Filled.Star else Icons.Filled.StarBorder,
                                contentDescription = null,
                                tint = if (star <= editRating) RewardsGold else Color.White.copy(alpha = 0.34f),
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Comment",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        ),
                        color = RewardsPrimaryText.copy(alpha = 0.62f),
                    )
                    BasicTextField(
                        value = editComment,
                        onValueChange = { editComment = it },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = RewardsPrimaryText),
                        cursorBrush = SolidColor(RewardsGold),
                        modifier = Modifier.fillMaxWidth(),
                        decorationBox = { innerTextField ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 120.dp, max = 180.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(RewardsCardBackground)
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                                    .padding(8.dp),
                            ) {
                                innerTextField()
                            }
                        },
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val isUpdating = current != null && myReviewsViewModel.updatingReviewId == current.id
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.08f))
                            .clickable(
                                interactionSource = cancelInteraction,
                                indication = null,
                                onClick = {
                                    showEditDialog = false
                                    editingReview = null
                                },
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "Cancel",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            ),
                            color = RewardsPrimaryText.copy(alpha = 0.80f),
                        )
                    }
                    val canUpdate = current != null && !isUpdating
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 46.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(RewardsGold)
                            .clickable(
                                enabled = canUpdate,
                                interactionSource = updateInteraction,
                                indication = null,
                                onClick = {
                                    val review = current ?: return@clickable
                                    val appointmentId = review.appointment_id ?: return@clickable
                                    if (token != null) {
                                        myReviewsViewModel.updateReview(
                                            bearerToken = token,
                                            reviewId = review.id,
                                            appointmentId = appointmentId,
                                            rating = editRating.toDouble(),
                                            comment = editComment,
                                            images = review.images,
                                            onUpdated = {
                                                showEditDialog = false
                                                editingReview = null
                                            },
                                        )
                                    }
                                },
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (isUpdating) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.Black.copy(alpha = 0.85f),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text = "Update",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                ),
                                color = Color.Black.copy(alpha = 0.88f),
                            )
                        }
                    }
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "My Reviews", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 8.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {

            if (!myReviewsViewModel.isLoading && myReviewsViewModel.items.isEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(20.dp))
                }
                item {
                    RewardsEmptyStateCard(
                        icon = Icons.Filled.Star,
                        title = "No reviews yet",
                        subtitle = "Complete an appointment and share your experience.",
                    )
                }
            } else {
                items(myReviewsViewModel.items, key = { it.id }) { review ->
                    val rating = review.rating ?: 0.0
                    val resolvedStoreName = review.store_name
                        ?.trim()
                        ?.takeIf { it.isNotEmpty() }
                        ?: review.store_id
                            ?.let { myReviewsViewModel.storeNameById[it]?.trim() }
                            ?.takeIf { it.isNotEmpty() }
                        ?: "Salon"
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.16f)),
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top,
                            ) {
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(
                                        text = resolvedStoreName,
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                                        color = RewardsPrimaryText,
                                        maxLines = 1,
                                    )
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        ReviewStars(rating = rating)
                                        Text(
                                            text = String.format("%.1f", rating),
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 12.sp,
                                            ),
                                            color = Color.White.copy(alpha = 0.68f),
                                        )
                                    }
                                }
                                Text(
                                    text = displayDateOnly(review.created_at.orEmpty()),
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                                    color = RewardsSecondaryText,
                                )
                            }

                            Text(
                                text = review.comment?.takeIf { it.isNotBlank() } ?: "No written comment",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (review.comment.isNullOrBlank()) RewardsSecondaryText else Color.White.copy(alpha = 0.82f),
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                val canEdit = review.appointment_id != null
                                val editInteraction = remember(review.id) { MutableInteractionSource() }
                                val editScale = rememberPressScale(
                                    interactionSource = editInteraction,
                                    pressedScale = 0.97f,
                                )
                                val deleteInteraction = remember(review.id) { MutableInteractionSource() }
                                val deleteScale = rememberPressScale(
                                    interactionSource = deleteInteraction,
                                    pressedScale = 0.97f,
                                )
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .scale(editScale)
                                        .heightIn(min = 40.dp)
                                        .alpha(if (canEdit) 1f else 0.45f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.White.copy(alpha = 0.06f))
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                        .clickable(
                                            enabled = canEdit,
                                            interactionSource = editInteraction,
                                            indication = null,
                                            onClick = {
                                                editingReview = review
                                                editComment = review.comment.orEmpty()
                                                editRating = (review.rating ?: 5.0).roundToInt().coerceIn(1, 5)
                                                showEditDialog = true
                                            },
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Edit,
                                            contentDescription = null,
                                            modifier = Modifier.size(12.dp),
                                            tint = Color.White.copy(alpha = 0.92f),
                                        )
                                        Text(
                                            text = "Edit",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 12.sp,
                                            ),
                                            color = Color.White.copy(alpha = 0.92f),
                                        )
                                    }
                                }
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .scale(deleteScale)
                                        .heightIn(min = 40.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFFFF6E6E).copy(alpha = 0.12f))
                                        .border(
                                            1.dp,
                                            Color(0xFFFF8A8A).copy(alpha = 0.28f),
                                            RoundedCornerShape(12.dp),
                                        )
                                        .clickable(
                                            enabled = myReviewsViewModel.deletingReviewId != review.id,
                                            interactionSource = deleteInteraction,
                                            indication = null,
                                            onClick = {
                                                if (token != null) {
                                                    myReviewsViewModel.deleteReview(token, review.id)
                                                }
                                            },
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (myReviewsViewModel.deletingReviewId == review.id) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(14.dp),
                                            strokeWidth = 1.8.dp,
                                            color = Color(0xFFFF8A8A),
                                        )
                                    } else {
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(
                                                imageVector = Icons.Filled.Delete,
                                                contentDescription = null,
                                                modifier = Modifier.size(12.dp),
                                                tint = Color(0xFFFF8A8A),
                                            )
                                            Text(
                                                text = "Delete",
                                                style = MaterialTheme.typography.labelSmall.copy(
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 12.sp,
                                                ),
                                                color = Color(0xFFFF8A8A),
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

        if (myReviewsViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}
}

@Composable
private fun ReviewStars(rating: Double) {
    val normalized = rating.roundToInt().coerceIn(0, 5)
    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        repeat(5) { index ->
            Icon(
                imageVector = if (index < normalized) Icons.Filled.Star else Icons.Filled.StarBorder,
                contentDescription = null,
                tint = if (index < normalized) RewardsGold else Color.White.copy(alpha = 0.28f),
                modifier = Modifier.size(12.dp),
            )
        }
    }
}

@Composable
fun FavoritesScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    onBrowseSalons: () -> Unit = {},
    onOpenPin: (Int) -> Unit = {},
    onOpenStore: (Int) -> Unit = {},
    myFavoritesViewModel: MyFavoritesViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token) {
        if (token != null) myFavoritesViewModel.load(token)
    }
    LaunchedEffect(myFavoritesViewModel.errorMessage, myFavoritesViewModel.actionMessage) {
        val message = myFavoritesViewModel.errorMessage?.trim().takeIf { !it.isNullOrEmpty() }
            ?: myFavoritesViewModel.actionMessage?.trim().takeIf { !it.isNullOrEmpty() }
        if (message != null) {
            noticeMessage = message
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "My Favorites", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 8.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {

            item {
                Text(
                    text = "${myFavoritesViewModel.favoriteStores.size} salons · ${myFavoritesViewModel.favoritePins.size} designs",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = RewardsSecondaryText,
                )
            }

            if (!myFavoritesViewModel.isLoading &&
                myFavoritesViewModel.favoriteStores.isEmpty() &&
                myFavoritesViewModel.favoritePins.isEmpty()
            ) {
                item {
                    RewardsEmptyStateCard(
                        icon = Icons.Filled.Favorite,
                        title = "No favorites yet",
                        subtitle = "Save salons and designs to revisit them quickly.",
                    )
                }
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 46.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(RewardsGold)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = onBrowseSalons,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "Browse Salons",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                            color = Color.Black,
                        )
                    }
                }
            } else {
                if (myFavoritesViewModel.favoritePins.isNotEmpty()) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            RewardsUnifiedSectionHeader(title = "FAVORITE DESIGNS")
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                myFavoritesViewModel.favoritePins.chunked(2).forEach { pinRow ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        pinRow.forEach { pin ->
                                            FavoritePinCard(
                                                pin = pin,
                                                isDeleting = myFavoritesViewModel.deletingPinId == pin.id,
                                                onOpen = { onOpenPin(pin.id) },
                                                onRemove = {
                                                    if (token != null) {
                                                        myFavoritesViewModel.removePin(token, pin.id)
                                                    }
                                                },
                                                modifier = Modifier.weight(1f),
                                            )
                                        }
                                        if (pinRow.size == 1) {
                                            Spacer(modifier = Modifier.weight(1f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (myFavoritesViewModel.favoriteStores.isNotEmpty()) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            RewardsUnifiedSectionHeader(title = "FAVORITE SALONS")
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                myFavoritesViewModel.favoriteStores.forEach { store ->
                                    FavoriteStoreCard(
                                        store = store,
                                        overrideImageUrl = myFavoritesViewModel.favoriteStoreImageUrlById[store.id],
                                        isDeleting = myFavoritesViewModel.deletingStoreId == store.id,
                                        onOpen = { onOpenStore(store.id) },
                                        onRemove = {
                                            if (token != null) {
                                                myFavoritesViewModel.removeStore(token, store.id)
                                            }
                                        },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (myFavoritesViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}
}

@Composable
private fun FavoritePinCard(
    pin: HomeFeedPin,
    isDeleting: Boolean,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val openInteraction = remember(pin.id) { MutableInteractionSource() }
    val openScale = rememberPressScale(
        interactionSource = openInteraction,
        pressedScale = 0.975f,
    )
    val removeInteraction = remember(pin.id) { MutableInteractionSource() }
    val removeScale = rememberPressScale(
        interactionSource = removeInteraction,
        pressedScale = 0.9f,
    )

    Box(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.75f)
                .scale(openScale)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.White.copy(alpha = 0.08f))
                .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(24.dp))
                .clickable(
                    interactionSource = openInteraction,
                    indication = null,
                    onClick = onOpen,
                ),
        ) {
            AsyncImage(
                model = AssetUrlResolver.resolveURL(pin.image_url),
                contentDescription = pin.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp)
                .size(30.dp)
                .scale(removeScale)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.66f))
                .clickable(
                    enabled = !isDeleting,
                    interactionSource = removeInteraction,
                    indication = null,
                    onClick = onRemove,
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (isDeleting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(12.dp),
                    strokeWidth = 1.6.dp,
                    color = Color.White,
                )
            } else {
                Icon(
                    imageVector = Icons.Filled.Favorite,
                    contentDescription = "Remove favorite",
                    tint = RewardsGold,
                    modifier = Modifier.size(12.dp),
                )
            }
        }
    }
}

@Composable
private fun FavoriteStoreCard(
    store: Store,
    overrideImageUrl: String?,
    isDeleting: Boolean,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
) {
    val openInteraction = remember(store.id) { MutableInteractionSource() }
    val openScale = rememberPressScale(
        interactionSource = openInteraction,
        pressedScale = 0.985f,
    )
    val removeInteraction = remember(store.id) { MutableInteractionSource() }
    val removeScale = rememberPressScale(
        interactionSource = removeInteraction,
        pressedScale = 0.9f,
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.16f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .scale(openScale)
                    .clickable(
                        interactionSource = openInteraction,
                        indication = null,
                        onClick = onOpen,
                    ),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AsyncImage(
                    model = AssetUrlResolver.resolveURL(overrideImageUrl ?: store.image_url),
                    contentDescription = store.name,
                    modifier = Modifier
                        .size(84.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color.White.copy(alpha = 0.12f)),
                    contentScale = ContentScale.Crop,
                )
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = store.name,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = RewardsPrimaryText,
                        maxLines = 1,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.LocationOn,
                            contentDescription = null,
                            tint = RewardsGold,
                            modifier = Modifier.size(12.dp),
                        )
                        Text(
                            text = store.formattedAddress,
                            style = MaterialTheme.typography.bodySmall,
                            color = RewardsSecondaryText,
                            maxLines = 2,
                        )
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = null,
                            tint = RewardsGold,
                            modifier = Modifier.size(12.dp),
                        )
                        Text(
                            text = String.format("%.1f", store.rating),
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = RewardsPrimaryText.copy(alpha = 0.76f),
                        )
                        Text(
                            text = "(${store.review_count} reviews)",
                            style = MaterialTheme.typography.labelSmall,
                            color = RewardsSecondaryText,
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .size(34.dp)
                    .scale(removeScale)
                    .clickable(
                        enabled = !isDeleting,
                        interactionSource = removeInteraction,
                        indication = null,
                        onClick = onRemove,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (isDeleting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                } else {
                    Icon(
                        imageVector = Icons.Filled.Favorite,
                        contentDescription = "Remove favorite",
                        tint = RewardsGold,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun VipScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
) {
    if (!sessionViewModel.isLoggedIn) return

    val tiers = remember {
        listOf(
            VipTierVisual(
                level = "VIP 1-3",
                title = "Silver Perks",
                icon = Icons.Filled.Security,
                iconTint = Color(0xFFB7BDC9),
                benefits = listOf(
                    "5% off all services",
                    "Birthday gift coupon",
                    "Member-only events",
                ),
            ),
            VipTierVisual(
                level = "VIP 4-6",
                title = "Gold Status",
                icon = Icons.Filled.Star,
                iconTint = RewardsGold,
                benefits = listOf(
                    "10% off all services",
                    "Priority booking",
                    "Free soak-off service",
                ),
            ),
            VipTierVisual(
                level = "VIP 7-9",
                title = "Platinum Luxe",
                icon = Icons.Filled.AutoAwesome,
                iconTint = Color(0xFF99C7FF),
                benefits = listOf(
                    "15% off all services",
                    "Free hand mask with every visit",
                    "Skip the line queue",
                ),
            ),
            VipTierVisual(
                level = "VIP 10",
                title = "Diamond Elite",
                icon = Icons.Filled.WorkspacePremium,
                iconTint = RewardsGold,
                benefits = listOf(
                    "20% off all services",
                    "Personal style consultant",
                    "Free premium drink & snacks",
                ),
            ),
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "VIP Membership", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 20.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {

            item {
                VipHeroSection()
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    tiers.forEach { tier ->
                        VipTierCard(tier = tier)
                    }
                }
            }

            item {
                VipRedemptionCard()
            }

            item {
                Text(
                    text = "Figma Make Nails • Exclusive American Salon Program",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.8.sp,
                    ),
                    color = Color.White.copy(alpha = 0.32f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                )
            }
        }
    }
}
}

private data class VipTierVisual(
    val level: String,
    val title: String,
    val icon: ImageVector,
    val iconTint: Color,
    val benefits: List<String>,
)

@Composable
private fun VipHeroSection() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier.size(72.dp),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(RewardsGold.copy(alpha = 0.14f), CircleShape),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(1.dp, RewardsGold.copy(alpha = 0.34f), CircleShape),
            )
            Icon(
                imageVector = Icons.Filled.WorkspacePremium,
                contentDescription = null,
                tint = RewardsGold,
                modifier = Modifier.size(30.dp),
            )
        }

        Text(
            text = "ELITE REWARDS PROGRAM",
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Medium,
                fontSize = 23.sp,
                letterSpacing = 1.8.sp,
            ),
            color = RewardsPrimaryText,
            textAlign = TextAlign.Center,
        )

        Text(
            text = "Elevate your experience with our tiered rewards. The more you pamper yourself, the more exclusive your benefits become.",
            style = MaterialTheme.typography.bodySmall.copy(lineHeight = 18.sp),
            color = Color.White.copy(alpha = 0.58f),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 10.dp),
        )
    }
}

@Composable
private fun VipTierCard(tier: VipTierVisual) {
    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = tier.level,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            fontStyle = FontStyle.Italic,
                        ),
                        color = RewardsGold,
                    )
                    Text(
                        text = tier.title.uppercase(Locale.US),
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.4.sp,
                        ),
                        color = Color.White.copy(alpha = 0.48f),
                    )
                }
                Icon(
                    imageVector = tier.icon,
                    contentDescription = null,
                    tint = tier.iconTint,
                    modifier = Modifier.size(18.dp),
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                tier.benefits.forEach { benefit ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.AutoAwesome,
                            contentDescription = null,
                            tint = RewardsGold,
                            modifier = Modifier
                                .size(12.dp)
                                .padding(top = 2.dp),
                        )
                        Text(
                            text = benefit,
                            style = MaterialTheme.typography.bodySmall.copy(lineHeight = 18.sp),
                            color = Color.White.copy(alpha = 0.72f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun VipRedemptionCard() {
    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = androidx.compose.foundation.BorderStroke(1.dp, RewardsGold.copy(alpha = 0.28f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            RewardsGold.copy(alpha = 0.10f),
                            Color.Transparent,
                        ),
                    ),
                )
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Filled.AutoAwesome,
                    contentDescription = null,
                    tint = RewardsGold,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = "REDEMPTION LOGIC",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.2.sp,
                    ),
                    color = RewardsGold,
                )
            }

            Text(
                text = "\"Points are accumulated automatically with every visit. To redeem your benefits, simply present your digital membership card to your technician during checkout. All vouchers and tier rewards must be redeemed in-store.\"",
                style = MaterialTheme.typography.bodySmall.copy(
                    fontStyle = FontStyle.Italic,
                    lineHeight = 19.sp,
                ),
                color = Color.White.copy(alpha = 0.68f),
            )
        }
    }
}

@Composable
fun ReferralScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    referralViewModel: ReferralViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    var copyNotice by remember { mutableStateOf<String?>(null) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token) {
        if (token != null) referralViewModel.load(token)
    }
    LaunchedEffect(referralViewModel.errorMessage) {
        val message = referralViewModel.errorMessage?.trim().takeIf { !it.isNullOrEmpty() }
        if (message != null) {
            noticeMessage = message
        }
    }
    LaunchedEffect(copied) {
        if (copied) {
            delay(2_000)
            copied = false
            copyNotice = null
        }
    }

    val referralCode = referralViewModel.referralCode?.trim().orEmpty()
    val totalReferrals = referralViewModel.stats?.total_referrals ?: 0
    val totalRewards = referralViewModel.stats?.total_rewards_earned ?: 0
    val referralCopyInteraction = remember { MutableInteractionSource() }
    val referralCopyScale = rememberPressScale(
        interactionSource = referralCopyInteraction,
        pressedScale = 0.93f,
    )
    val referralShareInteraction = remember { MutableInteractionSource() }
    val referralShareScale = rememberPressScale(
        interactionSource = referralShareInteraction,
        pressedScale = 0.97f,
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RewardsPageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            RewardsTopBar(title = "Refer a Friend", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = RewardsPagePadding,
                    end = RewardsPagePadding,
                    top = 16.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {

            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        modifier = Modifier.size(80.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(RewardsGold.copy(alpha = 0.12f), CircleShape),
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .border(1.dp, RewardsGold.copy(alpha = 0.24f), CircleShape),
                        )
                        Icon(
                            imageVector = Icons.Filled.CardGiftcard,
                            contentDescription = null,
                            tint = RewardsGold,
                            modifier = Modifier.size(36.dp),
                        )
                    }

                    Text(
                        text = "Refer a Friend",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                        color = RewardsPrimaryText,
                    )
                    Text(
                        text = "Share the glow! Both you and your friend will receive 1 Free Coupon (\$10 value) immediately after successful registration.",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 13.sp,
                            lineHeight = 15.sp,
                        ),
                        color = Color.White.copy(alpha = 0.68f),
                        textAlign = TextAlign.Center,
                    )
                }
            }

            item {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(
                            text = "YOUR REFERRAL CODE",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.8.sp,
                            ),
                            color = Color.White.copy(alpha = 0.48f),
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color.Black, RoundedCornerShape(14.dp))
                                .border(
                                    width = 1.dp,
                                    color = Color.White.copy(alpha = 0.12f),
                                    shape = RoundedCornerShape(14.dp),
                                )
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = if (referralCode.isBlank()) "—" else referralCode,
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontSize = 28.sp,
                                    lineHeight = 30.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 5.2.sp,
                                ),
                                color = RewardsGold,
                                maxLines = 1,
                                modifier = Modifier.weight(1f),
                            )
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .scale(referralCopyScale)
                                    .alpha(if (referralCode.isNotBlank()) 1f else 0.45f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(RewardsGold)
                                    .clickable(
                                        enabled = referralCode.isNotBlank(),
                                        interactionSource = referralCopyInteraction,
                                        indication = null,
                                        onClick = {
                                            if (referralCode.isBlank()) return@clickable
                                            clipboardManager.setText(AnnotatedString(referralCode))
                                            copied = true
                                            copyNotice = "Referral code copied"
                                        },
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = if (copied) Icons.Filled.CheckCircle else Icons.Filled.ContentCopy,
                                    contentDescription = if (copied) "Copied" else "Copy referral code",
                                    modifier = Modifier.size(22.dp),
                                    tint = Color.Black,
                                )
                            }
                        }

                        Text(
                            text = "Your code is unique and stays the same.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.50f),
                        )
                        AnimatedVisibility(
                            visible = !copyNotice.isNullOrBlank(),
                            enter = fadeIn(tween(durationMillis = 140)) + expandVertically(tween(durationMillis = 140)),
                            exit = fadeOut(tween(durationMillis = 140)) + shrinkVertically(tween(durationMillis = 140)),
                        ) {
                            Text(
                                text = copyNotice.orEmpty(),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                ),
                                color = RewardsGold,
                            )
                        }
                    }
                }
            }

            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .scale(referralShareScale)
                            .alpha(if (referralCode.isNotBlank()) 1f else 0.45f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.White)
                            .clickable(
                                enabled = referralCode.isNotBlank(),
                                interactionSource = referralShareInteraction,
                                indication = null,
                                onClick = {
                                    if (referralCode.isBlank()) return@clickable
                                    val intent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, referralSharePayload(referralCode))
                                    }
                                    context.startActivity(Intent.createChooser(intent, "Share with Friends"))
                                },
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Share,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Color.Black,
                            )
                            Text(
                                text = "Share with Friends",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                ),
                                color = Color.Black,
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ReferralStatChip(
                            icon = Icons.Filled.Group,
                            text = "$totalReferrals Referrals",
                            tint = Color.White.copy(alpha = 0.62f),
                        )
                        Box(
                            modifier = Modifier
                                .size(3.dp)
                                .background(Color.White.copy(alpha = 0.28f), CircleShape),
                        )
                        ReferralStatChip(
                            icon = Icons.Filled.Star,
                            text = "$totalRewards Coupons Earned",
                            tint = RewardsGold,
                        )
                    }
                }
            }

            if (!referralViewModel.isLoading && referralViewModel.items.isEmpty()) {
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp, horizontal = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Group,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.34f),
                                modifier = Modifier.size(42.dp),
                            )
                            Text(
                                text = "No referrals yet. Start inviting friends!",
                                style = MaterialTheme.typography.titleSmall,
                                color = Color.White.copy(alpha = 0.58f),
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            } else {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "REFERRAL HISTORY",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.8.sp,
                            ),
                            color = Color.White.copy(alpha = 0.52f),
                        )
                        referralViewModel.items.forEach { item ->
                            ReferralHistoryCard(item = item)
                        }
                    }
                }
            }
        }

        if (referralViewModel.isLoading) {
            RewardsLoadingOverlay()
        }

        noticeMessage?.let { message ->
            RewardsNoticeDialog(
                message = message,
                onDismiss = { noticeMessage = null },
            )
        }
    }
}
}

@Composable
private fun ReferralHistoryCard(item: com.nailsdash.android.data.model.ReferralListItem) {
    Card(
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = RewardsCardBackground),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    text = item.referee_name.ifBlank { "User" },
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = RewardsPrimaryText,
                )
                Text(
                    text = maskPhone(item.referee_phone),
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = Color.White.copy(alpha = 0.58f),
                )
                Text(
                    text = "Joined: ${displayJoinedDate(item.created_at)}",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                    color = Color.White.copy(alpha = 0.42f),
                )
            }
            if (item.referrer_reward_given) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF7DE39A),
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        text = "Rewarded",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = Color(0xFF7DE39A),
                    )
                }
            } else {
                Text(
                    text = "Pending",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = RewardsGold,
                )
            }
        }
    }
}

@Composable
private fun ReferralStatChip(
    icon: ImageVector,
    text: String,
    tint: Color,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall.copy(
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            ),
            color = tint,
        )
    }
}

private fun referralSharePayload(referralCode: String): String {
    val code = referralCode.trim()
    if (code.isEmpty()) return ""
    val shareText = "Join me on Nails Booking! Use my referral code $code and get a \$10 coupon right after registration!"
    val webBase = BuildConfig.API_BASE_URL
        .trim()
        .trimEnd('/')
        .removeSuffix("api/v1")
        .trimEnd('/')
    val referralLink = "$webBase/register?ref=$code"
    return "$shareText\n$referralLink"
}
