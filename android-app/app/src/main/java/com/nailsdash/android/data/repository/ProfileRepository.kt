package com.nailsdash.android.data.repository

import com.nailsdash.android.core.cache.TimedMemoryCache
import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.CountDTO
import com.nailsdash.android.data.model.CouponTemplate
import com.nailsdash.android.data.model.GiftCard
import com.nailsdash.android.data.model.GiftCardClaimRequest
import com.nailsdash.android.data.model.GiftCardRevokeResponse
import com.nailsdash.android.data.model.GiftCardTransferRequest
import com.nailsdash.android.data.model.PointTransaction
import com.nailsdash.android.data.model.PointsBalance
import com.nailsdash.android.data.model.ProfileSummary
import com.nailsdash.android.data.model.ReferralCode
import com.nailsdash.android.data.model.ReferralListItem
import com.nailsdash.android.data.model.ReferralStats
import com.nailsdash.android.data.model.ReviewUploadImagePayload
import com.nailsdash.android.data.model.ReviewUpsertRequest
import com.nailsdash.android.data.model.UnreadCount
import com.nailsdash.android.data.model.UserCoupon
import com.nailsdash.android.data.model.UserReview
import com.nailsdash.android.data.model.VipStatus
import com.nailsdash.android.data.network.ServiceLocator
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

data class ProfileCenterPrimarySummary(
    val unreadCount: Int,
    val points: Int,
    val favoriteCount: Int?,
    val completedOrders: Int?,
    val vipStatus: VipStatus?,
)

data class ProfileCenterSecondarySummary(
    val couponCount: Int?,
    val giftBalance: Double?,
    val reviewCount: Int?,
)

class ProfileRepository {
    private val api get() = ServiceLocator.api

    private data class TokenKey(
        val bearerToken: String,
    )

    private data class TokenLimitKey(
        val bearerToken: String,
        val limit: Int,
    )

    private data class TokenStatusKey(
        val bearerToken: String,
        val status: String?,
        val limit: Int,
    )

    suspend fun getProfileCenterPrimarySummary(bearerToken: String): Result<ProfileCenterPrimarySummary> {
        val summary = getProfileSummary(bearerToken).getOrElse { return Result.failure(it) }
        return Result.success(
            ProfileCenterPrimarySummary(
                unreadCount = summary.unread_count,
                points = summary.points,
                favoriteCount = summary.favorite_count.coerceAtLeast(0),
                completedOrders = summary.completed_orders.coerceAtLeast(0),
                vipStatus = summary.vip_status,
            ),
        )
    }

    suspend fun getProfileCenterSecondarySummary(bearerToken: String): Result<ProfileCenterSecondarySummary> {
        val summary = getProfileSummary(bearerToken).getOrElse { return Result.failure(it) }
        return Result.success(
            ProfileCenterSecondarySummary(
                couponCount = summary.coupon_count.coerceAtLeast(0),
                giftBalance = summary.gift_balance.coerceAtLeast(0.0),
                reviewCount = summary.review_count.coerceAtLeast(0),
            ),
        )
    }

    private suspend fun getProfileSummary(bearerToken: String): Result<ProfileSummary> {
        val cacheKey = TokenKey(bearerToken)
        profileSummaryCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getProfileSummary(bearerToken) }
            .mapFailure()
            .onSuccess { profileSummaryCache.put(cacheKey, it) }
    }

    suspend fun getUnreadCount(bearerToken: String): Result<UnreadCount> {
        val cacheKey = TokenKey(bearerToken)
        unreadCountCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getUnreadNotificationCount(bearerToken) }
            .mapFailure()
            .onSuccess { unreadCountCache.put(cacheKey, it) }
    }

    suspend fun getPointsBalance(bearerToken: String): Result<PointsBalance> {
        val cacheKey = TokenKey(bearerToken)
        pointsBalanceCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getPointsBalance(bearerToken) }
            .mapFailure()
            .onSuccess { pointsBalanceCache.put(cacheKey, it) }
    }

    suspend fun getPointTransactions(bearerToken: String, limit: Int = 50): Result<List<PointTransaction>> {
        val cacheKey = TokenLimitKey(bearerToken, limit)
        pointTransactionsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getPointTransactions(bearerToken, skip = 0, limit = limit) }
            .mapFailure()
            .onSuccess { pointTransactionsCache.put(cacheKey, it) }
    }

    suspend fun getExchangeableCoupons(bearerToken: String): Result<List<CouponTemplate>> {
        val cacheKey = TokenKey(bearerToken)
        exchangeableCouponsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getExchangeableCoupons(bearerToken) }
            .mapFailure()
            .onSuccess { exchangeableCouponsCache.put(cacheKey, it) }
    }

    suspend fun exchangeCoupon(bearerToken: String, couponId: Int): Result<UserCoupon> =
        runCatching { api.exchangeCoupon(bearerToken, couponId) }
            .mapFailure()
            .onSuccess {
                profileSummaryCache.clear()
                pointsBalanceCache.clear()
                exchangeableCouponsCache.clear()
                myCouponsCache.clear()
            }

    suspend fun getMyCoupons(
        bearerToken: String,
        status: String? = null,
        limit: Int = 100,
    ): Result<List<UserCoupon>> {
        val cacheKey = TokenStatusKey(bearerToken, status, limit)
        myCouponsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching {
            api.getMyCoupons(
                bearerToken = bearerToken,
                skip = 0,
                limit = limit,
                status = status,
            )
        }.mapFailure().onSuccess { myCouponsCache.put(cacheKey, it) }
    }

    suspend fun getMyGiftCards(bearerToken: String, limit: Int = 100): Result<List<GiftCard>> {
        val cacheKey = TokenLimitKey(bearerToken, limit)
        myGiftCardsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching {
            api.getMyGiftCards(bearerToken = bearerToken, skip = 0, limit = limit)
        }.mapFailure().onSuccess { myGiftCardsCache.put(cacheKey, it) }
    }

    suspend fun transferGiftCard(
        bearerToken: String,
        giftCardId: Int,
        recipientPhone: String,
        message: String?,
    ): Result<GiftCard> = runCatching {
        val request = GiftCardTransferRequest(recipient_phone = recipientPhone, message = message)
        api.transferGiftCard(
            bearerToken = bearerToken,
            giftCardId = giftCardId,
            request = request,
        ).gift_card
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        myGiftCardsCache.clear()
    }

    suspend fun claimGiftCard(bearerToken: String, claimCode: String): Result<GiftCard> = runCatching {
        api.claimGiftCard(
            bearerToken = bearerToken,
            request = GiftCardClaimRequest(claim_code = claimCode),
        ).gift_card
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        myGiftCardsCache.clear()
    }

    suspend fun revokeGiftCard(bearerToken: String, giftCardId: Int): Result<GiftCard> = runCatching {
        val response: GiftCardRevokeResponse = api.revokeGiftCard(
            bearerToken = bearerToken,
            giftCardId = giftCardId,
        )
        response.gift_card
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        myGiftCardsCache.clear()
    }

    suspend fun getMyReviews(bearerToken: String, limit: Int = 100): Result<List<UserReview>> {
        val cacheKey = TokenLimitKey(bearerToken, limit)
        myReviewsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getMyReviews(bearerToken, skip = 0, limit = limit) }
            .mapFailure()
            .onSuccess { myReviewsCache.put(cacheKey, it) }
    }

    suspend fun createReview(
        bearerToken: String,
        appointmentId: Int,
        rating: Double,
        comment: String?,
        images: List<String>? = null,
    ): Result<UserReview> = runCatching {
        api.createReview(
            bearerToken,
            ReviewUpsertRequest(
                appointment_id = appointmentId,
                rating = rating.coerceIn(1.0, 5.0),
                comment = comment,
                images = images,
            ),
        )
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        myReviewsCache.clear()
    }

    suspend fun uploadReviewImages(
        bearerToken: String,
        files: List<ReviewUploadImagePayload>,
    ): Result<List<String>> = runCatching {
        if (files.isEmpty()) {
            emptyList()
        } else {
            val parts = files.map { file ->
                val requestBody = file.imageData.toRequestBody(file.mimeType.toMediaTypeOrNull())
                MultipartBody.Part.createFormData(
                    name = "files",
                    filename = file.fileName,
                    body = requestBody,
                )
            }
            api.uploadReviewImages(
                bearerToken = bearerToken,
                files = parts,
            )
        }
    }.mapFailure()

    suspend fun updateReview(
        bearerToken: String,
        reviewId: Int,
        appointmentId: Int,
        rating: Double,
        comment: String?,
        images: List<String>?,
    ): Result<UserReview> = runCatching {
        api.updateReview(
            bearerToken = bearerToken,
            reviewId = reviewId,
            request = ReviewUpsertRequest(
                appointment_id = appointmentId,
                rating = rating.coerceIn(1.0, 5.0),
                comment = comment,
                images = images,
            ),
        )
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        myReviewsCache.clear()
    }

    suspend fun deleteReview(bearerToken: String, reviewId: Int): Result<Unit> = runCatching {
        api.deleteReview(bearerToken = bearerToken, reviewId = reviewId)
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        myReviewsCache.clear()
    }

    suspend fun getFavoritePinsCount(bearerToken: String): Result<CountDTO> {
        val cacheKey = TokenKey(bearerToken)
        favoritePinsCountCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getFavoritePinsCount(bearerToken) }
            .mapFailure()
            .onSuccess { favoritePinsCountCache.put(cacheKey, it) }
    }

    suspend fun getFavoritePins(bearerToken: String, limit: Int = 100): Result<List<com.nailsdash.android.data.model.HomeFeedPin>> {
        val cacheKey = TokenLimitKey(bearerToken, limit)
        favoritePinsCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getFavoritePins(bearerToken, skip = 0, limit = limit) }
            .mapFailure()
            .onSuccess { favoritePinsCache.put(cacheKey, it) }
    }

    suspend fun getFavoriteStores(bearerToken: String, limit: Int = 100): Result<List<com.nailsdash.android.data.model.Store>> {
        val cacheKey = TokenLimitKey(bearerToken, limit)
        favoriteStoresCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getFavoriteStores(bearerToken, skip = 0, limit = limit) }
            .mapFailure()
            .onSuccess { favoriteStoresCache.put(cacheKey, it) }
    }

    suspend fun removeFavoritePin(bearerToken: String, pinId: Int): Result<Unit> = runCatching {
        api.removeFavoritePin(bearerToken = bearerToken, pinId = pinId)
    }.mapFailure().onSuccess {
        profileSummaryCache.clear()
        favoritePinsCountCache.clear()
        favoritePinsCache.clear()
    }

    suspend fun removeFavoriteStore(bearerToken: String, storeId: Int): Result<Unit> = runCatching {
        api.removeStoreFavorite(bearerToken = bearerToken, storeId = storeId)
    }.mapFailure().onSuccess {
        favoriteStoresCache.clear()
    }

    suspend fun getVipStatus(bearerToken: String): Result<VipStatus> {
        val cacheKey = TokenKey(bearerToken)
        vipStatusCache.get(cacheKey)?.let { return Result.success(it) }
        return runCatching { api.getVipStatus(bearerToken) }
            .mapFailure()
            .onSuccess { vipStatusCache.put(cacheKey, it) }
    }

    suspend fun getReferralCode(bearerToken: String): Result<ReferralCode> =
        runCatching { api.getReferralCode(bearerToken) }.mapFailure()

    suspend fun getReferralStats(bearerToken: String): Result<ReferralStats> =
        runCatching { api.getReferralStats(bearerToken) }.mapFailure()

    suspend fun getReferralList(bearerToken: String, limit: Int = 100): Result<List<ReferralListItem>> =
        runCatching { api.getReferralList(bearerToken, skip = 0, limit = limit) }.mapFailure()

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }

    private companion object {
        private const val SHORT_TTL_MS = 30 * 1000L
        private const val LONG_TTL_MS = 60 * 1000L
        private val unreadCountCache = TimedMemoryCache<TokenKey, UnreadCount>(SHORT_TTL_MS, maxEntries = 4)
        private val pointsBalanceCache = TimedMemoryCache<TokenKey, PointsBalance>(SHORT_TTL_MS, maxEntries = 4)
        private val profileSummaryCache = TimedMemoryCache<TokenKey, ProfileSummary>(SHORT_TTL_MS, maxEntries = 4)
        private val pointTransactionsCache = TimedMemoryCache<TokenLimitKey, List<PointTransaction>>(SHORT_TTL_MS, maxEntries = 8)
        private val exchangeableCouponsCache = TimedMemoryCache<TokenKey, List<CouponTemplate>>(LONG_TTL_MS, maxEntries = 4)
        private val myCouponsCache = TimedMemoryCache<TokenStatusKey, List<UserCoupon>>(SHORT_TTL_MS, maxEntries = 12)
        private val myGiftCardsCache = TimedMemoryCache<TokenLimitKey, List<GiftCard>>(SHORT_TTL_MS, maxEntries = 8)
        private val myReviewsCache = TimedMemoryCache<TokenLimitKey, List<UserReview>>(SHORT_TTL_MS, maxEntries = 8)
        private val favoritePinsCountCache = TimedMemoryCache<TokenKey, CountDTO>(SHORT_TTL_MS, maxEntries = 4)
        private val favoritePinsCache = TimedMemoryCache<TokenLimitKey, List<com.nailsdash.android.data.model.HomeFeedPin>>(SHORT_TTL_MS, maxEntries = 8)
        private val favoriteStoresCache = TimedMemoryCache<TokenLimitKey, List<com.nailsdash.android.data.model.Store>>(SHORT_TTL_MS, maxEntries = 8)
        private val vipStatusCache = TimedMemoryCache<TokenKey, VipStatus>(LONG_TTL_MS, maxEntries = 4)
    }
}
