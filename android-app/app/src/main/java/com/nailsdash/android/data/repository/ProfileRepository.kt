package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.CountDTO
import com.nailsdash.android.data.model.CouponTemplate
import com.nailsdash.android.data.model.GiftCard
import com.nailsdash.android.data.model.GiftCardClaimRequest
import com.nailsdash.android.data.model.GiftCardRevokeResponse
import com.nailsdash.android.data.model.GiftCardTransferRequest
import com.nailsdash.android.data.model.PointTransaction
import com.nailsdash.android.data.model.PointsBalance
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

class ProfileRepository {
    private val api get() = ServiceLocator.api

    suspend fun getUnreadCount(bearerToken: String): Result<UnreadCount> =
        runCatching { api.getUnreadNotificationCount(bearerToken) }.mapFailure()

    suspend fun getPointsBalance(bearerToken: String): Result<PointsBalance> =
        runCatching { api.getPointsBalance(bearerToken) }.mapFailure()

    suspend fun getPointTransactions(bearerToken: String, limit: Int = 50): Result<List<PointTransaction>> =
        runCatching { api.getPointTransactions(bearerToken, skip = 0, limit = limit) }.mapFailure()

    suspend fun getExchangeableCoupons(bearerToken: String): Result<List<CouponTemplate>> =
        runCatching { api.getExchangeableCoupons(bearerToken) }.mapFailure()

    suspend fun exchangeCoupon(bearerToken: String, couponId: Int): Result<UserCoupon> =
        runCatching { api.exchangeCoupon(bearerToken, couponId) }.mapFailure()

    suspend fun getMyCoupons(
        bearerToken: String,
        status: String? = null,
        limit: Int = 100,
    ): Result<List<UserCoupon>> = runCatching {
        api.getMyCoupons(
            bearerToken = bearerToken,
            skip = 0,
            limit = limit,
            status = status,
        )
    }.mapFailure()

    suspend fun getMyGiftCards(bearerToken: String, limit: Int = 100): Result<List<GiftCard>> =
        runCatching { api.getMyGiftCards(bearerToken = bearerToken, skip = 0, limit = limit) }.mapFailure()

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
    }.mapFailure()

    suspend fun claimGiftCard(bearerToken: String, claimCode: String): Result<GiftCard> = runCatching {
        api.claimGiftCard(
            bearerToken = bearerToken,
            request = GiftCardClaimRequest(claim_code = claimCode),
        ).gift_card
    }.mapFailure()

    suspend fun revokeGiftCard(bearerToken: String, giftCardId: Int): Result<GiftCard> = runCatching {
        val response: GiftCardRevokeResponse = api.revokeGiftCard(
            bearerToken = bearerToken,
            giftCardId = giftCardId,
        )
        response.gift_card
    }.mapFailure()

    suspend fun getMyReviews(bearerToken: String, limit: Int = 100): Result<List<UserReview>> =
        runCatching { api.getMyReviews(bearerToken, skip = 0, limit = limit) }.mapFailure()

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
    }.mapFailure()

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
    }.mapFailure()

    suspend fun deleteReview(bearerToken: String, reviewId: Int): Result<Unit> = runCatching {
        api.deleteReview(bearerToken = bearerToken, reviewId = reviewId)
    }.mapFailure()

    suspend fun getFavoritePinsCount(bearerToken: String): Result<CountDTO> =
        runCatching { api.getFavoritePinsCount(bearerToken) }.mapFailure()

    suspend fun getFavoritePins(bearerToken: String, limit: Int = 100): Result<List<com.nailsdash.android.data.model.HomeFeedPin>> =
        runCatching { api.getFavoritePins(bearerToken, skip = 0, limit = limit) }.mapFailure()

    suspend fun getFavoriteStores(bearerToken: String, limit: Int = 100): Result<List<com.nailsdash.android.data.model.Store>> =
        runCatching { api.getFavoriteStores(bearerToken, skip = 0, limit = limit) }.mapFailure()

    suspend fun removeFavoritePin(bearerToken: String, pinId: Int): Result<Unit> = runCatching {
        api.removeFavoritePin(bearerToken = bearerToken, pinId = pinId)
    }.mapFailure()

    suspend fun removeFavoriteStore(bearerToken: String, storeId: Int): Result<Unit> = runCatching {
        api.removeStoreFavorite(bearerToken = bearerToken, storeId = storeId)
    }.mapFailure()

    suspend fun getVipStatus(bearerToken: String): Result<VipStatus> =
        runCatching { api.getVipStatus(bearerToken) }.mapFailure()

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
}
