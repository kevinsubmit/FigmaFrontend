import SwiftUI
@MainActor
final class PointsViewModel: ObservableObject {
    @Published var balance: PointsBalanceDTO?
    @Published var transactions: [PointTransactionDTO] = []
    @Published var exchangeables: [CouponTemplateDTO] = []
    @Published var isRedeemingCouponID: Int?
    @Published var actionMessage: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let b = service.getPointsBalance(token: token)
            async let t = service.getPointTransactions(token: token, limit: 50)
            async let e = service.getExchangeableCoupons(token: token)
            balance = try await b
            transactions = try await t
            exchangeables = try await e
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func exchange(token: String, couponID: Int) async {
        isRedeemingCouponID = couponID
        defer { isRedeemingCouponID = nil }
        do {
            let redeemed = try await service.exchangeCoupon(token: token, couponID: couponID)
            actionMessage = "Exchanged: \(redeemed.coupon.name)"
            await load(token: token)
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
final class CouponsViewModel: ObservableObject {
    @Published var selectedStatus: String = "available"
    @Published var coupons: [UserCouponDTO] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            coupons = try await service.getMyCoupons(token: token, status: selectedStatus, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
final class GiftCardsViewModel: ObservableObject {
    @Published var cards: [GiftCardDTO] = []
    @Published var isLoading = false
    @Published var isClaiming = false
    @Published var sendingCardID: Int?
    @Published var revokingCardID: Int?
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            cards = try await service.getMyGiftCards(token: token, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func transfer(
        token: String,
        giftCardID: Int,
        recipientPhone: String,
        message: String?
    ) async -> Bool {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(recipientPhone)
        guard normalizedPhone.count == 11 else {
            errorMessage = "Please enter a valid US phone number."
            return false
        }

        sendingCardID = giftCardID
        defer { sendingCardID = nil }
        do {
            let updated = try await service.transferGiftCard(
                token: token,
                giftCardID: giftCardID,
                recipientPhone: normalizedPhone,
                message: message
            )
            upsert(updated)
            actionMessage = "Gift sent successfully."
            errorMessage = nil
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func claim(token: String, claimCode: String) async -> Bool {
        let normalizedCode = claimCode
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .uppercased()
        guard !normalizedCode.isEmpty else {
            errorMessage = "Please enter a claim code."
            return false
        }

        isClaiming = true
        defer { isClaiming = false }
        do {
            let claimed = try await service.claimGiftCard(token: token, claimCode: normalizedCode)
            upsert(claimed)
            actionMessage = "Gift card claimed."
            errorMessage = nil
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func revoke(token: String, giftCardID: Int) async -> Bool {
        revokingCardID = giftCardID
        defer { revokingCardID = nil }
        do {
            let updated = try await service.revokeGiftCard(token: token, giftCardID: giftCardID)
            upsert(updated)
            actionMessage = "Transfer canceled."
            errorMessage = nil
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func upsert(_ card: GiftCardDTO) {
        if let idx = cards.firstIndex(where: { $0.id == card.id }) {
            cards[idx] = card
        } else {
            cards.insert(card, at: 0)
        }
    }
}

@MainActor
final class OrderHistoryViewModel: ObservableObject {
    @Published var items: [AppointmentDTO] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let appointmentsService: AppointmentsServiceProtocol
    private let rewardsService: ProfileRewardsService

    init(
        appointmentsService: AppointmentsServiceProtocol = AppointmentsService(),
        rewardsService: ProfileRewardsService = ProfileRewardsService()
    ) {
        self.appointmentsService = appointmentsService
        self.rewardsService = rewardsService
    }

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let rows = try await appointmentsService.getMyAppointments(token: token, limit: 100)
            items = rows
                .filter { $0.status.lowercased() == "completed" }
                .sorted { lhs, rhs in
                    appointmentDateTime(lhs) > appointmentDateTime(rhs)
                }
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func appointmentDateTime(_ item: AppointmentDTO) -> Date {
        HomeDateFormatterCache.appointmentDateTime(item)
    }

    func createReview(
        token: String,
        appointmentID: Int,
        rating: Double,
        comment: String?,
        images: [String]? = nil
    ) async throws -> UserReviewDTO {
        try await rewardsService.createReview(
            token: token,
            appointmentID: appointmentID,
            rating: rating,
            comment: comment,
            images: images
        )
    }

    func uploadReviewImages(
        token: String,
        files: [ReviewUploadImagePayload]
    ) async throws -> [String] {
        try await rewardsService.uploadReviewImages(token: token, files: files)
    }
}

@MainActor
final class MyReviewsViewModel: ObservableObject {
    @Published var items: [UserReviewDTO] = []
    @Published var deletingReviewID: Int?
    @Published var updatingReviewID: Int?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            items = try await service.getMyReviews(token: token, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateReview(
        token: String,
        reviewID: Int,
        appointmentID: Int,
        rating: Double,
        comment: String?,
        images: [String]?
    ) async {
        updatingReviewID = reviewID
        defer { updatingReviewID = nil }
        do {
            let updated = try await service.updateReview(
                token: token,
                reviewID: reviewID,
                appointmentID: appointmentID,
                rating: rating,
                comment: comment,
                images: images
            )
            if let index = items.firstIndex(where: { $0.id == reviewID }) {
                items[index] = updated
            }
            actionMessage = "Review updated."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteReview(token: String, reviewID: Int) async {
        deletingReviewID = reviewID
        defer { deletingReviewID = nil }
        do {
            try await service.deleteReview(token: token, reviewID: reviewID)
            items.removeAll { $0.id == reviewID }
            actionMessage = "Review deleted."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
final class MyFavoritesViewModel: ObservableObject {
    @Published var favoritePins: [HomeFeedPinDTO] = []
    @Published var favoriteStores: [StoreDTO] = []
    @Published var favoriteStoreImageURLByID: [Int: String] = [:]
    @Published var deletingPinID: Int?
    @Published var deletingStoreID: Int?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let pinsTask = service.getMyFavoritePins(token: token, limit: 100)
            async let storesTask = service.getMyFavoriteStores(token: token, limit: 100)
            favoritePins = try await pinsTask
            let stores = try await storesTask
            favoriteStores = stores
            favoriteStoreImageURLByID = await resolveFavoriteStoreImageURLs(stores: stores)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removePin(token: String, pinID: Int) async {
        deletingPinID = pinID
        defer { deletingPinID = nil }
        do {
            try await service.removeFavoritePin(token: token, pinID: pinID)
            favoritePins.removeAll { $0.id == pinID }
            actionMessage = "Removed from favorites."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeStore(token: String, storeID: Int) async {
        deletingStoreID = storeID
        defer { deletingStoreID = nil }
        do {
            try await service.removeFavoriteStore(token: token, storeID: storeID)
            favoriteStores.removeAll { $0.id == storeID }
            favoriteStoreImageURLByID.removeValue(forKey: storeID)
            actionMessage = "Removed from favorites."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func resolveFavoriteStoreImageURLs(stores: [StoreDTO]) async -> [Int: String] {
        if stores.isEmpty {
            return [:]
        }

        return await withTaskGroup(of: (Int, String?).self, returning: [Int: String].self) { group in
            for store in stores {
                group.addTask { [service] in
                    do {
                        let images = try await service.getStoreImages(storeID: store.id)
                        let preferred = Self.pickPrimaryStoreImageURL(from: images)
                        return (store.id, preferred)
                    } catch {
                        return (store.id, nil)
                    }
                }
            }

            var resolved: [Int: String] = [:]
            for await (storeID, imageURL) in group {
                guard let imageURL,
                      !imageURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    continue
                }
                resolved[storeID] = imageURL
            }
            return resolved
        }
    }

    nonisolated private static func pickPrimaryStoreImageURL(from images: [StoreImageDTO]) -> String? {
        guard !images.isEmpty else { return nil }

        let sorted = images.sorted { lhs, rhs in
            let lhsPrimary = lhs.is_primary ?? 0
            let rhsPrimary = rhs.is_primary ?? 0
            if lhsPrimary != rhsPrimary { return lhsPrimary > rhsPrimary }

            let lhsOrder = lhs.display_order ?? Int.max
            let rhsOrder = rhs.display_order ?? Int.max
            if lhsOrder != rhsOrder { return lhsOrder < rhsOrder }

            return lhs.id < rhs.id
        }

        return sorted.first?.image_url
    }
}
