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
    private static let urlCache = NSCache<NSString, NSURL>()

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
        urlCache.setObject(url as NSURL, forKey: cacheKey)
        return url
    }

    static func resolveString(from rawValue: String?, assetBaseURL: String = APIClient.shared.assetBaseURL) -> String? {
        resolveURL(from: rawValue, assetBaseURL: assetBaseURL)?.absoluteString
    }
}

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
    private static let payloadMethods: Set<String> = ["POST", "PUT", "PATCH"]
    private static let cacheInvalidatingMethods: Set<String> = ["POST", "PUT", "PATCH", "DELETE"]
    private static let responseCacheTTL: TimeInterval = 8
    private static let responseCacheMaxEntries = 120
    private static let suspiciousContentRegex = try! NSRegularExpression(
        pattern: "<\\s*/?\\s*script\\b|javascript:|data:text/html",
        options: [.caseInsensitive]
    )
    private static let usernameRegex = try! NSRegularExpression(
        pattern: "^[A-Za-z0-9._-]{3,100}$",
        options: []
    )
    private static let emailRegex = try! NSRegularExpression(
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        options: []
    )
    private static let dateRegex = try! NSRegularExpression(
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        options: []
    )
    private static let timeRegex = try! NSRegularExpression(
        pattern: "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$",
        options: []
    )
    private static let codeRegex = try! NSRegularExpression(
        pattern: "^\\d{6}$",
        options: []
    )
    private static let allowedPurposes: Set<String> = ["register", "login", "reset_password"]
    private static let allowedGenders: Set<String> = ["male", "female", "other"]
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
    private init() {
        let configuredBaseURL = ProcessInfo.processInfo.environment["NAILSDASH_API_BASE_URL"] ?? "http://127.0.0.1:8000/api/v1"
        self.baseURL = configuredBaseURL
        self.assetBaseURL = Self.makeAssetBaseURL(from: configuredBaseURL)
    }

    // Default to IPv4 loopback to avoid simulator `localhost` resolving to `::1`
    // while backend listens only on IPv4.
    var baseURL: String {
        didSet {
            assetBaseURL = Self.makeAssetBaseURL(from: baseURL)
        }
    }
    private(set) var assetBaseURL: String
    private let refreshCoordinator = TokenRefreshCoordinator()
    private let responseCache = ResponseMemoryCache()
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .useProtocolCachePolicy
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        config.httpMaximumConnectionsPerHost = 6
        config.urlCache = URLCache(
            memoryCapacity: 64 * 1024 * 1024,
            diskCapacity: 256 * 1024 * 1024,
            diskPath: "nailsdash_api_cache"
        )
        return URLSession(configuration: config)
    }()

    private static func makeAssetBaseURL(from baseURL: String) -> String {
        baseURL.replacingOccurrences(of: "/api/v1", with: "")
    }

    func request<T: Decodable>(
        path: String,
        method: String = "GET",
        token: String? = nil,
        body: Encodable? = nil
    ) async throws -> T {
        let normalizedMethod = method.uppercased()
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = normalizedMethod
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if normalizedMethod != "GET" {
            request.cachePolicy = .reloadIgnoringLocalCacheData
        }
        let authToken = token ?? TokenStore.shared.read(key: TokenStore.Keys.accessToken)
        if let authToken {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            let encodedBody = try JSONEncoder().encode(AnyEncodable(body))
            try validateRequestPayload(encodedBody, method: normalizedMethod, path: path)
            request.httpBody = encodedBody
        }

        let responseCacheKey = cacheKey(for: request)
        if normalizedMethod == "GET",
           let responseCacheKey,
           let cached = responseCache.read(for: responseCacheKey) {
            return try decodeResponse(data: cached.data, http: cached.http, postUnauthorizedNotification: false)
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

            if (200 ... 299).contains(retryHTTP.statusCode) {
                if normalizedMethod == "GET", let responseCacheKey {
                    responseCache.write(
                        key: responseCacheKey,
                        data: retryData,
                        http: retryHTTP,
                        ttl: Self.responseCacheTTL,
                        maxEntries: Self.responseCacheMaxEntries
                    )
                } else if Self.cacheInvalidatingMethods.contains(normalizedMethod) {
                    responseCache.clear()
                }
            }

            return try decodeResponse(data: retryData, http: retryHTTP, postUnauthorizedNotification: true)
        }

        if (200 ... 299).contains(http.statusCode) {
            if normalizedMethod == "GET", let responseCacheKey {
                responseCache.write(
                    key: responseCacheKey,
                    data: data,
                    http: http,
                    ttl: Self.responseCacheTTL,
                    maxEntries: Self.responseCacheMaxEntries
                )
            } else if Self.cacheInvalidatingMethods.contains(normalizedMethod) {
                responseCache.clear()
            }
        }

        return try decodeResponse(data: data, http: http, postUnauthorizedNotification: true)
    }

    private func cacheKey(for request: URLRequest) -> String? {
        guard request.httpMethod?.uppercased() == "GET",
              request.httpBody == nil,
              let url = request.url?.absoluteString else {
            return nil
        }
        var hasher = Hasher()
        hasher.combine(url)
        hasher.combine(request.value(forHTTPHeaderField: "Authorization") ?? "")
        hasher.combine(request.value(forHTTPHeaderField: "Accept-Language") ?? "")
        return "GET-\(hasher.finalize())"
    }

    private func performDataTask(for request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch {
            if isRequestCancelled(error) {
                // Keep UI silent for pull-to-refresh / task-cancel scenarios.
                throw APIError.network("")
            }
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet,
                     NSURLErrorNetworkConnectionLost,
                     NSURLErrorCannotConnectToHost,
                     NSURLErrorCannotFindHost,
                     NSURLErrorTimedOut:
                    throw APIError.network("Network error. Please check your connection and try again.")
                default:
                    break
                }
            }
            throw APIError.network("Request failed. Please try again.")
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
            let detail = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "You do not have permission to perform this action."
            )
            throw APIError.forbidden(detail)
        case 422:
            let text = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Please check your input and try again."
            )
            throw APIError.validation(text)
        default:
            let detail = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Server is busy. Please try again later."
            )
            throw APIError.server(detail)
        }
    }

    private func extractUserMessage(from data: Data, statusCode: Int, fallback: String) -> String {
        if isEmptyPayload(data) {
            return statusFallbackMessage(statusCode: statusCode) ?? fallback
        }

        if let object = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) {
            if let dict = object as? [String: Any], let detail = dict["detail"] {
                if let mapped = messageFromDetail(detail, statusCode: statusCode), !mapped.isEmpty {
                    return mapped
                }
            }
            if let mapped = messageFromDetail(object, statusCode: statusCode), !mapped.isEmpty {
                return mapped
            }
        }

        if let raw = String(data: data, encoding: .utf8) {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if let mapped = mapKnownServerMessage(trimmed, statusCode: statusCode), !mapped.isEmpty {
                return mapped
            }
        }

        return statusFallbackMessage(statusCode: statusCode) ?? fallback
    }

    private func messageFromDetail(_ detail: Any, statusCode: Int) -> String? {
        switch detail {
        case let text as String:
            return mapKnownServerMessage(text, statusCode: statusCode)
        case let array as [Any]:
            for item in array {
                if let text = item as? String,
                   let mapped = mapKnownServerMessage(text, statusCode: statusCode),
                   !mapped.isEmpty {
                    return mapped
                }
                if let dict = item as? [String: Any],
                   let mapped = messageFromValidationEntry(dict),
                   !mapped.isEmpty {
                    return mapped
                }
            }
            return nil
        case let dict as [String: Any]:
            if let nested = dict["detail"] {
                return messageFromDetail(nested, statusCode: statusCode)
            }
            return messageFromValidationEntry(dict)
        default:
            return nil
        }
    }

    private func messageFromValidationEntry(_ entry: [String: Any]) -> String? {
        guard let rawMessage = (entry["msg"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
              !rawMessage.isEmpty else {
            return nil
        }

        let lower = rawMessage.lowercased()
        let field = formatFieldName(fieldName(from: entry["loc"]))

        if lower.contains("field required") {
            return "\(field) is required."
        }

        if let upperBound = firstCapture(in: rawMessage, pattern: #"less than or equal to\s+([0-9.]+)"#) {
            return "\(field) must be less than or equal to \(upperBound)."
        }

        if let lowerBound = firstCapture(in: rawMessage, pattern: #"greater than or equal to\s+([0-9.]+)"#) {
            return "\(field) must be greater than or equal to \(lowerBound)."
        }

        if let maxLength = firstCapture(in: rawMessage, pattern: #"at most\s+([0-9]+)"#) {
            return "\(field) must be at most \(maxLength) characters."
        }

        if let minLength = firstCapture(in: rawMessage, pattern: #"at least\s+([0-9]+)"#) {
            return "\(field) must be at least \(minLength) characters."
        }

        if lower.contains("valid integer") || lower.contains("unable to parse string as an integer") {
            return "\(field) must be a valid integer."
        }

        if lower.contains("valid number") {
            return "\(field) must be a valid number."
        }

        if lower.contains("valid date") {
            return "\(field) must be a valid date."
        }

        if lower.contains("valid time") {
            return "\(field) must be a valid time."
        }

        if lower.contains("valid email") {
            return "\(field) must be a valid email address."
        }

        return sentenceCase(rawMessage)
    }

    private func fieldName(from loc: Any?) -> String {
        guard let values = loc as? [Any] else { return "field" }
        let ignore: Set<String> = ["body", "query", "path", "header", "cookie"]
        for value in values.reversed() {
            guard let text = value as? String else { continue }
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty || ignore.contains(trimmed.lowercased()) {
                continue
            }
            return trimmed
        }
        return "field"
    }

    private func formatFieldName(_ field: String) -> String {
        let cleaned = field
            .replacingOccurrences(of: #"\[\d+\]"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: "_", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return "Field" }
        return cleaned.prefix(1).uppercased() + cleaned.dropFirst()
    }

    private func sentenceCase(_ text: String) -> String {
        let normalized = text
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        guard !normalized.isEmpty else { return normalized }
        return normalized.prefix(1).uppercased() + normalized.dropFirst()
    }

    private func firstCapture(in text: String, pattern: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return nil
        }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, options: [], range: range),
              match.numberOfRanges > 1,
              let captureRange = Range(match.range(at: 1), in: text) else {
            return nil
        }
        return String(text[captureRange])
    }

    private func mapKnownServerMessage(_ raw: String, statusCode: Int?) -> String? {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return nil }
        let lower = text.lowercased()

        if lower == "failed to fetch" || lower.contains("network error") || lower.contains("network request failed") {
            return "Network error. Please check your connection and try again."
        }
        if lower.contains("not authenticated") || lower.contains("authentication required") {
            return "Please sign in to continue."
        }
        if lower.contains("could not validate credentials")
            || lower.contains("token has expired")
            || lower.contains("session expired") {
            return "Session expired. Please sign in again."
        }
        if lower.contains("forbidden")
            || lower.contains("permission denied")
            || lower.contains("not enough permissions") {
            return "You do not have permission to perform this action."
        }
        if lower.contains("too many booking requests") || lower.contains("too many requests") {
            return "Too many requests. Please try again in a few minutes."
        }
        if lower.contains("request payload cannot be empty") {
            return "Please complete the required fields before submitting."
        }
        if lower.contains("must be a valid us phone number") {
            return "Please enter a valid US phone number."
        }
        if lower.contains("must be a 6-digit code") || lower.contains("verification code") {
            return "Please enter a valid 6-digit verification code."
        }
        if lower.contains("incorrect phone number or password") {
            return "Incorrect phone number or password."
        }
        if lower.contains("phone number already registered") {
            return "This phone number is already registered. Please sign in instead."
        }
        if lower.contains("username already taken") {
            return "This username is already taken. Please choose another one."
        }
        if lower.contains("invalid or expired verification code") {
            return "The verification code is invalid or expired. Please request a new code."
        }

        if let fallback = statusFallbackMessage(statusCode: statusCode) {
            if lower == "forbidden" || lower == "validation failed" || lower == "server error" {
                return fallback
            }
        }

        if text.hasPrefix("{") || text.hasPrefix("[") {
            return statusFallbackMessage(statusCode: statusCode)
        }

        return sentenceCase(text)
    }

    private func statusFallbackMessage(statusCode: Int?) -> String? {
        guard let statusCode else { return nil }
        switch statusCode {
        case 400:
            return "Invalid request. Please check your input and try again."
        case 401:
            return "Session expired. Please sign in again."
        case 403:
            return "You do not have permission to perform this action."
        case 404:
            return "Requested resource was not found."
        case 409:
            return "This action conflicts with existing data."
        case 422:
            return "Please check your input and try again."
        case 429:
            return "Too many requests. Please try again in a few minutes."
        default:
            if statusCode >= 500 {
                return "Server is busy. Please try again later."
            }
            return nil
        }
    }

    private func isEmptyPayload(_ data: Data) -> Bool {
        guard !data.isEmpty else { return true }
        guard let raw = String(data: data, encoding: .utf8) else { return false }
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return normalized.isEmpty || normalized == "null"
    }

    private func validateRequestPayload(_ data: Data, method: String, path: String) throws {
        let normalizedMethod = method.uppercased()
        guard Self.payloadMethods.contains(normalizedMethod) else { return }

        if isEmptyPayload(data) {
            throw APIError.validation("Request payload cannot be empty.")
        }

        guard let jsonObject = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) else {
            return
        }

        if !hasMeaningfulValue(jsonObject) {
            if allowsEmptyPayload(method: normalizedMethod, path: path) {
                return
            }
            throw APIError.validation("Request payload cannot be empty.")
        }

        if let invalidError = firstInvalidField(in: jsonObject, at: "payload") {
            throw APIError.validation(invalidError)
        }

        try validateEndpointPayload(jsonObject, method: normalizedMethod, path: path)
    }

    private func hasMeaningfulValue(_ value: Any) -> Bool {
        switch value {
        case is NSNull:
            return false
        case let text as String:
            return !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case is NSNumber:
            return true
        case let array as [Any]:
            return array.contains(where: hasMeaningfulValue)
        case let dict as [String: Any]:
            return dict.values.contains(where: hasMeaningfulValue)
        default:
            return true
        }
    }

    private func allowsEmptyPayload(method: String, path: String) -> Bool {
        let normalizedPath = normalizePath(path).lowercased()
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/\\d+/cancel$") {
            return true
        }
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?stores/\\d+/favorite$") {
            return true
        }
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?pins/\\d+/favorite$") {
            return true
        }
        if method == "PATCH", pathMatches(normalizedPath, pattern: "^/(api/v1/)?notifications/\\d+/read$") {
            return true
        }
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?notifications/mark-all-read$") {
            return true
        }
        return false
    }

    private func firstInvalidField(in value: Any, at path: String) -> String? {
        switch value {
        case let text as String:
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return nil }
            if hasInvalidControlCharacters(in: text) {
                return "Invalid control characters in \(path)."
            }
            if hasSuspiciousContent(in: text) {
                return "Invalid characters in \(path)."
            }
            if let fieldError = validateFieldByName(trimmed, at: path) {
                return fieldError
            }
            return nil
        case let array as [Any]:
            for (index, item) in array.enumerated() {
                if let invalid = firstInvalidField(in: item, at: "\(path)[\(index)]") {
                    return invalid
                }
            }
            return nil
        case let dict as [String: Any]:
            for key in dict.keys.sorted() {
                if let invalid = firstInvalidField(in: dict[key] as Any, at: "\(path).\(key)") {
                    return invalid
                }
            }
            return nil
        default:
            return nil
        }
    }

    private func hasInvalidControlCharacters(in text: String) -> Bool {
        for scalar in text.unicodeScalars {
            let isControl = CharacterSet.controlCharacters.contains(scalar)
            let isAllowedWhitespace = scalar == "\n" || scalar == "\r" || scalar == "\t"
            if isControl && !isAllowedWhitespace {
                return true
            }
        }
        return false
    }

    private func hasSuspiciousContent(in text: String) -> Bool {
        let range = NSRange(text.startIndex..., in: text)
        return Self.suspiciousContentRegex.firstMatch(in: text, options: [], range: range) != nil
    }

    private func validateFieldByName(_ value: String, at path: String) -> String? {
        let field = leafFieldName(from: path)
        switch field {
        case "phone", "new_phone", "guest_phone", "recipient_phone":
            if !isValidUSPhone(value) {
                return "\(path) must be a valid US phone number."
            }
        case "email":
            if !matchesRegex(value, regex: Self.emailRegex) {
                return "\(path) must be a valid email."
            }
        case "username":
            if !matchesRegex(value, regex: Self.usernameRegex) {
                return "\(path) must be 3-100 chars and only include letters, numbers, dot, underscore, or dash."
            }
        case "verification_code", "code":
            if !matchesRegex(value, regex: Self.codeRegex) {
                return "\(path) must be a 6-digit code."
            }
        case "appointment_date", "new_date", "birthday", "date_of_birth":
            if !isValidDateString(value) {
                return "\(path) must be in YYYY-MM-DD format."
            }
        case "appointment_time", "new_time":
            if !matchesRegex(value, regex: Self.timeRegex) {
                return "\(path) must be in HH:MM or HH:MM:SS format."
            }
        case "purpose":
            if !Self.allowedPurposes.contains(value.lowercased()) {
                return "\(path) must be one of register, login, reset_password."
            }
        case "notes", "host_notes":
            if value.count > 2000 {
                return "\(path) cannot exceed 2000 characters."
            }
        case "reason", "cancel_reason", "description", "message":
            if value.count > 255 {
                return "\(path) cannot exceed 255 characters."
            }
        default:
            break
        }
        return nil
    }

    private func validateEndpointPayload(_ value: Any, method: String, path: String) throws {
        let normalizedPath = normalizePath(path).lowercased()

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/send-verification-code$") {
            let dict = try requireDictionary(value, context: "send-verification-code payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requirePurpose(dict["purpose"], field: "purpose")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/verify-code$") {
            let dict = try requireDictionary(value, context: "verify-code payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requireCode(dict["code"], field: "code")
            try requirePurpose(dict["purpose"], field: "purpose")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/register$") {
            let dict = try requireDictionary(value, context: "register payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requireCode(dict["verification_code"], field: "verification_code")
            try requireUsername(dict["username"], field: "username")
            try requirePassword(dict["password"], field: "password", minLength: 8)
            try validateOptionalEmail(dict["email"], field: "email")
            try validateOptionalName(dict["full_name"], field: "full_name")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/login$") {
            let dict = try requireDictionary(value, context: "login payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requirePassword(dict["password"], field: "password", minLength: 1)
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/phone$") {
            let dict = try requireDictionary(value, context: "bind phone payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requireCode(dict["verification_code"], field: "verification_code")
            return
        }

        if method == "PUT", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/phone$") {
            let dict = try requireDictionary(value, context: "update phone payload")
            try requireUSPhone(dict["new_phone"], field: "new_phone")
            try requireCode(dict["verification_code"], field: "verification_code")
            try requirePassword(dict["current_password"], field: "current_password", minLength: 1)
            return
        }

        if method == "PUT", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/password$") {
            let dict = try requireDictionary(value, context: "update password payload")
            let currentPassword = try requirePassword(dict["current_password"], field: "current_password", minLength: 1)
            let newPassword = try requirePassword(dict["new_password"], field: "new_password", minLength: 8)
            if currentPassword == newPassword {
                throw APIError.validation("new_password must be different from current_password.")
            }
            return
        }

        if method == "PUT", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/profile$") {
            let dict = try requireDictionary(value, context: "update profile payload")
            try validateOptionalName(dict["full_name"], field: "full_name")
            try validateOptionalEmail(dict["email"], field: "email")
            try validateOptionalGender(dict["gender"], field: "gender")
            try validateOptionalDate(dict["birthday"], field: "birthday")
            try validateOptionalDate(dict["date_of_birth"], field: "date_of_birth")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/?$") {
            let dict = try requireDictionary(value, context: "create appointment payload")
            try requireDate(dict["appointment_date"], field: "appointment_date")
            try requireTime(dict["appointment_time"], field: "appointment_time")
            try validateOptionalText(dict["notes"], field: "notes", maxLength: 2000)
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/groups$") {
            let dict = try requireDictionary(value, context: "create appointment group payload")
            try requireDate(dict["appointment_date"], field: "appointment_date")
            try requireTime(dict["appointment_time"], field: "appointment_time")
            try requirePositiveInteger(dict["host_service_id"], field: "host_service_id")
            try validateOptionalText(dict["host_notes"], field: "host_notes", maxLength: 2000)

            guard let guests = dict["guests"] as? [Any], !guests.isEmpty else {
                throw APIError.validation("guests must include at least one guest item.")
            }
            for (index, guest) in guests.enumerated() {
                let guestDict = try requireDictionary(guest, context: "guests[\(index)]")
                try requirePositiveInteger(guestDict["service_id"], field: "guests[\(index)].service_id")
                try validateOptionalText(guestDict["notes"], field: "guests[\(index)].notes", maxLength: 2000)
                try validateOptionalName(guestDict["guest_name"], field: "guests[\(index)].guest_name")
                try validateOptionalUSPhone(guestDict["guest_phone"], field: "guests[\(index)].guest_phone")
            }
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/\\d+/reschedule$") {
            let dict = try requireDictionary(value, context: "reschedule payload")
            try requireDate(dict["new_date"], field: "new_date")
            try requireTime(dict["new_time"], field: "new_time")
            return
        }

        if method == "PATCH", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/\\d+/notes$") {
            let dict = try requireDictionary(value, context: "appointment notes payload")
            try requireText(dict["notes"], field: "notes", maxLength: 2000)
            return
        }
    }

    private func normalizePath(_ path: String) -> String {
        let noHash = path.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false).first.map(String.init) ?? path
        let noQuery = noHash.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false).first.map(String.init) ?? noHash
        if let absoluteRange = noQuery.range(of: "://"), let slash = noQuery[absoluteRange.upperBound...].firstIndex(of: "/") {
            return String(noQuery[slash...])
        }
        if noQuery.hasPrefix("/") {
            return noQuery
        }
        return "/" + noQuery
    }

    private func pathMatches(_ path: String, pattern: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return false
        }
        let range = NSRange(path.startIndex..., in: path)
        return regex.firstMatch(in: path, options: [], range: range) != nil
    }

    private func leafFieldName(from path: String) -> String {
        let cleaned = path.replacingOccurrences(of: "\\[\\d+\\]", with: "", options: .regularExpression)
        return cleaned.split(separator: ".").last.map { String($0).lowercased() } ?? cleaned.lowercased()
    }

    private func matchesRegex(_ value: String, regex: NSRegularExpression) -> Bool {
        let range = NSRange(value.startIndex..., in: value)
        return regex.firstMatch(in: value, options: [], range: range) != nil
    }

    private func isValidUSPhone(_ value: String) -> Bool {
        let digits = value.filter(\.isNumber)
        if digits.count == 10 { return true }
        return digits.count == 11 && digits.first == "1"
    }

    private func isValidDateString(_ value: String) -> Bool {
        if !matchesRegex(value, regex: Self.dateRegex) { return false }
        return Self.dateFormatter.date(from: value) != nil
    }

    private func requireDictionary(_ value: Any, context: String) throws -> [String: Any] {
        guard let dict = value as? [String: Any] else {
            throw APIError.validation("\(context) must be an object.")
        }
        return dict
    }

    private func requiredString(_ value: Any?, field: String) throws -> String {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            throw APIError.validation("\(field) is required.")
        }
        return text
    }

    @discardableResult
    private func requireText(_ value: Any?, field: String, maxLength: Int) throws -> String {
        let text = try requiredString(value, field: field)
        if text.count > maxLength {
            throw APIError.validation("\(field) cannot exceed \(maxLength) characters.")
        }
        return text
    }

    private func validateOptionalText(_ value: Any?, field: String, maxLength: Int) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if text.count > maxLength {
            throw APIError.validation("\(field) cannot exceed \(maxLength) characters.")
        }
    }

    private func requireUSPhone(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !isValidUSPhone(text) {
            throw APIError.validation("\(field) must be a valid US phone number.")
        }
    }

    private func validateOptionalUSPhone(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !isValidUSPhone(text) {
            throw APIError.validation("\(field) must be a valid US phone number.")
        }
    }

    private func requireCode(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !matchesRegex(text, regex: Self.codeRegex) {
            throw APIError.validation("\(field) must be a 6-digit code.")
        }
    }

    private func requirePurpose(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field).lowercased()
        if !Self.allowedPurposes.contains(text) {
            throw APIError.validation("\(field) must be one of register, login, reset_password.")
        }
    }

    private func requireUsername(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !matchesRegex(text, regex: Self.usernameRegex) {
            throw APIError.validation("\(field) must be 3-100 chars and only include letters, numbers, dot, underscore, or dash.")
        }
    }

    @discardableResult
    private func requirePassword(_ value: Any?, field: String, minLength: Int) throws -> String {
        let text = try requiredString(value, field: field)
        if text.count < minLength || text.count > 100 {
            throw APIError.validation("\(field) must be \(minLength)-100 characters.")
        }
        return text
    }

    private func validateOptionalEmail(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !matchesRegex(text, regex: Self.emailRegex) {
            throw APIError.validation("\(field) must be a valid email.")
        }
    }

    private func validateOptionalName(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if text.count < 2 || text.count > 200 {
            throw APIError.validation("\(field) must be 2-200 characters.")
        }
    }

    private func validateOptionalGender(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !Self.allowedGenders.contains(text.lowercased()) {
            throw APIError.validation("\(field) must be male, female, or other.")
        }
    }

    private func requireDate(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !isValidDateString(text) {
            throw APIError.validation("\(field) must be in YYYY-MM-DD format.")
        }
    }

    private func validateOptionalDate(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !isValidDateString(text) {
            throw APIError.validation("\(field) must be in YYYY-MM-DD format.")
        }
    }

    private func requireTime(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !matchesRegex(text, regex: Self.timeRegex) {
            throw APIError.validation("\(field) must be in HH:MM or HH:MM:SS format.")
        }
    }

    private func requirePositiveInteger(_ value: Any?, field: String) throws {
        guard let number = value as? NSNumber else {
            throw APIError.validation("\(field) must be a positive integer.")
        }
        if number.intValue <= 0 || floor(number.doubleValue) != number.doubleValue {
            throw APIError.validation("\(field) must be a positive integer.")
        }
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
            let (data, response) = try await session.data(for: request)
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

private final class ResponseMemoryCache {
    struct Entry {
        let data: Data
        let http: HTTPURLResponse
        let expiresAt: Date
    }

    private var entries: [String: Entry] = [:]
    private var insertionOrder: [String] = []
    private let lock = NSLock()

    func read(for key: String) -> Entry? {
        lock.lock()
        defer { lock.unlock() }
        purgeExpiredLocked()
        return entries[key]
    }

    func write(key: String, data: Data, http: HTTPURLResponse, ttl: TimeInterval, maxEntries: Int) {
        lock.lock()
        defer { lock.unlock() }
        purgeExpiredLocked()
        let entry = Entry(data: data, http: http, expiresAt: Date().addingTimeInterval(ttl))
        entries[key] = entry
        insertionOrder.removeAll { $0 == key }
        insertionOrder.append(key)

        if entries.count > maxEntries {
            let removeCount = entries.count - maxEntries
            for _ in 0 ..< removeCount {
                guard let oldest = insertionOrder.first else { break }
                insertionOrder.removeFirst()
                entries.removeValue(forKey: oldest)
            }
        }
    }

    func clear() {
        lock.lock()
        defer { lock.unlock() }
        entries.removeAll()
        insertionOrder.removeAll()
    }

    private func purgeExpiredLocked() {
        let now = Date()
        var expiredKeys: [String] = []
        for (key, entry) in entries where entry.expiresAt <= now {
            expiredKeys.append(key)
        }
        if expiredKeys.isEmpty { return }
        let expiredSet = Set(expiredKeys)
        for key in expiredKeys {
            entries.removeValue(forKey: key)
        }
        insertionOrder.removeAll { expiredSet.contains($0) }
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
