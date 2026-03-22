import Foundation

enum AppTab: Hashable {
    case home
    case book
    case appointments
    case deals
    case profile
}

struct BookingStyleReference: Identifiable, Equatable {
    let pinID: Int
    let title: String
    let imageURL: String?
    let tags: [String]

    var id: Int { pinID }

    var noteText: String {
        "Reference look: \(title) (Pin #\(pinID))"
    }
}

struct AppVersionCheckDTO: Decodable {
    let platform: String
    let current_version: String?
    let current_build: Int?
    let latest_version: String?
    let latest_build: Int?
    let min_supported_version: String?
    let min_supported_build: Int?
    let should_update: Bool
    let force_update: Bool
    let update_title: String?
    let update_message: String?
    let release_notes: String?
    let app_store_url: String?
    let checked_at: String?
}

struct AppVersionPrompt: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let message: String
    let releaseNotes: String?
    let appStoreURL: URL?
    let forceUpdate: Bool
    let signature: String
}

@MainActor
final class AppState: ObservableObject {
    nonisolated static let sessionExpiredMessage = "Session expired, please sign in again."
    nonisolated static func shouldForceLogoutAfterSensitiveAuthAlert(_ message: String) -> Bool {
        let normalized = message.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if normalized.isEmpty { return false }

        // Account restriction / ban style messages should always return user to login.
        if normalized.contains("restricted")
            || normalized.contains("ban")
            || normalized.contains("banned")
            || normalized.contains("blocked")
            || normalized.contains("suspended")
        {
            return true
        }

        // Keep existing auth-expired style behavior unified.
        if normalized.contains("session expired")
            || normalized.contains("sign in again")
            || normalized.contains("could not validate credentials")
            || normalized.contains("token has expired")
            || normalized.contains("unauthorized")
            || normalized.contains("not authenticated")
            || normalized.contains("authentication required")
        {
            return true
        }

        return false
    }
    @Published var isLoggedIn: Bool = false
    @Published var authMessage: String? = nil
    @Published var isLoadingAuth: Bool = false
    @Published var currentUser: AuthUser? = nil
    @Published var selectedTab: AppTab = .home
    @Published var bookingStyleReference: BookingStyleReference? = nil
    @Published var bookOpenedFromStyleReference: Bool = false
    @Published var bookTabResetID = UUID()
    @Published var dealsTabResetID = UUID()
    @Published var appVersionPrompt: AppVersionPrompt? = nil
    private var unauthorizedObserver: NSObjectProtocol?
    private let dismissedVersionSignatureKey = "app.version.prompt.dismissed.signature"
    private var isCheckingAppVersion = false
    private var lastVersionCheckAt: Date?
    private let appVersionCheckInterval: TimeInterval = 15 * 60

    init() {
        unauthorizedObserver = NotificationCenter.default.addObserver(
            forName: .apiUnauthorized,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.forceLogout(message: Self.sessionExpiredMessage)
            }
        }
    }

    deinit {
        if let observer = unauthorizedObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    func bootstrap() {
        guard TokenStore.shared.read(key: TokenStore.Keys.accessToken) != nil else {
            isLoggedIn = false
            currentUser = nil
            return
        }
        Task { await refreshSession() }
    }

    func login(phone: String, password: String) async {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        guard !normalizedPhone.isEmpty, !password.isEmpty else {
            authMessage = "Please enter phone and password."
            return
        }

        isLoadingAuth = true
        defer { isLoadingAuth = false }

        let payload = LoginRequest(phone: normalizedPhone, password: password, login_portal: "frontend")
        do {
            let token: TokenResponse = try await APIClient.shared.request(
                path: "/auth/login",
                method: "POST",
                body: payload
            )
            TokenStore.shared.save(token.access_token, key: TokenStore.Keys.accessToken)
            TokenStore.shared.save(token.refresh_token, key: TokenStore.Keys.refreshToken)
            authMessage = nil
            await refreshSession()
        } catch let error as APIError {
            switch error {
            case .unauthorized:
                authMessage = "Incorrect phone number or password."
            default:
                handleAuthError(error)
            }
        } catch {
            authMessage = error.localizedDescription
        }
    }

    func sendVerificationCode(phone: String, purpose: VerificationPurpose) async throws -> SendVerificationCodeResponse {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        guard !normalizedPhone.isEmpty else {
            throw APIError.validation("Please enter a valid US phone number.")
        }
        let payload = SendVerificationCodeRequest(phone: normalizedPhone, purpose: purpose)
        let result: SendVerificationCodeResponse = try await APIClient.shared.request(
            path: "/auth/send-verification-code",
            method: "POST",
            body: payload
        )
        return result
    }

    func verifyCode(phone: String, code: String, purpose: VerificationPurpose) async throws -> VerifyCodeResponse {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        let trimmedCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = VerifyCodeRequest(phone: normalizedPhone, code: trimmedCode, purpose: purpose)
        let result: VerifyCodeResponse = try await APIClient.shared.request(
            path: "/auth/verify-code",
            method: "POST",
            body: payload
        )
        return result
    }

    func register(
        phone: String,
        verificationCode: String,
        username: String,
        password: String,
        fullName: String?,
        referralCode: String?
    ) async {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        let trimmedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedFullName = fullName?.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedReferralCode = referralCode?.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalizedPhone.isEmpty,
              !verificationCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !trimmedUsername.isEmpty,
              !trimmedPassword.isEmpty else {
            authMessage = "Please fill all required fields."
            return
        }

        isLoadingAuth = true
        defer { isLoadingAuth = false }

        let payload = RegisterRequest(
            phone: normalizedPhone,
            verification_code: verificationCode.trimmingCharacters(in: .whitespacesAndNewlines),
            username: trimmedUsername,
            password: trimmedPassword,
            full_name: trimmedFullName?.isEmpty == false ? trimmedFullName : nil,
            referral_code: trimmedReferralCode?.isEmpty == false ? trimmedReferralCode : nil
        )

        do {
            let _: AuthUser = try await APIClient.shared.request(
                path: "/auth/register",
                method: "POST",
                body: payload
            )
            authMessage = nil
            await login(phone: normalizedPhone, password: trimmedPassword)
        } catch let error as APIError {
            handleAuthError(error)
        } catch {
            authMessage = error.localizedDescription
        }
    }

    func refreshSession() async {
        guard let token = TokenStore.shared.read(key: TokenStore.Keys.accessToken) else {
            forceLogout()
            return
        }
        do {
            let user: AuthUser = try await APIClient.shared.request(
                path: "/auth/me",
                token: token
            )
            currentUser = user
            isLoggedIn = true
            authMessage = nil
            await checkAppVersionIfNeeded(force: false)
        } catch let error as APIError {
            handleAuthError(error)
        } catch {
            forceLogout(message: Self.sessionExpiredMessage)
        }
    }

    func requireAccessToken() -> String? {
        guard let token = TokenStore.shared.read(key: TokenStore.Keys.accessToken) else {
            forceLogout(message: Self.sessionExpiredMessage)
            return nil
        }
        return token
    }

    func forceLogout(message: String? = nil) {
        let accessTokenBeforeLogout = TokenStore.shared.read(key: TokenStore.Keys.accessToken)
        PushNotificationManager.shared.unregisterCurrentTokenOnLogout(accessToken: accessTokenBeforeLogout)
        PushNotificationManager.shared.setAppBadge(0)

        TokenStore.shared.clear(key: TokenStore.Keys.accessToken)
        TokenStore.shared.clear(key: TokenStore.Keys.refreshToken)
        isLoggedIn = false
        currentUser = nil
        authMessage = message
        selectedTab = .home
        bookingStyleReference = nil
        bookOpenedFromStyleReference = false
        bookTabResetID = UUID()
        dealsTabResetID = UUID()
    }

    func openBookFlow(with styleReference: BookingStyleReference) {
        bookingStyleReference = styleReference
        bookOpenedFromStyleReference = true
        bookTabResetID = UUID()
        selectedTab = .book
    }

    func resetBookFlowSource() {
        bookOpenedFromStyleReference = false
    }

    func resetBookNavigationStack() {
        bookTabResetID = UUID()
    }

    func resetDealsNavigationStack() {
        dealsTabResetID = UUID()
    }

    func checkAppVersionIfNeeded(force: Bool) async {
        if isCheckingAppVersion {
            return
        }
        if !force,
           let lastVersionCheckAt,
           Date().timeIntervalSince(lastVersionCheckAt) < appVersionCheckInterval {
            return
        }

        isCheckingAppVersion = true
        defer {
            isCheckingAppVersion = false
            lastVersionCheckAt = Date()
        }

        let path = makeVersionCheckPath()
        guard !path.isEmpty else { return }

        do {
            let response: AppVersionCheckDTO = try await APIClient.shared.request(path: path)
            guard response.should_update else {
                appVersionPrompt = nil
                return
            }

            let latestVersion = response.latest_version?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let latestBuild = response.latest_build ?? -1
            let minSupportedVersion = response.min_supported_version?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let minSupportedBuild = response.min_supported_build ?? -1
            let signature = "\(latestVersion)|\(latestBuild)|\(minSupportedVersion)|\(minSupportedBuild)"

            if !response.force_update {
                let dismissedSignature = UserDefaults.standard.string(forKey: dismissedVersionSignatureKey)
                if dismissedSignature == signature {
                    return
                }
            }

            let defaultTitle = response.force_update ? "Update Required" : "Update Available"
            let defaultMessage = response.force_update
                ? "A newer version is required to continue. Please update your app."
                : "A newer version is available. Update now for the best experience."

            let appStoreURL = URL(string: response.app_store_url ?? "")
            appVersionPrompt = AppVersionPrompt(
                title: (response.update_title?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? defaultTitle,
                message: (response.update_message?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? defaultMessage,
                releaseNotes: response.release_notes,
                appStoreURL: appStoreURL,
                forceUpdate: response.force_update,
                signature: signature
            )
        } catch {
            // Keep startup/login path resilient when version endpoint is temporarily unavailable.
        }
    }

    func dismissAppVersionPrompt() {
        guard let prompt = appVersionPrompt else { return }
        if !prompt.forceUpdate {
            UserDefaults.standard.set(prompt.signature, forKey: dismissedVersionSignatureKey)
        }
        appVersionPrompt = nil
    }

    func clearAppVersionPromptWithoutPersisting() {
        appVersionPrompt = nil
    }

    private func makeVersionCheckPath() -> String {
        var items = [URLQueryItem(name: "platform", value: "ios")]
        if let version = currentBundleShortVersion(), !version.isEmpty {
            items.append(URLQueryItem(name: "current_version", value: version))
        }
        if let build = currentBundleBuildNumber() {
            items.append(URLQueryItem(name: "current_build", value: String(build)))
        }

        var components = URLComponents()
        components.queryItems = items
        guard let query = components.percentEncodedQuery, !query.isEmpty else {
            return ""
        }
        return "/app-version/check?\(query)"
    }

    private func currentBundleShortVersion() -> String? {
        let raw = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        let normalized = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return normalized.isEmpty ? nil : normalized
    }

    private func currentBundleBuildNumber() -> Int? {
        let raw = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
        let normalized = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !normalized.isEmpty else { return nil }
        return Int(normalized)
    }

    private func handleAuthError(_ error: APIError) {
        switch error {
        case .unauthorized:
            forceLogout(message: Self.sessionExpiredMessage)
        case .forbidden(let detail):
            forceLogout(message: detail)
        case .validation(let detail):
            authMessage = detail
        case .server(let detail):
            authMessage = detail
        case .network(let detail):
            authMessage = detail
        case .invalidURL:
            authMessage = "Invalid API configuration."
        case .decoding:
            authMessage = "Response parse failed."
        }
    }
}
