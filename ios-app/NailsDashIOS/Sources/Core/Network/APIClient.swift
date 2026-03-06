import Foundation

final class APIClient {
    static let shared = APIClient()
    private static let cacheInvalidatingMethods: Set<String> = ["POST", "PUT", "PATCH", "DELETE"]
    private static let responseCacheTTL: TimeInterval = 8
    private static let responseCacheMaxEntries = 120
    private static let clientPlatform = "ios"
    private static let forceReloginKeywords: [String] = [
        "temporarily restricted",
        "restricted until",
        "account restricted",
        "temporarily restricted from booking",
        "account is inactive",
        "user account is inactive",
        "account disabled",
        "account suspended",
        "account locked",
        "blocked",
        "account banned",
        "permanently banned",
        "permanently_banned",
        "permanent ban",
        "forbidden login",
        "login forbidden",
    ]

    private static let debugSimulatorBaseURL = "http://127.0.0.1:8000/api/v1"
    private static let debugDeviceBaseURL = "http://192.168.1.225:8000/api/v1"
    private static let releaseBaseURL = "https://api.nailsdash.app/api/v1"
    private static let readTimeoutSeconds: TimeInterval = 15
    private static let writeTimeoutSeconds: TimeInterval = 20
    private static let uploadTimeoutSeconds: TimeInterval = 120
    private static let refreshTimeoutSeconds: TimeInterval = 15
    private static let clientVersion: String? = {
        let short = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
        switch (short?.trimmingCharacters(in: .whitespacesAndNewlines), build?.trimmingCharacters(in: .whitespacesAndNewlines)) {
        case let (s?, b?) where !s.isEmpty && !b.isEmpty:
            return "\(s) (\(b))"
        case let (s?, _) where !s.isEmpty:
            return s
        case let (_, b?) where !b.isEmpty:
            return b
        default:
            return nil
        }
    }()

    private init() {
        let configuredBaseURL = Self.resolveBaseURL()
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
    private let responseCache = ResponseMemoryCache()
    private let inFlightGETDeduplicator = InFlightGETRequestDeduplicator()
    private let tokenRefreshCoordinator = TokenRefreshCoordinator()
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .useProtocolCachePolicy
        config.timeoutIntervalForRequest = APIClient.writeTimeoutSeconds
        config.timeoutIntervalForResource = APIClient.uploadTimeoutSeconds
        // Fail fast when device is offline so UI can stop loading and show actionable error.
        config.waitsForConnectivity = false
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

    private static func resolveBaseURL() -> String {
        let envValue = ProcessInfo.processInfo.environment["NAILSDASH_API_BASE_URL"]
        if let normalizedEnv = normalizeConfiguredBaseURL(envValue) {
            return normalizedEnv
        }

        let plistValue = Bundle.main.object(forInfoDictionaryKey: "NAILSDASH_API_BASE_URL") as? String
        if let normalizedPlist = normalizeConfiguredBaseURL(plistValue) {
            return normalizedPlist
        }

        #if DEBUG
        #if targetEnvironment(simulator)
        return debugSimulatorBaseURL
        #else
        return debugDeviceBaseURL
        #endif
        #else
        return releaseBaseURL
        #endif
    }

    private static func normalizeConfiguredBaseURL(_ raw: String?) -> String? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        guard !trimmed.contains("$(") else { return nil } // unresolved build setting placeholder
        return trimmed
    }

    func request<T: Decodable>(
        path: String,
        method: String = "GET",
        token: String? = nil,
        body: Encodable? = nil
    ) async throws -> T {
        return try await requestInternal(
            path: path,
            method: method,
            token: token,
            body: body,
            didRetryAfterRefresh: false
        )
    }

    private func requestInternal<T: Decodable>(
        path: String,
        method: String = "GET",
        token: String? = nil,
        body: Encodable? = nil,
        didRetryAfterRefresh: Bool
    ) async throws -> T {
        let normalizedMethod = method.uppercased()
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = normalizedMethod
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applyClientHeaders(to: &request)
        request.timeoutInterval = timeoutInterval(for: path, method: normalizedMethod)
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

        let (data, response): (Data, URLResponse)
        if normalizedMethod == "GET", let responseCacheKey {
            let requestSnapshot = request
            (data, response) = try await inFlightGETDeduplicator.perform(key: responseCacheKey) { [weak self] in
                guard let self else {
                    throw APIError.network("Request failed. Please try again.")
                }
                return try await self.performDataTask(for: requestSnapshot)
            }
        } else {
            (data, response) = try await performDataTask(for: request)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        if http.statusCode == 401,
           !didRetryAfterRefresh,
           shouldAttemptTokenRefresh(path: path) {
            do {
                let refreshedAccessToken = try await refreshAccessToken()
                return try await requestInternal(
                    path: path,
                    method: normalizedMethod,
                    token: refreshedAccessToken,
                    body: body,
                    didRetryAfterRefresh: true
                )
            } catch {
                // Fall through to normal 401 handling (global re-login flow).
            }
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

        let shouldPostUnauthorizedNotification = shouldPostUnauthorizedNotification(
            path: path,
            method: normalizedMethod
        )

        return try decodeResponse(
            data: data,
            http: http,
            postUnauthorizedNotification: shouldPostUnauthorizedNotification
        )
    }

    private func shouldAttemptTokenRefresh(path: String) -> Bool {
        guard TokenStore.shared.read(key: TokenStore.Keys.refreshToken) != nil else {
            return false
        }

        let normalizedPath = normalizePath(path).lowercased()
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/login$") {
            return false
        }
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/register$") {
            return false
        }
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/send-verification-code$") {
            return false
        }
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/verify-code$") {
            return false
        }
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/reset-password$") {
            return false
        }
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/refresh$") {
            return false
        }

        return true
    }

    private func refreshAccessToken() async throws -> String {
        let runningTask = await tokenRefreshCoordinator.acquire { [weak self] in
            guard let self else {
                throw APIError.unauthorized
            }
            return try await self.performTokenRefreshRequest()
        }

        do {
            let nextToken = try await runningTask.task.value
            await tokenRefreshCoordinator.clear(id: runningTask.id)
            return nextToken
        } catch {
            await tokenRefreshCoordinator.clear(id: runningTask.id)
            throw error
        }
    }

    private func performTokenRefreshRequest() async throws -> String {
        guard let refreshToken = TokenStore.shared.read(key: TokenStore.Keys.refreshToken) else {
            throw APIError.unauthorized
        }

        guard let url = URL(string: baseURL + "/auth/refresh") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applyClientHeaders(to: &request)
        request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])
        request.timeoutInterval = Self.refreshTimeoutSeconds
        request.cachePolicy = .reloadIgnoringLocalCacheData

        let (data, response) = try await performDataTask(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        guard (200 ... 299).contains(http.statusCode) else {
            let detail = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Session expired. Please sign in again."
            )
            let requestReference = responseRequestReference(http)
            if http.statusCode == 401 || http.statusCode == 403 || http.statusCode == 423 {
                throw APIError.unauthorized
            }
            throw APIError.server(withRequestReference(detail, requestReference: requestReference))
        }

        let refreshedToken: TokenResponse
        do {
            refreshedToken = try JSONDecoder().decode(TokenResponse.self, from: data)
        } catch {
            throw APIError.decoding
        }

        TokenStore.shared.save(refreshedToken.access_token, key: TokenStore.Keys.accessToken)
        TokenStore.shared.save(refreshedToken.refresh_token, key: TokenStore.Keys.refreshToken)
        responseCache.clear()
        return refreshedToken.access_token
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

    private func applyClientHeaders(to request: inout URLRequest) {
        request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-Id")
        request.setValue(Self.clientPlatform, forHTTPHeaderField: "X-Client-Platform")
        if let clientVersion = Self.clientVersion {
            request.setValue(clientVersion, forHTTPHeaderField: "X-Client-Version")
        }
    }

    private func timeoutInterval(for path: String, method: String) -> TimeInterval {
        let normalizedPath = normalizePath(path).lowercased()
        if isUploadPath(normalizedPath) {
            return Self.uploadTimeoutSeconds
        }
        if method.uppercased() == "GET" {
            return Self.readTimeoutSeconds
        }
        return Self.writeTimeoutSeconds
    }

    private func isUploadPath(_ normalizedPath: String) -> Bool {
        normalizedPath.contains("/upload/")
            || normalizedPath.hasSuffix("/upload")
            || normalizedPath.contains("/avatar")
            || normalizedPath.contains("/portfolio")
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
                     NSURLErrorCannotFindHost:
                    throw APIError.network("Network appears offline. Please check your connection and try again.")
                case NSURLErrorTimedOut:
                    throw APIError.network("Request timed out. Please try again.")
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
        let requestReference = responseRequestReference(http)
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
            if postUnauthorizedNotification && shouldForceRelogin(statusCode: http.statusCode, detail: detail) {
                NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
            }
            throw APIError.forbidden(withRequestReference(detail, requestReference: requestReference))
        case 423:
            let detail = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Your account is restricted. Please sign in again."
            )
            if postUnauthorizedNotification && shouldForceRelogin(statusCode: http.statusCode, detail: detail) {
                NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
            }
            throw APIError.forbidden(withRequestReference(detail, requestReference: requestReference))
        case 429:
            let detail = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Too many requests. Please try again in a few minutes."
            )
            if postUnauthorizedNotification && shouldForceRelogin(statusCode: http.statusCode, detail: detail) {
                NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
            }
            throw APIError.server(withRequestReference(detail, requestReference: requestReference))
        case 422:
            let text = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Please check your input and try again."
            )
            throw APIError.validation(withRequestReference(text, requestReference: requestReference))
        default:
            let detail = extractUserMessage(
                from: data,
                statusCode: http.statusCode,
                fallback: "Server is busy. Please try again later."
            )
            throw APIError.server(withRequestReference(detail, requestReference: requestReference))
        }
    }

    private func responseRequestReference(_ response: HTTPURLResponse) -> String? {
        let raw = response.value(forHTTPHeaderField: "X-Request-Id")?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let raw, !raw.isEmpty else {
            return nil
        }
        return raw
    }

    private func withRequestReference(_ message: String, requestReference: String?) -> String {
        let baseMessage = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let requestReference = requestReference?.trimmingCharacters(in: .whitespacesAndNewlines),
              !requestReference.isEmpty else {
            return baseMessage.isEmpty ? message : baseMessage
        }

        let normalized = baseMessage.isEmpty ? "Request failed." : baseMessage
        if normalized.range(of: requestReference, options: .caseInsensitive) != nil {
            return normalized
        }
        return "\(normalized) [Ref: \(requestReference)]"
    }

    private func shouldPostUnauthorizedNotification(path: String, method: String) -> Bool {
        let normalizedPath = normalizePath(path).lowercased()
        let normalizedMethod = method.uppercased()
        guard normalizedMethod == "POST" else {
            return true
        }

        // Auth entry requests should not trigger global "session expired" handling.
        if pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/login$")
            || pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/register$")
            || pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/send-verification-code$")
            || pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/verify-code$")
            || pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/reset-password$") {
            return false
        }

        return true
    }

    private func shouldForceRelogin(statusCode: Int, detail: String?) -> Bool {
        if statusCode == 401 {
            return true
        }
        guard statusCode == 403 || statusCode == 423 || statusCode == 429 else {
            return false
        }
        let normalized = (detail ?? "").lowercased()
        guard !normalized.isEmpty else {
            return false
        }
        return Self.forceReloginKeywords.contains { keyword in
            normalized.contains(keyword)
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
        if lower.contains("temporarily restricted")
            || lower.contains("restricted until")
            || lower.contains("account restricted")
            || lower.contains("permanently banned")
            || lower.contains("account is inactive")
            || lower.contains("forbidden login") {
            return "Your account is restricted. Please sign in again."
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

    func isEmptyPayload(_ data: Data) -> Bool {
        guard !data.isEmpty else { return true }
        guard let raw = String(data: data, encoding: .utf8) else { return false }
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return normalized.isEmpty || normalized == "null"
    }

    func normalizePath(_ path: String) -> String {
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

    func pathMatches(_ path: String, pattern: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return false
        }
        let range = NSRange(path.startIndex..., in: path)
        return regex.firstMatch(in: path, options: [], range: range) != nil
    }

}
