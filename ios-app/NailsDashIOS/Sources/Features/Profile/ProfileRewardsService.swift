import Foundation

struct ReviewUploadImagePayload {
    let data: Data
    let fileName: String
    let mimeType: String
}

struct ProfileRewardsService {
    private struct UnreadCountDTO: Decodable {
        let unread_count: Int
    }

    private enum CacheTTL {
        static let unreadCount: TimeInterval = 20
        static let pointsBalance: TimeInterval = 30
        static let pointTransactions: TimeInterval = 30
        static let dailyCheckIn: TimeInterval = 15
        static let coupons: TimeInterval = 30
        static let giftCards: TimeInterval = 30
        static let giftCardSummary: TimeInterval = 30
        static let reviews: TimeInterval = 30
        static let favoriteCounts: TimeInterval = 30
        static let favorites: TimeInterval = 30
        static let storeImages: TimeInterval = 180
        static let vipStatus: TimeInterval = 60
        static let exchangeableCoupons: TimeInterval = 60
        static let referral: TimeInterval = 60
    }

    private static let unreadCountCache = TimedAsyncRequestCache<String, Int>()
    private static let pointsBalanceCache = TimedAsyncRequestCache<String, PointsBalanceDTO>()
    private static let pointTransactionsCache = TimedAsyncRequestCache<String, [PointTransactionDTO]>()
    private static let dailyCheckInStatusCache = TimedAsyncRequestCache<String, DailyCheckInStatusDTO>()
    private static let couponsCache = TimedAsyncRequestCache<String, [UserCouponDTO]>()
    private static let giftCardsCache = TimedAsyncRequestCache<String, [GiftCardDTO]>()
    private static let giftCardSummaryCache = TimedAsyncRequestCache<String, GiftCardSummaryDTO>()
    private static let reviewsCache = TimedAsyncRequestCache<String, [UserReviewDTO]>()
    private static let favoritePinsCountCache = TimedAsyncRequestCache<String, Int>()
    private static let favoritePinsCache = TimedAsyncRequestCache<String, [HomeFeedPinDTO]>()
    private static let favoriteStoresCache = TimedAsyncRequestCache<String, [StoreDTO]>()
    private static let storeImagesCache = TimedAsyncRequestCache<Int, [StoreImageDTO]>()
    private static let vipStatusCache = TimedAsyncRequestCache<String, VipStatusDTO>()
    private static let exchangeableCouponsCache = TimedAsyncRequestCache<String, [CouponTemplateDTO]>()
    private static let referralCodeCache = TimedAsyncRequestCache<String, ReferralCodeDTO>()
    private static let referralStatsCache = TimedAsyncRequestCache<String, ReferralStatsDTO>()
    private static let referralListCache = TimedAsyncRequestCache<String, [ReferralListItemDTO]>()

    func getUnreadCount(token: String) async throws -> Int {
        try await Self.unreadCountCache.value(for: token, ttl: CacheTTL.unreadCount) {
            let payload: UnreadCountDTO = try await APIClient.shared.request(
                path: "/notifications/stats/unread-count",
                token: token
            )
            return payload.unread_count
        }
    }

    func getPointsBalance(token: String) async throws -> PointsBalanceDTO {
        try await Self.pointsBalanceCache.value(for: token, ttl: CacheTTL.pointsBalance) {
            try await APIClient.shared.request(path: "/points/balance", token: token)
        }
    }

    func getPointTransactions(token: String, skip: Int = 0, limit: Int = 50) async throws -> [PointTransactionDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/points/transactions?skip=\(skip)&limit=\(limit)"
        return try await Self.pointTransactionsCache.value(for: cacheKey, ttl: CacheTTL.pointTransactions) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getDailyCheckInStatus(token: String) async throws -> DailyCheckInStatusDTO {
        try await Self.dailyCheckInStatusCache.value(for: token, ttl: CacheTTL.dailyCheckIn) {
            try await APIClient.shared.request(path: "/points/daily-checkin/status", token: token)
        }
    }

    func claimDailyCheckIn(token: String) async throws -> DailyCheckInClaimResponseDTO {
        let response: DailyCheckInClaimResponseDTO = try await APIClient.shared.request(
            path: "/points/daily-checkin",
            method: "POST",
            token: token
        )
        Self.invalidatePoints(for: token)
        Self.dailyCheckInStatusCache.removeValue(for: token)
        return response
    }

    func getMyCoupons(token: String, status: String? = nil, skip: Int = 0, limit: Int = 50) async throws -> [UserCouponDTO] {
        let suffix = status.map { "&status=\($0)" } ?? ""
        let cacheKey = "\(token)|\(status ?? "all")|\(skip)|\(limit)"
        let path = "/coupons/my-coupons?skip=\(skip)&limit=\(limit)\(suffix)"
        return try await Self.couponsCache.value(for: cacheKey, ttl: CacheTTL.coupons) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getMyGiftCards(token: String, skip: Int = 0, limit: Int = 50) async throws -> [GiftCardDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/gift-cards/my-cards?skip=\(skip)&limit=\(limit)"
        return try await Self.giftCardsCache.value(for: cacheKey, ttl: CacheTTL.giftCards) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getGiftCardSummary(token: String) async throws -> GiftCardSummaryDTO {
        try await Self.giftCardSummaryCache.value(for: token, ttl: CacheTTL.giftCardSummary) {
            try await APIClient.shared.request(path: "/gift-cards/summary", token: token)
        }
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
        Self.invalidateGiftCards(for: token)
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
        Self.invalidateGiftCards(for: token)
        return response.gift_card
    }

    func revokeGiftCard(token: String, giftCardID: Int) async throws -> GiftCardDTO {
        let response: GiftCardRevokeResponseDTO = try await APIClient.shared.request(
            path: "/gift-cards/\(giftCardID)/revoke",
            method: "POST",
            token: token
        )
        Self.invalidateGiftCards(for: token)
        return response.gift_card
    }

    func getMyReviews(token: String, skip: Int = 0, limit: Int = 100) async throws -> [UserReviewDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/reviews/my-reviews?skip=\(skip)&limit=\(limit)"
        return try await Self.reviewsCache.value(for: cacheKey, ttl: CacheTTL.reviews) {
            try await APIClient.shared.request(path: path, token: token)
        }
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
        let created: UserReviewDTO = try await APIClient.shared.request(
            path: "/reviews/",
            method: "POST",
            token: token,
            body: payload
        )
        Self.invalidateReviews(for: token)
        return created
    }

    func uploadReviewImages(
        token: String,
        files: [ReviewUploadImagePayload]
    ) async throws -> [String] {
        guard !files.isEmpty else { return [] }
        guard let url = URL(string: APIClient.shared.baseURL + "/upload/images") else {
            throw APIError.invalidURL
        }

        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        request.httpBody = buildReviewImagesMultipartBody(boundary: boundary, files: files)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorTimedOut {
                throw APIError.network("Request timed out. Please try again.")
            }
            throw APIError.network("Network error. Please check your connection and try again.")
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        switch http.statusCode {
        case 200 ... 299:
            do {
                return try JSONDecoder().decode([String].self, from: data)
            } catch {
                throw APIError.decoding
            }
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden(extractUploadErrorMessage(from: data, fallback: "You do not have permission to upload images."))
        case 400, 413, 422:
            throw APIError.validation(extractUploadErrorMessage(from: data, fallback: "Please upload valid images (jpg/png, max 5MB each, up to 5 files)."))
        default:
            throw APIError.server(extractUploadErrorMessage(from: data, fallback: "Failed to upload images. Please try again."))
        }
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
        let updated: UserReviewDTO = try await APIClient.shared.request(
            path: "/reviews/\(reviewID)",
            method: "PUT",
            token: token,
            body: payload
        )
        Self.invalidateReviews(for: token)
        return updated
    }

    private func buildReviewImagesMultipartBody(
        boundary: String,
        files: [ReviewUploadImagePayload]
    ) -> Data {
        var body = Data()
        for file in files {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"files\"; filename=\"\(file.fileName)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: \(file.mimeType)\r\n\r\n".data(using: .utf8)!)
            body.append(file.data)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }

    private func extractUploadErrorMessage(from data: Data, fallback: String) -> String {
        guard !data.isEmpty else { return fallback }
        if let object = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]),
           let dict = object as? [String: Any],
           let detail = dict["detail"]
        {
            if let text = detail as? String, !text.isEmpty {
                return text
            }
            if let list = detail as? [Any] {
                for item in list {
                    if let text = item as? String, !text.isEmpty {
                        return text
                    }
                    if let row = item as? [String: Any],
                       let msg = row["msg"] as? String,
                       !msg.isEmpty
                    {
                        return msg
                    }
                }
            }
        }
        return fallback
    }

    func deleteReview(token: String, reviewID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/reviews/\(reviewID)", method: "DELETE", token: token)
        Self.invalidateReviews(for: token)
    }

    func getMyFavoritePinsCount(token: String) async throws -> Int {
        return try await Self.favoritePinsCountCache.value(for: token, ttl: CacheTTL.favoriteCounts) {
            let row: CountDTO = try await APIClient.shared.request(path: "/pins/favorites/count", token: token)
            return row.count
        }
    }

    func getMyFavoritePins(token: String, skip: Int = 0, limit: Int = 100) async throws -> [HomeFeedPinDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/pins/favorites/my-favorites?skip=\(skip)&limit=\(limit)"
        return try await Self.favoritePinsCache.value(for: cacheKey, ttl: CacheTTL.favorites) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getMyFavoriteStores(token: String, skip: Int = 0, limit: Int = 100) async throws -> [StoreDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/stores/favorites/my-favorites?skip=\(skip)&limit=\(limit)"
        return try await Self.favoriteStoresCache.value(for: cacheKey, ttl: CacheTTL.favorites) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getStoreImages(storeID: Int) async throws -> [StoreImageDTO] {
        try await Self.storeImagesCache.value(for: storeID, ttl: CacheTTL.storeImages) {
            try await APIClient.shared.request(path: "/stores/\(storeID)/images")
        }
    }

    func removeFavoritePin(token: String, pinID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/pins/\(pinID)/favorite", method: "DELETE", token: token)
        Self.invalidateFavoritePins(for: token)
    }

    func removeFavoriteStore(token: String, storeID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/stores/\(storeID)/favorite", method: "DELETE", token: token)
        Self.invalidateFavoriteStores(for: token)
    }

    func getVipStatus(token: String) async throws -> VipStatusDTO {
        try await Self.vipStatusCache.value(for: token, ttl: CacheTTL.vipStatus) {
            try await APIClient.shared.request(path: "/vip/status", token: token)
        }
    }

    func getExchangeableCoupons(token: String) async throws -> [CouponTemplateDTO] {
        try await Self.exchangeableCouponsCache.value(for: token, ttl: CacheTTL.exchangeableCoupons) {
            try await APIClient.shared.request(path: "/coupons/exchangeable", token: token)
        }
    }

    func exchangeCoupon(token: String, couponID: Int) async throws -> UserCouponDTO {
        let redeemed: UserCouponDTO = try await APIClient.shared.request(
            path: "/coupons/exchange/\(couponID)",
            method: "POST",
            token: token
        )
        Self.invalidatePointsAndCoupons(for: token)
        return redeemed
    }

    func getReferralCode(token: String) async throws -> ReferralCodeDTO {
        try await Self.referralCodeCache.value(for: token, ttl: CacheTTL.referral) {
            try await APIClient.shared.request(path: "/referrals/my-code", token: token)
        }
    }

    func getReferralStats(token: String) async throws -> ReferralStatsDTO {
        try await Self.referralStatsCache.value(for: token, ttl: CacheTTL.referral) {
            try await APIClient.shared.request(path: "/referrals/stats", token: token)
        }
    }

    func getReferralList(token: String, skip: Int = 0, limit: Int = 100) async throws -> [ReferralListItemDTO] {
        let cacheKey = "\(token)|\(skip)|\(limit)"
        let path = "/referrals/list?skip=\(skip)&limit=\(limit)"
        return try await Self.referralListCache.value(for: cacheKey, ttl: CacheTTL.referral) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    private static func invalidateGiftCards(for token: String) {
        giftCardSummaryCache.removeValue(for: token)
        giftCardsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
    }

    private static func invalidateReviews(for token: String) {
        reviewsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
    }

    private static func invalidateFavoritePins(for token: String) {
        favoritePinsCountCache.removeValue(for: token)
        favoritePinsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
    }

    private static func invalidateFavoriteStores(for token: String) {
        favoriteStoresCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
    }

    private static func invalidatePointsAndCoupons(for token: String) {
        invalidatePoints(for: token)
        couponsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
        exchangeableCouponsCache.removeValue(for: token)
    }

    private static func invalidatePoints(for token: String) {
        pointsBalanceCache.removeValue(for: token)
        dailyCheckInStatusCache.removeValue(for: token)
        pointTransactionsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
    }
}
