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
    @State private var selectedTemplateKey: String = "minimal_gold"
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
                            ForEach(Array(sortedCards.enumerated()), id: \.element.id) { index, card in
                                giftCardItem(card)
                                    .onAppear {
                                        Task { await loadMoreGiftCardsIfNeeded(currentIndex: index) }
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
        .task { await loadIfNeeded() }
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
                .presentationDetents([.height(560)])
                .presentationDragIndicator(.visible)
        }
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
        .task(id: claimCode + "|" + (showClaimSheet ? "1" : "0")) {
            guard showClaimSheet, let token = appState.requireAccessToken() else {
                viewModel.clearClaimPreview()
                return
            }
            let normalizedCode = claimCode.trimmingCharacters(in: .whitespacesAndNewlines)
            guard normalizedCode.count >= 6 else {
                viewModel.clearClaimPreview()
                return
            }
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled else { return }
            await viewModel.loadClaimPreview(token: token, claimCode: claimCode)
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

    private func loadMoreGiftCardsIfNeeded(currentIndex: Int) async {
        let thresholdIndex = max(sortedCards.count - 3, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMore(token: token)
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
                        claimCode = ""
                        viewModel.clearClaimPreview()
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

                if let preview = viewModel.claimPreview {
                    giftCardVisual(
                        balance: preview.amount,
                        template: preview.template,
                        message: preview.recipient_message,
                        cardNumber: nil,
                        badge: "Gift preview"
                    )
                    .frame(height: 220)
                } else if viewModel.isLoadingClaimPreview {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.white.opacity(0.04))
                        .overlay {
                            Text("Loading preview...")
                                .font(.caption.weight(.bold))
                                .kerning(1.4)
                                .foregroundStyle(.secondary)
                        }
                        .frame(height: 160)
                } else {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.white.opacity(0.04))
                        .overlay {
                            Text("Enter the gift code to preview the selected gift card style before claiming it.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(UITheme.spacing16)
                        }
                        .frame(height: 160)
                }

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
                        selectedCardForSending = nil
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(brandGold)
                }

                if let card = selectedCardForSending {
                    giftCardVisual(
                        balance: card.balance,
                        template: selectedTemplate,
                        message: sendMessage,
                        cardNumber: nil,
                        badge: "Gift preview"
                    )
                    .frame(height: 220)
                }

                VStack(alignment: .leading, spacing: UITheme.spacing8) {
                    Text("Choose a style")
                        .font(.caption.weight(.bold))
                        .kerning(1.6)
                        .foregroundStyle(brandGold)
                    Text("The recipient will see this same card design.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: UITheme.spacing10) {
                            ForEach(viewModel.templates) { template in
                                Button {
                                    selectedTemplateKey = template.key
                                } label: {
                                    VStack(alignment: .leading, spacing: UITheme.spacing8) {
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(
                                                LinearGradient(
                                                    colors: [Color(hex: template.background_start_hex), Color(hex: template.background_end_hex)],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
                                                )
                                            )
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14)
                                                    .stroke(selectedTemplateKey == template.key ? brandGold : Color.white.opacity(0.10), lineWidth: 1)
                                            )
                                            .frame(width: 120, height: 84)
                                        Text(template.name)
                                            .font(.caption.weight(.bold))
                                            .foregroundStyle(.white)
                                        Text(template.description)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(2)
                                    }
                                    .frame(width: 120, alignment: .leading)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
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

            }
            .padding(UITheme.pagePadding)
        }
    }

    private func giftCardItem(_ card: GiftCardDTO) -> some View {
        let statusText = card.status.replacingOccurrences(of: "_", with: " ").capitalized
        let statusColor = giftStatusColor(card.status)

        return VStack(alignment: .leading, spacing: UITheme.spacing11) {
            giftCardVisual(
                balance: card.balance,
                template: card.template,
                message: card.recipient_message,
                cardNumber: card.card_number,
                badge: card.status.lowercased() == "pending_transfer" ? "Pending transfer" : card.template.name
            )
            .frame(height: 220)

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
                    selectedTemplateKey = card.template_key
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

    private var selectedTemplate: GiftCardTemplateDTO {
        if let match = viewModel.templates.first(where: { $0.key == selectedTemplateKey }) {
            return match
        }
        return selectedCardForSending?.template ?? viewModel.templates.first ?? GiftCardTemplateDTO(
            key: "minimal_gold",
            name: "Minimal Gold",
            description: "Clean black-and-gold card with a premium finish.",
            icon_key: "sparkles",
            accent_start_hex: "#F4D27A",
            accent_end_hex: "#B8891B",
            background_start_hex: "#121212",
            background_end_hex: "#2A2112",
            text_hex: "#FFF8E7"
        )
    }

    private func giftCardVisual(
        balance: Double,
        template: GiftCardTemplateDTO,
        message: String?,
        cardNumber: String?,
        badge: String
    ) -> some View {
        let accentStart = Color(hex: template.accent_start_hex)
        let accentEnd = Color(hex: template.accent_end_hex)
        let backgroundStart = Color(hex: template.background_start_hex)
        let backgroundEnd = Color(hex: template.background_end_hex)
        let foreground = Color(hex: template.text_hex)

        return ZStack {
            LinearGradient(
                colors: [backgroundStart, backgroundEnd],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RadialGradient(
                colors: [accentStart.opacity(0.28), .clear],
                center: .topLeading,
                startRadius: 10,
                endRadius: 220
            )
            .blendMode(.plusLighter)

            RadialGradient(
                colors: [accentEnd.opacity(0.22), .clear],
                center: .bottomTrailing,
                startRadius: 10,
                endRadius: 240
            )
            .blendMode(.plusLighter)

            VStack(alignment: .leading, spacing: UITheme.spacing12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: UITheme.spacing6) {
                        Text("NAILSDASH GIFT CARD")
                            .font(.caption2.weight(.bold))
                            .kerning(2.2)
                            .foregroundStyle(foreground.opacity(0.76))
                        Text(badge)
                            .font(.caption.weight(.bold))
                            .kerning(1.4)
                            .foregroundStyle(foreground.opacity(0.82))
                    }
                    Spacer()
                    ZStack {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(accentStart.opacity(0.18))
                            .frame(width: 42, height: 42)
                        Image(systemName: templateIconName(template.icon_key))
                            .font(.headline.weight(.bold))
                            .foregroundStyle(accentStart)
                    }
                }

                Spacer(minLength: 0)

                VStack(alignment: .leading, spacing: UITheme.spacing6) {
                    Text("AVAILABLE BALANCE")
                        .font(.caption2.weight(.bold))
                        .kerning(2.0)
                        .foregroundStyle(foreground.opacity(0.65))
                    HStack(alignment: .firstTextBaseline, spacing: UITheme.spacing2) {
                        Text("$")
                            .font(.title3.weight(.black))
                            .foregroundStyle(accentStart)
                        Text(String(format: "%.2f", balance))
                            .font(.system(size: 36, weight: .black, design: .rounded))
                            .foregroundStyle(foreground)
                    }
                    Text((message?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? "“\(message!.trimmingCharacters(in: .whitespacesAndNewlines))”" : "A little luxury, ready whenever you are.")
                        .font(.caption)
                        .foregroundStyle(foreground.opacity(0.88))
                        .lineLimit(2)
                }

                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: UITheme.spacing3) {
                        Text("Template")
                            .font(.caption2.weight(.bold))
                            .kerning(1.4)
                            .foregroundStyle(foreground.opacity(0.60))
                        Text(template.name)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(foreground)
                    }
                    Spacer()
                    if let cardNumber, !cardNumber.isEmpty {
                        Text(cardNumber)
                            .font(.system(.caption, design: .monospaced).weight(.semibold))
                            .foregroundStyle(foreground.opacity(0.9))
                            .padding(.horizontal, UITheme.spacing10)
                            .padding(.vertical, UITheme.spacing7)
                            .background(Color.black.opacity(0.18))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
            .padding(UITheme.spacing18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(accentStart.opacity(0.30), lineWidth: 1)
        )
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

    private func templateIconName(_ iconKey: String) -> String {
        switch iconKey {
        case "cake":
            return "gift.fill"
        case "lotus":
            return "sparkles"
        case "confetti":
            return "gift.fill"
        case "flower":
            return "camera.macro"
        case "gem":
            return "sparkle.diamond.fill"
        default:
            return "sparkles"
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
            viewModel.clearClaimPreview()
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
            message: sendMessage,
            templateKey: selectedTemplateKey
        )
        if success {
            showSendSheet = false
            selectedCardForSending = nil
            sendRecipientPhone = ""
            sendMessage = ""
            selectedTemplateKey = "minimal_gold"
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

private extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let r, g, b: UInt64
        switch cleaned.count {
        case 6:
            (r, g, b) = ((value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF)
        default:
            (r, g, b) = (255, 255, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255.0,
            green: Double(g) / 255.0,
            blue: Double(b) / 255.0,
            opacity: 1
        )
    }
}
