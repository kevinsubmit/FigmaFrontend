import SwiftUI
import UIKit
struct GiftCardsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = GiftCardsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var claimCode: String = ""
    @State private var selectedCardForSending: GiftCardDTO?
    @State private var sendRecipientPhone: String = ""
    @State private var sendMessage: String = ""
    @State private var showSendSheet: Bool = false
    @State private var showClaimSheet: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Gift Cards") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing12) {
                    giftAssetsHint
                    giftSummaryCard
                    UnifiedSectionHeader(
                        title: "MY COLLECTION",
                        trailing: nil,
                        showsDivider: true
                    )
                    .padding(.top, UITheme.spacing2)

                    HStack(spacing: UITheme.spacing8) {
                        Text("\(viewModel.cards.count) cards")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)

                        Spacer()

                        Button {
                            showClaimSheet = true
                        } label: {
                            HStack(spacing: UITheme.spacing4) {
                                Image(systemName: "ticket.fill")
                                    .font(.caption2.weight(.bold))
                                Text("Claim")
                                    .font(.caption.weight(.bold))
                                    .kerning(1.1)
                                    .textCase(.uppercase)
                            }
                            .foregroundStyle(brandGold)
                            .padding(.horizontal, UITheme.spacing10)
                            .padding(.vertical, UITheme.spacing7)
                            .background(Color.black.opacity(0.45))
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(brandGold.opacity(0.35), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.bottom, UITheme.spacing1)

                    if !viewModel.isLoading && viewModel.cards.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "gift.fill",
                            title: "No gift cards found",
                            subtitle: "Claim or receive gift cards to see them here."
                        )
                        .padding(.top, UITheme.spacing16)
                        .padding(.bottom, UITheme.spacing8)
                    } else {
                        LazyVStack(spacing: UITheme.spacing10) {
                            ForEach(sortedCards) { card in
                                giftCardItem(card)
                            }
                        }
                        .padding(.horizontal, UITheme.spacing1)
                        .padding(.top, UITheme.spacing3)
                    }

                    redemptionInfoCard
                        .padding(.top, UITheme.spacing8)
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
            viewModel.errorMessage = nil
        }
        .onChange(of: viewModel.actionMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
            viewModel.actionMessage = nil
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .sheet(isPresented: $showSendSheet) {
            sendGiftSheet
                .presentationDetents([.height(420)])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showClaimSheet) {
            claimGiftSheet
                .presentationDetents([.height(340)])
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

    private var sortedCards: [GiftCardDTO] {
        viewModel.cards.sorted { lhs, rhs in
            let leftPriority = statusPriority(lhs.status)
            let rightPriority = statusPriority(rhs.status)
            if leftPriority != rightPriority {
                return leftPriority < rightPriority
            }
            return lhs.created_at > rhs.created_at
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

    private var giftAssetsHint: some View {
        HStack(spacing: UITheme.spacing6) {
            Circle()
                .fill(brandGold)
                .frame(width: 6, height: 6)
            Text("DIGITAL ASSETS PURCHASED IN-SALON")
                .font(.caption2.weight(.bold))
                .kerning(1.6)
                .foregroundStyle(.secondary)
        }
    }

    private var claimGiftSheet: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(alignment: .leading, spacing: UITheme.spacing12) {
                HStack {
                    Text("Claim a Gift")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("Close") {
                        showClaimSheet = false
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(brandGold)
                }

                Text("Enter claim code")
                    .font(.caption.weight(.bold))
                    .kerning(1.6)
                    .foregroundStyle(.secondary)

                TextField("Claim code", text: $claimCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled(true)
                    .onChange(of: claimCode) { value in
                        claimCode = value.uppercased()
                    }
                    .padding(.horizontal, UITheme.spacing12)
                    .padding(.vertical, UITheme.spacing10)
                    .background(Color.black.opacity(0.42))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
                    .foregroundStyle(.white)

                Button {
                    Task { await handleClaimGiftCard() }
                } label: {
                    HStack(spacing: UITheme.spacing6) {
                        if viewModel.isClaiming {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.black)
                                .scaleEffect(0.9)
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption.weight(.bold))
                        }
                        Text(viewModel.isClaiming ? "Claiming..." : "Claim Gift Card")
                            .font(.headline.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, UITheme.spacing11)
                    .foregroundStyle(.black)
                    .background(brandGold)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
                .disabled(viewModel.isClaiming)

                Text("Enter the code from SMS to claim a transferred gift card.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer(minLength: 0)
            }
            .padding(UITheme.pagePadding)
        }
    }

    private var sendGiftSheet: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(alignment: .leading, spacing: UITheme.spacing12) {
                HStack {
                    Text("Send Gift Card")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("Close") {
                        showSendSheet = false
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(brandGold)
                }

                if let card = selectedCardForSending {
                    HStack(spacing: UITheme.spacing6) {
                        Text("Balance")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("$\(String(format: "%.2f", card.balance))")
                            .font(.title3.weight(.black))
                            .foregroundStyle(brandGold)
                    }
                    .padding(UITheme.spacing12)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                VStack(alignment: .leading, spacing: UITheme.spacing6) {
                    Text("Recipient Phone")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    TextField("Enter US phone", text: $sendRecipientPhone)
                        .keyboardType(.numberPad)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .padding(.horizontal, UITheme.spacing12)
                        .padding(.vertical, UITheme.spacing10)
                        .background(Color.black.opacity(0.42))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                }

                VStack(alignment: .leading, spacing: UITheme.spacing6) {
                    Text("Message (Optional)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    TextField("Write a message", text: $sendMessage)
                        .textInputAutocapitalization(.sentences)
                        .padding(.horizontal, UITheme.spacing12)
                        .padding(.vertical, UITheme.spacing10)
                        .background(Color.black.opacity(0.42))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                }

                Button {
                    Task { await handleSendGiftCard() }
                } label: {
                    HStack(spacing: UITheme.spacing6) {
                        if viewModel.sendingCardID == selectedCardForSending?.id {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.black)
                                .scaleEffect(0.9)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .font(.caption.weight(.bold))
                        }
                        Text(viewModel.sendingCardID == selectedCardForSending?.id ? "Sending..." : "Send Digital Gift Card")
                            .font(.headline.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, UITheme.spacing11)
                    .foregroundStyle(.black)
                    .background(brandGold)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
                .disabled(viewModel.sendingCardID != nil)

                Spacer(minLength: 0)
            }
            .padding(UITheme.pagePadding)
        }
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
                Button {
                    UIPasteboard.general.string = card.card_number
                    alertMessage = "Card code copied."
                    showAlert = true
                } label: {
                    Image(systemName: "doc.on.doc")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(7)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
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

            if card.status.lowercased() == "active" {
                Button {
                    selectedCardForSending = card
                    sendRecipientPhone = ""
                    sendMessage = ""
                    showSendSheet = true
                } label: {
                    HStack(spacing: UITheme.spacing5) {
                        Image(systemName: "paperplane.fill")
                            .font(.caption.weight(.bold))
                        Text("Send this card")
                            .font(.caption.weight(.bold))
                            .kerning(0.8)
                            .textCase(.uppercase)
                    }
                    .foregroundStyle(brandGold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, UITheme.spacing9)
                    .background(Color.black.opacity(0.42))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(brandGold.opacity(0.35), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            } else if card.status.lowercased() == "pending_transfer" {
                Button {
                    Task { await handleRevokeGiftCard(card) }
                } label: {
                    HStack(spacing: UITheme.spacing5) {
                        if viewModel.revokingCardID == card.id {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.red)
                                .scaleEffect(0.75)
                        } else {
                            Image(systemName: "xmark.circle.fill")
                                .font(.caption.weight(.bold))
                        }
                        Text(viewModel.revokingCardID == card.id ? "Canceling..." : "Cancel transfer")
                            .font(.caption.weight(.bold))
                            .kerning(0.8)
                            .textCase(.uppercase)
                    }
                    .foregroundStyle(Color.red.opacity(0.9))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, UITheme.spacing9)
                    .background(Color.red.opacity(0.10))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.red.opacity(0.45), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .disabled(viewModel.revokingCardID == card.id)
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
        case "used":
            return .orange
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

    private func handleClaimGiftCard() async {
        guard let token = appState.requireAccessToken() else { return }
        let success = await viewModel.claim(token: token, claimCode: claimCode)
        if success {
            claimCode = ""
            showClaimSheet = false
        }
    }

    private func handleSendGiftCard() async {
        guard let token = appState.requireAccessToken() else { return }
        guard let card = selectedCardForSending else {
            alertMessage = "Please select a gift card."
            showAlert = true
            return
        }
        let success = await viewModel.transfer(
            token: token,
            giftCardID: card.id,
            recipientPhone: sendRecipientPhone,
            message: sendMessage
        )
        if success {
            showSendSheet = false
            selectedCardForSending = nil
            sendRecipientPhone = ""
            sendMessage = ""
        }
    }

    private func handleRevokeGiftCard(_ card: GiftCardDTO) async {
        guard let token = appState.requireAccessToken() else { return }
        _ = await viewModel.revoke(token: token, giftCardID: card.id)
    }

    private var redemptionInfoCard: some View {
        HStack(alignment: .top, spacing: UITheme.spacing10) {
            ZStack {
                Circle()
                    .fill(brandGold.opacity(0.12))
                    .frame(width: 34, height: 34)
                Image(systemName: "shield.checkered")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(brandGold)
            }

            VStack(alignment: .leading, spacing: UITheme.spacing5) {
                Text("IN-STORE REDEMPTION")
                    .font(.caption.weight(.bold))
                    .kerning(1.6)
                    .foregroundStyle(brandGold)
                Text("Show your gift card code to the receptionist at checkout and the amount will be deducted from your final bill.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(UITheme.spacing12)
        .background(brandGold.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(0.18), lineWidth: 1)
        )
    }
}

