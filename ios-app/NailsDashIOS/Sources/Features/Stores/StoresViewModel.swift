import Foundation

@MainActor
final class StoresViewModel: ObservableObject {
    @Published var stores: [StoreDTO] = []
    @Published var storeImages: [Int: [StoreImageDTO]] = [:]
    @Published var storeRatingSummaries: [Int: StoreRatingSummaryDTO] = [:]
    @Published var isLoading: Bool = false
    @Published var isLoadingMore: Bool = false
    @Published var hasMore: Bool = true
    @Published var errorMessage: String? = nil
    private var loadingStoreImageIDs: Set<Int> = []
    private var loadingStoreRatingIDs: Set<Int> = []
    private var lastLoadedKey: String?
    private var requestToken: Int = 0
    private var offset: Int = 0

    private let initialPageSize = 10
    private let loadMorePageSize = 8

    private let service: StoresServiceProtocol

    init(service: StoresServiceProtocol = StoresService()) {
        self.service = service
    }

    func loadStoresIfNeeded(sortBy: String, userLat: Double? = nil, userLng: Double? = nil) async {
        let key = requestKey(sortBy: sortBy, userLat: userLat, userLng: userLng)
        guard lastLoadedKey != key || stores.isEmpty else { return }
        await loadStores(sortBy: sortBy, userLat: userLat, userLng: userLng, force: false)
    }

    func loadStores(sortBy: String, userLat: Double? = nil, userLng: Double? = nil, force: Bool) async {
        await loadStoresPage(
            sortBy: sortBy,
            userLat: userLat,
            userLng: userLng,
            reset: true,
            force: force
        )
    }

    func loadMore(sortBy: String, userLat: Double? = nil, userLng: Double? = nil) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        let key = requestKey(sortBy: sortBy, userLat: userLat, userLng: userLng)
        guard lastLoadedKey == key else { return }
        await loadStoresPage(
            sortBy: sortBy,
            userLat: userLat,
            userLng: userLng,
            reset: false,
            force: false
        )
    }

    func loadStoreImagesIfNeeded(storeID: Int) async {
        if storeImages[storeID] != nil || loadingStoreImageIDs.contains(storeID) {
            return
        }

        loadingStoreImageIDs.insert(storeID)
        defer { loadingStoreImageIDs.remove(storeID) }

        do {
            let rows = try await service.fetchStoreImages(storeID: storeID)
            let sortedRows = rows.sorted { lhs, rhs in
                let leftOrder = lhs.display_order ?? Int.max
                let rightOrder = rhs.display_order ?? Int.max
                if leftOrder == rightOrder {
                    return lhs.id < rhs.id
                }
                return leftOrder < rightOrder
            }
            storeImages[storeID] = sortedRows
        } catch {
            // Keep list page stable even if one store's images fail to load.
            storeImages[storeID] = []
        }
    }

    func loadStoreRatingIfNeeded(storeID: Int) async {
        if storeRatingSummaries[storeID] != nil || loadingStoreRatingIDs.contains(storeID) {
            return
        }

        loadingStoreRatingIDs.insert(storeID)
        defer { loadingStoreRatingIDs.remove(storeID) }

        do {
            let summary = try await service.fetchStoreRating(storeID: storeID)
            storeRatingSummaries[storeID] = summary
        } catch {
            // Keep list stable and fall back to list endpoint values.
        }
    }

    func displayRating(for store: StoreDTO) -> Double {
        storeRatingSummaries[store.id]?.average_rating ?? store.rating
    }

    func displayReviewCount(for store: StoreDTO) -> Int {
        storeRatingSummaries[store.id]?.total_reviews ?? store.review_count
    }

    private func loadStoresPage(
        sortBy: String,
        userLat: Double?,
        userLng: Double?,
        reset: Bool,
        force: Bool
    ) async {
        let key = requestKey(sortBy: sortBy, userLat: userLat, userLng: userLng)
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
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
            let loadedStores = try await service.fetchStores(
                skip: requestedOffset,
                limit: pageSize,
                sortBy: sortBy,
                userLat: userLat,
                userLng: userLng
            )
            guard currentRequestToken == requestToken else { return }

            if reset {
                stores = loadedStores
            } else {
                stores = mergeStores(existing: stores, newRows: loadedStores)
            }

            offset = requestedOffset + loadedStores.count
            hasMore = loadedStores.count == pageSize && !loadedStores.isEmpty
            lastLoadedKey = key

            let validStoreIDs = Set(stores.map(\.id))
            storeImages = storeImages.filter { validStoreIDs.contains($0.key) }
            loadingStoreImageIDs = loadingStoreImageIDs.filter { validStoreIDs.contains($0) }
            storeRatingSummaries = storeRatingSummaries.filter { validStoreIDs.contains($0.key) }
            loadingStoreRatingIDs = loadingStoreRatingIDs.filter { validStoreIDs.contains($0) }
            errorMessage = nil
        } catch let error as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(error)
        } catch {
            guard currentRequestToken == requestToken else { return }
            errorMessage = error.localizedDescription
        }
    }

    private func mergeStores(existing: [StoreDTO], newRows: [StoreDTO]) -> [StoreDTO] {
        guard !newRows.isEmpty else { return existing }
        var merged = existing
        var existingIDs = Set(existing.map(\.id))
        for row in newRows where existingIDs.insert(row.id).inserted {
            merged.append(row)
        }
        return merged
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .invalidURL:
            return "Invalid API URL"
        case .decoding:
            return "Failed to parse stores response"
        }
    }

    private func requestKey(sortBy: String, userLat: Double?, userLng: Double?) -> String {
        let lat = userLat.map { String(format: "%.5f", $0) } ?? "none"
        let lng = userLng.map { String(format: "%.5f", $0) } ?? "none"
        return "\(sortBy)|\(lat)|\(lng)"
    }
}

@MainActor
final class StoreDetailViewModel: ObservableObject {
    @Published var store: StoreDetailDTO?
    @Published var services: [ServiceDTO] = []
    @Published var reviews: [StoreReviewDTO] = []
    @Published var portfolioItems: [StorePortfolioDTO] = []
    @Published var ratingSummary: StoreRatingSummaryDTO?
    @Published var storeHours: [StoreHourDTO] = []
    @Published var isFavorited: Bool = false
    @Published var isFavoriteLoading: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    private let service: StoresServiceProtocol

    init(service: StoresServiceProtocol = StoresService()) {
        self.service = service
    }

    func loadStore(storeID: Int) async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let detailTask = service.fetchStoreDetail(storeID: storeID)
            async let serviceTask = service.fetchStoreServices(storeID: storeID)
            async let reviewTask = service.fetchStoreReviews(storeID: storeID, skip: 0, limit: 20)
            async let portfolioTask = service.fetchStorePortfolio(storeID: storeID, skip: 0, limit: 100)
            async let ratingTask: StoreRatingSummaryDTO? = try? service.fetchStoreRating(storeID: storeID)
            async let hoursTask = service.fetchStoreHours(storeID: storeID)
            store = try await detailTask
            services = try await serviceTask.filter { $0.is_active == 1 }
            reviews = (try? await reviewTask) ?? []
            portfolioItems = (try? await portfolioTask) ?? []
            ratingSummary = await ratingTask
            storeHours = (try? await hoursTask) ?? []
            errorMessage = nil
        } catch let error as APIError {
            errorMessage = mapError(error)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadFavoriteState(storeID: Int, token: String?) async {
        guard let token else {
            isFavorited = false
            return
        }
        do {
            isFavorited = try await service.checkFavorite(storeID: storeID, token: token)
        } catch {
            isFavorited = false
        }
    }

    func toggleFavorite(storeID: Int, token: String) async {
        isFavoriteLoading = true
        defer { isFavoriteLoading = false }
        do {
            try await service.setFavorite(storeID: storeID, token: token, favorited: !isFavorited)
            isFavorited.toggle()
            errorMessage = nil
        } catch let error as APIError {
            errorMessage = mapError(error)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .invalidURL:
            return "Invalid API endpoint."
        case .decoding:
            return "Failed to parse store detail response."
        }
    }
}
