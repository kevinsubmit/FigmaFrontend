import SwiftUI
struct MyReviewsView: View {
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
                LazyVStack(alignment: .leading, spacing: UITheme.spacing10) {
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

