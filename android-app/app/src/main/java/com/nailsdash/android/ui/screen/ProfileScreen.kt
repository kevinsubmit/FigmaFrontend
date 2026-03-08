package com.nailsdash.android.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.ProfileCenterViewModel
import com.nailsdash.android.utils.AssetUrlResolver

private data class ProfileOverviewItem(
    val title: String,
    val value: String,
    val onClick: () -> Unit,
)

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

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) {
            profileCenterViewModel.load(bearerToken)
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
    val visitsCurrent = maxOf(
        profileCenterViewModel.vipStatus?.visits_progress?.current
            ?: profileCenterViewModel.completedOrders.toDouble(),
        0.0,
    )
    val visitsRequired = maxOf(profileCenterViewModel.vipStatus?.visits_progress?.required ?: 15.0, 1.0)

    val overviewItems = listOf(
        ProfileOverviewItem("TOTAL POINTS", profileCenterViewModel.points.toString(), onOpenPoints),
        ProfileOverviewItem("COUPONS", profileCenterViewModel.couponCount.toString(), onOpenCoupons),
        ProfileOverviewItem("GIFT CARDS", String.format("$%.2f", profileCenterViewModel.giftBalance), onOpenGiftCards),
        ProfileOverviewItem("ORDERS", profileCenterViewModel.completedOrders.toString(), onOpenOrders),
        ProfileOverviewItem("REVIEWS", profileCenterViewModel.reviewCount.toString(), onOpenReviews),
        ProfileOverviewItem("FAVORITES", profileCenterViewModel.favoriteCount.toString(), onOpenFavorites),
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                ProfileActionButton(
                    unreadCount = profileCenterViewModel.unreadCount,
                    onClick = onOpenNotifications,
                )
                ProfileActionButton(
                    unreadCount = 0,
                    onClick = onOpenSettings,
                    isSettings = true,
                )
            }
        }

        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ProfileAvatar(avatarUrl = avatarUrl, userName = userName)
                Text(userName, style = MaterialTheme.typography.headlineMedium)
                Text(maskedPhone, style = MaterialTheme.typography.bodyMedium)
            }
        }

        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenVip() },
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("VIP $currentVipLevel", style = MaterialTheme.typography.headlineSmall)
                        Text("CURRENT", style = MaterialTheme.typography.labelSmall)
                    }
                    Text(vipBenefit, style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Spend: ${String.format("$%.2f", spendCurrent)} / ${String.format("$%.2f", spendRequired)}",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        "Visits: ${visitsCurrent.toInt()} / ${visitsRequired.toInt()}",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text("Next level to VIP $nextVipLevel", style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenReferral() },
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Invite Friends, Get $10", style = MaterialTheme.typography.titleMedium)
                        Text("Share your love for nails and save", style = MaterialTheme.typography.bodyMedium)
                    }
                    Text("Open", style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        item {
            if (profileCenterViewModel.isLoading) {
                CircularProgressIndicator()
            }
            profileCenterViewModel.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }

        item {
            Text("Overview", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(2.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                overviewItems.chunked(2).forEach { rowItems ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        rowItems.forEach { item ->
                            ProfileOverviewCard(
                                title = item.title,
                                value = item.value,
                                onClick = item.onClick,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (rowItems.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    ProfileShortcutRow("VIP Membership", onOpenVip)
                    ProfileShortcutRow("Notifications", onOpenNotifications)
                    ProfileShortcutRow("Settings", onOpenSettings)
                }
            }
        }

        item {
            TextButton(onClick = { sessionViewModel.logout() }, modifier = Modifier.fillMaxWidth()) {
                Text("Logout")
            }
        }
    }
}

@Composable
private fun ProfileActionButton(
    unreadCount: Int,
    onClick: () -> Unit,
    isSettings: Boolean = false,
) {
    Box {
        IconButton(onClick = onClick) {
            Icon(
                imageVector = if (isSettings) Icons.Filled.Settings else Icons.Filled.Notifications,
                contentDescription = null,
            )
        }
        if (!isSettings && unreadCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(18.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (unreadCount > 99) "99+" else unreadCount.toString(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
    }
}

@Composable
private fun ProfileAvatar(avatarUrl: String?, userName: String) {
    Box(
        modifier = Modifier
            .size(116.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center,
    ) {
        if (avatarUrl != null) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = "Avatar",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Text(initials(userName), style = MaterialTheme.typography.headlineMedium)
        }
    }
}

@Composable
private fun ProfileOverviewCard(
    title: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
            .height(132.dp)
            .clickable { onClick() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(value, style = MaterialTheme.typography.headlineMedium)
            Text(title, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun ProfileShortcutRow(label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 4.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label)
        Text("Open", style = MaterialTheme.typography.labelLarge)
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
