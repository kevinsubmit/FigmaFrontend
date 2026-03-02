import Foundation

@MainActor
final class StoresViewModel: ObservableObject {
    @Published var stores: [StoreDTO] = []
    @Published var storeImages: [Int: [StoreImageDTO]] = [:]
    @Published var storeRatingSummaries: [Int: StoreRatingSummaryDTO] = [:]
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    private var loadingStoreImageIDs: Set<Int> = []
    private var loadingStoreRatingIDs: Set<Int> = []

    private let service: StoresServiceProtocol

    init(service: StoresServiceProtocol = StoresService()) {
        self.service = service
    }

    func loadStores(sortBy: String, userLat: Double? = nil, userLng: Double? = nil) async {
        isLoading = true
        defer { isLoading = false }

        do {
            stores = try await service.fetchStores(
                limit: 100,
                sortBy: sortBy,
                userLat: userLat,
                userLng: userLng
            )
            let validStoreIDs = Set(stores.map(\.id))
            storeRatingSummaries = storeRatingSummaries.filter { validStoreIDs.contains($0.key) }
            loadingStoreRatingIDs = loadingStoreRatingIDs.filter { validStoreIDs.contains($0) }
            errorMessage = nil
        } catch let error as APIError {
            errorMessage = mapError(error)
        } catch {
            errorMessage = error.localizedDescription
        }
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
}

@MainActor
final class StoreDetailViewModel: ObservableObject {
    @Published var store: StoreDetailDTO?
    @Published var services: [ServiceDTO] = []
    @Published var reviews: [StoreReviewDTO] = []
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
            async let ratingTask: StoreRatingSummaryDTO? = try? service.fetchStoreRating(storeID: storeID)
            async let hoursTask = service.fetchStoreHours(storeID: storeID)
            store = try await detailTask
            services = try await serviceTask.filter { $0.is_active == 1 }
            reviews = (try? await reviewTask) ?? []
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
