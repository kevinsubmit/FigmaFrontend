import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("NailsDash iOS")
                    .font(.largeTitle.bold())

                Text("Login + stores module connected")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text("API Base URL")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(APIClient.shared.baseURL)
                    .font(.footnote.monospaced())
                    .multilineTextAlignment(.center)

                if let user = appState.currentUser {
                    VStack(spacing: 4) {
                        Text(user.full_name ?? user.username)
                            .font(.headline)
                        Text(user.phone)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                NavigationLink {
                    StoresListView()
                } label: {
                    Text("Browse Stores")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)

                NavigationLink {
                    MyAppointmentsView()
                } label: {
                    Text("My Appointments")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                NavigationLink {
                    ProfileCenterView()
                        .environmentObject(appState)
                } label: {
                    Text("Profile")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button("Sign Out") {
                    appState.forceLogout()
                }
                .buttonStyle(.bordered)
            }
            .padding(24)
            .navigationTitle("Home")
        }
    }
}

#Preview {
    HomeView()
        .environmentObject(AppState())
}

private struct ProfileCenterView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        List {
            Section("Profile") {
                if let user = appState.currentUser {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(user.full_name ?? user.username)
                            .font(.headline)
                        Text(user.phone)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("Rewards") {
                NavigationLink("My Points") {
                    PointsView()
                        .environmentObject(appState)
                }
                NavigationLink("My Coupons") {
                    CouponsView()
                        .environmentObject(appState)
                }
                NavigationLink("My Gift Cards") {
                    GiftCardsView()
                        .environmentObject(appState)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Profile")
    }
}

private struct PointsBalanceDTO: Decodable {
    let user_id: Int
    let total_points: Int
    let available_points: Int
}

private struct PointTransactionDTO: Decodable, Identifiable {
    let id: Int
    let amount: Int
    let type: String
    let reason: String
    let description: String?
    let reference_type: String?
    let reference_id: Int?
    let created_at: String
}

private struct CouponTemplateDTO: Decodable {
    let id: Int
    let name: String
    let description: String?
    let type: String
    let category: String
    let discount_value: Double
    let min_amount: Double
    let max_discount: Double?
    let valid_days: Int
    let is_active: Bool
    let total_quantity: Int?
    let claimed_quantity: Int
    let points_required: Int?
    let created_at: String
}

private struct UserCouponDTO: Decodable, Identifiable {
    let id: Int
    let coupon_id: Int
    let status: String
    let source: String?
    let obtained_at: String
    let expires_at: String
    let used_at: String?
    let coupon: CouponTemplateDTO
}

private struct GiftCardDTO: Decodable, Identifiable {
    let id: Int
    let user_id: Int
    let purchaser_id: Int
    let card_number: String
    let recipient_phone: String?
    let recipient_message: String?
    let balance: Double
    let initial_balance: Double
    let status: String
    let expires_at: String?
    let claim_expires_at: String?
    let claimed_by_user_id: Int?
    let claimed_at: String?
    let created_at: String
    let updated_at: String
}

private struct ProfileRewardsService {
    func getPointsBalance(token: String) async throws -> PointsBalanceDTO {
        try await APIClient.shared.request(path: "/points/balance", token: token)
    }

    func getPointTransactions(token: String, limit: Int = 50) async throws -> [PointTransactionDTO] {
        try await APIClient.shared.request(path: "/points/transactions?skip=0&limit=\(limit)", token: token)
    }

    func getMyCoupons(token: String, status: String? = nil, limit: Int = 50) async throws -> [UserCouponDTO] {
        let suffix = status.map { "&status=\($0)" } ?? ""
        return try await APIClient.shared.request(path: "/coupons/my-coupons?skip=0&limit=\(limit)\(suffix)", token: token)
    }

    func getMyGiftCards(token: String, limit: Int = 50) async throws -> [GiftCardDTO] {
        try await APIClient.shared.request(path: "/gift-cards/my-cards?skip=0&limit=\(limit)", token: token)
    }

    func getExchangeableCoupons(token: String) async throws -> [CouponTemplateDTO] {
        try await APIClient.shared.request(path: "/coupons/exchangeable", token: token)
    }

    func exchangeCoupon(token: String, couponID: Int) async throws -> UserCouponDTO {
        try await APIClient.shared.request(path: "/coupons/exchange/\(couponID)", method: "POST", token: token)
    }
}

@MainActor
private final class PointsViewModel: ObservableObject {
    @Published var balance: PointsBalanceDTO?
    @Published var transactions: [PointTransactionDTO] = []
    @Published var exchangeables: [CouponTemplateDTO] = []
    @Published var isRedeemingCouponID: Int?
    @Published var actionMessage: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let b = service.getPointsBalance(token: token)
            async let t = service.getPointTransactions(token: token, limit: 50)
            async let e = service.getExchangeableCoupons(token: token)
            balance = try await b
            transactions = try await t
            exchangeables = try await e
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func exchange(token: String, couponID: Int) async {
        isRedeemingCouponID = couponID
        defer { isRedeemingCouponID = nil }
        do {
            let redeemed = try await service.exchangeCoupon(token: token, couponID: couponID)
            actionMessage = "Exchanged: \(redeemed.coupon.name)"
            await load(token: token)
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
private final class CouponsViewModel: ObservableObject {
    @Published var selectedStatus: String = "available"
    @Published var coupons: [UserCouponDTO] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            coupons = try await service.getMyCoupons(token: token, status: selectedStatus, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
private final class GiftCardsViewModel: ObservableObject {
    @Published var cards: [GiftCardDTO] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            cards = try await service.getMyGiftCards(token: token, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct PointsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = PointsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    var body: some View {
        List {
            if let balance = viewModel.balance {
                Section("Balance") {
                    detailRow("Available", value: "\(balance.available_points)")
                    detailRow("Total", value: "\(balance.total_points)")
                }
            }
            Section("Exchange Coupons") {
                ForEach(viewModel.exchangeables, id: \.id) { coupon in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(coupon.name)
                                .font(.headline)
                            Spacer()
                            if viewModel.isRedeemingCouponID == coupon.id {
                                ProgressView()
                            } else {
                                Button("Exchange") {
                                    Task { await doExchange(coupon.id) }
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(!canExchange(coupon))
                            }
                        }
                        Text(couponSummary(coupon))
                            .font(.subheadline)
                        if let required = coupon.points_required {
                            Text("Required points: \(required)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                if !viewModel.isLoading && viewModel.exchangeables.isEmpty {
                    Text("No exchangeable coupons right now")
                        .foregroundStyle(.secondary)
                }
            }
            Section("History") {
                ForEach(viewModel.transactions) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(item.reason)
                            Spacer()
                            Text(item.amount >= 0 ? "+\(item.amount)" : "\(item.amount)")
                                .foregroundStyle(item.amount >= 0 ? .green : .red)
                        }
                        if let desc = item.description, !desc.isEmpty {
                            Text(desc).font(.caption).foregroundStyle(.secondary)
                        }
                        Text(displayDate(item.created_at))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
                if !viewModel.isLoading && viewModel.transactions.isEmpty {
                    Text("No point history")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("My Points")
        .task { await reload() }
        .refreshable { await reload() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .onChange(of: viewModel.actionMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Notice", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading...")
            }
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }

    private func canExchange(_ coupon: CouponTemplateDTO) -> Bool {
        guard let required = coupon.points_required else { return false }
        return (viewModel.balance?.available_points ?? 0) >= required
    }

    private func doExchange(_ couponID: Int) async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.exchange(token: token, couponID: couponID)
    }
}

private struct CouponsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = CouponsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    var body: some View {
        List {
            Section {
                Picker("Status", selection: $viewModel.selectedStatus) {
                    Text("Available").tag("available")
                    Text("Used").tag("used")
                    Text("Expired").tag("expired")
                }
                .pickerStyle(.segmented)
            }
            Section("Coupons") {
                ForEach(viewModel.coupons) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.coupon.name)
                            .font(.headline)
                        Text(couponDiscount(item.coupon))
                            .font(.subheadline)
                        Text("Min spend: $\(String(format: "%.2f", item.coupon.min_amount))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("Expires: \(displayDate(item.expires_at))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
                if !viewModel.isLoading && viewModel.coupons.isEmpty {
                    Text("No coupons")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("My Coupons")
        .task { await reload() }
        .refreshable { await reload() }
        .onChange(of: viewModel.selectedStatus) { _ in
            Task { await reload() }
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Notice", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading...")
            }
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }

    private func couponDiscount(_ coupon: CouponTemplateDTO) -> String {
        if coupon.type.lowercased() == "percentage" {
            return "\(Int(coupon.discount_value))% OFF"
        }
        return "$\(String(format: "%.2f", coupon.discount_value)) OFF"
    }
}

private struct GiftCardsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = GiftCardsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    var body: some View {
        List {
            Section("Gift Cards") {
                ForEach(viewModel.cards) { card in
                    VStack(alignment: .leading, spacing: 4) {
                        detailRow("Card", value: card.card_number)
                        detailRow("Balance", value: "$\(String(format: "%.2f", card.balance))")
                        detailRow("Status", value: card.status.capitalized)
                        if let expiresAt = card.expires_at {
                            detailRow("Expires", value: displayDate(expiresAt))
                        }
                    }
                    .padding(.vertical, 4)
                }
                if !viewModel.isLoading && viewModel.cards.isEmpty {
                    Text("No gift cards")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("My Gift Cards")
        .task { await reload() }
        .refreshable { await reload() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Notice", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading...")
            }
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }
}

private func detailRow(_ title: String, value: String) -> some View {
    HStack {
        Text(title)
        Spacer()
        Text(value)
            .multilineTextAlignment(.trailing)
            .foregroundStyle(.secondary)
    }
}

private func displayDate(_ raw: String) -> String {
    let parser = ISO8601DateFormatter()
    if let date = parser.date(from: raw) {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    return raw
}

private func couponSummary(_ coupon: CouponTemplateDTO) -> String {
    if coupon.type.lowercased() == "percentage" {
        return "\(Int(coupon.discount_value))% OFF"
    }
    return "$\(String(format: "%.2f", coupon.discount_value)) OFF"
}

private func mapError(_ error: APIError) -> String {
    switch error {
    case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
        return detail
    case .unauthorized:
        return AppState.sessionExpiredMessage
    case .invalidURL:
        return "Invalid API URL"
    case .decoding:
        return "Unexpected response format"
    }
}
