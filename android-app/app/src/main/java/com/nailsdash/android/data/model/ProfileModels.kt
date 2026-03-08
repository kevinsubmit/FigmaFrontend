package com.nailsdash.android.data.model

data class PointsBalance(
    val user_id: Int,
    val total_points: Int,
    val available_points: Int,
)

data class PointTransaction(
    val id: Int,
    val amount: Int,
    val type: String,
    val reason: String,
    val description: String? = null,
    val reference_type: String? = null,
    val reference_id: Int? = null,
    val created_at: String,
)

data class CouponTemplate(
    val id: Int,
    val name: String,
    val description: String? = null,
    val type: String,
    val category: String,
    val discount_value: Double,
    val min_amount: Double,
    val max_discount: Double? = null,
    val valid_days: Int,
    val is_active: Boolean,
    val total_quantity: Int? = null,
    val claimed_quantity: Int,
    val points_required: Int? = null,
    val created_at: String,
)

data class UserCoupon(
    val id: Int,
    val coupon_id: Int,
    val status: String,
    val source: String? = null,
    val obtained_at: String,
    val expires_at: String,
    val used_at: String? = null,
    val coupon: CouponTemplate,
)

data class GiftCard(
    val id: Int,
    val user_id: Int,
    val purchaser_id: Int,
    val card_number: String,
    val recipient_phone: String? = null,
    val recipient_message: String? = null,
    val balance: Double,
    val initial_balance: Double,
    val status: String,
    val expires_at: String? = null,
    val claim_expires_at: String? = null,
    val claimed_by_user_id: Int? = null,
    val claimed_at: String? = null,
    val created_at: String,
    val updated_at: String,
)

data class GiftCardTransferRequest(
    val recipient_phone: String,
    val message: String? = null,
)

data class GiftCardClaimRequest(
    val claim_code: String,
)

data class GiftCardPurchaseResponse(
    val gift_card: GiftCard,
    val sms_sent: Boolean,
    val claim_expires_at: String? = null,
    val claim_code: String? = null,
)

data class GiftCardClaimResponse(
    val gift_card: GiftCard,
)

data class GiftCardRevokeResponse(
    val gift_card: GiftCard,
)

data class UserReview(
    val id: Int,
    val user_id: Int? = null,
    val store_id: Int? = null,
    val appointment_id: Int? = null,
    val rating: Double? = null,
    val comment: String? = null,
    val images: List<String>? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
    val store_name: String? = null,
)

data class ReviewUpsertRequest(
    val appointment_id: Int,
    val rating: Double,
    val comment: String? = null,
    val images: List<String>? = null,
)

data class CountDTO(
    val count: Int,
)

data class VipLevel(
    val level: Int,
    val min_spend: Double,
    val min_visits: Int,
    val benefit: String,
)

data class VipProgress(
    val current: Double,
    val required: Double,
    val percent: Double,
)

data class VipStatus(
    val current_level: VipLevel,
    val total_spend: Double,
    val total_visits: Int,
    val spend_progress: VipProgress,
    val visits_progress: VipProgress,
    val next_level: VipLevel? = null,
)

data class ReferralCode(
    val referral_code: String,
)

data class ReferralStats(
    val total_referrals: Int,
    val successful_referrals: Int,
    val pending_referrals: Int,
    val total_rewards_earned: Int,
)

data class ReferralListItem(
    val id: Int,
    val referee_name: String,
    val referee_phone: String,
    val status: String,
    val created_at: String,
    val rewarded_at: String? = null,
    val referrer_reward_given: Boolean,
)

data class UnreadCount(
    val unread_count: Int,
)
