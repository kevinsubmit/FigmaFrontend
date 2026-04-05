import SwiftUI

func mergeUniqueRows<Row: Identifiable>(existing: [Row], newRows: [Row]) -> [Row] where Row.ID: Hashable {
    guard !newRows.isEmpty else { return existing }
    var merged = existing
    var existingIDs = Set(existing.map(\.id))
    for row in newRows where existingIDs.insert(row.id).inserted {
        merged.append(row)
    }
    return merged
}

@MainActor
final class PointsViewModel: ObservableObject {
    @Published var balance: PointsBalanceDTO?
    @Published var transactions: [PointTransactionDTO] = []
    @Published var dailyCheckInStatus: DailyCheckInStatusDTO?
    @Published var exchangeables: [CouponTemplateDTO] = []
    @Published var isRedeemingCouponID: Int?
    @Published var isClaimingDailyCheckIn = false
    @Published var actionMessage: String?
    @Published var isLoading = false
    @Published var isLoadingMoreTransactions = false
    @Published var transactionsHasMore = true
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()
    private var didLoadOnce = false
    private var transactionsRequestToken = 0
    private var transactionsOffset = 0
    private let initialTransactionPageSize = 20
    private let loadMoreTransactionPageSize = 20

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        if force {
            didLoadOnce = true
        }
        transactionsRequestToken += 1
        let currentRequestToken = transactionsRequestToken
        isLoading = true
        defer { isLoading = false }
        do {
            async let b = service.getPointsBalance(token: token)
            async let e = service.getExchangeableCoupons(token: token)
            async let t = service.getPointTransactions(
                token: token,
                skip: 0,
                limit: initialTransactionPageSize
            )
            async let c = service.getDailyCheckInStatus(token: token)
            balance = try await b
            exchangeables = try await e
            dailyCheckInStatus = try await c
            let loadedTransactions = try await t
            guard currentRequestToken == transactionsRequestToken else { return }
            transactions = loadedTransactions
            transactionsOffset = loadedTransactions.count
            transactionsHasMore = loadedTransactions.count == initialTransactionPageSize && !loadedTransactions.isEmpty
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func claimDailyCheckIn(token: String) async -> Bool {
        guard !isClaimingDailyCheckIn else { return false }
        isClaimingDailyCheckIn = true
        defer { isClaimingDailyCheckIn = false }
        do {
            let response = try await service.claimDailyCheckIn(token: token)
            actionMessage = response.awarded_points > 0
                ? "Checked in successfully. +\(response.awarded_points) points."
                : "Already checked in today."
            await load(token: token, force: true)
            return response.awarded_points > 0
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func loadMoreTransactions(token: String) async {
        guard transactionsHasMore, !isLoading, !isLoadingMoreTransactions else { return }
        let currentRequestToken = transactionsRequestToken
        isLoadingMoreTransactions = true
        defer { isLoadingMoreTransactions = false }
        do {
            let rows = try await service.getPointTransactions(
                token: token,
                skip: transactionsOffset,
                limit: loadMoreTransactionPageSize
            )
            guard currentRequestToken == transactionsRequestToken else { return }
            transactions = mergeUniqueRows(existing: transactions, newRows: rows)
            transactionsOffset += rows.count
            transactionsHasMore = rows.count == loadMoreTransactionPageSize && !rows.isEmpty
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == transactionsRequestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == transactionsRequestToken else { return }
            errorMessage = error.localizedDescription
        }
    }

    func exchange(token: String, couponID: Int) async {
        isRedeemingCouponID = couponID
        defer { isRedeemingCouponID = nil }
        do {
            let redeemed = try await service.exchangeCoupon(token: token, couponID: couponID)
            actionMessage = "Exchanged: \(redeemed.coupon.name)"
            await load(token: token, force: true)
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
    @Published var isLoadingMore = false
    @Published var hasMore = true
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()
    private var didLoadOnce = false
    private var requestToken = 0
    private var offset = 0
    private let initialPageSize = 12
    private let loadMorePageSize = 12

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        await loadPage(token: token, reset: true, force: force)
    }

    func loadMore(token: String) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        await loadPage(token: token, reset: false, force: false)
    }

    private func loadPage(token: String, reset: Bool, force: Bool) async {
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
        }

        if force {
            didLoadOnce = true
        }

        let requestedOffset = reset ? 0 : offset
        let pageSize = reset ? initialPageSize : loadMorePageSize

        if reset {
            isLoading = true
        } else {
            isLoadingMore = true
        }
        defer {
            if reset {
                isLoading = false
            } else {
                isLoadingMore = false
            }
        }
        do {
            let rows = try await service.getMyCoupons(
                token: token,
                status: selectedStatus,
                skip: requestedOffset,
                limit: pageSize
            )
            guard currentRequestToken == requestToken else { return }
            coupons = reset ? rows : mergeUniqueRows(existing: coupons, newRows: rows)
            offset = requestedOffset + rows.count
            hasMore = rows.count == pageSize && !rows.isEmpty
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
final class GiftCardsViewModel: ObservableObject {
    @Published var cards: [GiftCardDTO] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var hasMore = true
    @Published var isClaiming = false
    @Published var sendingCardID: Int?
    @Published var revokingCardID: Int?
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()
    private var didLoadOnce = false
    private var requestToken = 0
    private var offset = 0
    private let initialPageSize = 12
    private let loadMorePageSize = 10

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        await loadPage(token: token, reset: true, force: force)
    }

    func loadMore(token: String) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        await loadPage(token: token, reset: false, force: false)
    }

    private func loadPage(token: String, reset: Bool, force: Bool) async {
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
        }

        if force {
            didLoadOnce = true
        }

        let requestedOffset = reset ? 0 : offset
        let pageSize = reset ? initialPageSize : loadMorePageSize

        if reset {
            isLoading = true
        } else {
            isLoadingMore = true
        }
        defer {
            if reset {
                isLoading = false
            } else {
                isLoadingMore = false
            }
        }
        do {
            let rows = try await service.getMyGiftCards(
                token: token,
                skip: requestedOffset,
                limit: pageSize
            )
            guard currentRequestToken == requestToken else { return }
            cards = reset ? rows : mergeUniqueRows(existing: cards, newRows: rows)
            offset = requestedOffset + rows.count
            hasMore = rows.count == pageSize && !rows.isEmpty
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
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
    @Published var isLoadingMore = false
    @Published var hasMore = true
    @Published var errorMessage: String?

    private let appointmentsService: AppointmentsServiceProtocol
    private let rewardsService: ProfileRewardsService
    private var didLoadOnce = false
    private var requestToken = 0
    private var offset = 0
    private let initialPageSize = 20
    private let loadMorePageSize = 20

    init(
        appointmentsService: AppointmentsServiceProtocol = AppointmentsService(),
        rewardsService: ProfileRewardsService = ProfileRewardsService()
    ) {
        self.appointmentsService = appointmentsService
        self.rewardsService = rewardsService
    }

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        await loadPage(token: token, reset: true, force: force)
    }

    func loadMore(token: String) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        await loadPage(token: token, reset: false, force: false)
    }

    private func loadPage(token: String, reset: Bool, force: Bool) async {
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
        }

        if force {
            didLoadOnce = true
        }

        let requestedOffset = reset ? 0 : offset
        let pageSize = reset ? initialPageSize : loadMorePageSize

        if reset {
            isLoading = true
        } else {
            isLoadingMore = true
        }
        defer {
            if reset {
                isLoading = false
            } else {
                isLoadingMore = false
            }
        }
        do {
            let rows = try await appointmentsService.getMyAppointments(
                token: token,
                skip: requestedOffset,
                limit: pageSize
            )
            guard currentRequestToken == requestToken else { return }
            let completedRows = rows.filter { $0.status.lowercased() == "completed" }
            let mergedRows = reset ? completedRows : mergeUniqueRows(existing: items, newRows: completedRows)
            items = mergedRows.sorted { lhs, rhs in
                appointmentDateTime(lhs) > appointmentDateTime(rhs)
            }
            offset = requestedOffset + rows.count
            hasMore = rows.count == pageSize && !rows.isEmpty
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
            errorMessage = error.localizedDescription
        }
    }

    private func appointmentDateTime(_ item: AppointmentDTO) -> Date {
        if let completedAt = parseCompletedDateTime(item.completed_at) {
            return completedAt
        }
        return HomeDateFormatterCache.appointmentDateTime(item)
    }

    private func parseCompletedDateTime(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let isoWithFraction = ISO8601DateFormatter()
        isoWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoWithFraction.date(from: trimmed) {
            return date
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: trimmed) {
            return date
        }

        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss.SSSSSS",
            "yyyy-MM-dd HH:mm:ss.SSS",
            "yyyy-MM-dd HH:mm:ss"
        ]
        for format in formats {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = TimeZone(secondsFromGMT: 0)
            formatter.dateFormat = format
            if let date = formatter.date(from: trimmed) {
                return date
            }
        }
        return nil
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
    @Published var storeNameByID: [Int: String] = [:]
    @Published var deletingReviewID: Int?
    @Published var updatingReviewID: Int?
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var hasMore = true
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()
    private let storesService: StoresServiceProtocol
    private var didLoadOnce = false
    private var requestToken = 0
    private var offset = 0
    private let initialPageSize = 12
    private let loadMorePageSize = 12

    init(storesService: StoresServiceProtocol = StoresService()) {
        self.storesService = storesService
    }

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        await loadPage(token: token, reset: true, force: force)
    }

    func loadMore(token: String) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        await loadPage(token: token, reset: false, force: false)
    }

    private func loadPage(token: String, reset: Bool, force: Bool) async {
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
        }

        if force {
            didLoadOnce = true
        }

        let requestedOffset = reset ? 0 : offset
        let pageSize = reset ? initialPageSize : loadMorePageSize

        if reset {
            isLoading = true
        } else {
            isLoadingMore = true
        }
        defer {
            if reset {
                isLoading = false
            } else {
                isLoadingMore = false
            }
        }
        do {
            let rows = try await service.getMyReviews(
                token: token,
                skip: requestedOffset,
                limit: pageSize
            )
            guard currentRequestToken == requestToken else { return }
            items = reset ? rows : mergeUniqueRows(existing: items, newRows: rows)
            offset = requestedOffset + rows.count
            hasMore = rows.count == pageSize && !rows.isEmpty
            await refreshStoreNameMap()
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
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

    private func refreshStoreNameMap() async {
        var mergedMap: [Int: String] = [:]
        for item in items {
            guard let storeID = item.store_id else { continue }
            guard let rawName = item.store_name else { continue }
            let normalized = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !normalized.isEmpty else { continue }
            mergedMap[storeID] = normalized
        }

        let missingIDs = Set(items.compactMap(\.store_id)).subtracting(mergedMap.keys)
        if !missingIDs.isEmpty {
            let resolved = await resolveStoreNames(for: missingIDs)
            for (id, name) in resolved {
                mergedMap[id] = name
            }
        }

        storeNameByID = mergedMap
    }

    private func resolveStoreNames(for ids: Set<Int>) async -> [Int: String] {
        await withTaskGroup(of: (Int, String?).self, returning: [Int: String].self) { group in
            for id in ids {
                group.addTask { [storesService] in
                    do {
                        let detail = try await storesService.fetchStoreDetail(storeID: id)
                        let normalized = detail.name.trimmingCharacters(in: .whitespacesAndNewlines)
                        return (id, normalized.isEmpty ? nil : normalized)
                    } catch {
                        return (id, nil)
                    }
                }
            }

            var map: [Int: String] = [:]
            for await (id, name) in group {
                guard let name else { continue }
                map[id] = name
            }
            return map
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
    @Published var isLoadingMorePins = false
    @Published var isLoadingMoreStores = false
    @Published var favoritePinsHasMore = true
    @Published var favoriteStoresHasMore = true
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()
    private var didLoadOnce = false
    private var pinsRequestToken = 0
    private var storesRequestToken = 0
    private var favoritePinsOffset = 0
    private var favoriteStoresOffset = 0
    private let initialPinsPageSize = 12
    private let loadMorePinsPageSize = 10
    private let initialStoresPageSize = 8
    private let loadMoreStoresPageSize = 8

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        if force {
            didLoadOnce = true
        }
        pinsRequestToken += 1
        storesRequestToken += 1
        let currentPinsRequestToken = pinsRequestToken
        let currentStoresRequestToken = storesRequestToken
        isLoading = true
        defer { isLoading = false }
        do {
            async let pinsTask = service.getMyFavoritePins(
                token: token,
                skip: 0,
                limit: initialPinsPageSize
            )
            async let storesTask = service.getMyFavoriteStores(
                token: token,
                skip: 0,
                limit: initialStoresPageSize
            )
            let pins = try await pinsTask
            let stores = try await storesTask
            guard currentPinsRequestToken == pinsRequestToken else { return }
            guard currentStoresRequestToken == storesRequestToken else { return }

            favoritePins = pins
            favoritePinsOffset = pins.count
            favoritePinsHasMore = pins.count == initialPinsPageSize && !pins.isEmpty
            favoriteStores = stores
            favoriteStoresOffset = stores.count
            favoriteStoresHasMore = stores.count == initialStoresPageSize && !stores.isEmpty
            favoriteStoreImageURLByID = await resolveFavoriteStoreImageURLs(stores: stores)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadMorePins(token: String) async {
        guard favoritePinsHasMore, !isLoading, !isLoadingMorePins else { return }
        let currentRequestToken = pinsRequestToken
        isLoadingMorePins = true
        defer { isLoadingMorePins = false }
        do {
            let rows = try await service.getMyFavoritePins(
                token: token,
                skip: favoritePinsOffset,
                limit: loadMorePinsPageSize
            )
            guard currentRequestToken == pinsRequestToken else { return }
            favoritePins = mergeUniqueRows(existing: favoritePins, newRows: rows)
            favoritePinsOffset += rows.count
            favoritePinsHasMore = rows.count == loadMorePinsPageSize && !rows.isEmpty
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == pinsRequestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == pinsRequestToken else { return }
            errorMessage = error.localizedDescription
        }
    }

    func loadMoreStores(token: String) async {
        guard favoriteStoresHasMore, !isLoading, !isLoadingMoreStores else { return }
        let currentRequestToken = storesRequestToken
        isLoadingMoreStores = true
        defer { isLoadingMoreStores = false }
        do {
            let rows = try await service.getMyFavoriteStores(
                token: token,
                skip: favoriteStoresOffset,
                limit: loadMoreStoresPageSize
            )
            guard currentRequestToken == storesRequestToken else { return }
            let existingStoreIDs = Set(favoriteStores.map(\.id))
            favoriteStores = mergeUniqueRows(existing: favoriteStores, newRows: rows)
            favoriteStoresOffset += rows.count
            favoriteStoresHasMore = rows.count == loadMoreStoresPageSize && !rows.isEmpty

            let newStores = rows.filter { !existingStoreIDs.contains($0.id) }
            if !newStores.isEmpty {
                let resolvedImages = await resolveFavoriteStoreImageURLs(stores: newStores)
                for (storeID, imageURL) in resolvedImages {
                    favoriteStoreImageURLByID[storeID] = imageURL
                }
            }
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == storesRequestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == storesRequestToken else { return }
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
