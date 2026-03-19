import SwiftUI

struct StoresListView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.displayScale) private var displayScale
    @EnvironmentObject private var appState: AppState

    private enum StoreSortOption: String, CaseIterable, Identifiable {
        case recommended = "Recommended"
        case rating = "Top Rated"
        case distance = "Nearest"

        var id: String { rawValue }
    }

    @StateObject private var viewModel: StoresViewModel
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var selectedSort: StoreSortOption = .recommended
    @State private var userLocation: UserLocationCoordinate? = UserLocationCache.loadValid()
    @State private var locationBootstrapDone: Bool = false
    @State private var locationService: UserLocationService = UserLocationService()
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let hideTabBar: Bool

    init(hideTabBar: Bool = false) {
        _viewModel = StateObject(wrappedValue: StoresViewModel())
        self.hideTabBar = hideTabBar
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            sortHeaderArea

            ScrollView {
                LazyVStack(alignment: .leading, spacing: UITheme.spacing14) {
                    if !viewModel.isLoading && displayStores.isEmpty {
                        Text("No stores available right now.")
                            .foregroundStyle(.secondary)
                            .padding(UITheme.cardPadding)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(cardBG)
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
                            .overlay(
                                RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                                    .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
                            )
                    } else {
                        ForEach(Array(displayStores.enumerated()), id: \.element.id) { index, store in
                            NavigationLink {
                                StoreDetailView(storeID: store.id)
                                    .toolbar(.hidden, for: .tabBar)
                            } label: {
                                storeCard(store)
                            }
                            .buttonStyle(.plain)
                            .onAppear {
                                let visibleStores = displayStores
                                Task {
                                    async let imageTask: Void = viewModel.loadStoreImagesIfNeeded(storeID: store.id)
                                    async let ratingTask: Void = viewModel.loadStoreRatingIfNeeded(storeID: store.id)
                                    async let prefetchTask: Void = prefetchStoreImages(around: index, within: visibleStores)
                                    async let loadMoreTask: Void = loadMoreStoresIfNeeded(currentIndex: index, within: visibleStores)
                                    _ = await (imageTask, ratingTask, prefetchTask, loadMoreTask)
                                }
                            }
                        }

                        if viewModel.isLoadingMore {
                            ProgressView()
                                .tint(brandGold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, UITheme.spacing12)
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing12)
                .padding(.bottom, UITheme.spacing26)
            }
        }
        .background(Color.black)
        .background(
            ImagePrefetcher(
                urls: prefetchStoreImagesForInitialViewport(),
                limit: 12
            )
        )
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(effectiveHideTabBar ? .hidden : .automatic, for: .tabBar)
        .tint(brandGold)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let styleReference = appState.bookingStyleReference {
                styleReferenceBottomBar(styleReference)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading stores...")
                    .padding(UITheme.spacing20)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.overlayCornerRadius))
            }
        }
        .task {
            if !locationBootstrapDone {
                locationBootstrapDone = true
                await bootstrapLocation()
            }
        }
        .task(id: storesRequestKey) {
            await loadStoresForCurrentContext(force: false)
        }
        .refreshable {
            if selectedSort == .distance {
                await ensureLocationForDistanceSort()
            }
            await loadStoresForCurrentContext(force: true)
        }
        .onChange(of: selectedSort) { newValue in
            guard newValue == .distance else { return }
            Task { await ensureLocationForDistanceSort() }
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Message", isPresented: $showAlert) {
            Button("OK", role: .cancel) {
                if AppState.shouldForceLogoutAfterSensitiveAuthAlert(alertMessage) {
                    appState.forceLogout(message: alertMessage)
                }
            }
        } message: {
            Text(alertMessage)
        }
    }

    private var effectiveHideTabBar: Bool {
        hideTabBar || appState.bookOpenedFromStyleReference
    }

    private var storesRequestKey: String {
        let sort = selectedSort.rawValue
        let locationPart = userLocation.map { "\($0.latitude),\($0.longitude)" } ?? "none"
        return "\(sort)|\(locationPart)"
    }

    private var topBar: some View {
        ZStack {
            VStack(alignment: .center, spacing: UITheme.spacing1) {
                Text("STEP 01")
                    .font(.caption2.weight(.bold))
                    .kerning(2.2)
                    .foregroundStyle(brandGold)
                Text("Choose a salon")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .center)

            HStack {
                Button {
                    handleBack()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
                        .background(Color.white.opacity(0.07))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Spacer()
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing8)
        .padding(.bottom, UITheme.spacing8)
        .frame(maxWidth: .infinity)
        .background(Color.black.opacity(0.96))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private var displayStores: [StoreDTO] {
        switch selectedSort {
        case .recommended:
            return viewModel.stores
        case .rating:
            return viewModel.stores.sorted { lhs, rhs in
                let lhsRating = viewModel.displayRating(for: lhs)
                let rhsRating = viewModel.displayRating(for: rhs)
                if lhsRating == rhsRating {
                    return viewModel.displayReviewCount(for: lhs) > viewModel.displayReviewCount(for: rhs)
                }
                return lhsRating > rhsRating
            }
        case .distance:
            return viewModel.stores.sorted { lhs, rhs in
                let l = lhs.distance ?? 999_999
                let r = rhs.distance ?? 999_999
                return l < r
            }
        }
    }

    private func apiSortValue() -> String {
        switch selectedSort {
        case .recommended:
            return "recommended"
        case .rating:
            return "top_rated"
        case .distance:
            return userLocation == nil ? "recommended" : "distance"
        }
    }

    private func loadStoresForCurrentContext(force: Bool) async {
        if force {
            await viewModel.loadStores(
                sortBy: apiSortValue(),
                userLat: userLocation?.latitude,
                userLng: userLocation?.longitude,
                force: true
            )
        } else {
            await viewModel.loadStoresIfNeeded(
                sortBy: apiSortValue(),
                userLat: userLocation?.latitude,
                userLng: userLocation?.longitude
            )
        }
    }

    private func loadMoreStoresIfNeeded(currentIndex: Int, within stores: [StoreDTO]) async {
        let thresholdIndex = max(stores.count - 4, 0)
        guard currentIndex >= thresholdIndex else { return }
        await viewModel.loadMore(
            sortBy: apiSortValue(),
            userLat: userLocation?.latitude,
            userLng: userLocation?.longitude
        )
    }

    private func bootstrapLocation() async {
        guard userLocation == nil else { return }
        guard let coordinate = await locationService.requestCurrentLocation() else { return }

        userLocation = coordinate
        UserLocationCache.save(coordinate)
    }

    private func ensureLocationForDistanceSort() async {
        guard userLocation == nil else { return }
        if let coordinate = await locationService.requestCurrentLocation() {
            userLocation = coordinate
            UserLocationCache.save(coordinate)
            return
        }
        selectedSort = .recommended
    }

    private var sortHeaderArea: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: UITheme.spacing8) {
                    ForEach(StoreSortOption.allCases) { option in
                        Button {
                            selectedSort = option
                        } label: {
                            Text(option.rawValue)
                                .font(.footnote.weight(.semibold))
                                .padding(.horizontal, UITheme.pillHorizontalPadding + 4)
                                .frame(minHeight: UITheme.segmentHeight)
                                .background(selectedSort == option ? brandGold : Color.white.opacity(0.04))
                                .foregroundStyle(selectedSort == option ? .black : Color.white.opacity(0.84))
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(selectedSort == option ? Color.clear : brandGold.opacity(0.24), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
            }
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
        .frame(maxWidth: .infinity, alignment: .leading)
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

    private func styleReferenceBottomBar(_ styleReference: BookingStyleReference) -> some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)

            HStack(spacing: UITheme.spacing10) {
                styleReferenceCard(styleReference)
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.top, UITheme.spacing10)
            .padding(.bottom, UITheme.spacing12)
        }
        .background(Color.black.opacity(0.96))
    }

    private func styleReferenceCard(_ styleReference: BookingStyleReference) -> some View {
        HStack(spacing: UITheme.spacing10) {
            Group {
                if let url = styleReferenceImageURL(styleReference) {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            ProgressView().tint(brandGold)
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure:
                            Color.white.opacity(0.08)
                        @unknown default:
                            Color.white.opacity(0.08)
                        }
                    }
                } else {
                    Color.white.opacity(0.08)
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))

            VStack(alignment: .leading, spacing: UITheme.spacing4) {
                Text("Reference look")
                    .font(.caption2.weight(.semibold))
                    .kerning(1.4)
                    .foregroundStyle(brandGold.opacity(0.88))
                Text(styleReference.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                if !styleReference.tags.isEmpty {
                    Text(styleReference.tags.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: UITheme.spacing8)

            Button {
                appState.bookingStyleReference = nil
            } label: {
                Text("Clear")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, UITheme.compactPillHorizontalPadding + 2)
                    .frame(minHeight: UITheme.segmentHeight - 10)
                    .background(Color.white.opacity(0.04))
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(brandGold.opacity(0.2), lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(UITheme.cardPadding)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
        )
    }

    private func handleBack() {
        if hideTabBar {
            dismiss()
            return
        }
        appState.resetBookFlowSource()
        appState.selectedTab = .home
    }

    private func storeCard(_ store: StoreDTO) -> some View {
        let imageURLs = storeCardImageURLs(for: store)
        let heroURL = imageURLs.first
        let thumbURLs = Array(imageURLs.dropFirst().prefix(4))
        let rating = viewModel.displayRating(for: store)

        return VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                storeImageView(url: heroURL)
                .frame(height: 232)
                .frame(maxWidth: .infinity)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [.clear, Color.black.opacity(0.78)],
                        startPoint: .center,
                        endPoint: .bottom
                    )
                )

                Text(String(format: "%.1f★", rating))
                    .font(.caption.bold())
                    .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                    .padding(.vertical, UITheme.compactPillVerticalPadding)
                    .background(brandGold)
                    .foregroundStyle(.black)
                    .clipShape(Capsule())
                    .padding(UITheme.spacing10)
            }
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
            .padding(.horizontal, UITheme.spacing10)
            .padding(.top, UITheme.spacing10)

            HStack(spacing: UITheme.spacing8) {
                ForEach(0..<4, id: \.self) { idx in
                    storeImageView(url: idx < thumbURLs.count ? thumbURLs[idx] : nil)
                        .frame(maxWidth: .infinity)
                        .frame(height: 82)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                }
            }
            .padding(.horizontal, UITheme.spacing10)
            .padding(.top, UITheme.spacing10)

            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                VStack(alignment: .leading, spacing: UITheme.spacing5) {
                    Text(store.name)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text(store.formattedAddress)
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, UITheme.spacing12)
            .padding(.top, UITheme.spacing12)
            .padding(.bottom, UITheme.spacing14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.22), radius: 6, y: 3)
    }

    @ViewBuilder
    private func storeImageView(url: URL?) -> some View {
        if let url {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        Color.white.opacity(0.04)
                        ProgressView().tint(brandGold)
                    }
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    fallbackStoreCover
                @unknown default:
                    fallbackStoreCover
                }
            }
        } else {
            fallbackStoreCover
        }
    }

    private var fallbackStoreCover: some View {
        LinearGradient(
            colors: [
                Color(red: 39.0 / 255.0, green: 33.0 / 255.0, blue: 16.0 / 255.0),
                Color(red: 20.0 / 255.0, green: 20.0 / 255.0, blue: 20.0 / 255.0),
                Color.black,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func storeImageURL(_ store: StoreDTO) -> URL? {
        AssetURLResolver.resolveURL(from: store.image_url)
    }

    private func storeCardImageURLs(for store: StoreDTO) -> [URL] {
        let rows = viewModel.storeImages[store.id] ?? []
        let mappedRows: [URL] = rows.compactMap { row in
            storeImageURL(from: row.image_url)
        }

        if !mappedRows.isEmpty {
            return Array(mappedRows.prefix(5))
        }

        if let fallback = storeImageURL(store) {
            return [fallback]
        }

        return []
    }

    private func storeImageURL(from raw: String) -> URL? {
        AssetURLResolver.resolveURL(from: raw)
    }

    private func styleReferenceImageURL(_ styleReference: BookingStyleReference) -> URL? {
        AssetURLResolver.resolveURL(from: styleReference.imageURL)
    }

    private func prefetchStoreImagesForInitialViewport() -> [URL?] {
        Array(displayStores.prefix(4)).flatMap { store in
            Array(storeCardImageURLs(for: store).prefix(3)).map(Optional.some)
        }
    }

    private func prefetchStoreImages(around currentIndex: Int, within stores: [StoreDTO]) async {
        guard !stores.isEmpty else { return }
        let upperBound = min(currentIndex + 4, stores.count)
        let urls = stores[currentIndex..<upperBound].flatMap { store in
            Array(storeCardImageURLs(for: store).prefix(3))
        }
        await CachedImagePipeline.shared.prefetch(
            urls: urls,
            scale: displayScale,
            limit: 12
        )
    }
}

#Preview {
    NavigationStack {
        StoresListView()
    }
}
