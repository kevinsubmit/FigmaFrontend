import SwiftUI
struct CouponsView: View {
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
                    couponStatusTabs
                        .padding(RewardsVisualTokens.tabContainerPadding)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.sectionCorner))
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
                        LazyVStack(spacing: UITheme.spacing14) {
                            ForEach(Array(viewModel.coupons.enumerated()), id: \.element.id) { index, item in
                                couponTicketCard(item)
                                    .onAppear {
                                        Task { await loadMoreCouponsIfNeeded(currentIndex: index) }
                                    }
                            }

                            if viewModel.isLoadingMore {
                                ProgressView()
                                    .tint(brandGold)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, UITheme.spacing12)
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
        .task { await loadIfNeeded() }
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
        await viewModel.load(token: token, force: true)
    }

    private func loadIfNeeded() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadIfNeeded(token: token)
    }

    private func loadMoreCouponsIfNeeded(currentIndex: Int) async {
        let thresholdIndex = max(viewModel.coupons.count - 3, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMore(token: token)
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
