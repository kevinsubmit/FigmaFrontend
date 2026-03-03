import Photos
import SwiftUI
import UIKit

@MainActor
private final class HomeFeedPinDetailViewModel: ObservableObject {
    @Published var pin: HomeFeedPinDTO
    @Published var relatedPins: [HomeFeedPinDTO] = []
    @Published var isLoading: Bool = false
    @Published var isFavorited: Bool = false
    @Published var isFavoriteLoading: Bool = false
    @Published var errorMessage: String?

    private let service = HomeFeedService()

    init(pin: HomeFeedPinDTO) {
        self.pin = pin
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let detailTask = service.getPinByID(pin.id)
            async let relatedTask = loadRelated()
            pin = try await detailTask
            relatedPins = try await relatedTask
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadFavoriteState(token: String?) async {
        guard let token else {
            isFavorited = false
            return
        }
        do {
            isFavorited = try await service.checkFavorite(pinID: pin.id, token: token)
        } catch {
            isFavorited = false
        }
    }

    func toggleFavorite(token: String) async {
        guard !isFavoriteLoading else { return }
        let targetFavorited = !isFavorited
        isFavoriteLoading = true
        defer { isFavoriteLoading = false }
        do {
            try await service.setFavorite(pinID: pin.id, token: token, favorited: targetFavorited)
            isFavorited = targetFavorited
            errorMessage = nil
        } catch let err as APIError {
            if recoverFavoriteToggleState(error: err, targetFavorited: targetFavorited) {
                return
            }
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadRelated() async throws -> [HomeFeedPinDTO] {
        guard let primaryTag = pin.tags.first, !primaryTag.isEmpty else { return [] }
        let rows = try await service.getPins(skip: 0, limit: 8, tag: primaryTag, search: nil)
        return rows.filter { $0.id != pin.id }
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .invalidURL:
            return "Invalid API endpoint."
        case .decoding:
            return "Unexpected response from server."
        }
    }

    private func recoverFavoriteToggleState(error: APIError, targetFavorited: Bool) -> Bool {
        let detail: String
        switch error {
        case .forbidden(let value), .validation(let value), .server(let value), .network(let value):
            detail = value
        case .unauthorized, .invalidURL, .decoding:
            return false
        }

        let normalized = detail.lowercased()
        if normalized.contains("already in favorites") {
            isFavorited = true
            errorMessage = nil
            return true
        }

        if normalized.contains("not in favorites") {
            isFavorited = false
            errorMessage = nil
            return true
        }

        // If backend state changed between check and toggle, keep UI aligned with target state.
        if normalized.contains("favorite") && (normalized.contains("already") || normalized.contains("not")) {
            isFavorited = targetFavorited
            errorMessage = nil
            return true
        }

        return false
    }
}

struct HomeFeedPinDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: HomeFeedPinDetailViewModel
    @State private var toast: PinDetailToastPayload?
    @State private var heroBaseScale: CGFloat = 1
    @State private var isDownloadingImage = false
    @GestureState private var heroPinchScale: CGFloat = 1
    @State private var heroAccumulatedOffset: CGSize = .zero
    @GestureState private var heroDragOffset: CGSize = .zero
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private var heroHeight: CGFloat {
        let proposed = UIScreen.main.bounds.width * 1.12
        return min(max(proposed, 360), 500)
    }

    private var topControlTopPadding: CGFloat {
        let topInset = currentTopSafeAreaInset()
        let hasNotch = topInset > 20
        if hasNotch {
            return topInset + UITheme.spacing18
        }
        return topInset + UITheme.spacing10
    }

    private var heroCurrentScale: CGFloat {
        min(max(heroBaseScale * heroPinchScale, 1), 4)
    }

    private var heroCurrentOffset: CGSize {
        CGSize(
            width: heroAccumulatedOffset.width + heroDragOffset.width,
            height: heroAccumulatedOffset.height + heroDragOffset.height
        )
    }

    init(pin: HomeFeedPinDTO) {
        _viewModel = StateObject(wrappedValue: HomeFeedPinDetailViewModel(pin: pin))
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        heroImageSection(containerWidth: proxy.size.width)

                        VStack(alignment: .leading, spacing: UITheme.spacing14) {
                            titleInfoSection
                            if !viewModel.relatedPins.isEmpty {
                                relatedSection(containerWidth: proxy.size.width)
                            }
                        }
                        .padding(.horizontal, UITheme.pagePadding)
                        .padding(.top, UITheme.spacing12)
                        .padding(.bottom, 108)
                        .frame(width: proxy.size.width, alignment: .leading)
                    }
                    .frame(width: proxy.size.width, alignment: .top)
                }
                .frame(width: proxy.size.width)
                .background(Color.black)
                .scrollDisabled(heroCurrentScale > 1.01)

                topBarOverlay
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            floatingBookNowStrip
        }
        .tint(brandGold)
        .background(Color.black)
        .task {
            await viewModel.load()
            let token = TokenStore.shared.read(key: TokenStore.Keys.accessToken)
            await viewModel.loadFavoriteState(token: token)
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            showToast(message: value, isError: true)
        }
        .overlay(alignment: .top) {
            if let toast {
                PinDetailToastView(payload: toast)
                    .padding(.top, UITheme.spacing56)
                    .padding(.horizontal, UITheme.pagePadding)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: toast?.id)
    }

    private func heroImageSection(containerWidth: CGFloat) -> some View {
        ZStack(alignment: .bottom) {
            CachedAsyncImage(url: viewModel.pin.imageURL) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        Color.gray.opacity(0.2)
                        ProgressView().tint(.white)
                    }
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .scaleEffect(heroCurrentScale)
                        .offset(heroCurrentOffset)
                        .frame(width: containerWidth, height: heroHeight)
                        .clipped()
                        .onTapGesture(count: 2) {
                            withAnimation(.easeOut(duration: 0.2)) {
                                heroBaseScale = 1
                                heroAccumulatedOffset = .zero
                            }
                        }
                case .failure:
                    Color.gray.opacity(0.2)
                        .overlay(Text("Image unavailable").font(.caption).foregroundStyle(.white))
                @unknown default:
                    Color.gray.opacity(0.2)
                }
            }
            .frame(width: containerWidth, height: heroHeight)
            .clipped()

            LinearGradient(
                colors: [.clear, Color.black.opacity(0.72)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 220)
            .allowsHitTesting(false)
        }
        .frame(width: containerWidth, height: heroHeight)
        .contentShape(Rectangle())
        .highPriorityGesture(heroMagnificationGesture(containerWidth: containerWidth))
        .simultaneousGesture(heroDragGesture(containerWidth: containerWidth))
    }

    private var titleInfoSection: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text("CHOSEN DESIGN")
                .font(.caption.weight(.medium))
                .kerning(2.6)
                .foregroundStyle(Color.white.opacity(0.50))
            Text(viewModel.pin.title)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)
                .lineLimit(3)
                .minimumScaleFactor(0.78)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, UITheme.spacing2)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var floatingBookNowStrip: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.10))
                .frame(height: UITheme.spacing1)
            HStack(alignment: .center, spacing: UITheme.spacing12) {
                VStack(alignment: .leading, spacing: UITheme.spacing2) {
                    Text("BOOK THIS LOOK")
                        .font(.system(size: 12, weight: .medium))
                        .kerning(2.2)
                        .foregroundStyle(Color.white.opacity(0.50))
                        .lineLimit(1)
                    Text("Find salons near you")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.9)
                        .allowsTightening(true)
                }
                .layoutPriority(1)

                Spacer(minLength: UITheme.spacing8)

                Button {
                    let styleReference = BookingStyleReference(
                        pinID: viewModel.pin.id,
                        title: viewModel.pin.title,
                        imageURL: viewModel.pin.imageURL?.absoluteString,
                        tags: viewModel.pin.tags
                    )
                    appState.openBookFlow(with: styleReference)
                } label: {
                    Text("Choose a salon")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.black)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                        .allowsTightening(true)
                        .padding(.horizontal, 24)
                        .frame(minHeight: UITheme.ctaHeight + 2)
                        .background(brandGold)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, UITheme.spacing20)
            .padding(.top, UITheme.spacing12)
            .padding(.bottom, UITheme.spacing12)
        }
        .background(Color.black.opacity(0.96))
    }

    private func relatedSection(containerWidth: CGFloat) -> some View {
        let spacing = UITheme.spacing12
        let contentWidth = max(containerWidth - (UITheme.pagePadding * 2), 0)
        let itemWidth = max(floor((contentWidth - spacing) / 2), 120)
        let itemHeight = itemWidth * (4.0 / 3.0)
        let columns = [
            GridItem(.fixed(itemWidth), spacing: spacing, alignment: .top),
            GridItem(.fixed(itemWidth), spacing: 0, alignment: .top),
        ]
        return VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("Similar ideas")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)

            LazyVGrid(columns: columns, spacing: spacing) {
                ForEach(Array(viewModel.relatedPins.prefix(6))) { related in
                    NavigationLink {
                        HomeFeedPinDetailView(pin: related)
                            .environmentObject(appState)
                    } label: {
                        relatedPinCard(related, itemWidth: itemWidth, itemHeight: itemHeight)
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func relatedPinCard(_ pin: HomeFeedPinDTO, itemWidth: CGFloat, itemHeight: CGFloat) -> some View {
        CachedAsyncImage(url: pin.imageURL) { phase in
            switch phase {
            case .empty:
                ZStack {
                    Color.gray.opacity(0.24)
                    ProgressView().tint(.white)
                }
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .failure:
                Color.gray.opacity(0.22)
            @unknown default:
                Color.gray.opacity(0.22)
            }
        }
        .frame(width: itemWidth, height: itemHeight)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius, style: .continuous)
                .stroke(brandGold.opacity(0.15), lineWidth: 1)
        )
    }

    private var topBarOverlay: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: [Color.black.opacity(0.75), .clear],
                startPoint: .top,
                endPoint: .bottom
            )
            .allowsHitTesting(false)

            VStack {
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: UITheme.navIconSize, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: UITheme.floatingControlSize, height: UITheme.floatingControlSize)
                            .background(Color.black.opacity(0.62))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    Spacer()
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, topControlTopPadding)

                Spacer()
            }

            VStack {
                HStack {
                    Spacer()
                    HStack(spacing: UITheme.spacing10) {
                        shareButton
                        favoriteButton
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, topControlTopPadding)

                Spacer()
            }
        }
        .frame(height: 130)
        .ignoresSafeArea(edges: .top)
    }

    private func currentTopSafeAreaInset() -> CGFloat {
        let scenes = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        guard let scene = scenes.first,
              let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first
        else {
            return 20
        }

        return window.safeAreaInsets.top
    }

    private var shareButton: some View {
        Menu {
            ShareLink(item: sharePayload) {
                Label("Share", systemImage: "square.and.arrow.up")
            }

            Button {
                Task {
                    await downloadCurrentImageToLibrary()
                }
            } label: {
                Label("Download image", systemImage: "arrow.down.to.line")
            }
            .disabled(isDownloadingImage)
        } label: {
            ZStack {
                Circle()
                    .fill(Color.black.opacity(0.62))
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: UITheme.navIconSize, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: UITheme.floatingControlSize, height: UITheme.floatingControlSize)
        }
        .buttonStyle(.plain)
    }

    private var sharePayload: String {
        if let url = viewModel.pin.imageURL?.absoluteString, !url.isEmpty {
            return url
        }
        return viewModel.pin.title
    }

    private var favoriteButton: some View {
        Button {
            guard let token = TokenStore.shared.read(key: TokenStore.Keys.accessToken) else {
                showToast(message: "Please sign in to save favorites.", isError: true)
                return
            }
            Task {
                let wasFavorited = viewModel.isFavorited
                await viewModel.toggleFavorite(token: token)
                if let error = viewModel.errorMessage, !error.isEmpty { return }
                guard viewModel.isFavorited != wasFavorited else { return }
                showToast(
                    message: viewModel.isFavorited ? "Added to favorites." : "Removed from favorites.",
                    isError: false
                )
            }
        } label: {
            ZStack {
                Circle()
                    .fill(Color.black.opacity(0.62))
                if viewModel.isFavoriteLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.85)
                } else {
                    Image(systemName: viewModel.isFavorited ? "heart.fill" : "heart")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(viewModel.isFavorited ? brandGold : .white)
                }
            }
            .frame(width: UITheme.floatingControlSize, height: UITheme.floatingControlSize)
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isFavoriteLoading)
    }

    private func heroMagnificationGesture(containerWidth: CGFloat) -> some Gesture {
        MagnificationGesture()
            .updating($heroPinchScale) { value, state, _ in
                state = value
            }
            .onEnded { value in
                let nextScale = min(max(heroBaseScale * value, 1), 4)
                withAnimation(.easeOut(duration: 0.2)) {
                    heroBaseScale = nextScale < 1.02 ? 1 : nextScale
                    if heroBaseScale <= 1.01 {
                        heroAccumulatedOffset = .zero
                    } else {
                        heroAccumulatedOffset = clampedHeroOffset(
                            heroAccumulatedOffset,
                            scale: heroBaseScale,
                            containerWidth: containerWidth
                        )
                    }
                }
            }
    }

    private func heroDragGesture(containerWidth: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .updating($heroDragOffset) { value, state, _ in
                if heroCurrentScale > 1.01 {
                    state = value.translation
                }
            }
            .onEnded { value in
                guard heroCurrentScale > 1.01 else {
                    withAnimation(.easeOut(duration: 0.2)) {
                        heroAccumulatedOffset = .zero
                    }
                    return
                }
                let raw = CGSize(
                    width: heroAccumulatedOffset.width + value.translation.width,
                    height: heroAccumulatedOffset.height + value.translation.height
                )
                withAnimation(.interactiveSpring(response: 0.25, dampingFraction: 0.86)) {
                    heroAccumulatedOffset = clampedHeroOffset(
                        raw,
                        scale: heroCurrentScale,
                        containerWidth: containerWidth
                    )
                }
            }
    }

    private func clampedHeroOffset(_ offset: CGSize, scale: CGFloat, containerWidth: CGFloat) -> CGSize {
        guard scale > 1.01 else { return .zero }
        let maxX = max(0, ((containerWidth * scale) - containerWidth) / 2)
        let maxY = max(0, ((heroHeight * scale) - heroHeight) / 2)
        return CGSize(
            width: min(max(offset.width, -maxX), maxX),
            height: min(max(offset.height, -maxY), maxY)
        )
    }

    private func showToast(message: String, isError: Bool) {
        let payload = PinDetailToastPayload(message: message, isError: isError)
        withAnimation(.spring(response: 0.28, dampingFraction: 0.9)) {
            toast = payload
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            guard toast?.id == payload.id else { return }
            withAnimation(.easeOut(duration: 0.2)) {
                toast = nil
            }
        }
    }

    @MainActor
    private func downloadCurrentImageToLibrary() async {
        guard !isDownloadingImage else { return }
        guard let imageURL = viewModel.pin.imageURL else {
            showToast(message: "Image is unavailable.", isError: true)
            return
        }

        isDownloadingImage = true
        defer { isDownloadingImage = false }

        var authorizationStatus = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        if authorizationStatus == .notDetermined {
            authorizationStatus = await requestPhotoAddAuthorization()
        }

        guard authorizationStatus == .authorized || authorizationStatus == .limited else {
            showToast(message: "Please allow photo access in Settings.", isError: true)
            return
        }

        guard let image = await CachedImagePipeline.shared.image(for: imageURL, scale: UIScreen.main.scale) else {
            showToast(message: "Failed to load image.", isError: true)
            return
        }

        do {
            try await saveImageToPhotoLibrary(image)
            showToast(message: "Image downloaded.", isError: false)
        } catch {
            showToast(message: "Failed to save image.", isError: true)
        }
    }

    private func requestPhotoAddAuthorization() async -> PHAuthorizationStatus {
        await withCheckedContinuation { continuation in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                continuation.resume(returning: status)
            }
        }
    }

    private func saveImageToPhotoLibrary(_ image: UIImage) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            }) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if success {
                    continuation.resume(returning: ())
                } else {
                    continuation.resume(throwing: NSError(
                        domain: "HomeFeedPinDetailView",
                        code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "Failed to save image to Photos."]
                    ))
                }
            }
        }
    }
}

private struct PinDetailToastPayload: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let isError: Bool
}

private struct PinDetailToastView: View {
    let payload: PinDetailToastPayload

    var body: some View {
        HStack(spacing: UITheme.spacing10) {
            Image(systemName: payload.isError ? "xmark.circle.fill" : "checkmark.circle.fill")
                .foregroundStyle(.white)
            Text(payload.message)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(2)
        }
        .padding(.vertical, UITheme.pillVerticalPadding * 2)
        .padding(.horizontal, UITheme.cardPadding)
        .frame(maxWidth: .infinity)
        .background(payload.isError ? Color.red.opacity(0.9) : Color.green.opacity(0.9))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.overlayCornerRadius, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 8, y: 3)
    }
}
