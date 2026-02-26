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

@MainActor
final class AppState: ObservableObject {
    nonisolated static let sessionExpiredMessage = "Session expired, please sign in again."
    @Published var isLoggedIn: Bool = false
    @Published var authMessage: String? = nil
    @Published var isLoadingAuth: Bool = false
    @Published var currentUser: AuthUser? = nil
    @Published var selectedTab: AppTab = .home
    @Published var bookingStyleReference: BookingStyleReference? = nil
    @Published var bookOpenedFromStyleReference: Bool = false
    @Published var bookTabResetID = UUID()
    private var unauthorizedObserver: NSObjectProtocol?

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
        TokenStore.shared.clear(key: TokenStore.Keys.accessToken)
        TokenStore.shared.clear(key: TokenStore.Keys.refreshToken)
        isLoggedIn = false
        currentUser = nil
        authMessage = message
        selectedTab = .home
        bookingStyleReference = nil
        bookOpenedFromStyleReference = false
        bookTabResetID = UUID()
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
