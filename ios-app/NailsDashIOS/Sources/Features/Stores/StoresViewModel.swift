import Foundation

@MainActor
final class StoresViewModel: ObservableObject {
    @Published var stores: [StoreDTO] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

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
            store = try await service.fetchStoreDetail(storeID: storeID)
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
            return "Invalid API URL"
        case .decoding:
            return "Failed to parse store detail response"
        }
    }
}
