import Foundation

protocol StoresServiceProtocol {
    func fetchStores(limit: Int) async throws -> [StoreDTO]
    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO
    func fetchStoreImages(storeID: Int) async throws -> [StoreImageDTO]
    func fetchStoreServices(storeID: Int) async throws -> [ServiceDTO]
    func fetchStoreReviews(storeID: Int, skip: Int, limit: Int) async throws -> [StoreReviewDTO]
    func fetchStoreHours(storeID: Int) async throws -> [StoreHourDTO]
}

struct StoresService: StoresServiceProtocol {
    func fetchStores(limit: Int = 100) async throws -> [StoreDTO] {
        try await APIClient.shared.request(path: "/stores?skip=0&limit=\(limit)")
    }

    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        try await APIClient.shared.request(path: "/stores/\(storeID)")
    }

    func fetchStoreImages(storeID: Int) async throws -> [StoreImageDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/images")
    }

    func fetchStoreServices(storeID: Int) async throws -> [ServiceDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/services")
    }

    func fetchStoreReviews(storeID: Int, skip: Int = 0, limit: Int = 20) async throws -> [StoreReviewDTO] {
        try await APIClient.shared.request(path: "/reviews/stores/\(storeID)?skip=\(skip)&limit=\(limit)")
    }

    func fetchStoreHours(storeID: Int) async throws -> [StoreHourDTO] {
        try await APIClient.shared.request(path: "/stores/\(storeID)/hours")
    }
}
