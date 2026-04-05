package com.nailsdash.android.ui.screen

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImagePainter
import coil.compose.rememberAsyncImagePainter
import com.nailsdash.android.ui.component.AuthLogoAvatar
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.ProfileCenterViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import java.util.Locale

private data class ProfileStatItem(
    val title: String,
    val value: String,
    val icon: ImageVector,
    val emphasizedLabel: Boolean = false,
    val onClick: () -> Unit,
)

private val ProfileGold = Color(0xFFD4AF37)
private val ProfilePageBackground = Color(0xFF000000)
private val ProfileCardBackground = Color(0xFF181818)
private val ProfilePrimaryText = Color.White
private val ProfileSecondaryText = Color.White.copy(alpha = 0.72f)
private val ProfileMutedText = Color.White.copy(alpha = 0.50f)
private val ProfileHairline = Color.White.copy(alpha = 0.08f)
private val ProfilePagePadding = 16.dp

@Composable
fun ProfileScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenPoints: () -> Unit,
    onOpenCoupons: () -> Unit,
    onOpenGiftCards: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenReviews: () -> Unit,
    onOpenFavorites: () -> Unit,
    onOpenVip: () -> Unit,
    onOpenReferral: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenSettings: () -> Unit,
    profileCenterViewModel: ProfileCenterViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    var noticeMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) {
            profileCenterViewModel.loadIfNeeded(bearerToken)
        }
    }
    LaunchedEffect(bearerToken, sessionViewModel.profileSummaryRefreshVersion) {
        if (bearerToken != null && sessionViewModel.profileSummaryRefreshVersion != 0L) {
            profileCenterViewModel.load(bearerToken, force = true)
        }
    }
    LaunchedEffect(profileCenterViewModel.errorMessage) {
        val message = profileCenterViewModel.errorMessage?.trim().orEmpty()
        if (message.isNotEmpty()) {
            noticeMessage = message
        }
    }

    val user = sessionViewModel.currentUser
    val userName = user?.full_name ?: user?.username ?: "User"
    val avatarUrl = AssetUrlResolver.resolveURL(user?.avatar_url)
    val maskedPhone = displayPhone(user?.phone)

    val currentVipLevel = profileCenterViewModel.vipStatus?.current_level?.level
        ?: if (profileCenterViewModel.completedOrders >= 10) 2 else 1
    val nextVipLevel = profileCenterViewModel.vipStatus?.next_level?.level ?: (currentVipLevel + 1)
    val vipBenefit = profileCenterViewModel.vipStatus?.current_level?.benefit
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?: "Member Access"

    val spendCurrent = maxOf(
        profileCenterViewModel.vipStatus?.spend_progress?.current
            ?: profileCenterViewModel.vipStatus?.total_spend
            ?: 0.0,
        0.0,
    )
    val spendRequired = maxOf(profileCenterViewModel.vipStatus?.spend_progress?.required ?: 1000.0, 1.0)
    val spendProgress = (spendCurrent / spendRequired).toFloat().coerceIn(0f, 1f)

    val visitsCurrent = maxOf(
        profileCenterViewModel.vipStatus?.visits_progress?.current
            ?: profileCenterViewModel.completedOrders.toDouble(),
        0.0,
    )
    val visitsRequired = maxOf(profileCenterViewModel.vipStatus?.visits_progress?.required ?: 15.0, 1.0)
    val visitsProgress = (visitsCurrent / visitsRequired).toFloat().coerceIn(0f, 1f)

    val statItems = listOf(
        ProfileStatItem("TOTAL POINTS", profileCenterViewModel.points.toString(), Icons.Filled.AutoAwesome, onClick = onOpenPoints),
        ProfileStatItem("COUPONS", profileCenterViewModel.couponCount.toString(), Icons.Filled.ConfirmationNumber, onClick = onOpenCoupons),
        ProfileStatItem(
            "GIFT CARDS",
            String.format(Locale.US, "$%.2f", profileCenterViewModel.giftBalance),
            Icons.Filled.CardGiftcard,
            emphasizedLabel = true,
            onClick = onOpenGiftCards,
        ),
        ProfileStatItem("ORDERS", profileCenterViewModel.completedOrders.toString(), Icons.AutoMirrored.Filled.ReceiptLong, onClick = onOpenOrders),
        ProfileStatItem("REVIEWS", profileCenterViewModel.reviewCount.toString(), Icons.Filled.Star, onClick = onOpenReviews),
        ProfileStatItem("FAVORITES", profileCenterViewModel.favoriteCount.toString(), Icons.Filled.Favorite, onClick = onOpenFavorites),
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ProfilePageBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            ProfileTopBar(
                unreadCount = profileCenterViewModel.unreadCount,
                onOpenNotifications = onOpenNotifications,
                onOpenSettings = onOpenSettings,
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = ProfilePagePadding,
                    end = ProfilePagePadding,
                    top = 10.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    ProfileHeaderCard(
                        userName = userName,
                        maskedPhone = maskedPhone,
                        avatarUrl = avatarUrl,
                    )
                }

                item {
                    ProfileVipCard(
                        currentVipLevel = currentVipLevel,
                        nextVipLevel = nextVipLevel,
                        vipBenefit = vipBenefit,
                        spendCurrent = spendCurrent,
                        spendRequired = spendRequired,
                        spendProgress = spendProgress,
                        visitsCurrent = visitsCurrent,
                        visitsRequired = visitsRequired,
                        visitsProgress = visitsProgress,
                        onClick = onOpenVip,
                    )
                }

                item {
                    ProfileInviteCard(onClick = onOpenReferral)
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        statItems.chunked(2).forEach { rowItems ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                rowItems.forEach { stat ->
                                    ProfileStatCard(
                                        title = stat.title,
                                        value = stat.value,
                                        icon = stat.icon,
                                        emphasizedLabel = stat.emphasizedLabel,
                                        onClick = stat.onClick,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (profileCenterViewModel.isLoading) {
            ProfileLoadingOverlay()
        }

        if (noticeMessage != null) {
            AlertDialog(
                onDismissRequest = { noticeMessage = null },
                containerColor = ProfileCardBackground,
                titleContentColor = ProfilePrimaryText,
                textContentColor = ProfileSecondaryText,
                title = { Text("Notice") },
                text = { Text(noticeMessage.orEmpty()) },
                confirmButton = {
                    TextButton(
                        onClick = {
                            val message = noticeMessage.orEmpty()
                            noticeMessage = null
                            if (AppSessionViewModel.shouldForceLogoutAfterSensitiveAuthAlert(message)) {
                                sessionViewModel.forceLogout(message)
                            }
                        },
                    ) {
                        Text("OK", color = ProfileGold)
                    }
                },
            )
        }
    }
}

@Composable
private fun ProfileTopBar(
    unreadCount: Int,
    onOpenNotifications: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = ProfilePagePadding, end = ProfilePagePadding, top = 10.dp, bottom = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End),
    ) {
        ProfileTopActionButton(
            icon = Icons.Outlined.Notifications,
            unreadCount = unreadCount,
            onClick = onOpenNotifications,
        )
        ProfileTopActionButton(
            icon = Icons.Outlined.Settings,
            unreadCount = 0,
            onClick = onOpenSettings,
        )
    }
}

@Composable
private fun ProfileTopActionButton(
    icon: ImageVector,
    unreadCount: Int,
    onClick: () -> Unit,
) {
    Box {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.05f), CircleShape)
                .border(BorderStroke(0.75.dp, ProfileGold.copy(alpha = 0.22f)), CircleShape)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onClick,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = ProfilePrimaryText,
                modifier = Modifier.size(11.dp),
            )
        }
        if (unreadCount > 0 && icon == Icons.Outlined.Notifications) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 1.dp)
                    .background(ProfileGold, RoundedCornerShape(999.dp))
                    .padding(horizontal = 4.dp, vertical = 1.dp),
            ) {
                Text(
                    text = if (unreadCount > 99) "99+" else unreadCount.toString(),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                    ),
                    color = Color.Black,
                )
            }
        }
    }
}

@Composable
private fun ProfileHeaderCard(
    userName: String,
    maskedPhone: String,
    avatarUrl: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp, bottom = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(116.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.08f))
                .border(BorderStroke(3.dp, ProfileGold), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (avatarUrl.isNullOrBlank()) {
                ProfileAvatarFallback(userName = userName)
            } else {
                val avatarPainter = rememberAsyncImagePainter(model = avatarUrl)
                Image(
                    painter = avatarPainter,
                    contentDescription = "Avatar",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
                when (avatarPainter.state) {
                    is AsyncImagePainter.State.Success -> Unit
                    is AsyncImagePainter.State.Loading,
                    is AsyncImagePainter.State.Empty,
                    -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = ProfileGold,
                            strokeWidth = 2.dp,
                        )
                    }
                    is AsyncImagePainter.State.Error -> {
                        ProfileAvatarFallback(userName = userName)
                    }
                }
            }
        }

        Text(
            text = userName,
            style = MaterialTheme.typography.headlineLarge.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 40.sp,
            ),
            color = ProfilePrimaryText,
            maxLines = 1,
        )
        Text(
            text = maskedPhone,
            style = MaterialTheme.typography.bodyMedium,
            color = ProfileSecondaryText,
        )
    }
}

@Composable
@Suppress("UNUSED_PARAMETER")
private fun ProfileAvatarFallback(userName: String) {
    AuthLogoAvatar(modifier = Modifier.fillMaxSize())
}

@Composable
private fun ProfileVipCard(
    currentVipLevel: Int,
    nextVipLevel: Int,
    vipBenefit: String,
    spendCurrent: Double,
    spendRequired: Double,
    spendProgress: Float,
    visitsCurrent: Double,
    visitsRequired: Double,
    visitsProgress: Float,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = ProfileCardBackground),
        border = BorderStroke(1.dp, ProfileGold.copy(alpha = 0.2f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            ProfileCardBackground.copy(alpha = 0.98f),
                            Color(0xFF2B2922),
                        ),
                    ),
                ),
        ) {
            VipCardGoldSweep(modifier = Modifier.fillMaxSize())
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(ProfileGold.copy(alpha = 0.44f))
                    .align(Alignment.TopCenter),
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "VIP $currentVipLevel",
                            style = MaterialTheme.typography.displaySmall.copy(
                                fontWeight = FontWeight.Black,
                                fontSize = 36.sp,
                            ),
                            color = ProfilePrimaryText,
                        )
                        Text(
                            text = "CURRENT",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                            color = Color.Black,
                            modifier = Modifier
                                .background(ProfileGold, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                    RotatingCrownIcon(size = 40.dp)
                }

                Text(
                    text = vipBenefit,
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = ProfileGold,
                )

                ProfileMetricBar(
                    title = "Spend Amount",
                    value = "${String.format(Locale.US, "$%.2f", spendCurrent)} / ${String.format(Locale.US, "$%.2f", spendRequired)}",
                    progress = spendProgress,
                )

                ProfileMetricBar(
                    title = "Visits",
                    value = "${visitsCurrent.toInt()} / ${visitsRequired.toInt()}",
                    progress = visitsProgress,
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Filled.NorthEast,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.52f),
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        text = "Next level to VIP $nextVipLevel",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = Color.White.copy(alpha = 0.52f),
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileMetricBar(
    title: String,
    value: String,
    progress: Float,
) {
    val safeProgress = progress.coerceIn(0.02f, 1f)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.70f))
            Text(value, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.76f))
        }
        LinearProgressIndicator(
            progress = { safeProgress },
            modifier = Modifier
                .fillMaxWidth()
                .height(7.dp)
                .clip(RoundedCornerShape(999.dp)),
            color = ProfileGold,
            trackColor = Color.White.copy(alpha = 0.12f),
        )
    }
}

@Composable
private fun ProfileInviteCard(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = ProfileCardBackground),
        border = BorderStroke(1.dp, ProfileGold.copy(alpha = 0.16f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            ProfileCardBackground.copy(alpha = 0.98f),
                            Color.White.copy(alpha = 0.02f),
                        ),
                    ),
                )
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(ProfileGold.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.CardGiftcard,
                    contentDescription = null,
                    tint = ProfileGold,
                    modifier = Modifier.size(24.dp),
                )
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = "Invite Friends, Get $10",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold, fontSize = 18.sp),
                    color = ProfilePrimaryText,
                )
                Text(
                    text = "Share your love for nails and save",
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp),
                    color = Color.White.copy(alpha = 0.64f),
                )
            }

            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.42f),
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

@Composable
private fun ProfileStatCard(
    title: String,
    value: String,
    icon: ImageVector,
    emphasizedLabel: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .heightIn(min = 206.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = ProfileCardBackground),
        border = BorderStroke(
            1.dp,
            ProfileGold.copy(alpha = if (emphasizedLabel) 0.32f else 0.18f),
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            ProfileCardBackground,
                            Color.White.copy(alpha = 0.02f),
                        ),
                    ),
                )
                .padding(horizontal = 10.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = ProfileGold, modifier = Modifier.size(24.dp))
            }

            Text(
                text = value,
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Black,
                    fontSize = 44.sp,
                ),
                color = ProfilePrimaryText,
                maxLines = 1,
                textAlign = TextAlign.Center,
            )

            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Black,
                    fontSize = 10.sp,
                    letterSpacing = 3.2.sp,
                ),
                color = if (emphasizedLabel) ProfileGold else ProfileMutedText,
                textAlign = TextAlign.Center,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun RotatingCrownIcon(size: Dp) {
    val transition = rememberInfiniteTransition(label = "profileCrown")
    val rotationY by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 8000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "profileCrownRotationY",
    )
    val density = LocalDensity.current

    Box(
        modifier = Modifier
            .size(size)
            .shadow(6.dp, CircleShape, clip = false)
            .graphicsLayer {
                this.rotationY = rotationY
                cameraDistance = with(density) { 28.dp.toPx() }
            }
            .background(ProfileGold.copy(alpha = 0.10f), CircleShape)
            .border(BorderStroke(1.dp, ProfileGold.copy(alpha = 0.30f)), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.WorkspacePremium,
            contentDescription = null,
            tint = ProfileGold.copy(alpha = 0.22f),
            modifier = Modifier.size(size * 0.50f),
        )
        Icon(
            imageVector = Icons.Filled.WorkspacePremium,
            contentDescription = null,
            tint = ProfileGold,
            modifier = Modifier.size(size * 0.50f),
        )
    }
}

@Composable
private fun VipCardGoldSweep(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "vipCardSweep")
    val sweepPhase by transition.animateFloat(
        initialValue = -1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 7000
                -1f at 0
                2f at 3000
                2f at 7000
            },
            repeatMode = RepeatMode.Restart,
        ),
        label = "vipCardSweepPhase",
    )
    val glowScale by transition.animateFloat(
        initialValue = 1f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "vipCardGlowScale",
    )
    val glowAlpha by transition.animateFloat(
        initialValue = 0.05f,
        targetValue = 0.10f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "vipCardGlowAlpha",
    )

    Canvas(modifier = modifier) {
        val glowBaseRadius = 64.dp.toPx()
        drawCircle(
            color = ProfileGold.copy(alpha = glowAlpha),
            radius = glowBaseRadius * glowScale,
            center = androidx.compose.ui.geometry.Offset(
                x = size.width + 40.dp.toPx(),
                y = -40.dp.toPx(),
            ),
            blendMode = BlendMode.SrcOver,
        )

        val startX = sweepPhase * size.width
        drawRect(
            brush = Brush.linearGradient(
                colors = listOf(
                    Color.Transparent,
                    ProfileGold.copy(alpha = 0.10f),
                    Color.Transparent,
                ),
                start = androidx.compose.ui.geometry.Offset(startX, 0f),
                end = androidx.compose.ui.geometry.Offset(startX + size.width * 0.35f, size.height),
            ),
            size = size,
        )
    }
}

@Composable
private fun ProfileLoadingOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.18f)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = ProfileCardBackground),
            border = BorderStroke(1.dp, ProfileHairline),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(2.dp),
                    color = ProfileGold,
                )
                Text("Loading...", style = MaterialTheme.typography.bodyMedium, color = ProfilePrimaryText)
            }
        }
    }
}

private fun displayPhone(raw: String?): String {
    val value = raw?.trim().orEmpty()
    if (value.isEmpty()) return "-"
    val digits = value.filter(Char::isDigit)
    return if (digits.length >= 4) "***${digits.takeLast(4)}" else value
}

private fun initials(name: String): String {
    val trimmed = name.trim()
    if (trimmed.isEmpty()) return "U"
    val parts = trimmed.split(" ").filter { it.isNotBlank() }
    return when {
        parts.size >= 2 -> (parts[0].first().toString() + parts[1].first().toString()).uppercase()
        else -> parts.first().first().uppercase()
    }
}
