import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView {
            NavigationStack {
                HomeFeedView()
            }
            .tabItem {
                Label("Home", systemImage: "house")
            }

            NavigationStack {
                StoresListView()
            }
            .tabItem {
                Label("Book", systemImage: "storefront")
            }

            NavigationStack {
                MyAppointmentsView()
            }
            .tabItem {
                Label("Appointments", systemImage: "calendar")
            }

            NavigationStack {
                DealsView()
            }
            .tabItem {
                Label("Deals", systemImage: "tag")
            }

            NavigationStack {
                ProfileCenterView()
                    .environmentObject(appState)
            }
            .tabItem {
                Label("Profile", systemImage: "person")
            }
        }
        .tint(UITheme.brandGold)
    }
}

#Preview {
    HomeView()
        .environmentObject(AppState())
}

private struct UnreadCountDTO: Decodable {
    let unread_count: Int
}

@MainActor
private final class ProfileCenterViewModel: ObservableObject {
    @Published var unreadCount: Int = 0
    @Published var points: Int = 0
    @Published var couponCount: Int = 0
    @Published var giftBalance: Double = 0
    @Published var completedOrders: Int = 0
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let rewardsService = ProfileRewardsService()
    private let appointmentsService: AppointmentsServiceProtocol

    init(appointmentsService: AppointmentsServiceProtocol = AppointmentsService()) {
        self.appointmentsService = appointmentsService
    }

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let unreadTask: UnreadCountDTO = APIClient.shared.request(path: "/notifications/unread-count", token: token)
            async let pointsTask = rewardsService.getPointsBalance(token: token)
            async let couponsTask = rewardsService.getMyCoupons(token: token, status: "available", limit: 100)
            async let giftCardsTask = rewardsService.getMyGiftCards(token: token, limit: 100)
            async let appointmentsTask = appointmentsService.getMyAppointments(token: token, limit: 200)

            let unread = try await unreadTask
            let pointsBalance = try await pointsTask
            let coupons = try await couponsTask
            let giftCards = try await giftCardsTask
            let appointments = try await appointmentsTask

            unreadCount = unread.unread_count
            points = pointsBalance.available_points
            couponCount = coupons.count
            giftBalance = giftCards
                .filter { $0.status.lowercased() != "expired" }
                .reduce(0) { $0 + max($1.balance, 0) }
            completedOrders = appointments.filter { $0.status.lowercased() == "completed" }.count
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct ProfileCenterView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProfileCenterViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let gridColumns = [GridItem(.flexible(), spacing: UITheme.spacing10), GridItem(.flexible(), spacing: UITheme.spacing10)]

    var body: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing14) {
                    profileHeaderCard
                    vipAccessCard
                    inviteFriendsCard
                    statsGrid
                    actionMenuCard
                    signOutButton
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing10)
                .padding(.bottom, UITheme.spacing28)
            }
        }
        .background(Color.black)
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .task { await reload() }
        .refreshable { await reload() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }

    private var topBar: some View {
        HStack {
            Spacer()
            HStack(spacing: UITheme.spacing10) {
                topIconButton(systemImage: "bell") {
                    alertMessage = "Notifications page is coming soon."
                    showAlert = true
                } badge: {
                    if viewModel.unreadCount > 0 {
                        Text(viewModel.unreadCount > 99 ? "99+" : "\(viewModel.unreadCount)")
                    }
                }

                topIconButton(systemImage: "gearshape") {
                    alertMessage = "Settings page is coming soon."
                    showAlert = true
                }
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing10)
        .padding(.bottom, UITheme.spacing2)
        .frame(maxWidth: .infinity)
        .background(Color.black)
    }

    private func topIconButton(systemImage: String, action: @escaping () -> Void) -> some View {
        topIconButton(systemImage: systemImage, action: action) {
            EmptyView()
        }
    }

    private func topIconButton<Badge: View>(systemImage: String, action: @escaping () -> Void, @ViewBuilder badge: () -> Badge) -> some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: systemImage)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                    .background(Color.white.opacity(0.05))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(brandGold.opacity(0.28), lineWidth: 1))

                badge()
                    .font(.system(size: UITheme.tinyBadgeFontSize, weight: .bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, UITheme.spacing5)
                    .padding(.vertical, UITheme.spacing2)
                    .background(brandGold)
                    .clipShape(Capsule())
                    .offset(x: 7, y: -6)
            }
        }
        .buttonStyle(.plain)
    }

    private var profileHeaderCard: some View {
        VStack(spacing: UITheme.spacing12) {
            profileAvatar

            Text(appState.currentUser?.full_name ?? appState.currentUser?.username ?? "User")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(displayPhone(appState.currentUser?.phone))
                .font(.subheadline)
                .foregroundStyle(Color.white.opacity(0.72))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
    }

    @ViewBuilder
    private var profileAvatar: some View {
        let avatarURL = avatarURLString(appState.currentUser?.avatar_url)
        if let avatarURL, let url = URL(string: avatarURL) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure:
                    fallbackAvatar
                @unknown default:
                    fallbackAvatar
                }
            }
            .frame(width: 116, height: 116)
            .clipShape(Circle())
            .overlay(Circle().stroke(brandGold, lineWidth: 3))
        } else {
            fallbackAvatar
                .frame(width: 116, height: 116)
                .clipShape(Circle())
                .overlay(Circle().stroke(brandGold, lineWidth: 3))
        }
    }

    private var fallbackAvatar: some View {
        ZStack {
            Color.white.opacity(0.08)
            Text(initials(from: appState.currentUser?.full_name ?? appState.currentUser?.username))
                .font(.title2.weight(.bold))
                .foregroundStyle(brandGold)
        }
    }

    private var vipAccessCard: some View {
        let pointsGoal = 1000
        let visitsGoal = 15
        let pointsProgress = min(max(Double(viewModel.points) / Double(pointsGoal), 0), 1)
        let visitProgress = min(max(Double(viewModel.completedOrders) / Double(visitsGoal), 0), 1)

        return VStack(alignment: .leading, spacing: UITheme.spacing12) {
            HStack(alignment: .top) {
                HStack(spacing: UITheme.spacing8) {
                    Text(viewModel.points >= 500 || viewModel.completedOrders >= 10 ? "VIP 2" : "VIP 1")
                        .font(.system(size: 44, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    Text("CURRENT")
                        .font(.caption.weight(.bold))
                        .kerning(1.0)
                        .foregroundStyle(.black)
                        .padding(.horizontal, UITheme.spacing9)
                        .padding(.vertical, UITheme.spacing5)
                        .background(brandGold)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                }

                Spacer()

                ZStack {
                    Circle()
                        .fill(brandGold.opacity(0.08))
                        .frame(width: 52, height: 52)
                    Image(systemName: "crown")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(brandGold)
                }
                .overlay(
                    Circle()
                        .stroke(brandGold.opacity(0.25), lineWidth: 1)
                )
            }

            Text("Member Access")
                .font(.title3.weight(.semibold))
                .foregroundStyle(brandGold)

            vipMetricBar(
                title: "Points",
                value: "\(viewModel.points) / \(pointsGoal)",
                progress: pointsProgress
            )

            vipMetricBar(
                title: "Visits",
                value: "\(viewModel.completedOrders) / \(visitsGoal)",
                progress: visitProgress
            )

            HStack(spacing: UITheme.spacing6) {
                Image(systemName: "arrow.up.right")
                    .font(.caption.weight(.semibold))
                Text("Next level to \(viewModel.points >= 500 || viewModel.completedOrders >= 10 ? "VIP 3" : "VIP 2")")
                    .font(.title3.weight(.bold))
            }
            .foregroundStyle(Color.white.opacity(0.52))
        }
        .padding(UITheme.spacing16)
        .background(
            LinearGradient(
                colors: [
                    cardBG.opacity(0.98),
                    Color(red: 43.0 / 255.0, green: 41.0 / 255.0, blue: 34.0 / 255.0),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(brandGold.opacity(0.44))
                .frame(height: UITheme.spacing1)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous)
                .stroke(brandGold.opacity(0.2), lineWidth: 1)
        )
    }

    private func vipMetricBar(title: String, value: String, progress: Double) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing6) {
            HStack {
                Text(title)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(Color.white.opacity(0.7))
                Spacer()
                Text(value)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(Color.white.opacity(0.76))
            }

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.12))
                    .frame(height: UITheme.spacing7)
                GeometryReader { proxy in
                    Capsule()
                        .fill(brandGold)
                        .frame(width: max(CGFloat(progress), 0.02) * proxy.size.width, height: UITheme.spacing7)
                }
            }
            .frame(height: UITheme.spacing7)
        }
    }

    private var inviteFriendsCard: some View {
        Button {
            alertMessage = "Invite flow is coming soon."
            showAlert = true
        } label: {
            HStack(spacing: UITheme.spacing12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(brandGold.opacity(0.14))
                        .frame(width: 72, height: 72)
                    Image(systemName: "gift.fill")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(brandGold)
                }

                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text("Invite Friends, Get $10")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                    Text("Share your love for nails and save")
                        .font(.title3.weight(.regular))
                        .foregroundStyle(Color.white.opacity(0.64))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(Color.white.opacity(0.42))
            }
            .padding(UITheme.spacing16)
            .background(
                LinearGradient(
                    colors: [cardBG.opacity(0.98), Color.white.opacity(0.02)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous)
                    .stroke(brandGold.opacity(0.16), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var statsGrid: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(spacing: UITheme.spacing6) {
                Circle()
                    .fill(brandGold)
                    .frame(width: 5, height: 5)
                Text("OVERVIEW")
                    .font(.caption.weight(.bold))
                    .kerning(2.0)
                    .foregroundStyle(.secondary)
            }

            LazyVGrid(columns: gridColumns, spacing: UITheme.spacing10) {
                profileStatCard(title: "Points", value: "\(viewModel.points)", icon: "sparkles", accent: brandGold)
                profileStatCard(title: "Coupons", value: "\(viewModel.couponCount)", icon: "ticket.fill", accent: .green)
                profileStatCard(title: "Gift Balance", value: "$\(String(format: "%.2f", viewModel.giftBalance))", icon: "gift.fill", accent: .cyan)
                profileStatCard(title: "Orders", value: "\(viewModel.completedOrders)", icon: "checkmark.seal.fill", accent: .orange)
            }
        }
    }

    private func profileStatCard(title: String, value: String, icon: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: UITheme.spacing8)
                        .fill(accent.opacity(0.14))
                        .frame(width: 28, height: 28)
                    Image(systemName: icon)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(accent)
                }
                Text(title.uppercased())
                    .font(.caption2.weight(.bold))
                    .kerning(1.0)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(UITheme.spacing13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [cardBG, Color.white.opacity(0.01)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(accent.opacity(0.8))
                .frame(height: UITheme.spacing2)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(0.14), lineWidth: 1)
        )
    }

    private var actionMenuCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("TOOLS")
                .font(.caption.weight(.bold))
                .kerning(2.2)
                .foregroundStyle(.secondary)

            VStack(spacing: 0) {
                profileLinkRow(
                    title: "My Points",
                    subtitle: "View balance and history",
                    systemImage: "sparkles"
                ) {
                    PointsView()
                        .environmentObject(appState)
                }
                rowDivider
                profileLinkRow(
                    title: "My Coupons",
                    subtitle: "Manage available/used/expired",
                    systemImage: "ticket.fill"
                ) {
                    CouponsView()
                        .environmentObject(appState)
                }
                rowDivider
                profileLinkRow(
                    title: "My Gift Cards",
                    subtitle: "Check card balances",
                    systemImage: "gift.fill"
                ) {
                    GiftCardsView()
                        .environmentObject(appState)
                }
            }
            .padding(.horizontal, UITheme.spacing4)
        }
        .padding(UITheme.cardPadding)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius)
                .stroke(brandGold.opacity(0.18), lineWidth: 1)
        )
    }

    private var signOutButton: some View {
        Button(role: .destructive) {
            appState.forceLogout()
        } label: {
            Text("Sign Out")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(minHeight: UITheme.ctaHeight)
                .background(Color.red.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
        }
        .buttonStyle(.plain)
        .foregroundStyle(.red)
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                .stroke(Color.red.opacity(0.35), lineWidth: 1)
        )
    }

    private func profileLinkRow<Destination: View>(
        title: String,
        subtitle: String,
        systemImage: String,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: UITheme.spacing12) {
                Image(systemName: systemImage)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(brandGold)
                    .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                    .background(brandGold.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                    .overlay(
                        RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                            .stroke(brandGold.opacity(0.22), lineWidth: 1)
                    )
                VStack(alignment: .leading, spacing: UITheme.spacing2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.62))
                }
                Spacer()
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.05))
                        .frame(width: UITheme.miniControlSize, height: UITheme.miniControlSize)
                    Image(systemName: "chevron.right")
                        .font(.caption.bold())
                        .foregroundStyle(Color.white.opacity(0.72))
                }
            }
            .padding(.vertical, UITheme.spacing10)
        }
        .buttonStyle(.plain)
    }

    private var rowDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.08))
            .frame(height: UITheme.spacing1)
            .padding(.horizontal, UITheme.spacing2)
    }

    private func displayPhone(_ raw: String?) -> String {
        guard let raw, !raw.isEmpty else { return "-" }
        let digits = raw.filter { $0.isNumber }
        if digits.count >= 4 {
            return "***\(digits.suffix(4))"
        }
        return raw
    }

    private func initials(from name: String?) -> String {
        guard let name, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return "U"
        }
        let components = name.split(separator: " ").map(String.init)
        if components.count >= 2 {
            return "\(components[0].prefix(1))\(components[1].prefix(1))".uppercased()
        }
        return String(name.prefix(1)).uppercased()
    }

    private func avatarURLString(_ raw: String?) -> String? {
        guard let raw, !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        if raw.lowercased().hasPrefix("http") {
            return raw
        }
        let base = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        return "\(base)\(raw)"
    }
}

private struct HomeFeedPinDTO: Decodable, Identifiable {
    let id: Int
    let title: String
    let image_url: String
    let description: String?
    let tags: [String]
    let created_at: String

    var imageURL: URL? {
        if image_url.lowercased().hasPrefix("http") {
            return URL(string: image_url)
        }
        let base = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        return URL(string: "\(base)\(image_url)")
    }
}

private struct HomeFeedService {
    func getTags() async throws -> [String] {
        try await APIClient.shared.request(path: "/pins/tags")
    }

    func getPins(skip: Int, limit: Int, tag: String?, search: String?) async throws -> [HomeFeedPinDTO] {
        var params: [String] = ["skip=\(skip)", "limit=\(limit)"]
        if let tag, !tag.isEmpty {
            let encoded = tag.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? tag
            params.append("tag=\(encoded)")
        }
        if let search, !search.isEmpty {
            let encoded = search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? search
            params.append("search=\(encoded)")
        }
        return try await APIClient.shared.request(path: "/pins?\(params.joined(separator: "&"))")
    }

    func getPinByID(_ pinID: Int) async throws -> HomeFeedPinDTO {
        try await APIClient.shared.request(path: "/pins/\(pinID)")
    }

    func checkFavorite(pinID: Int, token: String) async throws -> Bool {
        struct FavoriteStatusDTO: Decodable {
            let pin_id: Int
            let is_favorited: Bool
        }
        let row: FavoriteStatusDTO = try await APIClient.shared.request(
            path: "/pins/\(pinID)/is-favorited",
            token: token
        )
        return row.is_favorited
    }

    func setFavorite(pinID: Int, token: String, favorited: Bool) async throws {
        if favorited {
            let _: [String: String] = try await APIClient.shared.request(
                path: "/pins/\(pinID)/favorite",
                method: "POST",
                token: token
            )
        } else {
            let _: [String: String] = try await APIClient.shared.request(
                path: "/pins/\(pinID)/favorite",
                method: "DELETE",
                token: token
            )
        }
    }
}

@MainActor
private final class HomeFeedViewModel: ObservableObject {
    @Published var tags: [String] = ["All"]
    @Published var selectedTag: String = "All"
    @Published var searchDraft: String = ""
    @Published var searchQuery: String = ""
    @Published var pins: [HomeFeedPinDTO] = []
    @Published var isLoading: Bool = false
    @Published var isLoadingMore: Bool = false
    @Published var hasMore: Bool = true
    @Published var errorMessage: String?

    private let service = HomeFeedService()
    private let initialPageSize = 12
    private let loadMorePageSize = 8
    private var offset = 0
    private var didLoadOnce = false

    func loadIfNeeded() async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await refresh()
    }

    func refresh() async {
        await loadTags()
        await loadPins(reset: true)
    }

    func loadMoreIfNeeded(current pin: HomeFeedPinDTO) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        guard let last = pins.last, last.id == pin.id else { return }
        await loadPins(reset: false)
    }

    func selectTag(_ tag: String) async {
        guard tag != selectedTag else { return }
        selectedTag = tag
        searchDraft = ""
        searchQuery = ""
        await loadPins(reset: true)
    }

    func applySearch() async {
        searchQuery = searchDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        selectedTag = "All"
        await loadPins(reset: true)
    }

    func clearSearch() async {
        searchDraft = ""
        searchQuery = ""
        selectedTag = "All"
        await loadPins(reset: true)
    }

    private func loadTags() async {
        do {
            let names = try await service.getTags()
            let normalized = ["All"] + names.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            tags = Array(NSOrderedSet(array: normalized)) as? [String] ?? ["All"]
            if !tags.contains(selectedTag) {
                selectedTag = "All"
            }
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadPins(reset: Bool) async {
        if reset {
            isLoading = true
            offset = 0
            hasMore = true
        } else {
            isLoadingMore = true
        }
        defer {
            if reset {
                isLoading = false
            } else {
                isLoadingMore = false
            }
        }

        let pageSize = reset ? initialPageSize : loadMorePageSize
        do {
            let tag = selectedTag == "All" ? nil : selectedTag
            let rows = try await service.getPins(
                skip: offset,
                limit: pageSize,
                tag: tag,
                search: searchQuery.isEmpty ? nil : searchQuery
            )
            if reset {
                pins = rows
            } else {
                pins.append(contentsOf: rows)
            }
            offset += rows.count
            hasMore = rows.count == pageSize
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
            hasMore = false
        } catch {
            errorMessage = error.localizedDescription
            hasMore = false
        }
    }
}

private struct HomeFeedView: View {
    @StateObject private var viewModel = HomeFeedViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold

    private let columns = [
        GridItem(.flexible(), spacing: UITheme.spacing12),
        GridItem(.flexible(), spacing: UITheme.spacing12),
    ]

    var body: some View {
        VStack(spacing: 0) {
            headerSearchArea

            ScrollView {
                if let error = viewModel.errorMessage, !error.isEmpty {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red.opacity(0.9))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, UITheme.pagePadding)
                        .padding(.top, UITheme.spacing8)
                }

                LazyVGrid(columns: columns, spacing: UITheme.spacing10) {
                    ForEach(Array(viewModel.pins.enumerated()), id: \.element.id) { index, pin in
                        NavigationLink {
                            HomeFeedPinDetailView(pin: pin)
                        } label: {
                            pinCard(pin, index: index)
                        }
                        .buttonStyle(.plain)
                        .onAppear {
                            Task { await viewModel.loadMoreIfNeeded(current: pin) }
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing16)

                if !viewModel.isLoading && viewModel.pins.isEmpty {
                    UnifiedEmptyStateCard(
                        icon: "photo.on.rectangle.angled",
                        title: viewModel.searchQuery.isEmpty ? "No images yet" : "No images found",
                        subtitle: viewModel.searchQuery.isEmpty
                            ? "New inspiration will appear here."
                            : "Try another search keyword.",
                        compact: true
                    )
                    .padding(.horizontal, UITheme.pagePadding)
                    .padding(.bottom, UITheme.spacing8)
                }

                if viewModel.isLoadingMore {
                    ProgressView()
                        .tint(brandGold)
                        .padding(.vertical, UITheme.spacing14)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .background(Color.black)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
        .task {
            await viewModel.loadIfNeeded()
        }
        .refreshable {
            await viewModel.refresh()
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
    }

    private var headerSearchArea: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            ZStack {
                TextField("Search by title (e.g. Classic French Set)", text: $viewModel.searchDraft)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit {
                        Task { await viewModel.applySearch() }
                    }
                    .padding(.leading, UITheme.spacing42)
                    .padding(.trailing, UITheme.spacing36)
                    .frame(minHeight: UITheme.controlHeight)
                    .background(Color(red: 26.0 / 255.0, green: 26.0 / 255.0, blue: 26.0 / 255.0))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(brandGold.opacity(0.22), lineWidth: 1)
                    )
                    .overlay(alignment: .leading) {
                        Button {
                            Task { await viewModel.applySearch() }
                        } label: {
                            Image(systemName: "magnifyingglass")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                        }
                        .buttonStyle(.plain)
                        .padding(.leading, UITheme.spacing5)
                    }
                    .overlay(alignment: .trailing) {
                        if !viewModel.searchDraft.isEmpty {
                            Button {
                                Task { await viewModel.clearSearch() }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                    .frame(width: UITheme.compactControlSize, height: UITheme.compactControlSize)
                                    .background(Color.white.opacity(0.07))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                            .padding(.trailing, UITheme.spacing8 - 1)
                        }
                    }
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.top, UITheme.spacing8)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: UITheme.spacing8) {
                    ForEach(viewModel.tags, id: \.self) { tag in
                        Button {
                            Task { await viewModel.selectTag(tag) }
                        } label: {
                            Text(tag)
                                .font(.footnote.weight(.semibold))
                                .padding(.horizontal, UITheme.pillHorizontalPadding + 4)
                                .frame(minHeight: UITheme.segmentHeight)
                                .background(viewModel.selectedTag == tag ? brandGold : Color(red: 26.0 / 255.0, green: 26.0 / 255.0, blue: 26.0 / 255.0))
                                .foregroundStyle(viewModel.selectedTag == tag ? Color.black : Color.white)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(viewModel.selectedTag == tag ? Color.clear : brandGold.opacity(0.26), lineWidth: 1)
                                )
                                .shadow(color: viewModel.selectedTag == tag ? brandGold.opacity(0.25) : .clear, radius: 6, y: 2)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.bottom, UITheme.spacing6)
            }
        }
        .padding(.bottom, UITheme.spacing8)
        .background(
            LinearGradient(
                colors: [Color.black, Color.black.opacity(0.96)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private func pinCard(_ pin: HomeFeedPinDTO, index: Int) -> some View {
        AsyncImage(url: pin.imageURL) { phase in
            switch phase {
            case .empty:
                ProgressView()
                    .tint(brandGold)
                    .frame(maxWidth: .infinity, minHeight: pinCardHeight(index), maxHeight: pinCardHeight(index))
                    .background(Color.gray.opacity(0.14))
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, minHeight: pinCardHeight(index), maxHeight: pinCardHeight(index))
                    .clipped()
            case .failure:
                Color.gray.opacity(0.2)
                    .frame(maxWidth: .infinity, minHeight: pinCardHeight(index), maxHeight: pinCardHeight(index))
                    .overlay(Text("Image unavailable").font(.caption).foregroundStyle(.secondary))
            @unknown default:
                Color.gray.opacity(0.2)
                    .frame(maxWidth: .infinity, minHeight: pinCardHeight(index), maxHeight: pinCardHeight(index))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }

    private func pinCardHeight(_ index: Int) -> CGFloat {
        switch index % 3 {
        case 0:
            return 248
        case 1:
            return 292
        default:
            return 262
        }
    }
}

@MainActor
private final class HomeFeedPinDetailViewModel: ObservableObject {
    @Published var pin: HomeFeedPinDTO
    @Published var relatedPins: [HomeFeedPinDTO] = []
    @Published var isLoading: Bool = false
    @Published var isFavorited: Bool = false
    @Published var isFavoriteLoading: Bool = false
    @Published var errorMessage: String?

    private let service = HomeFeedService()

    init(pin: HomeFeedPinDTO) {
        self.pin = pin
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let detailTask = service.getPinByID(pin.id)
            async let relatedTask = loadRelated()
            pin = try await detailTask
            relatedPins = try await relatedTask
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadFavoriteState(token: String?) async {
        guard let token else {
            isFavorited = false
            return
        }
        do {
            isFavorited = try await service.checkFavorite(pinID: pin.id, token: token)
        } catch {
            isFavorited = false
        }
    }

    func toggleFavorite(token: String) async {
        isFavoriteLoading = true
        defer { isFavoriteLoading = false }
        do {
            try await service.setFavorite(pinID: pin.id, token: token, favorited: !isFavorited)
            isFavorited.toggle()
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadRelated() async throws -> [HomeFeedPinDTO] {
        guard let primaryTag = pin.tags.first, !primaryTag.isEmpty else { return [] }
        let rows = try await service.getPins(skip: 0, limit: 8, tag: primaryTag, search: nil)
        return rows.filter { $0.id != pin.id }
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .invalidURL:
            return "Invalid API endpoint."
        case .decoding:
            return "Unexpected response from server."
        }
    }
}

private struct HomeFeedPinDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: HomeFeedPinDetailViewModel
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var showStoresList: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let relatedColumns = [GridItem(.flexible(), spacing: UITheme.spacing12), GridItem(.flexible(), spacing: UITheme.spacing12)]

    init(pin: HomeFeedPinDTO) {
        _viewModel = StateObject(wrappedValue: HomeFeedPinDetailViewModel(pin: pin))
    }

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    heroImageSection

                    VStack(alignment: .leading, spacing: UITheme.spacing14) {
                        titleInfoSection
                        if !viewModel.relatedPins.isEmpty {
                            relatedSection
                        }
                    }
                    .padding(.horizontal, UITheme.pagePadding)
                    .padding(.top, -22)
                    .padding(.bottom, 118)
                }
            }
            .background(Color.black)

            topBarOverlay
        }
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(isPresented: $showStoresList) {
            StoresListView()
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            floatingBookNowStrip
        }
        .tint(brandGold)
        .background(Color.black)
        .task {
            await viewModel.load()
            let token = TokenStore.shared.read(key: TokenStore.Keys.accessToken)
            await viewModel.loadFavoriteState(token: token)
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
    }

    private var heroImageSection: some View {
        ZStack(alignment: .bottom) {
            AsyncImage(url: viewModel.pin.imageURL) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        Color.gray.opacity(0.2)
                        ProgressView().tint(.white)
                    }
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    Color.gray.opacity(0.2)
                        .overlay(Text("Image unavailable").font(.caption).foregroundStyle(.white))
                @unknown default:
                    Color.gray.opacity(0.2)
                }
            }
            .frame(height: 560)
            .frame(maxWidth: .infinity)
            .clipped()

            LinearGradient(
                colors: [.clear, Color.black.opacity(0.72)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 220)
        }
        .frame(height: 560)
    }

    private var titleInfoSection: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text("CHOSEN DESIGN")
                .font(.caption.weight(.semibold))
                .kerning(UITheme.sectionHeaderKerning)
                .foregroundStyle(Color.white.opacity(0.58))
            Text(viewModel.pin.title)
                .font(.system(size: 46, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
            if let description = viewModel.pin.description, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(Color.white.opacity(0.72))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(UITheme.spacing16)
        .background(cardBG.opacity(0.96))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(brandGold.opacity(0.36))
                .frame(height: UITheme.spacing1)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous)
                .stroke(brandGold.opacity(0.22), lineWidth: 1)
        )
    }

    private var floatingBookNowStrip: some View {
        HStack(alignment: .center, spacing: UITheme.spacing12) {
            VStack(alignment: .leading, spacing: UITheme.spacing2) {
                Text("BOOK THIS LOOK")
                    .font(.caption.weight(.bold))
                    .kerning(UITheme.sectionHeaderKerning)
                    .foregroundStyle(Color.white.opacity(0.45))
                Text("Find salons near you")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
            }

            Spacer(minLength: UITheme.spacing8)

            Button {
                showStoresList = true
            } label: {
                Text("Choose a salon")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, UITheme.spacing18)
                    .frame(minHeight: UITheme.ctaHeight + 2)
                    .background(brandGold)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, UITheme.spacing16)
        .padding(.vertical, UITheme.spacing14)
        .background(cardBG.opacity(0.95))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(brandGold.opacity(0.16), lineWidth: 1)
        )
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.bottom, UITheme.spacing8)
        .background(Color.black.opacity(0.001))
    }

    private var relatedSection: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("SIMILAR IDEAS")
                .font(.caption.weight(.semibold))
                .kerning(UITheme.sectionHeaderKerning)
                .foregroundStyle(Color.white.opacity(0.58))

            LazyVGrid(columns: relatedColumns, spacing: UITheme.spacing12) {
                ForEach(Array(viewModel.relatedPins.prefix(6))) { related in
                    NavigationLink {
                        HomeFeedPinDetailView(pin: related)
                            .environmentObject(appState)
                    } label: {
                        relatedPinCard(related)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(UITheme.spacing16)
        .background(cardBG.opacity(0.96))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(brandGold.opacity(0.30))
                .frame(height: UITheme.spacing1)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous))
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius, style: .continuous)
                .stroke(brandGold.opacity(0.18), lineWidth: 1)
        )
    }

    private func relatedPinCard(_ pin: HomeFeedPinDTO) -> some View {
        AsyncImage(url: pin.imageURL) { phase in
            switch phase {
            case .empty:
                ZStack {
                    Color.gray.opacity(0.24)
                    ProgressView().tint(.white)
                }
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .failure:
                Color.gray.opacity(0.22)
            @unknown default:
                Color.gray.opacity(0.22)
            }
        }
        .frame(height: 208)
        .frame(maxWidth: .infinity)
        .clipped()
        .overlay(alignment: .bottomLeading) {
            LinearGradient(
                colors: [.clear, Color.black.opacity(0.65)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 90)
            .overlay(alignment: .bottomLeading) {
                Text(pin.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .padding(.horizontal, UITheme.spacing10)
                    .padding(.bottom, UITheme.spacing10)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius, style: .continuous)
                .stroke(brandGold.opacity(0.15), lineWidth: 1)
        )
    }

    private var topBarOverlay: some View {
        LinearGradient(
            colors: [Color.black.opacity(0.75), .clear],
            startPoint: .top,
            endPoint: .bottom
        )
        .frame(height: 130)
        .overlay(alignment: .top) {
            HStack(spacing: UITheme.spacing10) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: UITheme.floatingControlSize, height: UITheme.floatingControlSize)
                        .background(Color.black.opacity(0.62))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Spacer()

                HStack(spacing: UITheme.spacing10) {
                    shareButton
                    favoriteButton
                }
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.top, UITheme.spacing52)
        }
        .ignoresSafeArea(edges: .top)
    }

    private var shareButton: some View {
        ShareLink(item: sharePayload) {
            ZStack {
                Circle()
                    .fill(Color.black.opacity(0.62))
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: UITheme.navIconSize, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: UITheme.floatingControlSize, height: UITheme.floatingControlSize)
        }
        .buttonStyle(.plain)
    }

    private var sharePayload: String {
        if let url = viewModel.pin.imageURL?.absoluteString, !url.isEmpty {
            return url
        }
        return viewModel.pin.title
    }

    private var favoriteButton: some View {
        Button {
            guard let token = TokenStore.shared.read(key: TokenStore.Keys.accessToken) else {
                alertMessage = "Please sign in to save favorites."
                showAlert = true
                return
            }
            Task { await viewModel.toggleFavorite(token: token) }
        } label: {
            ZStack {
                Circle()
                    .fill(Color.black.opacity(0.62))
                if viewModel.isFavoriteLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.85)
                } else {
                    Image(systemName: viewModel.isFavorited ? "heart.fill" : "heart")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(viewModel.isFavorited ? brandGold : .white)
                }
            }
            .frame(width: UITheme.floatingControlSize, height: UITheme.floatingControlSize)
        }
        .buttonStyle(.plain)
    }
}

private struct PromotionServiceRuleDTO: Decodable, Identifiable {
    let id: Int
    let service_id: Int
    let min_price: Double?
    let max_price: Double?
}

private struct PromotionDTO: Decodable, Identifiable {
    let id: Int
    let scope: String
    let store_id: Int?
    let title: String
    let type: String
    let discount_type: String
    let discount_value: Double
    let rules: String?
    let start_at: String
    let end_at: String
    let is_active: Bool
    let created_at: String
    let updated_at: String
    let service_rules: [PromotionServiceRuleDTO]
}

private struct DealsService {
    func getPromotions() async throws -> [PromotionDTO] {
        try await APIClient.shared.request(path: "/promotions?skip=0&limit=100&active_only=true&include_platform=true")
    }

    func getStores() async throws -> [StoreDTO] {
        try await APIClient.shared.request(path: "/stores?skip=0&limit=200")
    }
}

private enum DealsSegment: String, CaseIterable, Identifiable {
    case store = "Store Deals"
    case platform = "Platform Deals"

    var id: String { rawValue }
}

@MainActor
private final class DealsViewModel: ObservableObject {
    @Published var selectedSegment: DealsSegment = .store
    @Published var promotions: [PromotionDTO] = []
    @Published var storesByID: [Int: StoreDTO] = [:]
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let service = DealsService()

    var filtered: [PromotionDTO] {
        switch selectedSegment {
        case .store:
            return promotions.filter { $0.scope.lowercased() != "platform" }
        case .platform:
            return promotions.filter { $0.scope.lowercased() == "platform" }
        }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let promoTask = service.getPromotions()
            async let storeTask = service.getStores()
            let promoRows = try await promoTask
            let storeRows = try await storeTask
            promotions = promoRows
            storesByID = Dictionary(uniqueKeysWithValues: storeRows.map { ($0.id, $0) })
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .invalidURL:
            return "Invalid API endpoint."
        case .decoding:
            return "Unexpected response from server."
        }
    }
}

private struct DealsView: View {
    @StateObject private var viewModel = DealsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            dealsHeader

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing12) {
                    if !viewModel.isLoading && viewModel.filtered.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "tag.fill",
                            title: "No active deals right now",
                            subtitle: "Check back soon for new offers.",
                            compact: true
                        )
                    } else {
                        ForEach(viewModel.filtered) { promotion in
                            dealRow(promotion)
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing12)
                .padding(.bottom, UITheme.spacing26)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .background(Color.black)
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
    }

    private var dealsHeader: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("DEALS")
                .font(.caption.weight(.semibold))
                .kerning(UITheme.sectionHeaderKerning)
                .foregroundStyle(brandGold.opacity(0.9))
            Text("Limited-time offers")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: UITheme.spacing8) {
                segmentButton(.store)
                segmentButton(.platform)
            }
            .frame(maxWidth: .infinity)
            .padding(UITheme.spacing4)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                    .stroke(brandGold.opacity(0.16), lineWidth: 1)
            )
            .padding(.top, UITheme.spacing2)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.black, Color.black.opacity(0.96)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private func segmentButton(_ segment: DealsSegment) -> some View {
        Button {
            viewModel.selectedSegment = segment
        } label: {
            Text(segment.rawValue)
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, UITheme.pillHorizontalPadding)
                .frame(maxWidth: .infinity)
                .frame(minHeight: UITheme.segmentHeight)
                .background(viewModel.selectedSegment == segment ? brandGold : Color.clear)
                .foregroundStyle(viewModel.selectedSegment == segment ? .black : Color.white.opacity(0.86))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                        .stroke(viewModel.selectedSegment == segment ? Color.clear : brandGold.opacity(0.24), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func dealRow(_ promotion: PromotionDTO) -> some View {
        let store = promotion.store_id.flatMap { viewModel.storesByID[$0] }
        let hasStore = store != nil
        let scopeLabel = hasStore ? "STORE DEAL" : "PLATFORM DEAL"
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                Group {
                    if let store, let coverURL = storeCoverURL(store) {
                        AsyncImage(url: coverURL) { phase in
                            switch phase {
                            case .empty:
                                ZStack {
                                    Color.white.opacity(0.03)
                                    ProgressView().tint(brandGold)
                                }
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                            case .failure:
                                dealCoverFallback
                            @unknown default:
                                dealCoverFallback
                            }
                        }
                    } else {
                        dealCoverFallback
                    }
                }
                .frame(height: UITheme.dealCoverHeight)
                .frame(maxWidth: .infinity)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [Color.black.opacity(0.06), Color.black.opacity(0.82)],
                        startPoint: .center,
                        endPoint: .bottom
                    )
                )

                Text(formatOffer(promotion))
                    .font(.caption.bold())
                    .padding(.horizontal, UITheme.pillHorizontalPadding)
                    .padding(.vertical, UITheme.compactPillVerticalPadding + 1)
                    .background(brandGold)
                    .foregroundStyle(.black)
                    .clipShape(Capsule())
                    .padding(UITheme.spacing10)
            }
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))

            VStack(alignment: .leading, spacing: UITheme.spacing12) {
                HStack(alignment: .top, spacing: UITheme.spacing8) {
                    VStack(alignment: .leading, spacing: UITheme.spacing5) {
                        Text(promotion.title)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                        Text(hasStore ? (store?.name ?? "Store Offer") : "Platform Offer")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.78))
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    Text(scopeLabel)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                        .padding(.vertical, UITheme.compactPillVerticalPadding)
                        .background(Color.white.opacity(0.05))
                        .foregroundStyle(.secondary)
                        .clipShape(Capsule())
                }

                HStack(spacing: UITheme.spacing4 + 1) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text(formatExpiry(promotion.end_at))
                        .font(.caption)
                }
                .foregroundStyle(Color.white.opacity(0.74))
                .padding(.horizontal, UITheme.compactPillHorizontalPadding + 1)
                .padding(.vertical, UITheme.compactPillVerticalPadding + 1)
                .background(Color.white.opacity(0.04))
                .clipShape(Capsule())

                if let store {
                    HStack(spacing: UITheme.spacing4 + 1) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.caption2)
                            .foregroundStyle(brandGold)
                        Text(store.formattedAddress)
                            .font(.footnote)
                            .lineLimit(1)
                    }
                    .foregroundStyle(Color.white.opacity(0.72))
                }

                HStack(spacing: UITheme.spacing8) {
                    if let firstRule = promotion.service_rules.first {
                        Text(formatPriceRange(min: firstRule.min_price, max: firstRule.max_price))
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                            .padding(.vertical, UITheme.compactPillVerticalPadding)
                            .background(Color.white.opacity(0.04))
                            .clipShape(Capsule())
                    }
                    Text(promotion.type.uppercased())
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                        .padding(.vertical, UITheme.compactPillVerticalPadding)
                        .background(Color.white.opacity(0.04))
                        .clipShape(Capsule())
                        .foregroundStyle(.secondary)
                }

                if let rules = promotion.rules, !rules.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Text(rules)
                        .font(.footnote)
                        .foregroundStyle(Color.white.opacity(0.66))
                        .lineLimit(3)
                }

                if let store {
                    NavigationLink {
                        StoreDetailView(storeID: store.id)
                    } label: {
                        HStack(spacing: UITheme.spacing6) {
                            Text("Book Now")
                            Image(systemName: "arrow.right")
                                .font(.caption.weight(.semibold))
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        .background(brandGold)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                } else {
                    NavigationLink {
                        StoresListView()
                    } label: {
                        HStack(spacing: UITheme.spacing6) {
                            Text("Browse Stores")
                            Image(systemName: "arrow.right")
                                .font(.caption.weight(.semibold))
                        }
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        .background(Color.white.opacity(0.04))
                        .foregroundStyle(brandGold)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(brandGold.opacity(0.28), lineWidth: 1)
                        )
                    }
                        .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, UITheme.cardPadding)
            .padding(.top, UITheme.spacing12)
            .padding(.bottom, UITheme.cardPadding)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(brandGold.opacity(0.42))
                .frame(height: UITheme.spacing1)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.22), radius: 6, y: 3)
    }

    private var dealCoverFallback: some View {
        LinearGradient(
            colors: [
                Color(red: 45.0 / 255.0, green: 34.0 / 255.0, blue: 10.0 / 255.0),
                Color(red: 22.0 / 255.0, green: 22.0 / 255.0, blue: 22.0 / 255.0),
                Color.black,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func storeCoverURL(_ store: StoreDTO) -> URL? {
        guard let raw = store.image_url?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty else {
            return nil
        }
        if raw.lowercased().hasPrefix("http") {
            return URL(string: raw)
        }
        let base = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        return URL(string: "\(base)\(raw)")
    }

    private func formatOffer(_ promotion: PromotionDTO) -> String {
        if promotion.discount_type.lowercased() == "percentage" {
            return "\(Int(promotion.discount_value))% OFF"
        }
        return "$\(String(format: "%.0f", promotion.discount_value)) OFF"
    }

    private func formatPriceRange(min: Double?, max: Double?) -> String {
        if min == nil && max == nil { return "All prices" }
        if let min, let max { return "$\(Int(min)) - $\(Int(max))" }
        if let min { return "From $\(Int(min))" }
        if let max { return "Up to $\(Int(max))" }
        return "All prices"
    }

    private func formatExpiry(_ endAt: String) -> String {
        let parser = ISO8601DateFormatter()
        guard let endDate = parser.date(from: endAt) else { return "Ends soon" }
        let now = Date()
        let diff = endDate.timeIntervalSince(now)
        if diff <= 0 { return "Expired" }
        let days = Int(ceil(diff / 86400))
        if days == 1 { return "Ends today" }
        if days < 7 { return "Ends in \(days) days" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MMM d"
        return "Ends on \(formatter.string(from: endDate))"
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

private struct RewardsTopBar: View {
    let title: String
    let onBack: () -> Void

    var body: some View {
        HStack(spacing: UITheme.spacing10) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: UITheme.navIconSize, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
                    .background(Color.white.opacity(0.07))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)

            Spacer()
            Color.clear.frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.black, Color.black.opacity(0.96)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }
}

private struct UnifiedLoadingOverlay: View {
    let isLoading: Bool
    var message: String = "Loading..."

    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: UITheme.spacing10) {
                    ProgressView()
                        .tint(UITheme.brandGold)
                    Text(message)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, UITheme.spacing20)
                .padding(.vertical, UITheme.spacing16)
                .background(UITheme.cardBackground.opacity(0.96))
                .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.sectionCorner))
                .overlay(
                    RoundedRectangle(cornerRadius: RewardsVisualTokens.sectionCorner)
                        .stroke(UITheme.brandGold.opacity(RewardsVisualTokens.thinBorderOpacity), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.28), radius: 8, y: 3)
            }
        }
    }
}

private struct UnifiedEmptyStateCard: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    var compact: Bool = false

    var body: some View {
        VStack(spacing: compact ? 10 : 12) {
            ZStack {
                Circle()
                    .fill(UITheme.brandGold.opacity(0.12))
                    .frame(width: compact ? 64 : 72, height: compact ? 64 : 72)
                Circle()
                    .stroke(UITheme.brandGold.opacity(0.32), lineWidth: 1)
                    .frame(width: compact ? 64 : 72, height: compact ? 64 : 72)
                Image(systemName: icon)
                    .font(.system(size: compact ? 26 : 30, weight: .medium))
                    .foregroundStyle(UITheme.brandGold)
            }

            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.9))
                .multilineTextAlignment(.center)

            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, compact ? 20 : 24)
        .padding(.horizontal, UITheme.pagePadding)
        .background(Color.white.opacity(0.03))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(UITheme.brandGold.opacity(RewardsVisualTokens.thinBorderOpacity), lineWidth: 1)
        )
    }
}

private struct UnifiedSectionHeader: View {
    let title: String
    var trailing: String? = nil
    var showsDivider: Bool = false

    var body: some View {
        VStack(spacing: showsDivider ? 7 : 0) {
            HStack(spacing: UITheme.spacing6) {
                Circle()
                    .fill(UITheme.brandGold)
                    .frame(width: 5, height: 5)

                Text(title)
                    .font(.caption.weight(.bold))
                    .kerning(2.0)
                    .foregroundStyle(.secondary)

                Spacer()

                if let trailing, !trailing.isEmpty {
                    Text(trailing)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, UITheme.spacing2)

            if showsDivider {
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [UITheme.brandGold.opacity(0.22), Color.white.opacity(0.04)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: UITheme.spacing1)
            }
        }
    }
}

private enum RewardsVisualTokens {
    static let cardCorner: CGFloat = 18
    static let sectionCorner: CGFloat = 16
    static let thinBorderOpacity: Double = 0.16
    static let mediumBorderOpacity: Double = 0.18
    static let strongBorderOpacity: Double = 0.2
    static let tabContainerPadding: CGFloat = 3
    static let tabSpacing: CGFloat = 8
    static let tabCorner: CGFloat = 12
    static let tabHeight: CGFloat = 38
    static let actionButtonMinWidth: CGFloat = 90
    static let actionButtonHeight: CGFloat = 36
    static let actionButtonHorizontalPadding: CGFloat = 18
    static let couponRightRailWidth: CGFloat = 108
    static let couponDividerCircleSize: CGFloat = 11
    static let couponTicketMinHeight: CGFloat = 162
    static let detailPillCorner: CGFloat = 8
    static let detailPillHorizontalPadding: CGFloat = 10
    static let detailPillVerticalPadding: CGFloat = 6
    static let compactPillHorizontalPadding: CGFloat = 8
    static let compactPillVerticalPadding: CGFloat = 5
    static let summaryPillHorizontalPadding: CGFloat = 12
    static let summaryPillVerticalPadding: CGFloat = 7
    static let codeRowCorner: CGFloat = 11
    static let codeRowVerticalPadding: CGFloat = 10
    static let statusPillHorizontalPadding: CGFloat = 10
    static let statusPillVerticalPadding: CGFloat = 4
}

private extension View {
    func unifiedNoticeAlert(isPresented: Binding<Bool>, message: String) -> some View {
        let clean = message.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalMessage = clean.isEmpty ? "Something went wrong. Please try again." : clean
        return alert("Notice", isPresented: isPresented) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(finalMessage)
        }
    }
}

private struct PointsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = PointsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Points") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing16) {
                    pointsHeroCard

                    VStack(alignment: .leading, spacing: UITheme.spacing10) {
                        UnifiedSectionHeader(title: "EXCHANGE COUPONS")

                        if !viewModel.isLoading && viewModel.exchangeables.isEmpty {
                            UnifiedEmptyStateCard(
                                icon: "ticket.fill",
                                title: "No exchangeable coupons right now",
                                subtitle: "More rewards will appear here.",
                                compact: true
                            )
                        } else {
                            VStack(spacing: UITheme.spacing10) {
                                ForEach(viewModel.exchangeables, id: \.id) { coupon in
                                    exchangeCouponCard(coupon)
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: UITheme.spacing10) {
                        UnifiedSectionHeader(title: "HISTORY")

                        if !viewModel.isLoading && viewModel.transactions.isEmpty {
                            UnifiedEmptyStateCard(
                                icon: "clock.arrow.circlepath",
                                title: "No transactions yet",
                                subtitle: "Your points activity will appear here.",
                                compact: true
                            )
                        } else {
                            VStack(spacing: 0) {
                                ForEach(Array(viewModel.transactions.enumerated()), id: \.element.id) { index, item in
                                    historyRow(item: item, isLast: index == viewModel.transactions.count - 1)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, UITheme.spacing14)
                    .padding(.vertical, UITheme.spacing12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
                    .overlay(alignment: .top) {
                        Rectangle()
                            .fill(brandGold.opacity(0.32))
                            .frame(height: UITheme.spacing1)
                            .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                            .stroke(brandGold.opacity(RewardsVisualTokens.mediumBorderOpacity), lineWidth: 1)
                    )
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing26)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .background(Color.black)
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
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
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

    @ViewBuilder
    private var pointsHeroCard: some View {
        let available = viewModel.balance?.available_points ?? 0
        let total = viewModel.balance?.total_points ?? 0
        VStack(spacing: UITheme.spacing14) {
            ZStack {
                Circle()
                    .fill(brandGold.opacity(0.13))
                    .frame(width: 96, height: 96)
                Circle()
                    .stroke(brandGold.opacity(0.45), lineWidth: 1.1)
                    .frame(width: 96, height: 96)
                Circle()
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
                    .frame(width: 108, height: 108)
                Image(systemName: "dollarsign.circle")
                    .font(.system(size: 42, weight: .semibold))
                    .foregroundStyle(brandGold)
            }
            Text("\(available)")
                .font(.system(size: 64, weight: .black, design: .rounded))
                .foregroundStyle(brandGold)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("Available Points")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white.opacity(0.92))

            HStack(spacing: UITheme.spacing8) {
                Image(systemName: "sparkles")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(brandGold)
                Text("Total Earned: \(total)")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, RewardsVisualTokens.summaryPillHorizontalPadding)
            .padding(.vertical, RewardsVisualTokens.summaryPillVerticalPadding)
            .background(Color.black.opacity(0.34))
            .clipShape(Capsule())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, UITheme.spacing34)
        .background(
            ZStack {
                LinearGradient(
                    colors: [Color(red: 23.0 / 255.0, green: 23.0 / 255.0, blue: 23.0 / 255.0), Color.black],
                    startPoint: .topLeading,
                    endPoint: .bottom
                )
                RadialGradient(
                    colors: [brandGold.opacity(0.24), .clear],
                    center: .top,
                    startRadius: 8,
                    endRadius: 240
                )
                .blendMode(.plusLighter)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(RewardsVisualTokens.strongBorderOpacity), lineWidth: 1)
        )
        .overlay(alignment: .top) {
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(Color.white.opacity(0.12), lineWidth: 0.8)
                .mask(
                    VStack(spacing: 0) {
                        Rectangle().frame(height: 36)
                        Spacer()
                    }
                )
        }
        .shadow(color: Color.black.opacity(0.35), radius: 14, y: 6)
    }

    private func exchangeCouponCard(_ coupon: CouponTemplateDTO) -> some View {
        let required = coupon.points_required ?? 0
        let canRedeem = canExchange(coupon)

        return HStack(spacing: UITheme.spacing12) {
            VStack(alignment: .leading, spacing: UITheme.spacing6) {
                Text(couponSummary(coupon))
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Text(coupon.name)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white.opacity(0.94))
                    .lineLimit(1)

                Text("Min. spend $\(String(format: "%.0f", coupon.min_amount))")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white.opacity(0.82))

                HStack(spacing: UITheme.spacing5) {
                    Image(systemName: "sparkles")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(brandGold)
                    Text("Need \(required) pts")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.9))
                }
                .padding(.horizontal, RewardsVisualTokens.compactPillHorizontalPadding)
                .padding(.vertical, RewardsVisualTokens.compactPillVerticalPadding)
                .background(Color.black.opacity(0.26))
                .clipShape(Capsule())
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, UITheme.spacing2)

            Rectangle()
                .fill(.clear)
                .frame(width: 1)
                .overlay(
                    Rectangle()
                        .stroke(
                            Color.white.opacity(0.35),
                            style: StrokeStyle(lineWidth: 1, dash: [4, 4])
                        )
                )
                .overlay(alignment: .top) {
                    Circle()
                        .fill(Color.black.opacity(0.96))
                        .frame(width: 11, height: 11)
                        .offset(y: -7)
                }
                .overlay(alignment: .bottom) {
                    Circle()
                        .fill(Color.black.opacity(0.96))
                        .frame(width: 11, height: 11)
                        .offset(y: 7)
                }
                .padding(.vertical, UITheme.spacing8)

            VStack(spacing: UITheme.spacing10) {
                Text("Exchange")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white.opacity(0.9))
                Text("\(required) pts")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, RewardsVisualTokens.detailPillHorizontalPadding)
                    .padding(.vertical, RewardsVisualTokens.detailPillVerticalPadding)
                    .background(Color.black.opacity(0.28))
                    .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.detailPillCorner))

                if viewModel.isRedeemingCouponID == coupon.id {
                    ProgressView()
                        .frame(minWidth: RewardsVisualTokens.actionButtonMinWidth, minHeight: RewardsVisualTokens.actionButtonHeight)
                } else {
                    Button(canRedeem ? "Exchange" : "Locked") {
                        Task { await doExchange(coupon.id) }
                    }
                    .font(.subheadline.weight(.bold))
                    .padding(.horizontal, RewardsVisualTokens.actionButtonHorizontalPadding)
                    .frame(minWidth: RewardsVisualTokens.actionButtonMinWidth, minHeight: RewardsVisualTokens.actionButtonHeight)
                    .background(canRedeem ? Color.white : Color.white.opacity(0.12))
                    .foregroundStyle(canRedeem ? Color.black : Color.white.opacity(0.45))
                    .clipShape(Capsule())
                    .disabled(!canRedeem)
                }
            }
            .frame(width: 112)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.vertical, UITheme.spacing14)
        .frame(minHeight: 168)
        .background(
            LinearGradient(
                colors: [brandGold.opacity(0.46), Color(red: 174.0 / 255.0, green: 141.0 / 255.0, blue: 42.0 / 255.0).opacity(0.28)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(Color.white.opacity(0.14), lineWidth: 1)
        )
        .overlay(alignment: .bottomTrailing) {
            Image(systemName: "ticket")
                .font(.system(size: 32))
                .foregroundStyle(Color.white.opacity(0.11))
                .rotationEffect(.degrees(12))
                .padding(UITheme.spacing8)
        }
    }

    private func historyRow(item: PointTransactionDTO, isLast: Bool) -> some View {
        let isPositive = item.amount >= 0
        let reasonText = item.reason.replacingOccurrences(of: "_", with: " ")

        return HStack(alignment: .top, spacing: UITheme.spacing12) {
            ZStack {
                Circle()
                    .fill((isPositive ? Color.green : Color.red).opacity(0.16))
                    .frame(width: 42, height: 42)
                Image(systemName: isPositive ? "arrow.up.right" : "arrow.down.right")
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(isPositive ? Color.green : Color.red)
            }
            .padding(.top, UITheme.spacing1)

            VStack(alignment: .leading, spacing: UITheme.spacing4) {
                Text(reasonText.capitalized)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                if let desc = item.description, !desc.isEmpty {
                    Text(desc)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Text(displayDateOnly(item.created_at))
                    .font(.caption.weight(.medium))
                    .kerning(0.4)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: UITheme.spacing1) {
                Text(item.amount > 0 ? "+\(item.amount)" : "\(item.amount)")
                    .font(.system(size: 35, weight: .black, design: .rounded))
                    .foregroundStyle(isPositive ? .green : .white.opacity(0.88))
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)

                Text("PTS")
                    .font(.caption2.weight(.bold))
                    .kerning(1.1)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, UITheme.spacing10)
        .padding(.vertical, UITheme.spacing14)
        .overlay(alignment: .bottom) {
            if !isLast {
                Rectangle()
                    .fill(Color.white.opacity(0.10))
                    .frame(height: UITheme.spacing1)
                    .padding(.leading, UITheme.spacing54)
            }
        }
    }
}

private struct CouponsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = CouponsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Coupons") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing12) {
                    UnifiedSectionHeader(title: "COUPONS")
                        .padding(.top, UITheme.spacing1)

                    couponStatusTabs
                        .padding(RewardsVisualTokens.tabContainerPadding)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.sectionCorner))
                        .overlay(alignment: .top) {
                            Rectangle()
                                .fill(brandGold.opacity(0.30))
                                .frame(height: UITheme.spacing1)
                                .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.sectionCorner))
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: RewardsVisualTokens.sectionCorner)
                                .stroke(brandGold.opacity(RewardsVisualTokens.thinBorderOpacity), lineWidth: 1)
                        )
                        .padding(.bottom, UITheme.spacing2)

                    if !viewModel.isLoading && viewModel.coupons.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "ticket.fill",
                            title: "No \(statusTitle(viewModel.selectedStatus)) coupons",
                            subtitle: "Coupons from stores and rewards will appear here."
                        )
                        .padding(.top, UITheme.spacing18)
                        .padding(.bottom, UITheme.spacing10)
                    } else {
                        VStack(spacing: UITheme.spacing14) {
                            ForEach(viewModel.coupons) { item in
                                couponTicketCard(item)
                            }
                        }
                        .padding(.horizontal, UITheme.spacing1)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .background(Color.black)
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
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
    }

    private var couponStatusTabs: some View {
        HStack(spacing: RewardsVisualTokens.tabSpacing) {
            statusButton("available")
            statusButton("used")
            statusButton("expired")
        }
    }

    private func statusButton(_ value: String) -> some View {
        let selected = viewModel.selectedStatus == value
        return Button {
            viewModel.selectedStatus = value
        } label: {
            Text(statusTitle(value))
                .font(.subheadline.weight(.bold))
                .foregroundStyle(selected ? .black : .white.opacity(0.75))
                .frame(maxWidth: .infinity, minHeight: RewardsVisualTokens.tabHeight)
                .background(selected ? brandGold : Color.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.tabCorner))
                .overlay(
                    RoundedRectangle(cornerRadius: RewardsVisualTokens.tabCorner)
                        .stroke(selected ? Color.clear : Color.white.opacity(0.07), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private func statusTitle(_ value: String) -> String {
        switch value {
        case "available":
            return "Available"
        case "used":
            return "Used"
        case "expired":
            return "Expired"
        default:
            return value.capitalized
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
        return "$\(String(format: "%.0f", coupon.discount_value)) OFF"
    }

    private func couponSubtitle(_ item: UserCouponDTO) -> String {
        let discount = couponDiscount(item.coupon).lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let title = item.coupon.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !title.isEmpty, title.lowercased() != discount {
            return title
        }
        if let desc = item.coupon.description?.trimmingCharacters(in: .whitespacesAndNewlines), !desc.isEmpty {
            return desc
        }
        switch item.source?.lowercased() {
        case "points":
            return "Points Exchange Coupon"
        case "referral":
            return "Referral Reward Coupon"
        case "activity":
            return "Activity Reward Coupon"
        default:
            return "Store Coupon"
        }
    }

    private func couponGradient(_ category: String) -> LinearGradient {
        switch category.lowercased() {
        case "newcomer":
            return LinearGradient(colors: [Color.purple.opacity(0.45), Color.blue.opacity(0.30)], startPoint: .leading, endPoint: .trailing)
        case "birthday":
            return LinearGradient(colors: [Color.pink.opacity(0.45), Color.red.opacity(0.30)], startPoint: .leading, endPoint: .trailing)
        case "referral":
            return LinearGradient(colors: [Color.green.opacity(0.42), Color.teal.opacity(0.30)], startPoint: .leading, endPoint: .trailing)
        case "activity":
            return LinearGradient(colors: [Color.orange.opacity(0.45), Color.yellow.opacity(0.30)], startPoint: .leading, endPoint: .trailing)
        default:
            return LinearGradient(colors: [brandGold.opacity(0.45), Color(red: 181.0 / 255.0, green: 149.0 / 255.0, blue: 47.0 / 255.0).opacity(0.24)], startPoint: .leading, endPoint: .trailing)
        }
    }

    private func couponDateLabel(_ item: UserCouponDTO) -> String {
        if item.status.lowercased() == "used", let usedAt = item.used_at {
            return displayDateOnly(usedAt)
        }
        return displayDateOnly(item.expires_at)
    }

    private func couponTicketCard(_ item: UserCouponDTO) -> some View {
        let status = item.status.lowercased()
        let isAvailable = status == "available"

        return HStack(spacing: UITheme.spacing12) {
            VStack(alignment: .leading, spacing: UITheme.spacing5) {
                Text(couponDiscount(item.coupon))
                    .font(.system(size: 44, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Text(couponSubtitle(item))
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.94))
                    .lineLimit(1)

                Text("Min. spend $\(String(format: "%.0f", item.coupon.min_amount))")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white.opacity(0.80))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, UITheme.spacing2)

            Rectangle()
                .fill(.clear)
                .frame(width: 1)
                .overlay(
                    Rectangle()
                        .stroke(
                            Color.white.opacity(0.35),
                            style: StrokeStyle(lineWidth: 1, dash: [4, 4])
                        )
                )
                .overlay(alignment: .top) {
                    Circle()
                        .fill(Color.black.opacity(0.96))
                        .frame(width: RewardsVisualTokens.couponDividerCircleSize, height: RewardsVisualTokens.couponDividerCircleSize)
                        .offset(y: -6)
                }
                .overlay(alignment: .bottom) {
                    Circle()
                        .fill(Color.black.opacity(0.96))
                        .frame(width: RewardsVisualTokens.couponDividerCircleSize, height: RewardsVisualTokens.couponDividerCircleSize)
                        .offset(y: 6)
                }
                .padding(.vertical, UITheme.spacing7)

            VStack(alignment: .center, spacing: UITheme.spacing8) {
                Text(status == "used" ? "Used" : "Expires")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.90))

                Text(couponDateLabel(item))
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)
                    .padding(.horizontal, RewardsVisualTokens.detailPillHorizontalPadding)
                    .padding(.vertical, RewardsVisualTokens.detailPillVerticalPadding)
                    .background(Color.black.opacity(0.28))
                    .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.detailPillCorner))
                    .foregroundStyle(.white)

                if isAvailable {
                    Button("Use") {
                        alertMessage = "User Coupon ID: #\(item.id)"
                        showAlert = true
                    }
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, RewardsVisualTokens.actionButtonHorizontalPadding)
                    .frame(minWidth: RewardsVisualTokens.actionButtonMinWidth, minHeight: RewardsVisualTokens.actionButtonHeight)
                    .background(Color.white)
                    .foregroundStyle(.black)
                    .clipShape(Capsule())
                    .buttonStyle(.plain)
                } else if status == "expired" {
                    Text("Expired")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.red.opacity(0.85))
                } else {
                    Text("Used")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white.opacity(0.7))
                    }
            }
            .frame(width: RewardsVisualTokens.couponRightRailWidth)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.vertical, UITheme.spacing14)
        .frame(minHeight: RewardsVisualTokens.couponTicketMinHeight)
        .background(couponGradient(item.coupon.category))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(Color.white.opacity(0.14), lineWidth: 1)
        )
        .opacity(isAvailable ? 1 : 0.65)
        .overlay(alignment: .bottomTrailing) {
            Image(systemName: "ticket")
                .font(.system(size: 36))
                .foregroundStyle(Color.white.opacity(0.10))
                .rotationEffect(.degrees(12))
                .padding(UITheme.spacing8)
        }
    }
}

private struct GiftCardsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = GiftCardsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Gift Cards") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing12) {
                    giftSummaryCard
                    UnifiedSectionHeader(
                        title: "MY COLLECTION",
                        trailing: !viewModel.cards.isEmpty ? "\(viewModel.cards.count) cards" : nil,
                        showsDivider: true
                    )
                    .padding(.top, UITheme.spacing2)
                    .padding(.bottom, UITheme.spacing1)

                    if !viewModel.isLoading && viewModel.cards.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "gift.fill",
                            title: "No gift cards found",
                            subtitle: "Gift cards you receive will appear here."
                        )
                        .padding(.top, UITheme.spacing16)
                        .padding(.bottom, UITheme.spacing8)
                    } else {
                        VStack(spacing: UITheme.spacing10) {
                            ForEach(sortedCards) { card in
                                giftCardItem(card)
                            }
                        }
                        .padding(.horizontal, UITheme.spacing1)
                        .padding(.top, UITheme.spacing3)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .background(Color.black)
        .task { await reload() }
        .refreshable { await reload() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }

    private var sortedCards: [GiftCardDTO] {
        viewModel.cards.sorted { lhs, rhs in
            statusPriority(lhs.status) < statusPriority(rhs.status)
        }
    }

    private func statusPriority(_ status: String) -> Int {
        switch status.lowercased() {
        case "pending_transfer":
            return 0
        case "active":
            return 1
        case "revoked":
            return 2
        default:
            return 3
        }
    }

    private var totalBalance: Double {
        viewModel.cards
            .filter { $0.status.lowercased() == "active" }
            .reduce(0) { $0 + $1.balance }
    }

    private var activeCount: Int {
        viewModel.cards.filter { $0.status.lowercased() == "active" }.count
    }

    private var totalCardCount: Int {
        viewModel.cards.count
    }

    private var giftSummaryCard: some View {
        VStack(spacing: UITheme.spacing12) {
            HStack(spacing: UITheme.spacing6) {
                Image(systemName: "gift.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(brandGold)
                Text("GIFT CARD WALLET")
                    .font(.caption.weight(.bold))
                    .kerning(2.2)
                    .foregroundStyle(.secondary)
            }

            Text("TOTAL BALANCE")
                .font(.caption.weight(.bold))
                .kerning(2.4)
                .foregroundStyle(brandGold)

            HStack(alignment: .firstTextBaseline, spacing: UITheme.spacing2) {
                Text("$")
                    .font(.title.weight(.black))
                    .foregroundStyle(brandGold)
                Text(String(format: "%.2f", totalBalance))
                    .font(.system(size: 46, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }

            HStack(spacing: UITheme.spacing8) {
                HStack(spacing: UITheme.spacing5) {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(brandGold)
                    Text("\(activeCount) Active")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                Text("•")
                    .font(.caption)
                    .foregroundStyle(.secondary.opacity(0.6))
                Text("\(totalCardCount) Total")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, RewardsVisualTokens.summaryPillHorizontalPadding)
            .padding(.vertical, RewardsVisualTokens.summaryPillVerticalPadding)
            .background(Color.black.opacity(0.35))
            .clipShape(Capsule())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, UITheme.spacing28)
        .background(
            ZStack {
                LinearGradient(
                    colors: [Color(red: 26.0 / 255.0, green: 26.0 / 255.0, blue: 26.0 / 255.0), Color(red: 37.0 / 255.0, green: 37.0 / 255.0, blue: 37.0 / 255.0)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                RadialGradient(
                    colors: [brandGold.opacity(0.22), .clear],
                    center: .top,
                    startRadius: 8,
                    endRadius: 220
                )
                .blendMode(.plusLighter)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(RewardsVisualTokens.strongBorderOpacity), lineWidth: 1)
        )
        .overlay(alignment: .top) {
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(Color.white.opacity(0.12), lineWidth: 0.8)
                .mask(
                    VStack(spacing: 0) {
                        Rectangle().frame(height: 32)
                        Spacer()
                    }
                )
        }
        .shadow(color: Color.black.opacity(0.35), radius: 12, y: 5)
    }

    private func giftCardItem(_ card: GiftCardDTO) -> some View {
        let statusText = card.status.replacingOccurrences(of: "_", with: " ").capitalized
        let statusColor = giftStatusColor(card.status)

        return VStack(alignment: .leading, spacing: UITheme.spacing11) {
            HStack(alignment: .center, spacing: UITheme.spacing8) {
                HStack(spacing: UITheme.spacing6) {
                    Image(systemName: "gift.fill")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(brandGold)
                    Text("GIFT CARD")
                        .font(.caption.weight(.bold))
                        .kerning(1.4)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(statusText)
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, RewardsVisualTokens.statusPillHorizontalPadding)
                    .padding(.vertical, RewardsVisualTokens.statusPillVerticalPadding)
                    .background(statusColor.opacity(0.18))
                    .clipShape(Capsule())
                    .foregroundStyle(statusColor)
            }

            HStack(alignment: .firstTextBaseline, spacing: UITheme.spacing2) {
                Text("$")
                    .font(.title3.weight(.black))
                    .foregroundStyle(brandGold)
                Text(String(format: "%.2f", card.balance))
                    .font(.system(size: 38, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }

            Text("Available Balance")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
                .padding(.top, UITheme.spacing1)

            HStack(spacing: UITheme.spacing8) {
                Image(systemName: "number")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(brandGold)
                Text(card.card_number)
                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(brandGold)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Spacer()
            }
            .padding(.horizontal, UITheme.spacing12)
            .padding(.vertical, RewardsVisualTokens.codeRowVerticalPadding)
            .background(Color.black.opacity(0.44))
            .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.codeRowCorner))

            HStack(spacing: UITheme.spacing8) {
                HStack(spacing: UITheme.spacing4) {
                    Image(systemName: "calendar")
                        .font(.caption2.weight(.bold))
                    Text("Issued \(displayDateOnly(card.created_at))")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(.secondary)

                if let expires = card.expires_at {
                    Text("•")
                        .font(.caption2)
                        .foregroundStyle(.secondary.opacity(0.55))
                    HStack(spacing: UITheme.spacing4) {
                        Image(systemName: "clock")
                            .font(.caption2.weight(.bold))
                        Text("Exp \(displayDateOnly(expires))")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(.secondary)
                }
                Spacer(minLength: 6)
            }

            if let recipient = card.recipient_phone,
               !recipient.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                HStack(spacing: UITheme.spacing4) {
                    Image(systemName: "person")
                        .font(.caption2.weight(.bold))
                    Text("Recipient \(maskPhone(recipient))")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.vertical, UITheme.spacing13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                LinearGradient(
                    colors: [cardBG, Color(red: 30.0 / 255.0, green: 27.0 / 255.0, blue: 19.0 / 255.0)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                RadialGradient(
                    colors: [brandGold.opacity(0.16), .clear],
                    center: .topLeading,
                    startRadius: 10,
                    endRadius: 180
                )
                .blendMode(.plusLighter)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(RewardsVisualTokens.strongBorderOpacity), lineWidth: 1)
        )
        .overlay(alignment: .top) {
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(Color.white.opacity(0.1), lineWidth: 0.8)
                .mask(
                    VStack(spacing: 0) {
                        Rectangle().frame(height: 24)
                        Spacer()
                    }
                )
        }
        .shadow(color: Color.black.opacity(0.25), radius: 8, y: 3)
    }

    private func giftStatusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "pending_transfer":
            return brandGold
        case "active":
            return .green
        case "revoked":
            return .red
        case "expired":
            return .gray
        default:
            return .secondary
        }
    }

    private func maskPhone(_ raw: String) -> String {
        let digits = raw.filter { $0.isNumber }
        guard digits.count > 4 else { return raw }
        return "***\(digits.suffix(4))"
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

private func displayDateOnly(_ raw: String) -> String {
    let parser = ISO8601DateFormatter()
    if let date = parser.date(from: raw) {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateStyle = .short
        formatter.timeStyle = .none
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
        return "Invalid API endpoint."
    case .decoding:
        return "Unexpected response from server."
    }
}
