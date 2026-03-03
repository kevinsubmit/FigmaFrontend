import Foundation
struct ProfileRewardsService {
    func getPointsBalance(token: String) async throws -> PointsBalanceDTO {
        try await APIClient.shared.request(path: "/points/balance", token: token)
    }

    func getPointTransactions(token: String, limit: Int = 50) async throws -> [PointTransactionDTO] {
        try await APIClient.shared.request(path: "/points/transactions?skip=0&limit=\(limit)", token: token)
    }

    func getMyCoupons(token: String, status: String? = nil, limit: Int = 50) async throws -> [UserCouponDTO] {
        let suffix = status.map { "&status=\($0)" } ?? ""
        return try await APIClient.shared.request(path: "/coupons/my-coupons?skip=0&limit=\(limit)\(suffix)", token: token)
    }

    func getMyGiftCards(token: String, limit: Int = 50) async throws -> [GiftCardDTO] {
        try await APIClient.shared.request(path: "/gift-cards/my-cards?skip=0&limit=\(limit)", token: token)
    }

    func transferGiftCard(
        token: String,
        giftCardID: Int,
        recipientPhone: String,
        message: String?
    ) async throws -> GiftCardDTO {
        let trimmedMessage = message?.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = GiftCardTransferRequestDTO(
            recipient_phone: recipientPhone,
            message: (trimmedMessage?.isEmpty ?? true) ? nil : trimmedMessage
        )
        let response: GiftCardPurchaseResponseDTO = try await APIClient.shared.request(
            path: "/gift-cards/\(giftCardID)/transfer",
            method: "POST",
            token: token,
            body: payload
        )
        return response.gift_card
    }

    func claimGiftCard(token: String, claimCode: String) async throws -> GiftCardDTO {
        let payload = GiftCardClaimRequestDTO(claim_code: claimCode)
        let response: GiftCardClaimResponseDTO = try await APIClient.shared.request(
            path: "/gift-cards/claim",
            method: "POST",
            token: token,
            body: payload
        )
        return response.gift_card
    }

    func revokeGiftCard(token: String, giftCardID: Int) async throws -> GiftCardDTO {
        let response: GiftCardRevokeResponseDTO = try await APIClient.shared.request(
            path: "/gift-cards/\(giftCardID)/revoke",
            method: "POST",
            token: token
        )
        return response.gift_card
    }

    func getMyReviews(token: String, limit: Int = 100) async throws -> [UserReviewDTO] {
        try await APIClient.shared.request(path: "/reviews/my-reviews?skip=0&limit=\(limit)", token: token)
    }

    func createReview(
        token: String,
        appointmentID: Int,
        rating: Double,
        comment: String?,
        images: [String]? = nil
    ) async throws -> UserReviewDTO {
        let trimmed = comment?.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = ReviewUpsertRequest(
            appointment_id: appointmentID,
            rating: min(max(rating, 1), 5),
            comment: (trimmed?.isEmpty ?? true) ? nil : trimmed,
            images: images
        )
        return try await APIClient.shared.request(
            path: "/reviews/",
            method: "POST",
            token: token,
            body: payload
        )
    }

    func updateReview(
        token: String,
        reviewID: Int,
        appointmentID: Int,
        rating: Double,
        comment: String?,
        images: [String]?
    ) async throws -> UserReviewDTO {
        let trimmed = comment?.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = ReviewUpsertRequest(
            appointment_id: appointmentID,
            rating: min(max(rating, 1), 5),
            comment: (trimmed?.isEmpty ?? true) ? nil : trimmed,
            images: images
        )
        return try await APIClient.shared.request(
            path: "/reviews/\(reviewID)",
            method: "PUT",
            token: token,
            body: payload
        )
    }

    func deleteReview(token: String, reviewID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/reviews/\(reviewID)", method: "DELETE", token: token)
    }

    func getMyFavoritePinsCount(token: String) async throws -> Int {
        let row: CountDTO = try await APIClient.shared.request(path: "/pins/favorites/count", token: token)
        return row.count
    }

    func getMyFavoritePins(token: String, limit: Int = 100) async throws -> [HomeFeedPinDTO] {
        try await APIClient.shared.request(path: "/pins/favorites/my-favorites?skip=0&limit=\(limit)", token: token)
    }

    func getMyFavoriteStores(token: String, limit: Int = 100) async throws -> [StoreDTO] {
        try await APIClient.shared.request(path: "/stores/favorites/my-favorites?skip=0&limit=\(limit)", token: token)
    }

    func getStoreImages(storeID: Int) async throws -> [StoreImageDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/images")
    }

    func removeFavoritePin(token: String, pinID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/pins/\(pinID)/favorite", method: "DELETE", token: token)
    }

    func removeFavoriteStore(token: String, storeID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/stores/\(storeID)/favorite", method: "DELETE", token: token)
    }

    func getVipStatus(token: String) async throws -> VipStatusDTO {
        try await APIClient.shared.request(path: "/vip/status", token: token)
    }

    func getExchangeableCoupons(token: String) async throws -> [CouponTemplateDTO] {
        try await APIClient.shared.request(path: "/coupons/exchangeable", token: token)
    }

    func exchangeCoupon(token: String, couponID: Int) async throws -> UserCouponDTO {
        try await APIClient.shared.request(path: "/coupons/exchange/\(couponID)", method: "POST", token: token)
    }

    func getReferralCode(token: String) async throws -> ReferralCodeDTO {
        try await APIClient.shared.request(path: "/referrals/my-code", token: token)
    }

    func getReferralStats(token: String) async throws -> ReferralStatsDTO {
        try await APIClient.shared.request(path: "/referrals/stats", token: token)
    }

    func getReferralList(token: String, limit: Int = 100) async throws -> [ReferralListItemDTO] {
        try await APIClient.shared.request(path: "/referrals/list?skip=0&limit=\(limit)", token: token)
    }
}
