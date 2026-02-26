import Foundation

extension Notification.Name {
    static let apiUnauthorized = Notification.Name("apiUnauthorized")
}

enum APIError: Error {
    case invalidURL
    case unauthorized
    case forbidden(String)
    case validation(String)
    case server(String)
    case decoding
    case network(String)
}

struct APIMessage: Decodable {
    let detail: String
}

struct EmptyResponse: Decodable {}

private struct RefreshTokenRequest: Encodable {
    let refresh_token: String
}

struct AnyEncodable: Encodable {
    private let encoder: (Encoder) throws -> Void

    init(_ wrapped: Encodable) {
        self.encoder = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try self.encoder(encoder)
    }
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    // Default to IPv4 loopback to avoid simulator `localhost` resolving to `::1`
    // while backend listens only on IPv4.
    var baseURL = ProcessInfo.processInfo.environment["NAILSDASH_API_BASE_URL"] ?? "http://127.0.0.1:8000/api/v1"
    private let refreshCoordinator = TokenRefreshCoordinator()

    func request<T: Decodable>(
        path: String,
        method: String = "GET",
        token: String? = nil,
        body: Encodable? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let authToken = token ?? TokenStore.shared.read(key: TokenStore.Keys.accessToken)
        if let authToken {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        let (data, response) = try await performDataTask(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        if http.statusCode == 401,
           authToken != nil,
           !path.contains("/auth/login"),
           !path.contains("/auth/refresh"),
           let newToken = await refreshCoordinator.refresh(using: { [weak self] in
               guard let self else { return nil }
               return await self.refreshAccessToken()
           }) {
            var retryRequest = request
            retryRequest.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
            let (retryData, retryResponse) = try await performDataTask(for: retryRequest)

            guard let retryHTTP = retryResponse as? HTTPURLResponse else {
                throw APIError.network("Invalid response")
            }

            return try decodeResponse(data: retryData, http: retryHTTP, postUnauthorizedNotification: true)
        }

        return try decodeResponse(data: data, http: http, postUnauthorizedNotification: true)
    }

    private func performDataTask(for request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await URLSession.shared.data(for: request)
        } catch {
            if isRequestCancelled(error) {
                // Keep UI silent for pull-to-refresh / task-cancel scenarios.
                throw APIError.network("")
            }
            throw APIError.network(error.localizedDescription)
        }
    }

    private func isRequestCancelled(_ error: Error) -> Bool {
        if error is CancellationError {
            return true
        }

        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return true
        }

        let message = nsError.localizedDescription.lowercased()
        return message == "cancelled" || message == "canceled" || message.contains("cancelled") || message.contains("canceled")
    }

    private func decodeResponse<T: Decodable>(
        data: Data,
        http: HTTPURLResponse,
        postUnauthorizedNotification: Bool
    ) throws -> T {
        switch http.statusCode {
        case 200 ... 299:
            if isEmptyPayload(data), T.self == EmptyResponse.self {
                return EmptyResponse() as! T
            }
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw APIError.decoding
            }
        case 401:
            if postUnauthorizedNotification {
                NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
            }
            throw APIError.unauthorized
        case 403:
            let detail = (try? JSONDecoder().decode(APIMessage.self, from: data).detail) ?? "Forbidden"
            throw APIError.forbidden(detail)
        case 422:
            let text = String(data: data, encoding: .utf8) ?? "Validation failed"
            throw APIError.validation(text)
        default:
            let detail = (try? JSONDecoder().decode(APIMessage.self, from: data).detail) ?? "Server error"
            throw APIError.server(detail)
        }
    }

    private func isEmptyPayload(_ data: Data) -> Bool {
        guard !data.isEmpty else { return true }
        guard let raw = String(data: data, encoding: .utf8) else { return false }
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return normalized.isEmpty || normalized == "null"
    }

    private func refreshAccessToken() async -> String? {
        guard let refreshToken = TokenStore.shared.read(key: TokenStore.Keys.refreshToken), !refreshToken.isEmpty else {
            return nil
        }

        if let token = await requestRefreshTokenWithJSON(refreshToken) {
            return token
        }

        if let token = await requestRefreshTokenWithQuery(refreshToken) {
            return token
        }

        return nil
    }

    private func requestRefreshTokenWithJSON(_ refreshToken: String) async -> String? {
        guard let url = URL(string: baseURL + "/auth/refresh") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(RefreshTokenRequest(refresh_token: refreshToken))
        return await executeRefreshRequest(request)
    }

    private func requestRefreshTokenWithQuery(_ refreshToken: String) async -> String? {
        guard var components = URLComponents(string: baseURL + "/auth/refresh") else {
            return nil
        }
        components.queryItems = [URLQueryItem(name: "refresh_token", value: refreshToken)]
        guard let url = components.url else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return await executeRefreshRequest(request)
    }

    private func executeRefreshRequest(_ request: URLRequest) async -> String? {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
                return nil
            }

            let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
            TokenStore.shared.save(tokenResponse.access_token, key: TokenStore.Keys.accessToken)
            TokenStore.shared.save(tokenResponse.refresh_token, key: TokenStore.Keys.refreshToken)
            return tokenResponse.access_token
        } catch {
            return nil
        }
    }
}

private actor TokenRefreshCoordinator {
    private var task: Task<String?, Never>?

    func refresh(using operation: @escaping @Sendable () async -> String?) async -> String? {
        if let task {
            return await task.value
        }

        let task = Task { await operation() }
        self.task = task
        let token = await task.value
        self.task = nil
        return token
    }
}
