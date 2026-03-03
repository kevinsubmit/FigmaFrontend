import SwiftUI
import UIKit

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
        let defaultBase = APIClient.shared.assetBaseURL
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

private struct ShareSheetPayload: Identifiable {
    let id = UUID()
    let activityItems: [Any]
}

struct ReferAFriendView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ReferAFriendViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var shareSheetPayload: ShareSheetPayload?
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
        .sheet(item: $shareSheetPayload) { payload in
            ActivityView(activityItems: payload.activityItems)
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
                shareSheetPayload = ShareSheetPayload(activityItems: payload)
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

                LazyVStack(spacing: UITheme.spacing8) {
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
        if let formatted = HomeDateFormatterCache.formatJoinedDate(raw) {
            return formatted
        }
        return raw
    }
}
