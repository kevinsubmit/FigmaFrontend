import SwiftUI
import PhotosUI
struct OrderHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = OrderHistoryViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var showReviewSheet: Bool = false
    @State private var reviewingItem: AppointmentDTO?
    @State private var reviewRating: Int = 5
    @State private var reviewComment: String = ""
    @State private var reviewExistingImagePaths: [String] = []
    @State private var reviewDraftImages: [ReviewDraftImage] = []
    @State private var pickedReviewImages: [PhotosPickerItem] = []
    @State private var isUploadingReviewImages: Bool = false
    @State private var isSubmittingReview: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let reviewWindowDays = 30

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
                        LazyVStack(spacing: UITheme.spacing10) {
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
        .onChange(of: pickedReviewImages) { items in
            Task { await handlePickedReviewImages(items) }
        }
        .sheet(isPresented: $showReviewSheet, onDismiss: { reviewingItem = nil }) {
            reviewComposerSheet
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .preferredColorScheme(.dark)
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
                    if let address = item.store_address?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(Color.white.opacity(0.48))
                            Text(address)
                                .font(.caption2)
                                .foregroundStyle(Color.white.opacity(0.6))
                                .lineLimit(1)
                        }
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

            if item.status.lowercased() == "completed" {
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: UITheme.spacing1)

                HStack(spacing: UITheme.spacing8) {
                    Text("Review")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.68))

                    Spacer(minLength: UITheme.spacing8)

                    if canReview(item) {
                        Button {
                            startReview(item)
                        } label: {
                            HStack(spacing: UITheme.spacing4) {
                                Image(systemName: "star.fill")
                                    .font(.caption2.weight(.bold))
                                Text("Review")
                                    .font(.caption.weight(.bold))
                            }
                            .foregroundStyle(brandGold)
                            .padding(.horizontal, UITheme.spacing12)
                            .padding(.vertical, UITheme.spacing6)
                            .background(brandGold.opacity(0.12))
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(brandGold.opacity(0.42), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    } else {
                        Text(item.review_id != nil ? "Reviewed" : "Review window closed")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(item.review_id != nil ? brandGold : Color.white.opacity(0.56))
                    }
                }
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
        HomeDateFormatterCache.formattedNYDate(raw) ?? raw
    }

    private func formattedTime(_ raw: String) -> String {
        HomeDateFormatterCache.formattedNYTime(raw) ?? raw
    }

    private func canReview(_ item: AppointmentDTO) -> Bool {
        item.status.lowercased() == "completed" && item.review_id == nil && isReviewWindowOpen(item)
    }

    private func isReviewWindowOpen(_ item: AppointmentDTO) -> Bool {
        let baseDate = HomeDateFormatterCache.appointmentDateTime(item)
        guard baseDate != .distantPast else { return false }
        guard let cutoff = Calendar(identifier: .gregorian).date(byAdding: .day, value: reviewWindowDays, to: baseDate) else {
            return false
        }
        return Date() <= cutoff
    }

    private func startReview(_ item: AppointmentDTO) {
        reviewingItem = item
        reviewRating = 5
        reviewComment = ""
        reviewExistingImagePaths = []
        reviewDraftImages = []
        pickedReviewImages = []
        showReviewSheet = true
    }

    private func submitReview() {
        guard let item = reviewingItem else { return }
        guard let token = appState.requireAccessToken() else { return }
        Task { @MainActor in
            isSubmittingReview = true
            do {
                var uploadedImagePaths: [String] = []
                if !reviewDraftImages.isEmpty {
                    isUploadingReviewImages = true
                    uploadedImagePaths = try await viewModel.uploadReviewImages(
                        token: token,
                        files: reviewDraftImages.map { $0.uploadPayload }
                    )
                    isUploadingReviewImages = false
                }
                let allImages = reviewExistingImagePaths + uploadedImagePaths
                _ = try await viewModel.createReview(
                    token: token,
                    appointmentID: item.id,
                    rating: Double(reviewRating),
                    comment: reviewComment,
                    images: allImages.isEmpty ? nil : allImages
                )
                await viewModel.load(token: token)
                showReviewSheet = false
                reviewingItem = nil
                reviewComment = ""
                reviewExistingImagePaths = []
                reviewDraftImages = []
                pickedReviewImages = []
            } catch let err as APIError {
                alertMessage = mapError(err)
                showAlert = true
            } catch {
                alertMessage = error.localizedDescription
                showAlert = true
            }
            isUploadingReviewImages = false
            isSubmittingReview = false
        }
    }

    @ViewBuilder
    private var reviewComposerSheet: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing14) {
                    HStack(alignment: .center, spacing: UITheme.spacing8) {
                        Text("Write a Review")
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        Button("Close") {
                            showReviewSheet = false
                            reviewingItem = nil
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.74))
                    }

                    Text("Reviews are available within 30 days after your appointment.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let item = reviewingItem {
                        VStack(alignment: .leading, spacing: UITheme.spacing4) {
                            Text(item.store_name ?? "Salon")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white)
                            Text(item.service_name ?? "Service")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, UITheme.spacing10)
                        .padding(.vertical, UITheme.spacing8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(cardBG)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous)
                                .stroke(Color.white.opacity(0.12), lineWidth: 1)
                        )
                    }

                    VStack(alignment: .leading, spacing: UITheme.spacing8) {
                        Text("Rating")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.62))
                        HStack(spacing: UITheme.spacing8) {
                            ForEach(1 ... 5, id: \.self) { star in
                                Button {
                                    reviewRating = star
                                } label: {
                                    Image(systemName: star <= reviewRating ? "star.fill" : "star")
                                        .font(.title3)
                                        .foregroundStyle(star <= reviewRating ? brandGold : Color.white.opacity(0.34))
                                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: UITheme.spacing8) {
                        Text("Comment (Optional)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.62))
                        TextEditor(text: $reviewComment)
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

                    VStack(alignment: .leading, spacing: UITheme.spacing8) {
                        Text("Photos (Optional, max 5)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.62))

                        if reviewImageCount > 0 {
                            let columns = Array(repeating: GridItem(.flexible(), spacing: UITheme.spacing8), count: 3)
                            LazyVGrid(columns: columns, spacing: UITheme.spacing8) {
                                ForEach(Array(reviewExistingImagePaths.enumerated()), id: \.offset) { idx, path in
                                    reviewRemoteImageCell(path: path, removeAction: {
                                        reviewExistingImagePaths.remove(at: idx)
                                    })
                                }
                                ForEach(reviewDraftImages) { item in
                                    reviewDraftImageCell(item: item)
                                }
                            }
                        }

                        if reviewImageCount < 5 {
                            PhotosPicker(
                                selection: $pickedReviewImages,
                                maxSelectionCount: max(0, 5 - reviewImageCount),
                                matching: .images,
                                photoLibrary: .shared()
                            ) {
                                HStack(spacing: UITheme.spacing8) {
                                    if isUploadingReviewImages {
                                        ProgressView().tint(brandGold)
                                    } else {
                                        Image(systemName: "photo.on.rectangle.angled")
                                            .font(.subheadline.weight(.semibold))
                                    }
                                    Text(isUploadingReviewImages ? "Uploading..." : "Add Photos")
                                        .font(.subheadline.weight(.semibold))
                                }
                                .foregroundStyle(Color.white.opacity(0.86))
                                .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight - 6)
                                .background(cardBG)
                                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous)
                                        .stroke(Color.white.opacity(0.16), style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                                )
                            }
                        }
                    }

                    HStack(spacing: UITheme.spacing8) {
                        Button("Cancel") {
                            showReviewSheet = false
                            reviewingItem = nil
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.8))
                        .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))

                        Button {
                            submitReview()
                        } label: {
                            if isSubmittingReview {
                                ProgressView()
                                    .tint(Color.black.opacity(0.85))
                                    .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                            } else {
                                Text("Submit")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(Color.black.opacity(0.88))
                                    .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(isSubmittingReview || isUploadingReviewImages)
                        .background(brandGold)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing18)
                .padding(.bottom, UITheme.spacing12)
            }
        }
    }

    private var reviewImageCount: Int {
        reviewExistingImagePaths.count + reviewDraftImages.count
    }

    private func reviewDraftImageCell(item: ReviewDraftImage) -> some View {
        ZStack(alignment: .topTrailing) {
            Image(uiImage: item.preview)
                .resizable()
                .scaledToFill()
                .frame(height: 92)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))

            Button {
                reviewDraftImages.removeAll { $0.id == item.id }
            } label: {
                Image(systemName: "xmark")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(Color.black.opacity(0.68))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .padding(6)
        }
    }

    private func reviewRemoteImageCell(path: String, removeAction: @escaping () -> Void) -> some View {
        ZStack(alignment: .topTrailing) {
            CachedAsyncImage(url: AssetURLResolver.resolveURL(from: path)) { phase in
                switch phase {
                case .empty:
                    ZStack { Color.white.opacity(0.08); ProgressView().tint(brandGold) }
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure:
                    Color.white.opacity(0.08)
                        .overlay(Image(systemName: "photo").foregroundStyle(Color.white.opacity(0.45)))
                @unknown default:
                    Color.white.opacity(0.08)
                }
            }
            .frame(height: 92)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))

            Button(action: removeAction) {
                Image(systemName: "xmark")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(Color.black.opacity(0.68))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .padding(6)
        }
    }

    private func handlePickedReviewImages(_ items: [PhotosPickerItem]) async {
        guard !items.isEmpty else { return }

        for item in items {
            if reviewImageCount >= 5 {
                alertMessage = "Maximum 5 images allowed."
                showAlert = true
                break
            }
            do {
                guard let data = try await item.loadTransferable(type: Data.self),
                      let uiImage = UIImage(data: data) else {
                    alertMessage = "Failed to read selected image."
                    showAlert = true
                    continue
                }

                guard let optimized = optimizeReviewImageData(from: uiImage) else {
                    alertMessage = "Image size must be less than 5MB."
                    showAlert = true
                    continue
                }

                reviewDraftImages.append(
                    ReviewDraftImage(
                        data: optimized,
                        preview: uiImage,
                        mimeType: "image/jpeg",
                        fileName: "review_\(Int(Date().timeIntervalSince1970))_\(UUID().uuidString.prefix(8)).jpg"
                    )
                )
            } catch {
                alertMessage = "Failed to load selected image."
                showAlert = true
            }
        }

        pickedReviewImages = []
    }

    private func optimizeReviewImageData(from image: UIImage) -> Data? {
        let maxBytes = 5 * 1024 * 1024
        guard var data = image.jpegData(compressionQuality: 0.9) else { return nil }
        if data.count <= maxBytes { return data }

        let attempts: [CGFloat] = [0.8, 0.72, 0.65, 0.58, 0.5, 0.42]
        for quality in attempts {
            if let compressed = image.jpegData(compressionQuality: quality), compressed.count <= maxBytes {
                data = compressed
                return data
            }
        }
        return nil
    }
}

private struct ReviewDraftImage: Identifiable, Equatable {
    let id = UUID()
    let data: Data
    let preview: UIImage
    let mimeType: String
    let fileName: String

    var uploadPayload: ReviewUploadImagePayload {
        ReviewUploadImagePayload(data: data, fileName: fileName, mimeType: mimeType)
    }
}
