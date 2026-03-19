import Foundation

protocol StoresServiceProtocol {
    func fetchStores(skip: Int, limit: Int, sortBy: String?, userLat: Double?, userLng: Double?) async throws -> [StoreDTO]
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

extension StoresServiceProtocol {
    func fetchStores(limit: Int, sortBy: String?, userLat: Double?, userLng: Double?) async throws -> [StoreDTO] {
        try await fetchStores(skip: 0, limit: limit, sortBy: sortBy, userLat: userLat, userLng: userLng)
    }
}

struct StoresService: StoresServiceProtocol {
    private struct FavoriteStateDTO: Decodable {
        let is_favorited: Bool
    }

    private enum CacheTTL {
        static let storesList: TimeInterval = 45
        static let storeDetail: TimeInterval = 180
        static let storeImages: TimeInterval = 180
        static let storePortfolio: TimeInterval = 120
        static let storeServices: TimeInterval = 180
        static let storeReviews: TimeInterval = 60
        static let storeRating: TimeInterval = 60
        static let storeHours: TimeInterval = 300
        static let favoriteState: TimeInterval = 20
    }

    private static let storesListCache = TimedAsyncRequestCache<String, [StoreDTO]>()
    private static let storeDetailCache = TimedAsyncRequestCache<Int, StoreDetailDTO>()
    private static let storeImagesCache = TimedAsyncRequestCache<Int, [StoreImageDTO]>()
    private static let storePortfolioCache = TimedAsyncRequestCache<String, [StorePortfolioDTO]>()
    private static let storeServicesCache = TimedAsyncRequestCache<Int, [ServiceDTO]>()
    private static let storeReviewsCache = TimedAsyncRequestCache<String, [StoreReviewDTO]>()
    private static let storeRatingCache = TimedAsyncRequestCache<Int, StoreRatingSummaryDTO>()
    private static let storeHoursCache = TimedAsyncRequestCache<Int, [StoreHourDTO]>()
    private static let favoriteStateCache = TimedAsyncRequestCache<String, Bool>()

    func fetchStores(skip: Int = 0, limit: Int = 100, sortBy: String? = nil, userLat: Double? = nil, userLng: Double? = nil) async throws -> [StoreDTO] {
        var params = ["skip=\(skip)", "limit=\(limit)"]
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
        let path = "/stores?\(query)"
        return try await Self.storesListCache.value(for: path, ttl: CacheTTL.storesList) {
            try await APIClient.shared.request(path: path)
        }
    }

    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        try await Self.storeDetailCache.value(for: storeID, ttl: CacheTTL.storeDetail) {
            try await APIClient.shared.request(path: "/stores/\(storeID)")
        }
    }

    func fetchStoreImages(storeID: Int) async throws -> [StoreImageDTO] {
        try await Self.storeImagesCache.value(for: storeID, ttl: CacheTTL.storeImages) {
            try await APIClient.shared.request(path: "/stores/\(storeID)/images")
        }
    }

    func fetchStorePortfolio(storeID: Int, skip: Int = 0, limit: Int = 50) async throws -> [StorePortfolioDTO] {
        let path = "/stores/portfolio/\(storeID)?skip=\(skip)&limit=\(limit)"
        return try await Self.storePortfolioCache.value(for: path, ttl: CacheTTL.storePortfolio) {
            try await APIClient.shared.request(path: path)
        }
    }

    func fetchStoreServices(storeID: Int) async throws -> [ServiceDTO] {
        try await Self.storeServicesCache.value(for: storeID, ttl: CacheTTL.storeServices) {
            try await APIClient.shared.request(path: "/stores/\(storeID)/services")
        }
    }

    func fetchStoreReviews(storeID: Int, skip: Int = 0, limit: Int = 20) async throws -> [StoreReviewDTO] {
        let path = "/reviews/stores/\(storeID)?skip=\(skip)&limit=\(limit)"
        return try await Self.storeReviewsCache.value(for: path, ttl: CacheTTL.storeReviews) {
            try await APIClient.shared.request(path: path)
        }
    }

    func fetchStoreRating(storeID: Int) async throws -> StoreRatingSummaryDTO {
        try await Self.storeRatingCache.value(for: storeID, ttl: CacheTTL.storeRating) {
            try await APIClient.shared.request(path: "/reviews/stores/\(storeID)/rating")
        }
    }

    func fetchStoreHours(storeID: Int) async throws -> [StoreHourDTO] {
        try await Self.storeHoursCache.value(for: storeID, ttl: CacheTTL.storeHours) {
            try await APIClient.shared.request(path: "/stores/\(storeID)/hours")
        }
    }

    func checkFavorite(storeID: Int, token: String) async throws -> Bool {
        let cacheKey = "\(token)|\(storeID)"
        return try await Self.favoriteStateCache.value(for: cacheKey, ttl: CacheTTL.favoriteState) {
            let row: FavoriteStateDTO = try await APIClient.shared.request(
                path: "/stores/\(storeID)/is-favorited",
                token: token
            )
            return row.is_favorited
        }
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
        Self.favoriteStateCache.removeValue(for: "\(token)|\(storeID)")
    }
}
