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

    var baseURL = "http://localhost:8000/api/v1"

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
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        switch http.statusCode {
        case 200 ... 299:
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw APIError.decoding
            }
        case 401:
            NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
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
}
