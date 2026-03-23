package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.model.CouponTemplate
import com.nailsdash.android.data.model.GiftCard
import com.nailsdash.android.data.model.PointTransaction
import com.nailsdash.android.data.model.PointsBalance
import com.nailsdash.android.data.model.ReferralListItem
import com.nailsdash.android.data.model.ReferralStats
import com.nailsdash.android.data.model.ReviewUploadImagePayload
import com.nailsdash.android.data.model.UserCoupon
import com.nailsdash.android.data.model.UserReview
import com.nailsdash.android.data.model.VipStatus
import com.nailsdash.android.data.repository.AppointmentsRepository
import com.nailsdash.android.data.repository.ProfileCenterPrimarySummary
import com.nailsdash.android.data.repository.ProfileCenterSecondarySummary
import com.nailsdash.android.data.repository.ProfileRepository
import com.nailsdash.android.data.repository.StoresRepository
import com.nailsdash.android.utils.AppDateTimeFormatterCache
import com.nailsdash.android.utils.PhoneFormatter
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class ProfileCenterViewModel(application: Application) : AndroidViewModel(application) {
    private val profileRepository = ProfileRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false
    private var loadRequestVersion = 0

    var unreadCount by mutableStateOf(0)
        private set

    var points by mutableStateOf(0)
        private set

    var couponCount by mutableStateOf(0)
        private set

    var giftBalance by mutableStateOf(0.0)
        private set

    var completedOrders by mutableStateOf(0)
        private set

    var reviewCount by mutableStateOf(0)
        private set

    var favoriteCount by mutableStateOf(0)
        private set

    var vipStatus by mutableStateOf<VipStatus?>(null)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        val requestVersion = ++loadRequestVersion
        isLoading = true
        viewModelScope.launch {
            val primarySummary = profileRepository.getProfileCenterPrimarySummary(bearerToken)
            if (requestVersion != loadRequestVersion) return@launch

            primarySummary
                .onSuccess { summary -> applyPrimarySummary(summary) }
                .onFailure {
                    errorMessage = it.message
                    isLoading = false
                    return@launch
                }

            errorMessage = null
            isLoading = false

            val secondarySummary = profileRepository.getProfileCenterSecondarySummary(bearerToken)
            if (requestVersion != loadRequestVersion) return@launch

            secondarySummary.onSuccess { summary ->
                applySecondarySummary(summary)
            }
        }
    }

    private fun applyPrimarySummary(summary: ProfileCenterPrimarySummary) {
        unreadCount = summary.unreadCount
        points = summary.points
        summary.favoriteCount?.let { favoriteCount = maxOf(it, 0) }
        summary.completedOrders?.let { completedOrders = maxOf(it, 0) }
        summary.vipStatus?.let { vipStatus = it }
    }

    private fun applySecondarySummary(summary: ProfileCenterSecondarySummary) {
        summary.couponCount?.let { couponCount = it }
        summary.giftBalance?.let { giftBalance = it }
        summary.reviewCount?.let { reviewCount = it }
    }
}

class PointsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var balance by mutableStateOf<PointsBalance?>(null)
        private set

    var transactions by mutableStateOf(emptyList<PointTransaction>())
        private set

    var exchangeables by mutableStateOf(emptyList<CouponTemplate>())
        private set

    var isRedeemingCouponId by mutableStateOf<Int?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val b = async { repository.getPointsBalance(bearerToken) }
                val t = async { repository.getPointTransactions(bearerToken, limit = 50) }
                val e = async { repository.getExchangeableCoupons(bearerToken) }

                b.await().onSuccess { balance = it }.onFailure { errorMessage = it.message }
                t.await().onSuccess { transactions = it }.onFailure { errorMessage = it.message }
                e.await().onSuccess { exchangeables = it }.onFailure { errorMessage = it.message }
            }
            isLoading = false
        }
    }

    fun exchange(bearerToken: String, couponId: Int) {
        isRedeemingCouponId = couponId
        viewModelScope.launch {
            repository.exchangeCoupon(bearerToken, couponId)
                .onSuccess { redeemed ->
                    actionMessage = "Exchanged: ${redeemed.coupon.name}"
                    errorMessage = null
                    load(bearerToken, force = true)
                }
                .onFailure { errorMessage = it.message }
            isRedeemingCouponId = null
        }
    }
}

class CouponsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private var loadedBearerToken: String? = null
    private var loadedStatus: String? = null
    private var hasLoadedOnce = false
    private var loadRequestVersion = 0

    var selectedStatus by mutableStateOf("available")

    var coupons by mutableStateOf(emptyList<UserCoupon>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (
            loadedBearerToken == bearerToken &&
            loadedStatus == selectedStatus &&
            hasLoadedOnce &&
            errorMessage == null &&
            !isLoading
        ) {
            return
        }
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (
            !force &&
            loadedBearerToken == bearerToken &&
            loadedStatus == selectedStatus &&
            hasLoadedOnce &&
            errorMessage == null
        ) {
            return
        }
        loadedBearerToken = bearerToken
        loadedStatus = selectedStatus
        hasLoadedOnce = true
        val requestVersion = ++loadRequestVersion
        isLoading = true
        viewModelScope.launch {
            repository.getMyCoupons(
                bearerToken = bearerToken,
                status = selectedStatus,
                limit = 100,
            ).onSuccess {
                if (requestVersion != loadRequestVersion) return@onSuccess
                coupons = it
                errorMessage = null
            }.onFailure { err ->
                if (requestVersion != loadRequestVersion) return@onFailure
                coupons = emptyList()
                errorMessage = err.message
            }
            if (requestVersion != loadRequestVersion) return@launch
            isLoading = false
        }
    }
}

class GiftCardsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var cards by mutableStateOf(emptyList<GiftCard>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var isClaiming by mutableStateOf(false)
        private set

    var sendingCardId by mutableStateOf<Int?>(null)
        private set

    var revokingCardId by mutableStateOf<Int?>(null)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            repository.getMyGiftCards(bearerToken, limit = 100)
                .onSuccess {
                    cards = it
                    errorMessage = null
                }
                .onFailure { err ->
                    cards = emptyList()
                    errorMessage = err.message
                }
            isLoading = false
        }
    }

    fun transfer(
        bearerToken: String,
        giftCardId: Int,
        recipientPhone: String,
        message: String?,
    ) {
        val normalizedPhone = PhoneFormatter.normalizeUSPhone(recipientPhone)
        if (normalizedPhone.length != 11) {
            errorMessage = "Please enter a valid US phone number."
            return
        }

        sendingCardId = giftCardId
        viewModelScope.launch {
            repository.transferGiftCard(
                bearerToken = bearerToken,
                giftCardId = giftCardId,
                recipientPhone = normalizedPhone,
                message = message,
            ).onSuccess { updated ->
                upsert(updated)
                actionMessage = "Gift sent successfully."
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
            }
            sendingCardId = null
        }
    }

    fun claim(bearerToken: String, claimCode: String) {
        val normalizedCode = claimCode.trim().uppercase()
        if (normalizedCode.isEmpty()) {
            errorMessage = "Please enter a claim code."
            return
        }

        isClaiming = true
        viewModelScope.launch {
            repository.claimGiftCard(bearerToken, normalizedCode)
                .onSuccess { claimed ->
                    upsert(claimed)
                    actionMessage = "Gift card claimed."
                    errorMessage = null
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
            isClaiming = false
        }
    }

    fun revoke(bearerToken: String, giftCardId: Int) {
        revokingCardId = giftCardId
        viewModelScope.launch {
            repository.revokeGiftCard(bearerToken, giftCardId)
                .onSuccess { updated ->
                    upsert(updated)
                    actionMessage = "Transfer canceled."
                    errorMessage = null
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
            revokingCardId = null
        }
    }

    private fun upsert(card: GiftCard) {
        val idx = cards.indexOfFirst { it.id == card.id }
        cards = if (idx >= 0) {
            cards.toMutableList().also { it[idx] = card }
        } else {
            listOf(card) + cards
        }
    }
}

class OrderHistoryViewModel(application: Application) : AndroidViewModel(application) {
    private val appointmentsRepository = AppointmentsRepository()
    private val profileRepository = ProfileRepository()
    private val appointmentDateTimeSecondFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
    private val appointmentDateTimeMinuteFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var items by mutableStateOf(emptyList<Appointment>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    var submittingReviewAppointmentId by mutableStateOf<Int?>(null)
        private set

    var isUploadingReviewImages by mutableStateOf(false)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            appointmentsRepository.getMyAppointments(bearerToken, limit = 100)
                .onSuccess { rows ->
                    items = rows
                        .filter { it.status.lowercase() == "completed" }
                        .sortedByDescending { appointmentDateTime(it) }
                    errorMessage = null
                }
                .onFailure { err ->
                    items = emptyList()
                    errorMessage = err.message
                }
            isLoading = false
        }
    }

    private fun appointmentDateTime(item: Appointment): LocalDateTime {
        item.completed_at?.trim()?.takeIf { it.isNotEmpty() }?.let { raw ->
            parseCompletedDateTime(raw)?.let { return it }
        }
        val raw = "${item.appointment_date}T${item.appointment_time}".trim()
        return runCatching {
            LocalDateTime.parse(raw, appointmentDateTimeSecondFormatter)
        }.recoverCatching {
            LocalDateTime.parse(raw, appointmentDateTimeMinuteFormatter)
        }.getOrElse {
            LocalDateTime.MIN
        }
    }

    private fun parseCompletedDateTime(raw: String): LocalDateTime? {
        return AppDateTimeFormatterCache.parseServerDateTime(raw)
    }

    fun createReview(
        bearerToken: String,
        appointmentId: Int,
        rating: Double,
        comment: String?,
        imageFiles: List<ReviewUploadImagePayload> = emptyList(),
        onCreated: () -> Unit = {},
    ) {
        submittingReviewAppointmentId = appointmentId
        viewModelScope.launch {
            val uploadedImagePaths = if (imageFiles.isNotEmpty()) {
                isUploadingReviewImages = true
                val result = profileRepository.uploadReviewImages(
                    bearerToken = bearerToken,
                    files = imageFiles,
                )
                isUploadingReviewImages = false
                result.getOrElse { err ->
                    errorMessage = err.message
                    submittingReviewAppointmentId = null
                    return@launch
                }
            } else {
                emptyList()
            }

            profileRepository.createReview(
                bearerToken = bearerToken,
                appointmentId = appointmentId,
                rating = rating,
                comment = comment,
                images = uploadedImagePaths.ifEmpty { null },
            ).onSuccess { review ->
                items = items.map { item ->
                    if (item.id == appointmentId) item.copy(review_id = review.id) else item
                }
                actionMessage = "Review submitted."
                errorMessage = null
                onCreated()
            }.onFailure { err ->
                errorMessage = err.message
            }
            isUploadingReviewImages = false
            submittingReviewAppointmentId = null
        }
    }
}

class MyReviewsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private val storesRepository = StoresRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var items by mutableStateOf(emptyList<UserReview>())
        private set

    var storeNameById by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    var deletingReviewId by mutableStateOf<Int?>(null)
        private set

    var updatingReviewId by mutableStateOf<Int?>(null)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            repository.getMyReviews(bearerToken, limit = 100)
                .onSuccess { rows ->
                    items = rows
                    refreshStoreNameMap()
                    errorMessage = null
                }
                .onFailure { err ->
                    items = emptyList()
                    storeNameById = emptyMap()
                    errorMessage = err.message
                }
            isLoading = false
        }
    }

    fun deleteReview(bearerToken: String, reviewId: Int) {
        deletingReviewId = reviewId
        viewModelScope.launch {
            repository.deleteReview(bearerToken, reviewId)
                .onSuccess {
                    items = items.filterNot { it.id == reviewId }
                    refreshStoreNameMap()
                    actionMessage = "Review deleted."
                    errorMessage = null
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
            deletingReviewId = null
        }
    }

    fun updateReview(
        bearerToken: String,
        reviewId: Int,
        appointmentId: Int,
        rating: Double,
        comment: String?,
        images: List<String>? = null,
        onUpdated: () -> Unit = {},
    ) {
        updatingReviewId = reviewId
        viewModelScope.launch {
            repository.updateReview(
                bearerToken = bearerToken,
                reviewId = reviewId,
                appointmentId = appointmentId,
                rating = rating,
                comment = comment,
                images = images,
            ).onSuccess { updated ->
                items = items.map { if (it.id == reviewId) updated else it }
                refreshStoreNameMap()
                actionMessage = "Review updated."
                errorMessage = null
                onUpdated()
            }.onFailure { err ->
                errorMessage = err.message
            }
            updatingReviewId = null
        }
    }

    private suspend fun refreshStoreNameMap() = coroutineScope {
        val merged = mutableMapOf<Int, String>()
        items.forEach { item ->
            val storeId = item.store_id ?: return@forEach
            val normalized = item.store_name?.trim().orEmpty()
            if (normalized.isNotEmpty()) {
                merged[storeId] = normalized
            }
        }

        val missingStoreIds = items.mapNotNull { it.store_id }.toSet().subtract(merged.keys)
        if (missingStoreIds.isNotEmpty()) {
            val tasks = missingStoreIds.map { storeId ->
                async {
                    val name = storesRepository.getStoreDetail(storeId)
                        .getOrNull()
                        ?.name
                        ?.trim()
                        .orEmpty()
                    storeId to name.takeIf { it.isNotEmpty() }
                }
            }
            tasks.forEach { task ->
                val (storeId, name) = task.await()
                if (name != null) {
                    merged[storeId] = name
                }
            }
        }

        storeNameById = merged
    }
}

class MyFavoritesViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private val storesRepository = StoresRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var favoritePins by mutableStateOf(emptyList<com.nailsdash.android.data.model.HomeFeedPin>())
        private set

    var favoriteStores by mutableStateOf(emptyList<com.nailsdash.android.data.model.Store>())
        private set

    var favoriteStoreImageUrlById by mutableStateOf<Map<Int, String>>(emptyMap())
        private set

    var deletingPinId by mutableStateOf<Int?>(null)
        private set

    var deletingStoreId by mutableStateOf<Int?>(null)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val pinsTask = async { repository.getFavoritePins(bearerToken, limit = 100) }
                val storesTask = async { repository.getFavoriteStores(bearerToken, limit = 100) }

                pinsTask.await()
                    .onSuccess { favoritePins = it }
                    .onFailure { errorMessage = it.message }

                storesTask.await()
                    .onSuccess {
                        favoriteStores = it
                        favoriteStoreImageUrlById = resolveFavoriteStoreImageUrls(it)
                    }
                    .onFailure { errorMessage = it.message }
            }
            isLoading = false
        }
    }

    fun removePin(bearerToken: String, pinId: Int) {
        deletingPinId = pinId
        viewModelScope.launch {
            repository.removeFavoritePin(bearerToken, pinId)
                .onSuccess {
                    favoritePins = favoritePins.filterNot { it.id == pinId }
                    actionMessage = "Removed from favorites."
                    errorMessage = null
                }
                .onFailure { errorMessage = it.message }
            deletingPinId = null
        }
    }

    fun removeStore(bearerToken: String, storeId: Int) {
        deletingStoreId = storeId
        viewModelScope.launch {
            repository.removeFavoriteStore(bearerToken, storeId)
                .onSuccess {
                    favoriteStores = favoriteStores.filterNot { it.id == storeId }
                    favoriteStoreImageUrlById = favoriteStoreImageUrlById - storeId
                    actionMessage = "Removed from favorites."
                    errorMessage = null
                }
                .onFailure { errorMessage = it.message }
            deletingStoreId = null
        }
    }

    private suspend fun resolveFavoriteStoreImageUrls(
        stores: List<com.nailsdash.android.data.model.Store>,
    ): Map<Int, String> = coroutineScope {
        if (stores.isEmpty()) return@coroutineScope emptyMap()

        val resolved = mutableMapOf<Int, String>()
        stores.forEach { store ->
            val direct = store.image_url?.trim().orEmpty()
            if (direct.isNotEmpty()) {
                resolved[store.id] = direct
            }
        }

        val missingStores = stores.filter { it.id !in resolved.keys }
        if (missingStores.isNotEmpty()) {
            val tasks = missingStores.map { store ->
                async {
                    val imageUrl = storesRepository.getStoreImages(store.id)
                        .getOrNull()
                        ?.let(::pickPrimaryStoreImageUrl)
                    store.id to imageUrl
                }
            }
            tasks.forEach { task ->
                val (storeId, imageUrl) = task.await()
                if (!imageUrl.isNullOrBlank()) {
                    resolved[storeId] = imageUrl
                }
            }
        }

        resolved
    }

    private fun pickPrimaryStoreImageUrl(
        images: List<com.nailsdash.android.data.model.StoreImage>,
    ): String? {
        if (images.isEmpty()) return null
        return images.sortedWith(
            compareByDescending<com.nailsdash.android.data.model.StoreImage> { it.is_primary ?: 0 }
                .thenBy { it.display_order ?: Int.MAX_VALUE }
                .thenBy { it.id },
        ).firstOrNull()?.image_url?.trim()?.takeIf { it.isNotEmpty() }
    }
}

class VipViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var vipStatus by mutableStateOf<VipStatus?>(null)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            repository.getVipStatus(bearerToken)
                .onSuccess {
                    vipStatus = it
                    errorMessage = null
                }
                .onFailure { err ->
                    vipStatus = null
                    errorMessage = err.message
                }
            isLoading = false
        }
    }
}

class ReferralViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProfileRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var referralCode by mutableStateOf<String?>(null)
        private set

    var stats by mutableStateOf<ReferralStats?>(null)
        private set

    var items by mutableStateOf(emptyList<ReferralListItem>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val codeTask = async { repository.getReferralCode(bearerToken) }
                val statsTask = async { repository.getReferralStats(bearerToken) }
                val listTask = async { repository.getReferralList(bearerToken, limit = 100) }

                codeTask.await().onSuccess { referralCode = it.referral_code }
                    .onFailure { errorMessage = it.message }

                statsTask.await().onSuccess { stats = it }
                    .onFailure { errorMessage = it.message }

                listTask.await().onSuccess { items = it }
                    .onFailure { errorMessage = it.message }
            }
            isLoading = false
        }
    }
}
