import Foundation

@MainActor
final class StoresViewModel: ObservableObject {
    @Published var stores: [StoreDTO] = []
    @Published var storeImages: [Int: [StoreImageDTO]] = [:]
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    private var loadingStoreImageIDs: Set<Int> = []

    private let service: StoresServiceProtocol

    init(service: StoresServiceProtocol = StoresService()) {
        self.service = service
    }

    func loadStores() async {
        isLoading = true
        defer { isLoading = false }

        do {
            stores = try await service.fetchStores(limit: 100)
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
            async let hoursTask = service.fetchStoreHours(storeID: storeID)
            store = try await detailTask
            services = try await serviceTask.filter { $0.is_active == 1 }
            reviews = (try? await reviewTask) ?? []
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
