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

struct EmptyResponse: Decodable {}

enum AssetURLResolver {
    private static let urlCache: NSCache<NSString, NSURL> = {
        let cache = NSCache<NSString, NSURL>()
        cache.countLimit = 1600
        cache.totalCostLimit = 4 * 1024 * 1024
        return cache
    }()

    static func resolveURL(from rawValue: String?, assetBaseURL: String = APIClient.shared.assetBaseURL) -> URL? {
        guard let rawValue else { return nil }
        let raw = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return nil }

        let normalizedBase: String
        if assetBaseURL.hasSuffix("/") {
            normalizedBase = String(assetBaseURL.dropLast())
        } else {
            normalizedBase = assetBaseURL
        }

        let resolvedString: String
        if raw.lowercased().hasPrefix("http://") || raw.lowercased().hasPrefix("https://") {
            resolvedString = raw
        } else {
            let normalizedPath = raw.hasPrefix("/") ? raw : "/\(raw)"
            resolvedString = normalizedBase + normalizedPath
        }

        let cacheKey = "\(normalizedBase)|\(resolvedString)" as NSString
        if let cached = urlCache.object(forKey: cacheKey) {
            return cached as URL
        }

        guard let url = URL(string: resolvedString) else { return nil }
        urlCache.setObject(url as NSURL, forKey: cacheKey, cost: resolvedString.utf8.count)
        return url
    }

    static func resolveString(from rawValue: String?, assetBaseURL: String = APIClient.shared.assetBaseURL) -> String? {
        resolveURL(from: rawValue, assetBaseURL: assetBaseURL)?.absoluteString
    }
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
