import Foundation
struct PointsBalanceDTO: Decodable {
    let user_id: Int
    let total_points: Int
    let available_points: Int
}

struct PointTransactionDTO: Decodable, Identifiable {
    let id: Int
    let amount: Int
    let type: String
    let reason: String
    let description: String?
    let reference_type: String?
    let reference_id: Int?
    let created_at: String
}

struct DailyCheckInStatusDTO: Decodable {
    let checked_in_today: Bool
    let reward_points: Int
    let checkin_date: String
    let checked_in_at: String?
}

struct DailyCheckInClaimResponseDTO: Decodable {
    let checked_in_today: Bool
    let reward_points: Int
    let awarded_points: Int
    let checkin_date: String
    let checked_in_at: String?
    let available_points: Int
    let total_points: Int
}

struct CouponTemplateDTO: Decodable {
    let id: Int
    let name: String
    let description: String?
    let type: String
    let category: String
    let discount_value: Double
    let min_amount: Double
    let max_discount: Double?
    let valid_days: Int
    let is_active: Bool
    let total_quantity: Int?
    let claimed_quantity: Int
    let points_required: Int?
    let created_at: String
}

struct UserCouponDTO: Decodable, Identifiable {
    let id: Int
    let coupon_id: Int
    let status: String
    let source: String?
    let obtained_at: String
    let expires_at: String
    let used_at: String?
    let coupon: CouponTemplateDTO
}

struct GiftCardDTO: Decodable, Identifiable {
    let id: Int
    let user_id: Int
    let purchaser_id: Int
    let card_number: String
    let template_key: String
    let template: GiftCardTemplateDTO
    let recipient_phone: String?
    let recipient_message: String?
    let balance: Double
    let initial_balance: Double
    let status: String
    let expires_at: String?
    let claim_expires_at: String?
    let claimed_by_user_id: Int?
    let claimed_at: String?
    let created_at: String
    let updated_at: String
}

struct GiftCardTemplateDTO: Decodable, Identifiable {
    var id: String { key }
    let key: String
    let name: String
    let description: String
    let icon_key: String
    let accent_start_hex: String
    let accent_end_hex: String
    let background_start_hex: String
    let background_end_hex: String
    let text_hex: String
}

struct GiftCardSummaryDTO: Decodable {
    let total_balance: Double
    let active_count: Int
    let total_count: Int
}

struct GiftCardTemplateListResponseDTO: Decodable {
    let templates: [GiftCardTemplateDTO]
}

struct GiftCardTransferRequestDTO: Encodable {
    let recipient_phone: String
    let message: String?
    let template_key: String?
}

struct GiftCardClaimRequestDTO: Encodable {
    let claim_code: String
}

struct GiftCardPurchaseResponseDTO: Decodable {
    let gift_card: GiftCardDTO
    let sms_sent: Bool
    let claim_expires_at: String?
    let claim_code: String?
}

struct GiftCardClaimResponseDTO: Decodable {
    let gift_card: GiftCardDTO
}

struct GiftCardRevokeResponseDTO: Decodable {
    let gift_card: GiftCardDTO
}

struct GiftCardClaimPreviewDTO: Decodable {
    let gift_card_id: Int
    let amount: Double
    let recipient_phone: String?
    let recipient_message: String?
    let claim_expires_at: String?
    let template_key: String
    let template: GiftCardTemplateDTO
}

struct UserReviewDTO: Decodable, Identifiable {
    let id: Int
    let user_id: Int?
    let store_id: Int?
    let appointment_id: Int?
    let rating: Double?
    let comment: String?
    let images: [String]?
    let created_at: String?
    let updated_at: String?
    let store_name: String?
}

struct ReviewUpsertRequest: Encodable {
    let appointment_id: Int
    let rating: Double
    let comment: String?
    let images: [String]?
}

struct CountDTO: Decodable {
    let count: Int
}

struct VipLevelDTO: Decodable {
    let level: Int
    let min_spend: Double
    let min_visits: Int
    let benefit: String
}

struct VipProgressDTO: Decodable {
    let current: Double
    let required: Double
    let percent: Double
}

struct VipStatusDTO: Decodable {
    let current_level: VipLevelDTO
    let total_spend: Double
    let total_visits: Int
    let spend_progress: VipProgressDTO
    let visits_progress: VipProgressDTO
    let next_level: VipLevelDTO?
}

struct ProfileSummaryDTO: Decodable {
    let unread_count: Int
    let points: Int
    let favorite_count: Int
    let completed_orders: Int
    let vip_status: VipStatusDTO
    let coupon_count: Int
    let gift_balance: Double
    let review_count: Int
}

struct ReferralCodeDTO: Decodable {
    let referral_code: String
}

struct ReferralStatsDTO: Decodable {
    let total_referrals: Int
    let successful_referrals: Int
    let pending_referrals: Int
    let total_rewards_earned: Int
}

struct ReferralListItemDTO: Decodable, Identifiable {
    let id: Int
    let referee_name: String
    let referee_phone: String
    let status: String
    let created_at: String
    let rewarded_at: String?
    let referrer_reward_given: Bool
}
