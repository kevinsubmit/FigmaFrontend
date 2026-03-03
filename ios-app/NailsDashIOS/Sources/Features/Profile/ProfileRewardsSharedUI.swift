import SwiftUI
struct RewardsTopBar: View {
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

struct UnifiedLoadingOverlay: View {
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

struct UnifiedEmptyStateCard: View {
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

struct UnifiedSectionHeader: View {
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

enum RewardsVisualTokens {
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

extension View {
    func unifiedNoticeAlert(isPresented: Binding<Bool>, message: String) -> some View {
        let clean = message.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalMessage = clean.isEmpty ? "Something went wrong. Please try again." : clean
        return alert("Notice", isPresented: isPresented) {
            Button("OK", role: .cancel) {
                if AppState.shouldForceLogoutAfterSensitiveAuthAlert(finalMessage) {
                    NotificationCenter.default.post(name: .apiUnauthorized, object: nil)
                }
            }
        } message: {
            Text(finalMessage)
        }
    }
}
