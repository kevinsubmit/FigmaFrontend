import SwiftUI
struct PointsView: View {
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
                    dailyCheckInCard

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
                            LazyVStack(spacing: UITheme.spacing10) {
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
                            LazyVStack(spacing: 0) {
                                ForEach(Array(viewModel.transactions.enumerated()), id: \.element.id) { index, item in
                                    historyRow(item: item, isLast: index == viewModel.transactions.count - 1)
                                        .onAppear {
                                            Task { await loadMoreTransactionsIfNeeded(currentIndex: index) }
                                        }
                                }

                                if viewModel.isLoadingMoreTransactions {
                                    ProgressView()
                                        .tint(brandGold)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, UITheme.spacing12)
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
        .task { await loadIfNeeded() }
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
        await viewModel.load(token: token, force: true)
    }

    private func loadIfNeeded() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadIfNeeded(token: token)
    }

    private func canExchange(_ coupon: CouponTemplateDTO) -> Bool {
        guard let required = coupon.points_required else { return false }
        return (viewModel.balance?.available_points ?? 0) >= required
    }

    private func doExchange(_ couponID: Int) async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.exchange(token: token, couponID: couponID)
    }

    private func claimDailyCheckIn() async {
        guard let token = appState.requireAccessToken() else { return }
        let awarded = await viewModel.claimDailyCheckIn(token: token)
        if awarded {
            appState.requestProfileSummaryRefresh()
        }
    }

    private func loadMoreTransactionsIfNeeded(currentIndex: Int) async {
        let thresholdIndex = max(viewModel.transactions.count - 4, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMoreTransactions(token: token)
    }

    @ViewBuilder
    private var dailyCheckInCard: some View {
        let status = viewModel.dailyCheckInStatus
        let rewardPoints = max(status?.reward_points ?? 0, 0)
        let checkedIn = status?.checked_in_today ?? false

        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            HStack(alignment: .center, spacing: UITheme.spacing10) {
                ZStack {
                    Circle()
                        .fill(brandGold.opacity(0.14))
                        .frame(width: 42, height: 42)
                    Image(systemName: checkedIn ? "checkmark.seal.fill" : "calendar.badge.plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(brandGold)
                }

                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text("DAILY CHECK-IN")
                        .font(.caption.weight(.black))
                        .tracking(2.2)
                        .foregroundStyle(.secondary)
                    Text(checkedIn ? "Come back tomorrow for more points." : "Check in today and earn \(rewardPoints) points.")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.92))
                }

                Spacer()

                Button {
                    Task { await claimDailyCheckIn() }
                } label: {
                    Text(checkedIn ? "Checked In" : "+\(rewardPoints) pts")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(checkedIn ? Color.white.opacity(0.55) : Color.black)
                        .padding(.horizontal, UITheme.spacing14)
                        .padding(.vertical, UITheme.spacing10)
                        .background(checkedIn ? Color.white.opacity(0.08) : brandGold)
                        .clipShape(Capsule())
                }
                .disabled(checkedIn || viewModel.isClaimingDailyCheckIn)
            }

            if let checkedInAt = status?.checked_in_at, checkedIn {
                Text("Today's check-in completed at \(formatCheckInTime(checkedInAt)).")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, UITheme.spacing14)
        .padding(.vertical, UITheme.spacing14)
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

    private func formatCheckInTime(_ rawValue: String) -> String {
        guard let date = PointsCheckInDateParser.parse(rawValue) else {
            return "today"
        }
        return date.formatted(date: .omitted, time: .shortened)
    }

    private func historyRow(item: PointTransactionDTO, isLast: Bool) -> some View {
        let isPositive = item.type.lowercased() == "earn" || item.amount >= 0

        return HStack(alignment: .center, spacing: UITheme.spacing12) {
            ZStack {
                Circle()
                    .fill((isPositive ? Color.green : Color.red).opacity(0.22))
                    .frame(width: 32, height: 32)
                Image(systemName: isPositive ? "arrow.up.right" : "arrow.down.right")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(isPositive ? Color.green : Color.red)
            }

            VStack(alignment: .leading, spacing: UITheme.spacing2) {
                Text(formattedPointsReason(item.reason))
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                if let desc = item.description, !desc.isEmpty {
                    Text(desc)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Text(displayDateOnly(item.created_at))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(item.amount > 0 ? "+\(item.amount)" : "\(item.amount)")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(isPositive ? .green : .white.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .padding(.horizontal, UITheme.spacing2)
        .padding(.vertical, UITheme.spacing12)
        .overlay(alignment: .bottom) {
            if !isLast {
                Rectangle()
                    .fill(Color.white.opacity(0.10))
                    .frame(height: UITheme.spacing1)
                    .padding(.leading, 44)
            }
        }
    }

    private func formattedPointsReason(_ raw: String) -> String {
        let normalized = raw
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
        if normalized.isEmpty {
            return "Points update"
        }
        return normalized.localizedCapitalized
    }
}

private enum PointsCheckInDateParser {
    private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let standard: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static func parse(_ rawValue: String) -> Date? {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        if let date = fractional.date(from: trimmed) {
            return date
        }
        if let date = standard.date(from: trimmed) {
            return date
        }
        if !trimmed.hasSuffix("Z") {
            let normalized = trimmed.contains("T")
                ? "\(trimmed)Z"
                : trimmed.replacingOccurrences(of: " ", with: "T") + "Z"
            if let date = fractional.date(from: normalized) {
                return date
            }
            if let date = standard.date(from: normalized) {
                return date
            }
        }
        return nil
    }
}
