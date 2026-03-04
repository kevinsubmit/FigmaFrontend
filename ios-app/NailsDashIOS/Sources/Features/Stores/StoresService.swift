import Foundation

protocol StoresServiceProtocol {
    func fetchStores(limit: Int, sortBy: String?, userLat: Double?, userLng: Double?) async throws -> [StoreDTO]
    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO
    func fetchStoreImages(storeID: Int) async throws -> [StoreImageDTO]
    func fetchStorePortfolio(storeID: Int, skip: Int, limit: Int) async throws -> [StorePortfolioDTO]
    func fetchStoreServices(storeID: Int) async throws -> [ServiceDTO]
    func fetchStoreReviews(storeID: Int, skip: Int, limit: Int) async throws -> [StoreReviewDTO]
    func fetchStoreRating(storeID: Int) async throws -> StoreRatingSummaryDTO
    func fetchStoreHours(storeID: Int) async throws -> [StoreHourDTO]
    func checkFavorite(storeID: Int, token: String) async throws -> Bool
    func setFavorite(storeID: Int, token: String, favorited: Bool) async throws
}

struct StoresService: StoresServiceProtocol {
    private struct FavoriteStateDTO: Decodable {
        let is_favorited: Bool
    }

    func fetchStores(limit: Int = 100, sortBy: String? = nil, userLat: Double? = nil, userLng: Double? = nil) async throws -> [StoreDTO] {
        var params = ["skip=0", "limit=\(limit)"]
        if let sortBy, !sortBy.isEmpty {
            params.append("sort_by=\(sortBy)")
        }
        if let userLat {
            params.append("user_lat=\(userLat)")
        }
        if let userLng {
            params.append("user_lng=\(userLng)")
        }
        let query = params.joined(separator: "&")
        return try await APIClient.shared.request(path: "/stores?\(query)")
    }

    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        try await APIClient.shared.request(path: "/stores/\(storeID)")
    }

    func fetchStoreImages(storeID: Int) async throws -> [StoreImageDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/images")
    }

    func fetchStorePortfolio(storeID: Int, skip: Int = 0, limit: Int = 50) async throws -> [StorePortfolioDTO] {
        try await APIClient.shared.request(path: "/stores/portfolio/\(storeID)?skip=\(skip)&limit=\(limit)")
    }

    func fetchStoreServices(storeID: Int) async throws -> [ServiceDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/services")
    }

    func fetchStoreReviews(storeID: Int, skip: Int = 0, limit: Int = 20) async throws -> [StoreReviewDTO] {
        try await APIClient.shared.request(path: "/reviews/stores/\(storeID)?skip=\(skip)&limit=\(limit)")
    }

    func fetchStoreRating(storeID: Int) async throws -> StoreRatingSummaryDTO {
        try await APIClient.shared.request(path: "/reviews/stores/\(storeID)/rating")
    }

    func fetchStoreHours(storeID: Int) async throws -> [StoreHourDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/hours")
    }

    func checkFavorite(storeID: Int, token: String) async throws -> Bool {
        let row: FavoriteStateDTO = try await APIClient.shared.request(
            path: "/stores/\(storeID)/is-favorited",
            token: token
        )
        return row.is_favorited
    }

    func setFavorite(storeID: Int, token: String, favorited: Bool) async throws {
        if favorited {
            let _: EmptyResponse = try await APIClient.shared.request(
                path: "/stores/\(storeID)/favorite",
                method: "POST",
                token: token
            )
        } else {
            let _: EmptyResponse = try await APIClient.shared.request(
                path: "/stores/\(storeID)/favorite",
                method: "DELETE",
                token: token
            )
        }
    }
}
