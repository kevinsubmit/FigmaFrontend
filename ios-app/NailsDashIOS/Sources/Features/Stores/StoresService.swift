import Foundation

protocol StoresServiceProtocol {
    func fetchStores(limit: Int) async throws -> [StoreDTO]
    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO
}

struct StoresService: StoresServiceProtocol {
    func fetchStores(limit: Int = 100) async throws -> [StoreDTO] {
        try await APIClient.shared.request(path: "/stores?skip=0&limit=\(limit)")
    }

    func fetchStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        try await APIClient.shared.request(path: "/stores/\(storeID)")
    }
}
