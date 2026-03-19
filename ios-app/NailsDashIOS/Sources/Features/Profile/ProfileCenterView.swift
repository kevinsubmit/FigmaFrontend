import SwiftUI
import UIKit

private struct ProfileCenterPrimarySummary {
    let unreadCount: Int
    let points: Int
    let favoriteCount: Int?
    let completedOrders: Int?
    let vipStatus: VipStatusDTO?
}

private struct ProfileCenterSecondarySummary {
    let couponCount: Int?
    let giftBalance: Double?
    let reviewCount: Int?
}

private struct ProfileCenterSummaryService {
    private let rewardsService = ProfileRewardsService()

    func loadPrimarySummary(token: String) async -> ProfileCenterPrimarySummary {
        async let unreadTask: Int? = {
            do {
                return try await rewardsService.getUnreadCount(token: token)
            } catch {
                return nil
            }
        }()

        async let pointsTask: Int? = {
            do {
                let points = try await rewardsService.getPointsBalance(token: token)
                return points.available_points
            } catch {
                return nil
            }
        }()

        async let favoriteCountTask: Int? = {
            do {
                return try await rewardsService.getMyFavoritePinsCount(token: token)
            } catch {
                return nil
            }
        }()

        async let vipStatusTask: VipStatusDTO? = {
            do {
                return try await rewardsService.getVipStatus(token: token)
            } catch {
                return nil
            }
        }()

        let unreadCount = await unreadTask
        let points = await pointsTask
        let favoriteCount = await favoriteCountTask
        let vipStatus = await vipStatusTask

        return ProfileCenterPrimarySummary(
            unreadCount: max(unreadCount ?? 0, 0),
            points: max(points ?? 0, 0),
            favoriteCount: favoriteCount.map { max($0, 0) },
            completedOrders: vipStatus.map { max($0.total_visits, 0) },
            vipStatus: vipStatus
        )
    }

    func loadSecondarySummary(token: String) async -> ProfileCenterSecondarySummary {
        async let couponCountTask: Int? = {
            do {
                let coupons = try await rewardsService.getMyCoupons(
                    token: token,
                    status: "available",
                    skip: 0,
                    limit: 100
                )
                return coupons.count
            } catch {
                return nil
            }
        }()

        async let giftBalanceTask: Double? = {
            do {
                let summary = try await rewardsService.getGiftCardSummary(token: token)
                return summary.total_balance
            } catch {
                return nil
            }
        }()

        async let reviewCountTask: Int? = {
            do {
                let reviews = try await rewardsService.getMyReviews(token: token, skip: 0, limit: 100)
                return reviews.count
            } catch {
                return nil
            }
        }()

        return ProfileCenterSecondarySummary(
            couponCount: (await couponCountTask).map { max($0, 0) },
            giftBalance: (await giftBalanceTask).map { max($0, 0.0) },
            reviewCount: (await reviewCountTask).map { max($0, 0) }
        )
    }
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

    private let summaryService = ProfileCenterSummaryService()
    private var didLoadOnce = false
    private var loadedToken: String?
    private var requestToken = 0

    func loadIfNeeded(token: String) async {
        guard loadedToken != token || !didLoadOnce || errorMessage != nil else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        if force {
            didLoadOnce = true
        }
        loadedToken = token
        requestToken += 1
        let currentRequestToken = requestToken
        isLoading = true

        let primarySummary = await summaryService.loadPrimarySummary(token: token)
        guard currentRequestToken == requestToken else { return }

        unreadCount = primarySummary.unreadCount
        PushNotificationManager.shared.setAppBadge(
            PushNotificationManager.shared.isPushPreferenceEnabled()
            ? primarySummary.unreadCount
            : 0
        )
        points = primarySummary.points
        if let favoriteCount = primarySummary.favoriteCount {
            self.favoriteCount = favoriteCount
        }
        if let completedOrders = primarySummary.completedOrders {
            self.completedOrders = completedOrders
        }
        if let resolvedVipStatus = primarySummary.vipStatus {
            vipStatus = resolvedVipStatus
        }
        errorMessage = nil
        isLoading = false

        let secondarySummary = await summaryService.loadSecondarySummary(token: token)
        guard currentRequestToken == requestToken else { return }

        if let resolvedCouponCount = secondarySummary.couponCount {
            couponCount = resolvedCouponCount
        }
        if let resolvedGiftBalance = secondarySummary.giftBalance {
            giftBalance = resolvedGiftBalance
        }
        if let resolvedReviewCount = secondarySummary.reviewCount {
            reviewCount = resolvedReviewCount
        }
    }
}

struct ProfileCenterView: View {
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
    private var vipBadgeText: String {
        let currentLevel = viewModel.vipStatus?.current_level.level ?? (viewModel.completedOrders >= 10 ? 2 : 1)
        return "VIP \(currentLevel)"
    }

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
        .task { await loadIfNeeded() }
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
        await viewModel.load(token: token, force: true)
    }

    private func loadIfNeeded() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadIfNeeded(token: token)
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

                NavigationLink {
                    SettingsView(vipBadgeText: vipBadgeText)
                        .environmentObject(appState)
                } label: {
                    Image(systemName: "gearshape")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                        .background(Color.white.opacity(0.05))
                        .clipShape(Circle())
                        .overlay(Circle().stroke(brandGold.opacity(0.28), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing10)
        .padding(.bottom, UITheme.spacing2)
        .frame(maxWidth: .infinity)
        .background(Color.black)
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
            CachedAsyncImage(url: url) { phase in
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
        let vipBenefit = viewModel.vipStatus?.current_level.benefit.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let vipBenefitTitle = vipBenefit.isEmpty ? "Member Access" : vipBenefit

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

                RotatingCrownIcon(size: 40)
            }

            Text(vipBenefitTitle)
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
        AssetURLResolver.resolveString(from: raw)
    }
}

private struct RotatingCrownIcon: View {
    let size: CGFloat
    private let brandGold = UITheme.brandGold
    private let rotationDuration: Double = 8.0
    @State private var rotationStartDate = Date()

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 60.0, paused: false)) { context in
            let elapsed = context.date.timeIntervalSince(rotationStartDate)
            let progress = (elapsed.truncatingRemainder(dividingBy: rotationDuration)) / rotationDuration
            let angle = progress * 360.0

            ZStack {
                Circle()
                    .fill(brandGold.opacity(0.10))
                    .frame(width: size, height: size)
                ZStack {
                    Image(systemName: "crown.fill")
                        .font(.system(size: size * 0.50, weight: .semibold))
                        .foregroundStyle(brandGold.opacity(0.22))
                    Image(systemName: "crown")
                        .font(.system(size: size * 0.50, weight: .semibold))
                        .foregroundStyle(brandGold)
                }
            }
            .overlay(
                Circle()
                    .stroke(brandGold.opacity(0.30), lineWidth: 1)
            )
            .rotation3DEffect(
                .degrees(angle),
                axis: (x: 0, y: 1, z: 0),
                perspective: 0.72
            )
            .shadow(color: brandGold.opacity(0.18), radius: 6, y: 2)
        }
        .onAppear {
            rotationStartDate = Date()
        }
    }
}

private struct VipCardGoldSweep: View {
    private let brandGold = UITheme.brandGold
    @State private var sweepPhase: CGFloat = -1
    @State private var glowExpanded = false
    @State private var sweepTask: Task<Void, Never>?

    var body: some View {
        GeometryReader { proxy in
            let width = max(proxy.size.width, 1)
            let height = max(proxy.size.height, 1)

            ZStack(alignment: .topTrailing) {
                Circle()
                    .fill(brandGold)
                    .frame(width: 128, height: 128)
                    .blur(radius: 64)
                    .scaleEffect(glowExpanded ? 1.2 : 1.0)
                    .opacity(glowExpanded ? 0.10 : 0.05)
                    .offset(x: 40, y: -40)

                LinearGradient(
                    colors: [
                        Color.clear,
                        brandGold.opacity(0.10),
                        Color.clear,
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: width, height: height)
                .transformEffect(
                    CGAffineTransform(
                        a: 1,
                        b: 0,
                        c: CGFloat(tan(12.0 * Double.pi / 180.0)),
                        d: 1,
                        tx: 0,
                        ty: 0
                    )
                )
                .offset(x: sweepPhase * width)
            }
            .onAppear {
                startGlowPulse()
                startSweepLoop()
            }
            .onDisappear {
                sweepTask?.cancel()
                sweepTask = nil
            }
        }
        .allowsHitTesting(false)
    }

    private func startGlowPulse() {
        glowExpanded = false
        withAnimation(.easeInOut(duration: 4.0).repeatForever(autoreverses: true)) {
            glowExpanded = true
        }
    }

    private func startSweepLoop() {
        sweepTask?.cancel()
        sweepTask = Task { @MainActor in
            while !Task.isCancelled {
                sweepPhase = -1
                try? await Task.sleep(nanoseconds: 16_000_000)
                withAnimation(.linear(duration: 3.0)) {
                    sweepPhase = 2
                }
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                if Task.isCancelled { break }
                try? await Task.sleep(nanoseconds: 4_000_000_000)
            }
        }
    }
}
