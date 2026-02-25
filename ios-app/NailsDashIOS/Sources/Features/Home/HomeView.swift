import SwiftUI
import UIKit

struct HomeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            NavigationStack {
                HomeFeedView()
            }
            .tag(AppTab.home)
            .tabItem {
                Label("Home", systemImage: "house")
            }

            NavigationStack {
                StoresListView()
            }
            .id(appState.bookTabResetID)
            .tag(AppTab.book)
            .tabItem {
                Label("Book", systemImage: "storefront")
            }

            NavigationStack {
                MyAppointmentsView()
            }
            .tag(AppTab.appointments)
            .tabItem {
                Label("Appointments", systemImage: "calendar")
            }

            NavigationStack {
                DealsView()
            }
            .tag(AppTab.deals)
            .tabItem {
                Label("Deals", systemImage: "tag")
            }

            NavigationStack {
                ProfileCenterView()
                    .environmentObject(appState)
            }
            .tag(AppTab.profile)
            .tabItem {
                Label("Profile", systemImage: "person")
            }
        }
        .tint(UITheme.brandGold)
        .onChange(of: appState.selectedTab) { newValue in
            if newValue != .book {
                appState.resetBookFlowSource()
            }
        }
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
    @Published var reviewCount: Int = 0
    @Published var favoriteCount: Int = 0
    @Published var vipStatus: VipStatusDTO?
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
            async let appointmentsTask = appointmentsService.getMyAppointments(token: token, limit: 100)
            async let reviewsTask: [UserReviewDTO]? = try? rewardsService.getMyReviews(token: token, limit: 100)
            async let favoritesTask: Int? = try? rewardsService.getMyFavoritePinsCount(token: token)
            async let vipStatusTask: VipStatusDTO? = try? rewardsService.getVipStatus(token: token)

            let unread = try await unreadTask
            let pointsBalance = try await pointsTask
            let coupons = try await couponsTask
            let giftCards = try await giftCardsTask
            let appointments = try await appointmentsTask
            let reviews = await reviewsTask ?? []
            let favoritePinsCount = await favoritesTask ?? 0
            let vipStatus = await vipStatusTask

            unreadCount = unread.unread_count
            points = pointsBalance.available_points
            couponCount = coupons.count
            giftBalance = giftCards
                .filter { $0.status.lowercased() != "expired" }
                .reduce(0) { $0 + max($1.balance, 0) }
            completedOrders = appointments.filter { $0.status.lowercased() == "completed" }.count
            reviewCount = reviews.count
            favoriteCount = max(favoritePinsCount, 0)
            self.vipStatus = vipStatus
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
    private let profileNameFontSize: CGFloat = 40
    private let vipLevelFontSize: CGFloat = 36
    private let statsValueFontSize: CGFloat = 44
    private let statsLabelFontSize: CGFloat = 10
    private let statsLabelKerning: CGFloat = 3.2

    var body: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing14) {
                    profileHeaderCard
                    vipAccessCardLink
                    inviteFriendsCard
                    statsGrid
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
                NavigationLink {
                    NotificationsView()
                        .environmentObject(appState)
                } label: {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "bell")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                            .background(Color.white.opacity(0.05))
                            .clipShape(Circle())
                            .overlay(Circle().stroke(brandGold.opacity(0.28), lineWidth: 1))

                        if viewModel.unreadCount > 0 {
                            Text(viewModel.unreadCount > 99 ? "99+" : "\(viewModel.unreadCount)")
                                .font(.system(size: UITheme.tinyBadgeFontSize, weight: .bold))
                                .foregroundStyle(.black)
                                .padding(.horizontal, UITheme.spacing5)
                                .padding(.vertical, UITheme.spacing2)
                                .background(brandGold)
                                .clipShape(Capsule())
                                .offset(x: 7, y: -6)
                        }
                    }
                }
                .buttonStyle(.plain)

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
                .font(.system(size: profileNameFontSize, weight: .bold, design: .rounded))
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
        let currentLevel = viewModel.vipStatus?.current_level.level ?? (viewModel.completedOrders >= 10 ? 2 : 1)
        let nextLevel = viewModel.vipStatus?.next_level?.level ?? (currentLevel + 1)

        let spendCurrent = max(viewModel.vipStatus?.spend_progress.current ?? viewModel.vipStatus?.total_spend ?? 0, 0)
        let spendRequiredRaw = viewModel.vipStatus?.spend_progress.required ?? 1000
        let spendRequired = max(spendRequiredRaw, 1)
        let spendPercentRaw = viewModel.vipStatus?.spend_progress.percent ?? ((spendCurrent / spendRequired) * 100.0)
        let spendProgress = min(max(spendPercentRaw / 100.0, 0), 1)

        let visitsCurrent = max(viewModel.vipStatus?.visits_progress.current ?? Double(viewModel.completedOrders), 0)
        let visitsRequiredRaw = viewModel.vipStatus?.visits_progress.required ?? 15
        let visitsRequired = max(visitsRequiredRaw, 1)
        let visitsPercentRaw = viewModel.vipStatus?.visits_progress.percent ?? ((visitsCurrent / visitsRequired) * 100.0)
        let visitProgress = min(max(visitsPercentRaw / 100.0, 0), 1)

        return VStack(alignment: .leading, spacing: UITheme.spacing12) {
            HStack(alignment: .top) {
                HStack(spacing: UITheme.spacing8) {
                    Text("VIP \(currentLevel)")
                        .font(.system(size: vipLevelFontSize, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    Text("CURRENT")
                        .font(.system(size: 11, weight: .bold))
                        .kerning(1.0)
                        .foregroundStyle(.black)
                        .padding(.horizontal, UITheme.spacing8)
                        .padding(.vertical, UITheme.spacing4)
                        .background(brandGold)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                }

                Spacer()

                RotatingCrownIcon(size: 48)
            }

            Text("Member Access")
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(brandGold)

            vipMetricBar(
                title: "Spend Amount",
                value: "$\(String(format: "%.2f", spendCurrent)) / $\(String(format: "%.2f", spendRequired))",
                progress: spendProgress
            )

            vipMetricBar(
                title: "Visits",
                value: "\(Int(visitsCurrent.rounded(.down))) / \(Int(visitsRequired.rounded(.down)))",
                progress: visitProgress
            )

            HStack(spacing: UITheme.spacing6) {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .semibold))
                Text("Next level to VIP \(nextLevel)")
                    .font(.system(size: 18, weight: .bold))
            }
            .foregroundStyle(Color.white.opacity(0.52))
        }
        .padding(UITheme.spacing16)
        .background(
            ZStack {
                LinearGradient(
                    colors: [
                        cardBG.opacity(0.98),
                        Color(red: 43.0 / 255.0, green: 41.0 / 255.0, blue: 34.0 / 255.0),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VipCardGoldSweep()
            }
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

    private var vipAccessCardLink: some View {
        NavigationLink {
            VipMembershipView()
                .environmentObject(appState)
        } label: {
            vipAccessCard
        }
        .buttonStyle(.plain)
    }

    private func vipMetricBar(title: String, value: String, progress: Double) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing6) {
            HStack {
                Text(title)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.7))
                Spacer()
                Text(value)
                    .font(.system(size: 16, weight: .medium))
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
        NavigationLink {
            ReferAFriendView()
                .environmentObject(appState)
        } label: {
            HStack(spacing: UITheme.spacing12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(brandGold.opacity(0.14))
                        .frame(width: 64, height: 64)
                    Image(systemName: "gift.fill")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(brandGold)
                }

                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text("Invite Friends, Get $10")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.white)
                    Text("Share your love for nails and save")
                        .font(.system(size: 15, weight: .regular))
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
        LazyVGrid(columns: gridColumns, spacing: UITheme.spacing10) {
            profileOverviewCardLink(title: "TOTAL POINTS", value: "\(viewModel.points)", icon: "sparkles") {
                PointsView()
                    .environmentObject(appState)
            }
            profileOverviewCardLink(title: "COUPONS", value: "\(viewModel.couponCount)", icon: "ticket") {
                CouponsView()
                    .environmentObject(appState)
            }
            profileOverviewCardLink(title: "GIFT CARDS", value: "$\(String(format: "%.2f", viewModel.giftBalance))", icon: "gift", emphasizedLabel: true) {
                GiftCardsView()
                    .environmentObject(appState)
            }
            profileOverviewCardLink(title: "ORDERS", value: "\(viewModel.completedOrders)", icon: "receipt") {
                OrderHistoryView()
                    .environmentObject(appState)
            }
            profileOverviewCardLink(title: "REVIEWS", value: "\(viewModel.reviewCount)", icon: "star") {
                MyReviewsView()
                    .environmentObject(appState)
            }
            profileOverviewCardLink(title: "FAVORITES", value: "\(viewModel.favoriteCount)", icon: "heart") {
                MyFavoritesView()
                    .environmentObject(appState)
            }
        }
    }

    private func profileOverviewCardLink<Destination: View>(
        title: String,
        value: String,
        icon: String,
        emphasizedLabel: Bool = false,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            profileOverviewCard(title: title, value: value, icon: icon, emphasizedLabel: emphasizedLabel)
        }
        .buttonStyle(.plain)
    }

    private func profileOverviewCard(title: String, value: String, icon: String, emphasizedLabel: Bool = false) -> some View {
        VStack(spacing: UITheme.spacing12) {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white.opacity(0.05))
                    .frame(width: 64, height: 64)
                Image(systemName: icon)
                    .font(.system(size: 24, weight: .regular))
                    .foregroundStyle(brandGold)
            }

            Text(value)
                .font(.system(size: statsValueFontSize, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.45)
                .lineLimit(1)
                .frame(maxWidth: .infinity)

            Text(title)
                .font(.system(size: statsLabelFontSize, weight: .black))
                .kerning(statsLabelKerning)
                .foregroundStyle(emphasizedLabel ? brandGold : Color.white.opacity(0.5))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, UITheme.spacing10)
        .padding(.vertical, UITheme.spacing16)
        .frame(maxWidth: .infinity)
        .frame(minHeight: 206)
        .background(
            LinearGradient(
                colors: [cardBG, Color.white.opacity(0.02)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(brandGold.opacity(emphasizedLabel ? 0.32 : 0.18), lineWidth: 1)
        )
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

private struct RotatingCrownIcon: View {
    let size: CGFloat
    private let brandGold = UITheme.brandGold
    @State private var rotation3DAngle: Double = 0

    var body: some View {
        ZStack {
            Circle()
                .fill(brandGold.opacity(0.08))
                .frame(width: size, height: size)
            Image(systemName: "crown")
                .font(.system(size: size * 0.42, weight: .semibold))
                .foregroundStyle(brandGold)
        }
        .overlay(
            Circle()
                .stroke(brandGold.opacity(0.25), lineWidth: 1)
        )
        .rotation3DEffect(
            .degrees(rotation3DAngle),
            axis: (x: 0.18, y: 1, z: 0),
            perspective: 0.78
        )
        .shadow(color: brandGold.opacity(0.18), radius: 6, y: 2)
        .onAppear {
            rotation3DAngle = 0
            withAnimation(.linear(duration: 3.2).repeatForever(autoreverses: false)) {
                rotation3DAngle = 360
            }
        }
    }
}

private struct VipCardGoldSweep: View {
    private let brandGold = UITheme.brandGold
    @State private var phase: CGFloat = -1

    var body: some View {
        GeometryReader { proxy in
            let width = max(proxy.size.width, 1)
            let height = max(proxy.size.height, 1)
            let sweepWidth = max(width * 0.55, 150)
            let travel = width + sweepWidth * 2

            LinearGradient(
                colors: [
                    Color.clear,
                    brandGold.opacity(0.02),
                    brandGold.opacity(0.20),
                    Color.white.opacity(0.28),
                    brandGold.opacity(0.16),
                    Color.clear,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(width: sweepWidth, height: height * 1.5)
            .rotationEffect(.degrees(15))
            .offset(x: phase * travel * 0.5)
            .blur(radius: 1.2)
            .blendMode(.screen)
            .onAppear {
                phase = -1
                withAnimation(.linear(duration: 3.6).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
        }
        .allowsHitTesting(false)
        .opacity(0.9)
    }
}

private struct VipTierItem: Identifiable {
    let id = UUID()
    let level: String
    let title: String
    let icon: String
    let iconColor: Color
    let benefits: [String]
}

private struct VipMembershipView: View {
    @Environment(\.dismiss) private var dismiss
    private let brandGold = UITheme.brandGold
    private let tiers: [VipTierItem] = [
        VipTierItem(
            level: "VIP 1-3",
            title: "Silver Perks",
            icon: "shield.fill",
            iconColor: Color(red: 0.72, green: 0.74, blue: 0.79),
            benefits: [
                "5% off all services",
                "Birthday gift coupon",
                "Member-only events",
            ]
        ),
        VipTierItem(
            level: "VIP 4-6",
            title: "Gold Status",
            icon: "star.fill",
            iconColor: UITheme.brandGold,
            benefits: [
                "10% off all services",
                "Priority booking",
                "Free soak-off service",
            ]
        ),
        VipTierItem(
            level: "VIP 7-9",
            title: "Platinum Luxe",
            icon: "sparkles",
            iconColor: Color(red: 0.60, green: 0.78, blue: 1.0),
            benefits: [
                "15% off all services",
                "Free hand mask with every visit",
                "Skip the line queue",
            ]
        ),
        VipTierItem(
            level: "VIP 10",
            title: "Diamond Elite",
            icon: "crown.fill",
            iconColor: UITheme.brandGold,
            benefits: [
                "20% off all services",
                "Personal style consultant",
                "Free premium drink & snacks",
            ]
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "VIP Membership") {
                dismiss()
            }

            ScrollView {
                VStack(spacing: UITheme.spacing24) {
                    heroSection

                    VStack(spacing: UITheme.spacing12) {
                        ForEach(tiers) { tier in
                            tierCard(tier)
                        }
                    }

                    redemptionSection

                    Text("Figma Make Nails • Exclusive American Salon Program")
                        .font(.system(size: 10, weight: .semibold))
                        .kerning(1.8)
                        .foregroundStyle(Color.white.opacity(0.32))
                        .multilineTextAlignment(.center)
                        .padding(.top, UITheme.spacing6)
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing28)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }

    private var heroSection: some View {
        VStack(spacing: UITheme.spacing12) {
            ZStack {
                Circle()
                    .fill(brandGold.opacity(0.14))
                    .frame(width: 72, height: 72)
                Circle()
                    .stroke(brandGold.opacity(0.34), lineWidth: 1)
                    .frame(width: 72, height: 72)
                Image(systemName: "crown.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(brandGold)
            }

            Text("Elite Rewards Program")
                .font(.system(size: 23, weight: .medium))
                .kerning(1.8)
                .foregroundStyle(.white)
                .textCase(.uppercase)

            Text("Elevate your experience with our tiered rewards. The more you pamper yourself, the more exclusive your benefits become.")
                .font(.footnote)
                .foregroundStyle(Color.white.opacity(0.58))
                .multilineTextAlignment(.center)
                .lineSpacing(2)
                .padding(.horizontal, UITheme.spacing10)
        }
        .padding(.top, UITheme.spacing4)
    }

    private func tierCard(_ tier: VipTierItem) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text(tier.level)
                        .font(.title3.weight(.heavy))
                        .italic()
                        .foregroundStyle(brandGold)
                    Text(tier.title)
                        .font(.caption.weight(.bold))
                        .kerning(1.4)
                        .foregroundStyle(Color.white.opacity(0.48))
                        .textCase(.uppercase)
                }
                Spacer()
                Image(systemName: tier.icon)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(tier.iconColor)
            }

            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                ForEach(tier.benefits, id: \.self) { benefit in
                    HStack(alignment: .top, spacing: UITheme.spacing8) {
                        Image(systemName: "sparkles")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(brandGold)
                            .padding(.top, UITheme.spacing2)
                        Text(benefit)
                            .font(.footnote)
                            .foregroundStyle(Color.white.opacity(0.72))
                            .lineSpacing(1.6)
                    }
                }
            }
        }
        .padding(UITheme.spacing16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(red: 0.07, green: 0.07, blue: 0.07))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private var redemptionSection: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(spacing: UITheme.spacing6) {
                Image(systemName: "sparkles")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(brandGold)
                Text("REDEMPTION LOGIC")
                    .font(.caption.weight(.bold))
                    .kerning(2.2)
                    .foregroundStyle(brandGold)
            }

            Text("\"Points are accumulated automatically with every visit. To redeem your benefits, simply present your digital membership card to your technician during checkout. All vouchers and tier rewards must be redeemed in-store.\"")
                .font(.footnote)
                .foregroundStyle(Color.white.opacity(0.68))
                .lineSpacing(3)
                .italic()
        }
        .padding(UITheme.spacing16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [brandGold.opacity(0.10), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(brandGold.opacity(0.28), lineWidth: 1)
        )
    }
}

@MainActor
private final class ReferAFriendViewModel: ObservableObject {
    @Published var referralCode: String = ""
    @Published var stats: ReferralStatsDTO?
    @Published var referralList: [ReferralListItemDTO] = []
    @Published var isLoading = false
    @Published var copied = false
    @Published var copyNotice: String?
    @Published var errorMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let codeTask = service.getReferralCode(token: token)
            async let statsTask = service.getReferralStats(token: token)
            async let listTask = service.getReferralList(token: token, limit: 100)

            let code = try await codeTask
            let stats = try await statsTask
            let list = try await listTask

            referralCode = code.referral_code
            self.stats = stats
            referralList = list
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func copyReferralCode() {
        let code = referralCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        UIPasteboard.general.string = code
        copied = true
        copyNotice = "Referral code copied"
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled else { return }
            copied = false
            copyNotice = nil
        }
    }

    func sharePayload() -> [Any]? {
        let code = referralCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return nil }
        let text = "Join me on Nails Booking! Use my referral code \(code) and get a $10 coupon right after registration!"
        if let url = referralURL(code: code) {
            return [text, url]
        }
        return [text]
    }

    private func referralURL(code: String) -> URL? {
        let overrideBase = ProcessInfo.processInfo.environment["NAILSDASH_WEB_BASE_URL"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        let defaultBase = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        let base = (overrideBase?.isEmpty == false ? overrideBase! : defaultBase).trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedBase = base.hasSuffix("/") ? String(base.dropLast()) : base
        return URL(string: "\(normalizedBase)/register?ref=\(code)")
    }
}

private struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

private struct ReferAFriendView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ReferAFriendViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var shareItems: [Any] = []
    @State private var showShareSheet = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Refer a Friend") {
                dismiss()
            }

            ScrollView {
                VStack(spacing: UITheme.spacing20) {
                    heroSection
                    codeSection
                    actionsSection
                    historySection
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing16)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
        .task { await reload() }
        .refreshable { await reload() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .sheet(isPresented: $showShareSheet) {
            ActivityView(activityItems: shareItems)
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

    private var heroSection: some View {
        VStack(spacing: UITheme.spacing12) {
            ZStack {
                Circle()
                    .fill(brandGold.opacity(0.12))
                    .frame(width: 80, height: 80)
                Circle()
                    .stroke(brandGold.opacity(0.24), lineWidth: 1)
                    .frame(width: 80, height: 80)
                Image(systemName: "gift.fill")
                    .font(.system(size: 36, weight: .semibold))
                    .foregroundStyle(brandGold)
            }

            Text("Refer a Friend")
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)

            Text("Share the glow! Both you and your friend will receive 1 Free Coupon ($10 value) immediately after successful registration.")
                .font(.footnote)
                .foregroundStyle(Color.white.opacity(0.68))
                .multilineTextAlignment(.center)
                .lineSpacing(2)
        }
    }

    private var codeSection: some View {
        VStack(spacing: UITheme.spacing10) {
            Text("YOUR REFERRAL CODE")
                .font(.caption.weight(.bold))
                .kerning(1.8)
                .foregroundStyle(Color.white.opacity(0.48))

            HStack(spacing: UITheme.spacing10) {
                Text(viewModel.referralCode.isEmpty ? "—" : viewModel.referralCode)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .kerning(5.2)
                    .foregroundStyle(brandGold)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Button {
                    viewModel.copyReferralCode()
                } label: {
                    Image(systemName: viewModel.copied ? "checkmark.circle.fill" : "doc.on.doc.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.black)
                        .frame(width: 48, height: 48)
                        .background(brandGold)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(viewModel.referralCode.isEmpty)
                .opacity(viewModel.referralCode.isEmpty ? 0.45 : 1)
            }
            .padding(UITheme.spacing12)
            .frame(maxWidth: .infinity)
            .background(Color.black)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )

            Text("Your code is unique and stays the same.")
                .font(.caption)
                .foregroundStyle(Color.white.opacity(0.5))

            if let notice = viewModel.copyNotice, !notice.isEmpty {
                Text(notice)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(brandGold)
            }
        }
        .padding(UITheme.spacing16)
        .frame(maxWidth: .infinity)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private var actionsSection: some View {
        VStack(spacing: UITheme.spacing10) {
            Button {
                guard let payload = viewModel.sharePayload() else { return }
                shareItems = payload
                showShareSheet = true
            } label: {
                HStack(spacing: UITheme.spacing8) {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share with Friends")
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 50)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(viewModel.referralCode.isEmpty)
            .opacity(viewModel.referralCode.isEmpty ? 0.45 : 1)

            HStack(spacing: UITheme.spacing10) {
                statInfoChip(
                    icon: "person.2.fill",
                    text: "\(viewModel.stats?.total_referrals ?? 0) Referrals",
                    color: Color.white.opacity(0.62)
                )
                Circle()
                    .fill(Color.white.opacity(0.28))
                    .frame(width: 3, height: 3)
                statInfoChip(
                    icon: "star.fill",
                    text: "\(viewModel.stats?.total_rewards_earned ?? 0) Coupons Earned",
                    color: brandGold
                )
            }
            .font(.caption)
        }
    }

    private func statInfoChip(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: UITheme.spacing4) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .semibold))
            Text(text)
                .font(.caption.weight(.medium))
        }
        .foregroundStyle(color)
    }

    @ViewBuilder
    private var historySection: some View {
        if viewModel.referralList.isEmpty {
            VStack(spacing: UITheme.spacing12) {
                Image(systemName: "person.2")
                    .font(.system(size: 42, weight: .regular))
                    .foregroundStyle(Color.white.opacity(0.34))
                Text("No referrals yet. Start inviting friends!")
                    .font(.subheadline)
                    .foregroundStyle(Color.white.opacity(0.58))
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical, UITheme.spacing24)
            .frame(maxWidth: .infinity)
            .background(cardBG)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        } else {
            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("REFERRAL HISTORY")
                    .font(.caption.weight(.bold))
                    .kerning(1.8)
                    .foregroundStyle(Color.white.opacity(0.52))

                VStack(spacing: UITheme.spacing8) {
                    ForEach(viewModel.referralList) { item in
                        historyRow(item)
                    }
                }
            }
        }
    }

    private func historyRow(_ item: ReferralListItemDTO) -> some View {
        HStack(spacing: UITheme.spacing10) {
            VStack(alignment: .leading, spacing: UITheme.spacing3) {
                Text(item.referee_name.isEmpty ? "User" : item.referee_name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Text(maskPhone(item.referee_phone))
                    .font(.footnote)
                    .foregroundStyle(Color.white.opacity(0.58))
                Text("Joined: \(formatJoinedDate(item.created_at))")
                    .font(.caption)
                    .foregroundStyle(Color.white.opacity(0.42))
            }

            Spacer()

            if item.referrer_reward_given {
                HStack(spacing: UITheme.spacing4) {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Rewarded")
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.green.opacity(0.88))
            } else {
                Text("Pending")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(brandGold)
            }
        }
        .padding(UITheme.spacing12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    private func maskPhone(_ raw: String) -> String {
        let digits = raw.filter(\.isNumber)
        guard digits.count >= 4 else { return raw }
        return "***\(digits.suffix(4))"
    }

    private func formatJoinedDate(_ raw: String) -> String {
        let parse = ISO8601DateFormatter()
        if let date = parse.date(from: raw) {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }
        if let date = parseServerDateFallback(raw) {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }
        return raw
    }

    private func parseServerDateFallback(_ raw: String) -> Date? {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        if let date = parser.date(from: raw) {
            return date
        }
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return parser.date(from: raw)
    }
}

private enum NotificationsFilter: String {
    case all = "All"
    case unread = "Unread"

    var unreadOnly: Bool { self == .unread }
}

private struct AppNotificationDTO: Decodable, Identifiable {
    let id: Int
    let type: String
    let title: String
    let message: String
    let appointment_id: Int?
    var is_read: Bool
    let created_at: String
    var read_at: String?
}

private struct NotificationsService {
    func getNotifications(token: String, unreadOnly: Bool) async throws -> [AppNotificationDTO] {
        var params = ["skip=0", "limit=100"]
        if unreadOnly {
            params.append("unread_only=true")
        }
        let path = "/notifications/?\(params.joined(separator: "&"))"
        return try await APIClient.shared.request(path: path, token: token)
    }

    func getUnreadCount(token: String) async throws -> Int {
        let payload: UnreadCountDTO = try await APIClient.shared.request(path: "/notifications/unread-count", token: token)
        return payload.unread_count
    }

    func markAsRead(notificationID: Int, token: String) async throws -> AppNotificationDTO {
        try await APIClient.shared.request(
            path: "/notifications/\(notificationID)/read",
            method: "PATCH",
            token: token
        )
    }

    func deleteNotification(notificationID: Int, token: String) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(
            path: "/notifications/\(notificationID)",
            method: "DELETE",
            token: token
        )
    }
}

@MainActor
private final class NotificationsViewModel: ObservableObject {
    @Published var items: [AppNotificationDTO] = []
    @Published var selectedFilter: NotificationsFilter = .all
    @Published var unreadCount: Int = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = NotificationsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let notificationsTask = service.getNotifications(token: token, unreadOnly: selectedFilter.unreadOnly)
            async let unreadTask = service.getUnreadCount(token: token)
            let notifications = try await notificationsTask
            let unread = try await unreadTask

            items = notifications
            unreadCount = unread
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func selectFilter(_ filter: NotificationsFilter, token: String) async {
        guard filter != selectedFilter else { return }
        selectedFilter = filter
        await load(token: token)
    }

    func markAsRead(notificationID: Int, token: String) async {
        guard let index = items.firstIndex(where: { $0.id == notificationID }) else { return }
        guard !items[index].is_read else { return }

        do {
            let updated = try await service.markAsRead(notificationID: notificationID, token: token)
            if selectedFilter == .unread {
                items.remove(at: index)
            } else {
                items[index] = updated
            }
            unreadCount = max(unreadCount - 1, 0)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteNotification(notificationID: Int, token: String) async {
        let wasUnread = items.first(where: { $0.id == notificationID })?.is_read == false

        do {
            try await service.deleteNotification(notificationID: notificationID, token: token)
            items.removeAll { $0.id == notificationID }
            if wasUnread {
                unreadCount = max(unreadCount - 1, 0)
            }
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func handleTap(_ item: AppNotificationDTO, token: String) async -> Bool {
        if !item.is_read {
            await markAsRead(notificationID: item.id, token: token)
        }
        return item.appointment_id != nil
    }
}

private struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = NotificationsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            topBar
            filterBar
            content
        }
        .toolbar(.hidden, for: .navigationBar)
        .background(Color.black)
        .tint(brandGold)
        .task { await reload() }
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
        HStack(spacing: UITheme.spacing10) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: UITheme.navIconSize, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
                    .background(Color.white.opacity(0.07))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            VStack(spacing: UITheme.spacing2) {
                Text("Notifications")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                if viewModel.unreadCount > 0 {
                    Text("\(viewModel.unreadCount) unread")
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.64))
                }
            }

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

    private var filterBar: some View {
        HStack(spacing: UITheme.spacing8) {
            filterButton(.all)
            filterButton(.unread)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.vertical, UITheme.spacing8)
        .background(Color.black)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private func filterButton(_ filter: NotificationsFilter) -> some View {
        Button {
            Task {
                guard let token = appState.requireAccessToken() else { return }
                await viewModel.selectFilter(filter, token: token)
            }
        } label: {
            HStack(spacing: UITheme.spacing4) {
                Text(filter.rawValue)
                if filter == .unread && viewModel.unreadCount > 0 {
                    Text("(\(viewModel.unreadCount))")
                }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(viewModel.selectedFilter == filter ? Color.black : Color.white.opacity(0.78))
            .frame(maxWidth: .infinity)
            .frame(minHeight: UITheme.segmentHeight)
            .background(viewModel.selectedFilter == filter ? brandGold : Color.white.opacity(0.05))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(viewModel.selectedFilter == filter ? Color.clear : brandGold.opacity(0.22), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                if !viewModel.isLoading && viewModel.items.isEmpty {
                    UnifiedEmptyStateCard(
                        icon: "bell.slash",
                        title: "No notifications",
                        subtitle: viewModel.selectedFilter == .unread ? "You're all caught up!" : "You'll see notifications here",
                        compact: true
                    )
                    .padding(.top, UITheme.spacing20)
                } else {
                    ForEach(viewModel.items) { item in
                        notificationCard(item)
                    }
                }
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.vertical, UITheme.spacing10)
        }
        .refreshable {
            await reload()
        }
    }

    private func notificationCard(_ item: AppNotificationDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            HStack(alignment: .top, spacing: UITheme.spacing10) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 40, height: 40)
                    Image(systemName: iconName(for: item.type))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(brandGold)
                }

                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text(item.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text(item.message)
                        .font(.footnote)
                        .foregroundStyle(Color.white.opacity(0.68))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineLimit(2)
                    Text(relativeTimeText(item.created_at))
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.50))
                }
            }

            HStack(spacing: UITheme.spacing8) {
                if !item.is_read {
                    Button {
                        Task {
                            guard let token = appState.requireAccessToken() else { return }
                            await viewModel.markAsRead(notificationID: item.id, token: token)
                        }
                    } label: {
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "checkmark")
                            Text("Mark as read")
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 34)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                Button {
                    Task {
                        guard let token = appState.requireAccessToken() else { return }
                        await viewModel.deleteNotification(notificationID: item.id, token: token)
                    }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.red.opacity(0.86))
                        .frame(minWidth: 52, minHeight: 34)
                        .background(Color.red.opacity(0.10))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .padding(.top, UITheme.spacing2)
        }
        .padding(UITheme.spacing12)
        .background(item.is_read ? Color.white.opacity(0.05) : brandGold.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
        .overlay(alignment: .topTrailing) {
            if !item.is_read {
                Circle()
                    .fill(brandGold)
                    .frame(width: 8, height: 8)
                    .padding(UITheme.spacing10)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous)
                .stroke(item.is_read ? Color.white.opacity(0.10) : brandGold.opacity(0.32), lineWidth: 1)
        )
        .contentShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
        .onTapGesture {
            Task {
                guard let token = appState.requireAccessToken() else { return }
                let goAppointments = await viewModel.handleTap(item, token: token)
                if goAppointments {
                    appState.selectedTab = .appointments
                }
            }
        }
    }

    private func iconName(for type: String) -> String {
        switch type {
        case "appointment_created", "appointment_confirmed", "appointment_completed":
            return "calendar"
        case "appointment_reminder":
            return "clock"
        default:
            return "bell"
        }
    }

    private func relativeTimeText(_ raw: String) -> String {
        guard let date = parseServerDate(raw) else { return raw }
        let diff = max(0, Date().timeIntervalSince(date))
        let minutes = Int(diff / 60)
        let hours = Int(diff / 3600)
        let days = Int(diff / 86_400)

        if minutes < 1 { return "Just now" }
        if minutes < 60 { return "\(minutes)m ago" }
        if hours < 24 { return "\(hours)h ago" }
        if days < 7 { return "\(days)d ago" }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private func parseServerDate(_ raw: String) -> Date? {
        let isoFractional = ISO8601DateFormatter()
        isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFractional.date(from: raw) {
            return date
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: raw) {
            return date
        }

        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        if let date = parser.date(from: raw) {
            return date
        }
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        if let date = parser.date(from: raw) {
            return date
        }
        return nil
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

    private let columnSpacing: CGFloat = 10
    private let cardSpacing: CGFloat = 16
    private func gridColumns(itemWidth: CGFloat) -> [GridItem] {
        [
            GridItem(.fixed(itemWidth), spacing: columnSpacing, alignment: .top),
            GridItem(.fixed(itemWidth), spacing: 0, alignment: .top),
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            headerSearchArea

            GeometryReader { proxy in
                let availableWidth = max(proxy.size.width - (UITheme.pagePadding * 2) - columnSpacing, 0)
                let itemWidth = max(floor(availableWidth / 2), 120)

                ScrollView {
                    if let error = viewModel.errorMessage, !error.isEmpty {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red.opacity(0.9))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, UITheme.pagePadding)
                            .padding(.top, UITheme.spacing8)
                    }

                    LazyVGrid(columns: gridColumns(itemWidth: itemWidth), alignment: .center, spacing: cardSpacing) {
                        ForEach(viewModel.pins) { pin in
                            NavigationLink {
                                HomeFeedPinDetailView(pin: pin)
                            } label: {
                                pinCard(pin, itemWidth: itemWidth)
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

    private func pinCard(_ pin: HomeFeedPinDTO, itemWidth: CGFloat) -> some View {
        AsyncImage(url: pin.imageURL) { phase in
            switch phase {
            case .empty:
                ZStack {
                    Color.gray.opacity(0.14)
                    ProgressView().tint(brandGold)
                }
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .failure:
                Color.gray.opacity(0.2)
                    .overlay(Text("Image unavailable").font(.caption).foregroundStyle(.secondary))
            @unknown default:
                Color.gray.opacity(0.2)
            }
        }
        .frame(width: itemWidth, height: itemWidth * (4.0 / 3.0))
        .background(Color.gray.opacity(0.08))
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
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
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private var heroHeight: CGFloat {
        let proposed = UIScreen.main.bounds.width * 1.12
        return min(max(proposed, 360), 500)
    }

    private var topControlTopPadding: CGFloat {
        let topInset = currentTopSafeAreaInset()
        let hasNotch = topInset > 20
        if hasNotch {
            return topInset + UITheme.spacing18
        }
        return topInset + UITheme.spacing10
    }

    init(pin: HomeFeedPinDTO) {
        _viewModel = StateObject(wrappedValue: HomeFeedPinDetailViewModel(pin: pin))
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        heroImageSection(containerWidth: proxy.size.width)

                        VStack(alignment: .leading, spacing: UITheme.spacing14) {
                            titleInfoSection
                            if !viewModel.relatedPins.isEmpty {
                                relatedSection(containerWidth: proxy.size.width)
                            }
                        }
                        .padding(.horizontal, UITheme.pagePadding)
                        .padding(.top, UITheme.spacing12)
                        .padding(.bottom, 108)
                        .frame(width: proxy.size.width, alignment: .leading)
                    }
                    .frame(width: proxy.size.width, alignment: .top)
                }
                .frame(width: proxy.size.width)
                .background(Color.black)

                topBarOverlay
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
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

    private func heroImageSection(containerWidth: CGFloat) -> some View {
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
            .frame(width: containerWidth, height: heroHeight)
            .clipped()

            LinearGradient(
                colors: [.clear, Color.black.opacity(0.72)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 220)
        }
        .frame(width: containerWidth, height: heroHeight)
    }

    private var titleInfoSection: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text("CHOSEN DESIGN")
                .font(.caption.weight(.medium))
                .kerning(2.6)
                .foregroundStyle(Color.white.opacity(0.50))
            Text(viewModel.pin.title)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)
                .lineLimit(3)
                .minimumScaleFactor(0.78)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, UITheme.spacing2)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var floatingBookNowStrip: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.10))
                .frame(height: UITheme.spacing1)
            HStack(alignment: .center, spacing: UITheme.spacing12) {
                VStack(alignment: .leading, spacing: UITheme.spacing2) {
                    Text("BOOK THIS LOOK")
                        .font(.system(size: 12, weight: .medium))
                        .kerning(2.2)
                        .foregroundStyle(Color.white.opacity(0.50))
                        .lineLimit(1)
                    Text("Find salons near you")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.9)
                        .allowsTightening(true)
                }
                .layoutPriority(1)

                Spacer(minLength: UITheme.spacing8)

                Button {
                    let styleReference = BookingStyleReference(
                        pinID: viewModel.pin.id,
                        title: viewModel.pin.title,
                        imageURL: viewModel.pin.imageURL?.absoluteString,
                        tags: viewModel.pin.tags
                    )
                    appState.openBookFlow(with: styleReference)
                } label: {
                    Text("Choose a salon")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.black)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                        .allowsTightening(true)
                        .padding(.horizontal, 24)
                        .frame(minHeight: UITheme.ctaHeight + 2)
                        .background(brandGold)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, UITheme.spacing20)
            .padding(.top, UITheme.spacing12)
            .padding(.bottom, UITheme.spacing12)
        }
        .background(Color.black.opacity(0.96))
    }

    private func relatedSection(containerWidth: CGFloat) -> some View {
        let spacing = UITheme.spacing12
        let contentWidth = max(containerWidth - (UITheme.pagePadding * 2), 0)
        let itemWidth = max(floor((contentWidth - spacing) / 2), 120)
        let itemHeight = itemWidth * (4.0 / 3.0)
        let columns = [
            GridItem(.fixed(itemWidth), spacing: spacing, alignment: .top),
            GridItem(.fixed(itemWidth), spacing: 0, alignment: .top),
        ]
        return VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("Similar ideas")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)

            LazyVGrid(columns: columns, spacing: spacing) {
                ForEach(Array(viewModel.relatedPins.prefix(6))) { related in
                    NavigationLink {
                        HomeFeedPinDetailView(pin: related)
                            .environmentObject(appState)
                    } label: {
                        relatedPinCard(related, itemWidth: itemWidth, itemHeight: itemHeight)
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func relatedPinCard(_ pin: HomeFeedPinDTO, itemWidth: CGFloat, itemHeight: CGFloat) -> some View {
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
        .frame(width: itemWidth, height: itemHeight)
        .clipped()
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
            .padding(.top, topControlTopPadding)
        }
        .ignoresSafeArea(edges: .top)
    }

    private func currentTopSafeAreaInset() -> CGFloat {
        let scenes = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        guard let scene = scenes.first,
              let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first
        else {
            return 20
        }

        return window.safeAreaInsets.top
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
        try await APIClient.shared.request(path: "/stores?skip=0&limit=100")
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
                        StoresListView(hideTabBar: true)
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

private struct UserReviewDTO: Decodable, Identifiable {
    let id: Int
    let user_id: Int?
    let store_id: Int?
    let appointment_id: Int?
    let rating: Double?
    let comment: String?
    let images: [String]?
    let created_at: String?
    let updated_at: String?
    let store_name: String?
}

private struct ReviewUpsertRequest: Encodable {
    let appointment_id: Int
    let rating: Double
    let comment: String?
    let images: [String]?
}

private struct CountDTO: Decodable {
    let count: Int
}

private struct VipLevelDTO: Decodable {
    let level: Int
    let min_spend: Double
    let min_visits: Int
    let benefit: String
}

private struct VipProgressDTO: Decodable {
    let current: Double
    let required: Double
    let percent: Double
}

private struct VipStatusDTO: Decodable {
    let current_level: VipLevelDTO
    let total_spend: Double
    let total_visits: Int
    let spend_progress: VipProgressDTO
    let visits_progress: VipProgressDTO
    let next_level: VipLevelDTO?
}

private struct ReferralCodeDTO: Decodable {
    let referral_code: String
}

private struct ReferralStatsDTO: Decodable {
    let total_referrals: Int
    let successful_referrals: Int
    let pending_referrals: Int
    let total_rewards_earned: Int
}

private struct ReferralListItemDTO: Decodable, Identifiable {
    let id: Int
    let referee_name: String
    let referee_phone: String
    let status: String
    let created_at: String
    let rewarded_at: String?
    let referrer_reward_given: Bool
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

    func getMyReviews(token: String, limit: Int = 100) async throws -> [UserReviewDTO] {
        try await APIClient.shared.request(path: "/reviews/my-reviews?skip=0&limit=\(limit)", token: token)
    }

    func updateReview(
        token: String,
        reviewID: Int,
        appointmentID: Int,
        rating: Double,
        comment: String?,
        images: [String]?
    ) async throws -> UserReviewDTO {
        let trimmed = comment?.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = ReviewUpsertRequest(
            appointment_id: appointmentID,
            rating: min(max(rating, 1), 5),
            comment: (trimmed?.isEmpty ?? true) ? nil : trimmed,
            images: images
        )
        return try await APIClient.shared.request(
            path: "/reviews/\(reviewID)",
            method: "PUT",
            token: token,
            body: payload
        )
    }

    func deleteReview(token: String, reviewID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/reviews/\(reviewID)", method: "DELETE", token: token)
    }

    func getMyFavoritePinsCount(token: String) async throws -> Int {
        let row: CountDTO = try await APIClient.shared.request(path: "/pins/favorites/count", token: token)
        return row.count
    }

    func getMyFavoritePins(token: String, limit: Int = 100) async throws -> [HomeFeedPinDTO] {
        try await APIClient.shared.request(path: "/pins/favorites/my-favorites?skip=0&limit=\(limit)", token: token)
    }

    func getMyFavoriteStores(token: String, limit: Int = 100) async throws -> [StoreDTO] {
        try await APIClient.shared.request(path: "/stores/favorites/my-favorites?skip=0&limit=\(limit)", token: token)
    }

    func removeFavoritePin(token: String, pinID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/pins/\(pinID)/favorite", method: "DELETE", token: token)
    }

    func removeFavoriteStore(token: String, storeID: Int) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(path: "/stores/\(storeID)/favorite", method: "DELETE", token: token)
    }

    func getVipStatus(token: String) async throws -> VipStatusDTO {
        try await APIClient.shared.request(path: "/vip/status", token: token)
    }

    func getExchangeableCoupons(token: String) async throws -> [CouponTemplateDTO] {
        try await APIClient.shared.request(path: "/coupons/exchangeable", token: token)
    }

    func exchangeCoupon(token: String, couponID: Int) async throws -> UserCouponDTO {
        try await APIClient.shared.request(path: "/coupons/exchange/\(couponID)", method: "POST", token: token)
    }

    func getReferralCode(token: String) async throws -> ReferralCodeDTO {
        try await APIClient.shared.request(path: "/referrals/my-code", token: token)
    }

    func getReferralStats(token: String) async throws -> ReferralStatsDTO {
        try await APIClient.shared.request(path: "/referrals/stats", token: token)
    }

    func getReferralList(token: String, limit: Int = 100) async throws -> [ReferralListItemDTO] {
        try await APIClient.shared.request(path: "/referrals/list?skip=0&limit=\(limit)", token: token)
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

@MainActor
private final class OrderHistoryViewModel: ObservableObject {
    @Published var items: [AppointmentDTO] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let appointmentsService: AppointmentsServiceProtocol

    init(appointmentsService: AppointmentsServiceProtocol = AppointmentsService()) {
        self.appointmentsService = appointmentsService
    }

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let rows = try await appointmentsService.getMyAppointments(token: token, limit: 100)
            items = rows
                .filter { $0.status.lowercased() == "completed" }
                .sorted { lhs, rhs in
                    appointmentDateTime(lhs) > appointmentDateTime(rhs)
                }
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func appointmentDateTime(_ item: AppointmentDTO) -> Date {
        let dateTime = "\(item.appointment_date)T\(item.appointment_time)"
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(identifier: "America/New_York")
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        if let date = parser.date(from: dateTime) {
            return date
        }
        parser.dateFormat = "yyyy-MM-dd'T'HH:mm"
        if let date = parser.date(from: dateTime) {
            return date
        }
        return .distantPast
    }
}

@MainActor
private final class MyReviewsViewModel: ObservableObject {
    @Published var items: [UserReviewDTO] = []
    @Published var deletingReviewID: Int?
    @Published var updatingReviewID: Int?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            items = try await service.getMyReviews(token: token, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateReview(
        token: String,
        reviewID: Int,
        appointmentID: Int,
        rating: Double,
        comment: String?,
        images: [String]?
    ) async {
        updatingReviewID = reviewID
        defer { updatingReviewID = nil }
        do {
            let updated = try await service.updateReview(
                token: token,
                reviewID: reviewID,
                appointmentID: appointmentID,
                rating: rating,
                comment: comment,
                images: images
            )
            if let index = items.firstIndex(where: { $0.id == reviewID }) {
                items[index] = updated
            }
            actionMessage = "Review updated."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteReview(token: String, reviewID: Int) async {
        deletingReviewID = reviewID
        defer { deletingReviewID = nil }
        do {
            try await service.deleteReview(token: token, reviewID: reviewID)
            items.removeAll { $0.id == reviewID }
            actionMessage = "Review deleted."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
private final class MyFavoritesViewModel: ObservableObject {
    @Published var favoritePins: [HomeFeedPinDTO] = []
    @Published var favoriteStores: [StoreDTO] = []
    @Published var deletingPinID: Int?
    @Published var deletingStoreID: Int?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = ProfileRewardsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let pinsTask = service.getMyFavoritePins(token: token, limit: 100)
            async let storesTask = service.getMyFavoriteStores(token: token, limit: 100)
            favoritePins = try await pinsTask
            favoriteStores = try await storesTask
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removePin(token: String, pinID: Int) async {
        deletingPinID = pinID
        defer { deletingPinID = nil }
        do {
            try await service.removeFavoritePin(token: token, pinID: pinID)
            favoritePins.removeAll { $0.id == pinID }
            actionMessage = "Removed from favorites."
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeStore(token: String, storeID: Int) async {
        deletingStoreID = storeID
        defer { deletingStoreID = nil }
        do {
            try await service.removeFavoriteStore(token: token, storeID: storeID)
            favoriteStores.removeAll { $0.id == storeID }
            actionMessage = "Removed from favorites."
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
        .toolbar(.hidden, for: .tabBar)
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
        .toolbar(.hidden, for: .tabBar)
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
        .toolbar(.hidden, for: .tabBar)
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

private struct OrderHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = OrderHistoryViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Transaction History") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing12) {
                    summaryCard

                    UnifiedSectionHeader(
                        title: "RECENT ACTIVITY",
                        trailing: !viewModel.items.isEmpty ? "\(viewModel.items.count) completed" : nil,
                        showsDivider: true
                    )

                    if !viewModel.isLoading && viewModel.items.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "clock.arrow.circlepath",
                            title: "No transactions yet",
                            subtitle: "Completed orders will appear here."
                        )
                    } else {
                        VStack(spacing: UITheme.spacing10) {
                            ForEach(viewModel.items) { item in
                                historyItem(item)
                            }
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
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

    private var totalSpend: Double {
        viewModel.items.reduce(0) { partialResult, item in
            partialResult + max(item.service_price ?? 0, 0)
        }
    }

    private var summaryCard: some View {
        HStack(spacing: UITheme.spacing10) {
            summaryMetric(title: "Total Spend", value: "$\(String(format: "%.2f", totalSpend))", icon: "dollarsign.circle.fill", highlighted: true)
            summaryMetric(title: "Total Visits", value: "\(viewModel.items.count)", icon: "calendar.badge.checkmark", highlighted: false)
        }
    }

    private func summaryMetric(title: String, value: String, icon: String, highlighted: Bool) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing6) {
            Text(title.uppercased())
                .font(.caption.weight(.bold))
                .kerning(1.6)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title2.weight(.black))
                .foregroundStyle(highlighted ? brandGold : .white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            HStack(spacing: UITheme.spacing5) {
                Image(systemName: icon)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(brandGold)
                Text("Completed orders")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(UITheme.spacing14)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(0.18), lineWidth: 1)
        )
    }

    private func historyItem(_ item: AppointmentDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(alignment: .top, spacing: UITheme.spacing10) {
                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text(item.store_name ?? "Salon")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    if let order = item.order_number, !order.isEmpty {
                        Text("Order \(order)")
                            .font(.caption2.weight(.semibold))
                            .kerning(1.1)
                            .foregroundStyle(Color.white.opacity(0.55))
                            .lineLimit(1)
                    }
                }

                Spacer(minLength: UITheme.spacing8)

                Text("$\(String(format: "%.2f", max(item.service_price ?? 0, 0)))")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(brandGold)
            }

            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)

            HStack(spacing: UITheme.spacing8) {
                Text(item.service_name ?? "Service")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Color.white.opacity(0.88))
                    .lineLimit(1)

                Spacer(minLength: UITheme.spacing8)

                Text(formattedAppointmentDate(item))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(UITheme.spacing14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(0.16), lineWidth: 1)
        )
    }

    private func formattedAppointmentDate(_ item: AppointmentDTO) -> String {
        let dateText = formattedDate(item.appointment_date)
        let timeText = formattedTime(item.appointment_time)
        return "\(dateText) · \(timeText)"
    }

    private func formattedDate(_ raw: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(identifier: "America/New_York")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: raw) else { return raw }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "America/New_York")
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    private func formattedTime(_ raw: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(identifier: "America/New_York")
        parser.dateFormat = "HH:mm:ss"
        var parsed = parser.date(from: raw)
        if parsed == nil {
            parser.dateFormat = "HH:mm"
            parsed = parser.date(from: raw)
        }
        guard let date = parsed else { return raw }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "America/New_York")
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}

private struct MyReviewsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = MyReviewsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var showEditSheet: Bool = false
    @State private var editingReview: UserReviewDTO?
    @State private var editRating: Int = 5
    @State private var editComment: String = ""
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Reviews") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing10) {
                    if !viewModel.isLoading && viewModel.items.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "star",
                            title: "No reviews yet",
                            subtitle: "Complete an appointment and share your experience."
                        )
                        .padding(.top, UITheme.spacing20)
                    } else {
                        ForEach(viewModel.items) { item in
                            reviewItem(item)
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
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
        .sheet(isPresented: $showEditSheet) {
            reviewEditSheet
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }

    private func reviewItem(_ item: UserReviewDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(alignment: .top, spacing: UITheme.spacing8) {
                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text(reviewStoreName(item))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    HStack(spacing: UITheme.spacing4) {
                        reviewStars(item.rating ?? 0)
                        Text(String(format: "%.1f", item.rating ?? 0))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.68))
                    }
                }

                Spacer(minLength: UITheme.spacing8)

                Text(displayDateOnly(item.created_at ?? ""))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            if let comment = item.comment?.trimmingCharacters(in: .whitespacesAndNewlines),
               !comment.isEmpty {
                Text(comment)
                    .font(.footnote)
                    .foregroundStyle(Color.white.opacity(0.82))
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("No written comment")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: UITheme.spacing8) {
                Button {
                    startEdit(item)
                } label: {
                    Label("Edit", systemImage: "pencil")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight - 6)
                }
                .buttonStyle(.plain)
                .foregroundStyle(Color.white.opacity(0.92))
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
                .disabled(item.appointment_id == nil)
                .opacity(item.appointment_id == nil ? 0.45 : 1)

                Button(role: .destructive) {
                    guard let token = appState.requireAccessToken() else { return }
                    Task { await viewModel.deleteReview(token: token, reviewID: item.id) }
                } label: {
                    if viewModel.deletingReviewID == item.id {
                        ProgressView()
                            .tint(.red)
                            .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight - 6)
                    } else {
                        Label("Delete", systemImage: "trash")
                            .font(.caption.weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight - 6)
                    }
                }
                .buttonStyle(.plain)
                .foregroundStyle(.red.opacity(0.9))
                .background(Color.red.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous)
                        .stroke(Color.red.opacity(0.28), lineWidth: 1)
                )
            }
        }
        .padding(UITheme.spacing14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(0.16), lineWidth: 1)
        )
    }

    private func reviewStoreName(_ item: UserReviewDTO) -> String {
        if let storeName = item.store_name?.trimmingCharacters(in: .whitespacesAndNewlines), !storeName.isEmpty {
            return storeName
        }
        if let storeID = item.store_id {
            return "Store #\(storeID)"
        }
        return "Salon"
    }

    private func reviewStars(_ rating: Double) -> some View {
        let normalized = Int(max(min(round(rating), 5), 0))
        return HStack(spacing: 2) {
            ForEach(0 ..< 5, id: \.self) { index in
                Image(systemName: index < normalized ? "star.fill" : "star")
                    .font(.caption2)
                    .foregroundStyle(index < normalized ? brandGold : Color.white.opacity(0.28))
            }
        }
    }

    private func startEdit(_ item: UserReviewDTO) {
        guard item.appointment_id != nil else {
            alertMessage = "This review cannot be edited right now."
            showAlert = true
            return
        }
        editingReview = item
        editComment = item.comment ?? ""
        editRating = Int(max(min(round(item.rating ?? 5), 5), 1))
        showEditSheet = true
    }

    @ViewBuilder
    private var reviewEditSheet: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(alignment: .leading, spacing: UITheme.spacing14) {
                HStack {
                    Text("Edit Review")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("Close") {
                        showEditSheet = false
                        editingReview = nil
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.74))
                }

                VStack(alignment: .leading, spacing: UITheme.spacing8) {
                    Text("Rating")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.62))
                    HStack(spacing: UITheme.spacing8) {
                        ForEach(1 ... 5, id: \.self) { star in
                            Button {
                                editRating = star
                            } label: {
                                Image(systemName: star <= editRating ? "star.fill" : "star")
                                    .font(.title3)
                                    .foregroundStyle(star <= editRating ? brandGold : Color.white.opacity(0.34))
                                    .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: UITheme.spacing8) {
                    Text("Comment")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.62))
                    TextEditor(text: $editComment)
                        .font(.body)
                        .foregroundStyle(.white)
                        .scrollContentBackground(.hidden)
                        .padding(UITheme.spacing8)
                        .frame(minHeight: 120, maxHeight: 180)
                        .background(cardBG)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous)
                                .stroke(Color.white.opacity(0.12), lineWidth: 1)
                        )
                }

                HStack(spacing: UITheme.spacing8) {
                    Button("Cancel") {
                        showEditSheet = false
                        editingReview = nil
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.8))
                    .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))

                    Button {
                        saveEditedReview()
                    } label: {
                        if let reviewID = editingReview?.id, viewModel.updatingReviewID == reviewID {
                            ProgressView()
                                .tint(Color.black.opacity(0.85))
                                .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        } else {
                            Text("Update")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Color.black.opacity(0.88))
                                .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        }
                    }
                    .buttonStyle(.plain)
                    .background(brandGold)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                }
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.top, UITheme.spacing18)
            .padding(.bottom, UITheme.spacing12)
        }
    }

    private func saveEditedReview() {
        guard let review = editingReview, let appointmentID = review.appointment_id else {
            alertMessage = "This review cannot be edited right now."
            showAlert = true
            return
        }
        guard let token = appState.requireAccessToken() else { return }

        Task {
            await viewModel.updateReview(
                token: token,
                reviewID: review.id,
                appointmentID: appointmentID,
                rating: Double(editRating),
                comment: editComment,
                images: review.images
            )
            if viewModel.errorMessage == nil {
                showEditSheet = false
                editingReview = nil
            }
        }
    }
}

private struct MyFavoritesView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = MyFavoritesViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let columns = [GridItem(.flexible(), spacing: UITheme.spacing10), GridItem(.flexible(), spacing: UITheme.spacing10)]

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Favorites") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing14) {
                    Text("\(viewModel.favoriteStores.count) salons · \(viewModel.favoritePins.count) designs")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)

                    if !viewModel.isLoading && viewModel.favoriteStores.isEmpty && viewModel.favoritePins.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "heart",
                            title: "No favorites yet",
                            subtitle: "Save salons and designs to revisit them quickly."
                        )

                        NavigationLink {
                            StoresListView(hideTabBar: true)
                        } label: {
                            Text("Browse Salons")
                                .font(.subheadline.weight(.bold))
                                .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                                .background(brandGold)
                                .foregroundStyle(.black)
                                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                        }
                        .buttonStyle(.plain)
                    } else {
                        if !viewModel.favoritePins.isEmpty {
                            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                                UnifiedSectionHeader(title: "FAVORITE DESIGNS")
                                LazyVGrid(columns: columns, spacing: UITheme.spacing10) {
                                    ForEach(viewModel.favoritePins) { pin in
                                        favoritePinCard(pin)
                                    }
                                }
                            }
                        }

                        if !viewModel.favoriteStores.isEmpty {
                            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                                UnifiedSectionHeader(title: "FAVORITE SALONS")
                                VStack(spacing: UITheme.spacing10) {
                                    ForEach(viewModel.favoriteStores) { store in
                                        favoriteStoreCard(store)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
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

    private func favoritePinCard(_ pin: HomeFeedPinDTO) -> some View {
        ZStack(alignment: .topTrailing) {
            NavigationLink {
                HomeFeedPinDetailView(pin: pin)
                    .environmentObject(appState)
            } label: {
                VStack(alignment: .leading, spacing: UITheme.spacing6) {
                    AsyncImage(url: pin.imageURL) { phase in
                        switch phase {
                        case .empty:
                            ZStack {
                                Color.gray.opacity(0.14)
                                ProgressView().tint(brandGold)
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
                    .frame(height: 186)
                    .frame(maxWidth: .infinity)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius, style: .continuous))

                    Text(pin.title)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                }
                .padding(UITheme.spacing8)
                .background(cardBG)
                .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
                .overlay(
                    RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                        .stroke(brandGold.opacity(0.16), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)

            Button {
                guard let token = appState.requireAccessToken() else { return }
                Task { await viewModel.removePin(token: token, pinID: pin.id) }
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.black.opacity(0.66))
                    if viewModel.deletingPinID == pin.id {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.85)
                    } else {
                        Image(systemName: "heart.fill")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(brandGold)
                    }
                }
                .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .padding(UITheme.spacing12)
        }
    }

    private func favoriteStoreCard(_ store: StoreDTO) -> some View {
        HStack(spacing: UITheme.spacing10) {
            NavigationLink {
                StoreDetailView(storeID: store.id)
            } label: {
                HStack(spacing: UITheme.spacing10) {
                    AsyncImage(url: storeImageURL(store)) { phase in
                        switch phase {
                        case .empty:
                            ZStack {
                                Color.gray.opacity(0.18)
                                ProgressView().tint(brandGold)
                            }
                        case .success(let image):
                            image.resizable().scaledToFill()
                        case .failure:
                            Color.gray.opacity(0.2)
                        @unknown default:
                            Color.gray.opacity(0.2)
                        }
                    }
                    .frame(width: 84, height: 84)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))

                    VStack(alignment: .leading, spacing: UITheme.spacing4) {
                        Text(store.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.caption2)
                                .foregroundStyle(brandGold)
                            Text(store.formattedAddress)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundStyle(brandGold)
                            Text(String(format: "%.1f", store.rating))
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.white.opacity(0.75))
                            Text("(\(store.review_count) reviews)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Button {
                guard let token = appState.requireAccessToken() else { return }
                Task { await viewModel.removeStore(token: token, storeID: store.id) }
            } label: {
                if viewModel.deletingStoreID == store.id {
                    ProgressView()
                        .tint(.white)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                } else {
                    Image(systemName: "heart.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(brandGold)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(UITheme.spacing10)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(0.16), lineWidth: 1)
        )
    }

    private func storeImageURL(_ store: StoreDTO) -> URL? {
        guard let raw = store.image_url?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty
        else {
            return nil
        }
        if raw.lowercased().hasPrefix("http") {
            return URL(string: raw)
        }
        let base = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        return URL(string: "\(base)\(raw)")
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
