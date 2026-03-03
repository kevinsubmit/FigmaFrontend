import Foundation

struct ReviewUploadImagePayload {
    let data: Data
    let fileName: String
    let mimeType: String
}

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
        request.httpBody = buildReviewImagesMultipartBody(boundary: boundary, files: files)

        let (data, response) = try await URLSession.shared.data(for: request)
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
        return try await APIClient.shared.request(
            path: "/reviews/\(reviewID)",
            method: "PUT",
            token: token,
            body: payload
        )
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
