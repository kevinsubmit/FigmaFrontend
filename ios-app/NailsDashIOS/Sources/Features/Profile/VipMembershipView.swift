import SwiftUI

private struct VipTierItem: Identifiable {
    let id = UUID()
    let level: String
    let title: String
    let icon: String
    let iconColor: Color
    let benefits: [String]
}

struct VipMembershipView: View {
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
