package com.nailsdash.android.ui.screen

import android.content.Intent
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.model.CouponTemplate
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
import com.nailsdash.android.ui.state.VipViewModel
import com.nailsdash.android.utils.AssetUrlResolver
import java.time.LocalDate

@Composable
fun PointsScreen(
    sessionViewModel: AppSessionViewModel,
    pointsViewModel: PointsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    LaunchedEffect(token) {
        if (token != null) pointsViewModel.load(token)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("My Points", style = MaterialTheme.typography.headlineSmall)
        }

        item {
            val available = pointsViewModel.balance?.available_points ?: 0
            val total = pointsViewModel.balance?.total_points ?: 0
            Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(available.toString(), style = MaterialTheme.typography.displaySmall)
                    Text("Available Points", style = MaterialTheme.typography.titleMedium)
                    Text("Total Earned: $total", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        item {
            pointsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            pointsViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            if (pointsViewModel.isLoading) {
                CircularProgressIndicator()
            }
        }

        item {
            Text("EXCHANGE COUPONS", style = MaterialTheme.typography.labelLarge)
        }

        if (!pointsViewModel.isLoading && pointsViewModel.exchangeables.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No exchangeable coupons right now.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            items(pointsViewModel.exchangeables, key = { it.id }) { coupon ->
                val required = coupon.points_required ?: 0
                val canRedeem = (pointsViewModel.balance?.available_points ?: 0) >= required && required > 0
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                            Text(coupon.name, style = MaterialTheme.typography.titleMedium)
                            coupon.description?.takeIf { it.isNotBlank() }?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("Need $required pts", style = MaterialTheme.typography.labelLarge)
                        }
                        Button(
                            onClick = { if (token != null) pointsViewModel.exchange(token, coupon.id) },
                            enabled = canRedeem && pointsViewModel.isRedeemingCouponId != coupon.id,
                        ) {
                            val loading = pointsViewModel.isRedeemingCouponId == coupon.id
                            Text(
                                when {
                                    loading -> "Exchanging..."
                                    canRedeem -> "Exchange"
                                    else -> "Locked"
                                },
                            )
                        }
                    }
                }
            }
        }

        item {
            Text("HISTORY", style = MaterialTheme.typography.labelLarge)
        }

        if (!pointsViewModel.isLoading && pointsViewModel.transactions.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No transactions yet.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        pointsViewModel.transactions.forEachIndexed { index, item ->
                            val isPositive = item.type.lowercase() == "earn" || item.amount >= 0
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(formattedPointsReason(item.reason), style = MaterialTheme.typography.titleSmall)
                                    item.description?.takeIf { it.isNotBlank() }?.let {
                                        Text(it, style = MaterialTheme.typography.bodySmall)
                                    }
                                    Text(displayDateOnly(item.created_at), style = MaterialTheme.typography.labelSmall)
                                }
                                Box {
                                    val amountText = if (item.amount > 0) "+${item.amount}" else item.amount.toString()
                                    Text(
                                        amountText,
                                        color = if (isPositive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                        style = MaterialTheme.typography.titleMedium,
                                    )
                                }
                            }
                            if (index < pointsViewModel.transactions.lastIndex) {
                                HorizontalDivider()
                            }
                        }
                    }
                }
            }
        }
    }
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
    return if (value.length >= 10) value.substring(0, 10) else value
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
fun CouponsScreen(
    sessionViewModel: AppSessionViewModel,
    couponsViewModel: CouponsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var useCouponId by mutableStateOf<Int?>(null)

    LaunchedEffect(token, couponsViewModel.selectedStatus) {
        if (token != null) couponsViewModel.load(token)
    }

    if (useCouponId != null) {
        AlertDialog(
            onDismissRequest = { useCouponId = null },
            title = { Text("Coupon") },
            text = { Text("User Coupon ID: #$useCouponId") },
            confirmButton = {
                TextButton(onClick = { useCouponId = null }) {
                    Text("OK")
                }
            },
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("My Coupons", style = MaterialTheme.typography.headlineSmall)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("available", "used", "expired").forEach { status ->
                    FilterChip(
                        selected = couponsViewModel.selectedStatus == status,
                        onClick = { couponsViewModel.selectedStatus = status },
                        label = { Text(couponStatusTitle(status)) },
                    )
                }
            }
        }

        item {
            if (couponsViewModel.isLoading) CircularProgressIndicator()
            couponsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }

        if (!couponsViewModel.isLoading && couponsViewModel.coupons.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No ${couponStatusTitle(couponsViewModel.selectedStatus).lowercase()} coupons.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            items(couponsViewModel.coupons, key = { it.id }) { item ->
                val status = item.status.lowercase()
                val isAvailable = status == "available"
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(couponDiscount(item.coupon), style = MaterialTheme.typography.headlineMedium)
                            Text(couponSubtitle(item), style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Min. spend $${String.format("%.0f", item.coupon.min_amount)}",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }

                        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                if (status == "used") "Used" else "Expires",
                                style = MaterialTheme.typography.labelMedium,
                            )
                            Text(couponDateLabel(item), style = MaterialTheme.typography.bodySmall)
                            if (isAvailable) {
                                Button(onClick = { useCouponId = item.id }) {
                                    Text("Use")
                                }
                            } else {
                                Text(couponStatusTitle(status), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GiftCardsScreen(
    sessionViewModel: AppSessionViewModel,
    giftCardsViewModel: GiftCardsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var claimCode by mutableStateOf("")
    var transferPhone by mutableStateOf("")
    var transferMessage by mutableStateOf("")
    var showClaimDialog by mutableStateOf(false)
    var sendCardId by mutableStateOf<Int?>(null)

    LaunchedEffect(token) {
        if (token != null) giftCardsViewModel.load(token)
    }
    LaunchedEffect(giftCardsViewModel.actionMessage) {
        val hasMessage = giftCardsViewModel.actionMessage?.isNotBlank() == true
        if (!hasMessage) return@LaunchedEffect
        if (showClaimDialog) {
            showClaimDialog = false
            claimCode = ""
        }
        if (sendCardId != null && giftCardsViewModel.sendingCardId == null) {
            sendCardId = null
            transferPhone = ""
            transferMessage = ""
        }
    }

    if (showClaimDialog) {
        AlertDialog(
            onDismissRequest = { showClaimDialog = false },
            title = { Text("Claim a Gift") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = claimCode,
                        onValueChange = { claimCode = it.uppercase() },
                        label = { Text("Claim code") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text("Enter the code from SMS to claim a transferred gift card.")
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (token != null) {
                            giftCardsViewModel.claim(token, claimCode)
                            if (!giftCardsViewModel.isClaiming) {
                                claimCode = ""
                                showClaimDialog = false
                            }
                        }
                    },
                    enabled = !giftCardsViewModel.isClaiming,
                ) {
                    Text(if (giftCardsViewModel.isClaiming) "Claiming..." else "Claim")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClaimDialog = false }) {
                    Text("Close")
                }
            },
        )
    }

    val sendCard = giftCardsViewModel.cards.firstOrNull { it.id == sendCardId }
    if (sendCardId != null && sendCard != null) {
        AlertDialog(
            onDismissRequest = { sendCardId = null },
            title = { Text("Send Gift Card") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Balance: $${String.format("%.2f", sendCard.balance)}")
                    OutlinedTextField(
                        value = transferPhone,
                        onValueChange = { transferPhone = it },
                        label = { Text("Recipient US phone") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = transferMessage,
                        onValueChange = { transferMessage = it },
                        label = { Text("Message (Optional)") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (token != null) {
                            giftCardsViewModel.transfer(
                                bearerToken = token,
                                giftCardId = sendCard.id,
                                recipientPhone = transferPhone,
                                message = transferMessage.takeIf { it.isNotBlank() },
                            )
                            if (giftCardsViewModel.sendingCardId == null) {
                                sendCardId = null
                                transferPhone = ""
                                transferMessage = ""
                            }
                        }
                    },
                    enabled = giftCardsViewModel.sendingCardId != sendCard.id,
                ) {
                    Text(if (giftCardsViewModel.sendingCardId == sendCard.id) "Sending..." else "Send")
                }
            },
            dismissButton = {
                TextButton(onClick = { sendCardId = null }) {
                    Text("Close")
                }
            },
        )
    }

    val sortedCards = giftCardsViewModel.cards.sortedWith(
        compareBy<com.nailsdash.android.data.model.GiftCard> { giftStatusPriority(it.status) }
            .thenByDescending { it.created_at },
    )
    val totalBalance = sortedCards
        .filter { it.status.lowercase() == "active" }
        .sumOf { it.balance }
    val activeCount = sortedCards.count { it.status.lowercase() == "active" }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("My Gift Cards", style = MaterialTheme.typography.headlineSmall)
        }

        item {
            Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("TOTAL BALANCE", style = MaterialTheme.typography.labelLarge)
                    Text("$${String.format("%.2f", totalBalance)}", style = MaterialTheme.typography.displaySmall)
                    Text("$activeCount Active | ${sortedCards.size} Total", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("${sortedCards.size} cards", style = MaterialTheme.typography.bodySmall)
                Button(onClick = { showClaimDialog = true }) {
                    Text("Claim")
                }
            }
        }

        item {
            giftCardsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            giftCardsViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            if (giftCardsViewModel.isLoading) CircularProgressIndicator()
        }

        if (!giftCardsViewModel.isLoading && sortedCards.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No gift cards found. Claim or receive gift cards to see them here.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            items(sortedCards, key = { it.id }) { card ->
                val status = card.status.lowercase()
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("GIFT CARD", style = MaterialTheme.typography.labelMedium)
                            Text(giftStatusLabel(status), style = MaterialTheme.typography.labelSmall)
                        }

                        Text("$${String.format("%.2f", card.balance)}", style = MaterialTheme.typography.headlineMedium)
                        Text("Card: ${card.card_number}", style = MaterialTheme.typography.bodySmall)
                        Text("Issued ${displayDateOnly(card.created_at)}", style = MaterialTheme.typography.bodySmall)
                        card.expires_at?.let {
                            Text("Exp ${displayDateOnly(it)}", style = MaterialTheme.typography.bodySmall)
                        }
                        card.recipient_phone?.takeIf { it.isNotBlank() }?.let {
                            Text("Recipient ${maskPhone(it)}", style = MaterialTheme.typography.bodySmall)
                        }

                        when (status) {
                            "active" -> {
                                Button(
                                    onClick = {
                                        sendCardId = card.id
                                        transferPhone = ""
                                        transferMessage = ""
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text("Send this card")
                                }
                            }

                            "pending_transfer" -> {
                                Button(
                                    onClick = { if (token != null) giftCardsViewModel.revoke(token, card.id) },
                                    enabled = giftCardsViewModel.revokingCardId != card.id,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text(
                                        if (giftCardsViewModel.revokingCardId == card.id) {
                                            "Canceling..."
                                        } else {
                                            "Cancel transfer"
                                        },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Show your gift card code to the receptionist at checkout and the amount will be deducted from your final bill.",
                    modifier = Modifier.padding(12.dp),
                )
            }
        }
    }
}

@Composable
fun OrderHistoryScreen(
    sessionViewModel: AppSessionViewModel,
    orderHistoryViewModel: OrderHistoryViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var reviewingItem by mutableStateOf<Appointment?>(null)
    var reviewRating by mutableStateOf(5)
    var reviewComment by mutableStateOf("")

    LaunchedEffect(token) {
        if (token != null) orderHistoryViewModel.load(token)
    }

    if (reviewingItem != null) {
        val current = reviewingItem
        AlertDialog(
            onDismissRequest = { reviewingItem = null },
            title = { Text("Write a Review") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(current?.store_name ?: "Salon", style = MaterialTheme.typography.titleSmall)
                    Text(current?.service_name ?: "Service", style = MaterialTheme.typography.bodySmall)
                    Text("Rating")
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        (1..5).forEach { star ->
                            IconButton(onClick = { reviewRating = star }) {
                                Icon(
                                    imageVector = if (star <= reviewRating) Icons.Filled.Star else Icons.Filled.StarBorder,
                                    contentDescription = null,
                                )
                            }
                        }
                    }
                    OutlinedTextField(
                        value = reviewComment,
                        onValueChange = { reviewComment = it },
                        label = { Text("Comment") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val appointment = current ?: return@TextButton
                        if (token != null) {
                            orderHistoryViewModel.createReview(
                                bearerToken = token,
                                appointmentId = appointment.id,
                                rating = reviewRating.toDouble(),
                                comment = reviewComment.takeIf { it.isNotBlank() },
                                onCreated = {
                                    reviewingItem = null
                                    reviewComment = ""
                                    reviewRating = 5
                                },
                            )
                        }
                    },
                    enabled = current != null &&
                        orderHistoryViewModel.submittingReviewAppointmentId != current.id,
                ) {
                    val label = if (
                        current != null &&
                        orderHistoryViewModel.submittingReviewAppointmentId == current.id
                    ) {
                        "Submitting..."
                    } else {
                        "Submit"
                    }
                    Text(label)
                }
            },
            dismissButton = {
                TextButton(onClick = { reviewingItem = null }) {
                    Text("Cancel")
                }
            },
        )
    }

    val totalSpend = orderHistoryViewModel.items.sumOf { maxOf(it.service_price ?: 0.0, 0.0) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Transaction History", style = MaterialTheme.typography.headlineSmall)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("TOTAL SPEND", style = MaterialTheme.typography.labelMedium)
                        Text("$${String.format("%.2f", totalSpend)}", style = MaterialTheme.typography.titleLarge)
                        Text("Completed orders", style = MaterialTheme.typography.bodySmall)
                    }
                }
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("TOTAL VISITS", style = MaterialTheme.typography.labelMedium)
                        Text(orderHistoryViewModel.items.size.toString(), style = MaterialTheme.typography.titleLarge)
                        Text("Completed orders", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        item {
            orderHistoryViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            orderHistoryViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            if (orderHistoryViewModel.isLoading) CircularProgressIndicator()
        }

        item {
            Text(
                "RECENT ACTIVITY (${orderHistoryViewModel.items.size} completed)",
                style = MaterialTheme.typography.labelLarge,
            )
        }

        if (!orderHistoryViewModel.isLoading && orderHistoryViewModel.items.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No transactions yet. Completed orders will appear here.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            items(orderHistoryViewModel.items, key = { it.id }) { item ->
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(item.store_name ?: "Salon", style = MaterialTheme.typography.titleMedium)
                                item.order_number?.takeIf { it.isNotBlank() }?.let {
                                    Text("Order $it", style = MaterialTheme.typography.labelSmall)
                                }
                                item.store_address?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                            Text(
                                "$${String.format("%.2f", maxOf(item.service_price ?: 0.0, 0.0))}",
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }

                        HorizontalDivider()
                        Text(item.service_name ?: "Service", style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "${displayDateOnly(item.appointment_date)} - ${item.appointment_time}",
                            style = MaterialTheme.typography.bodySmall,
                        )

                        if (item.status.lowercase() == "completed") {
                            HorizontalDivider()
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("Review", style = MaterialTheme.typography.labelMedium)
                                when {
                                    canReviewAppointment(item) -> {
                                        Button(
                                            onClick = {
                                                reviewingItem = item
                                                reviewRating = 5
                                                reviewComment = ""
                                            },
                                        ) {
                                            Text("Review")
                                        }
                                    }

                                    item.review_id != null -> {
                                        Text("Reviewed", style = MaterialTheme.typography.labelMedium)
                                    }

                                    else -> {
                                        Text("Review window closed", style = MaterialTheme.typography.labelMedium)
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

private fun canReviewAppointment(item: Appointment): Boolean {
    if (item.status.lowercase() != "completed") return false
    if (item.review_id != null) return false
    return isReviewWindowOpen(item.appointment_date, 30)
}

private fun isReviewWindowOpen(appointmentDate: String, reviewWindowDays: Long): Boolean {
    val date = runCatching { LocalDate.parse(appointmentDate) }.getOrNull() ?: return false
    val cutoff = date.plusDays(reviewWindowDays)
    return LocalDate.now() <= cutoff
}

@Composable
fun ReviewsScreen(
    sessionViewModel: AppSessionViewModel,
    myReviewsViewModel: MyReviewsViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    var showEditDialog by mutableStateOf(false)
    var editingReview by mutableStateOf<UserReview?>(null)
    var editRating by mutableStateOf(5)
    var editComment by mutableStateOf("")

    LaunchedEffect(token) {
        if (token != null) myReviewsViewModel.load(token)
    }

    if (showEditDialog && editingReview != null) {
        val current = editingReview
        AlertDialog(
            onDismissRequest = {
                showEditDialog = false
                editingReview = null
            },
            title = { Text("Edit Review") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Rating")
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        (1..5).forEach { star ->
                            IconButton(onClick = { editRating = star }) {
                                Icon(
                                    imageVector = if (star <= editRating) Icons.Filled.Star else Icons.Filled.StarBorder,
                                    contentDescription = null,
                                )
                            }
                        }
                    }
                    OutlinedTextField(
                        value = editComment,
                        onValueChange = { editComment = it },
                        label = { Text("Comment") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val review = current ?: return@TextButton
                        val appointmentId = review.appointment_id ?: return@TextButton
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
                    enabled = current != null && myReviewsViewModel.updatingReviewId != current.id,
                ) {
                    val label = if (current != null && myReviewsViewModel.updatingReviewId == current.id) {
                        "Updating..."
                    } else {
                        "Update"
                    }
                    Text(label)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showEditDialog = false
                    editingReview = null
                }) {
                    Text("Cancel")
                }
            },
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("My Reviews", style = MaterialTheme.typography.headlineSmall)
        }
        item {
            myReviewsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            myReviewsViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            if (myReviewsViewModel.isLoading) CircularProgressIndicator()
        }

        if (!myReviewsViewModel.isLoading && myReviewsViewModel.items.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No reviews yet. Complete an appointment and share your experience.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            items(myReviewsViewModel.items, key = { it.id }) { review ->
                val rating = review.rating ?: 0.0
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                Text(
                                    review.store_name ?: "Store #${review.store_id ?: 0}",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                ReviewStars(rating = rating)
                            }
                            Text(
                                displayDateOnly(review.created_at.orEmpty()),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }

                        Text(
                            review.comment?.takeIf { it.isNotBlank() } ?: "No written comment",
                            style = MaterialTheme.typography.bodyMedium,
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = {
                                    if (review.appointment_id != null) {
                                        editingReview = review
                                        editComment = review.comment.orEmpty()
                                        editRating = (review.rating ?: 5.0).toInt().coerceIn(1, 5)
                                        showEditDialog = true
                                    }
                                },
                                enabled = review.appointment_id != null,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Edit")
                            }
                            Button(
                                onClick = {
                                    if (token != null) myReviewsViewModel.deleteReview(token, review.id)
                                },
                                enabled = myReviewsViewModel.deletingReviewId != review.id,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text(
                                    if (myReviewsViewModel.deletingReviewId == review.id) {
                                        "Deleting..."
                                    } else {
                                        "Delete"
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReviewStars(rating: Double) {
    val normalized = rating.toInt().coerceIn(0, 5)
    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        repeat(5) { index ->
            Icon(
                imageVector = if (index < normalized) Icons.Filled.Star else Icons.Filled.StarBorder,
                contentDescription = null,
            )
        }
    }
}

@Composable
fun FavoritesScreen(
    sessionViewModel: AppSessionViewModel,
    myFavoritesViewModel: MyFavoritesViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    LaunchedEffect(token) {
        if (token != null) myFavoritesViewModel.load(token)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("My Favorites", style = MaterialTheme.typography.headlineSmall)
        }

        item {
            Text(
                "${myFavoritesViewModel.favoriteStores.size} salons | ${myFavoritesViewModel.favoritePins.size} designs",
                style = MaterialTheme.typography.bodySmall,
            )
            myFavoritesViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            myFavoritesViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            if (myFavoritesViewModel.isLoading) CircularProgressIndicator()
        }

        if (!myFavoritesViewModel.isLoading &&
            myFavoritesViewModel.favoriteStores.isEmpty() &&
            myFavoritesViewModel.favoritePins.isEmpty()
        ) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No favorites yet. Save salons and designs to revisit them quickly.",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            if (myFavoritesViewModel.favoritePins.isNotEmpty()) {
                item { Text("FAVORITE DESIGNS", style = MaterialTheme.typography.labelLarge) }
                myFavoritesViewModel.favoritePins.chunked(2).forEach { pinRow ->
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            pinRow.forEach { pin ->
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { },
                                ) {
                                    Column {
                                        AsyncImage(
                                            model = AssetUrlResolver.resolveURL(pin.image_url),
                                            contentDescription = pin.title,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(140.dp),
                                            contentScale = ContentScale.Crop,
                                        )
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text(
                                                pin.title,
                                                style = MaterialTheme.typography.bodyMedium,
                                                modifier = Modifier.weight(1f),
                                            )
                                            TextButton(
                                                onClick = {
                                                    if (token != null) {
                                                        myFavoritesViewModel.removePin(token, pin.id)
                                                    }
                                                },
                                                enabled = myFavoritesViewModel.deletingPinId != pin.id,
                                            ) {
                                                Text("Remove")
                                            }
                                        }
                                    }
                                }
                            }
                            if (pinRow.size == 1) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
            }

            if (myFavoritesViewModel.favoriteStores.isNotEmpty()) {
                item { Text("FAVORITE SALONS", style = MaterialTheme.typography.labelLarge) }
                items(myFavoritesViewModel.favoriteStores, key = { it.id }) { store ->
                    Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AsyncImage(
                                model = AssetUrlResolver.resolveURL(store.image_url),
                                contentDescription = store.name,
                                modifier = Modifier.size(84.dp),
                                contentScale = ContentScale.Crop,
                            )

                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(store.name, style = MaterialTheme.typography.titleSmall)
                                Text(store.formattedAddress, style = MaterialTheme.typography.bodySmall)
                                Text(
                                    "Rating ${String.format("%.1f", store.rating)} (${store.review_count} reviews)",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }

                            TextButton(
                                onClick = {
                                    if (token != null) myFavoritesViewModel.removeStore(token, store.id)
                                },
                                enabled = myFavoritesViewModel.deletingStoreId != store.id,
                            ) {
                                Text("Remove")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VipScreen(
    sessionViewModel: AppSessionViewModel,
    vipViewModel: VipViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    LaunchedEffect(token) {
        if (token != null) vipViewModel.load(token)
    }

    val tiers = listOf(
        Triple("VIP 1-3", "Silver Perks", listOf("5% off all services", "Birthday gift coupon", "Member-only events")),
        Triple("VIP 4-6", "Gold Status", listOf("10% off all services", "Priority booking", "Free soak-off service")),
        Triple("VIP 7-9", "Platinum Luxe", listOf("15% off all services", "Free hand mask with every visit", "Skip the line queue")),
        Triple("VIP 10", "Diamond Elite", listOf("20% off all services", "Personal style consultant", "Free premium drink & snacks")),
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("VIP Membership", style = MaterialTheme.typography.headlineSmall)
        }
        item {
            Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("VIP", style = MaterialTheme.typography.displaySmall)
                    Text("Elite Rewards Program", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "Elevate your experience with our tiered rewards. The more you pamper yourself, the more exclusive your benefits become.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        item {
            vipViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (vipViewModel.isLoading) CircularProgressIndicator()
        }

        vipViewModel.vipStatus?.let { status ->
            item {
                Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Current: VIP ${status.current_level.level}", style = MaterialTheme.typography.titleMedium)
                        Text(status.current_level.benefit, style = MaterialTheme.typography.bodyMedium)
                        Text("Total Spend: $${String.format("%.2f", status.total_spend)}")
                        Text("Total Visits: ${status.total_visits}")
                        Text("Next: VIP ${status.next_level?.level ?: "MAX"}")

                        Text(
                            "Spend ${status.spend_progress.current.toInt()} / ${status.spend_progress.required.toInt()}",
                            style = MaterialTheme.typography.labelMedium,
                        )
                        LinearProgressIndicator(
                            progress = { (status.spend_progress.percent / 100.0).toFloat().coerceIn(0f, 1f) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            "Visits ${status.visits_progress.current.toInt()} / ${status.visits_progress.required.toInt()}",
                            style = MaterialTheme.typography.labelMedium,
                        )
                        LinearProgressIndicator(
                            progress = { (status.visits_progress.percent / 100.0).toFloat().coerceIn(0f, 1f) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }

        item { Text("VIP TIERS", style = MaterialTheme.typography.labelLarge) }
        items(tiers) { tier ->
            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(tier.first, style = MaterialTheme.typography.titleMedium)
                    Text(tier.second, style = MaterialTheme.typography.labelLarge)
                    tier.third.forEach { benefit ->
                        Text("- $benefit", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("REDEMPTION LOGIC", style = MaterialTheme.typography.labelLarge)
                    Text(
                        "Points are accumulated automatically with every visit. To redeem your benefits, present your digital membership card during checkout. All vouchers and tier rewards are redeemed in-store.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}

@Composable
fun ReferralScreen(
    sessionViewModel: AppSessionViewModel,
    referralViewModel: ReferralViewModel = viewModel(),
) {
    val token = sessionViewModel.accessTokenOrNull()
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    var copied by mutableStateOf(false)

    LaunchedEffect(token) {
        if (token != null) referralViewModel.load(token)
    }

    val referralCode = referralViewModel.referralCode?.trim().orEmpty()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Refer a Friend", style = MaterialTheme.typography.headlineSmall)
        }

        item {
            Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("Gift", style = MaterialTheme.typography.displaySmall)
                    Text("Refer a Friend", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "Share the glow! Both you and your friend receive one free coupon (\$10 value) right after successful registration.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("YOUR REFERRAL CODE", style = MaterialTheme.typography.labelLarge)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            if (referralCode.isBlank()) "-" else referralCode,
                            style = MaterialTheme.typography.headlineMedium,
                        )
                        Button(
                            onClick = {
                                if (referralCode.isNotBlank()) {
                                    clipboardManager.setText(AnnotatedString(referralCode))
                                    copied = true
                                }
                            },
                            enabled = referralCode.isNotBlank(),
                        ) {
                            Text(if (copied) "Copied" else "Copy")
                        }
                    }
                    Text("Your code is unique and stays the same.", style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        item {
            Button(
                onClick = {
                    if (referralCode.isBlank()) return@Button
                    val shareText =
                        "Join me on Nails Booking! Use my referral code $referralCode and get a \$10 coupon right after registration!"
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, shareText)
                    }
                    context.startActivity(Intent.createChooser(intent, "Share with Friends"))
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = referralCode.isNotBlank(),
            ) {
                Text("Share with Friends")
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Referrals", style = MaterialTheme.typography.labelMedium)
                        Text((referralViewModel.stats?.total_referrals ?: 0).toString())
                    }
                }
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Coupons Earned", style = MaterialTheme.typography.labelMedium)
                        Text((referralViewModel.stats?.total_rewards_earned ?: 0).toString())
                    }
                }
            }
        }

        item {
            referralViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (referralViewModel.isLoading) CircularProgressIndicator()
        }

        if (!referralViewModel.isLoading && referralViewModel.items.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No referrals yet. Start inviting friends!",
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        } else {
            item { Text("REFERRAL HISTORY", style = MaterialTheme.typography.labelLarge) }
            items(referralViewModel.items, key = { it.id }) { item ->
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                item.referee_name.ifBlank { "User" },
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(maskPhone(item.referee_phone), style = MaterialTheme.typography.bodySmall)
                            Text("Joined: ${displayDateOnly(item.created_at)}", style = MaterialTheme.typography.labelSmall)
                        }
                        Text(
                            if (item.referrer_reward_given) "Rewarded" else "Pending",
                            style = MaterialTheme.typography.labelMedium,
                        )
                    }
                }
            }
        }
    }
}
