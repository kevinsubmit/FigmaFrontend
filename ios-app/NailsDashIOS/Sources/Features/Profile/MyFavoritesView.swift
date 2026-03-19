import SwiftUI
struct MyFavoritesView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.displayScale) private var displayScale
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = MyFavoritesViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let columnSpacing: CGFloat = 10
    private let cardSpacing: CGFloat = 16

    private var favoritePinItemWidth: CGFloat {
        let availableWidth = max(UIScreen.main.bounds.width - (UITheme.pagePadding * 2) - columnSpacing, 0)
        return max(floor(availableWidth / 2), 120)
    }

    private var favoritePinColumns: [GridItem] {
        [
            GridItem(.fixed(favoritePinItemWidth), spacing: columnSpacing, alignment: .top),
            GridItem(.fixed(favoritePinItemWidth), spacing: 0, alignment: .top),
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "My Favorites") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing14) {
                    Text("\(viewModel.favoriteStores.count) salons · \(viewModel.favoritePins.count) designs")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)

                    if !viewModel.isLoading && viewModel.favoriteStores.isEmpty && viewModel.favoritePins.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "heart",
                            title: "No favorites yet",
                            subtitle: "Save salons and designs to revisit them quickly."
                        )

                        NavigationLink {
                            StoresListView(hideTabBar: true)
                        } label: {
                            Text("Browse Salons")
                                .font(.subheadline.weight(.bold))
                                .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                                .background(brandGold)
                                .foregroundStyle(.black)
                                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                        }
                        .buttonStyle(.plain)
                    } else {
                        if !viewModel.favoritePins.isEmpty {
                            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                                UnifiedSectionHeader(title: "FAVORITE DESIGNS")
                                LazyVGrid(columns: favoritePinColumns, alignment: .center, spacing: cardSpacing) {
                                    ForEach(Array(viewModel.favoritePins.enumerated()), id: \.element.id) { index, pin in
                                        favoritePinCard(pin, itemWidth: favoritePinItemWidth)
                                            .onAppear {
                                                let visiblePins = viewModel.favoritePins
                                                Task {
                                                    async let prefetchTask: Void = prefetchFavoritePinImages(around: index, within: visiblePins)
                                                    async let loadMoreTask: Void = loadMoreFavoritePinsIfNeeded(currentIndex: index)
                                                    _ = await (prefetchTask, loadMoreTask)
                                                }
                                            }
                                    }
                                }
                                if viewModel.isLoadingMorePins {
                                    ProgressView()
                                        .tint(brandGold)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, UITheme.spacing12)
                                }
                            }
                        }

                        if !viewModel.favoriteStores.isEmpty {
                            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                                UnifiedSectionHeader(title: "FAVORITE SALONS")
                                LazyVStack(spacing: UITheme.spacing10) {
                                    ForEach(Array(viewModel.favoriteStores.enumerated()), id: \.element.id) { index, store in
                                        favoriteStoreCard(store)
                                            .onAppear {
                                                let visibleStores = viewModel.favoriteStores
                                                Task {
                                                    async let prefetchTask: Void = prefetchFavoriteStoreImages(around: index, within: visibleStores)
                                                    async let loadMoreTask: Void = loadMoreFavoriteStoresIfNeeded(currentIndex: index)
                                                    _ = await (prefetchTask, loadMoreTask)
                                                }
                                            }
                                    }
                                }
                                if viewModel.isLoadingMoreStores {
                                    ProgressView()
                                        .tint(brandGold)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, UITheme.spacing12)
                                }
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
        .task { await loadIfNeeded() }
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
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
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

    private func loadMoreFavoritePinsIfNeeded(currentIndex: Int) async {
        let thresholdIndex = max(viewModel.favoritePins.count - 4, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMorePins(token: token)
    }

    private func loadMoreFavoriteStoresIfNeeded(currentIndex: Int) async {
        let thresholdIndex = max(viewModel.favoriteStores.count - 3, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMoreStores(token: token)
    }

    private func prefetchFavoritePinImages(around currentIndex: Int, within pins: [HomeFeedPinDTO]) async {
        guard !pins.isEmpty else { return }
        let upperBound = min(currentIndex + 6, pins.count)
        let urls = pins[currentIndex..<upperBound].compactMap(\.imageURL)
        await CachedImagePipeline.shared.prefetch(
            urls: urls,
            scale: displayScale,
            limit: 10
        )
    }

    private func prefetchFavoriteStoreImages(around currentIndex: Int, within stores: [StoreDTO]) async {
        guard !stores.isEmpty else { return }
        let upperBound = min(currentIndex + 4, stores.count)
        let urls = stores[currentIndex..<upperBound].compactMap(storeImageURL)
        await CachedImagePipeline.shared.prefetch(
            urls: urls,
            scale: displayScale,
            limit: 8
        )
    }

    private func favoritePinCard(_ pin: HomeFeedPinDTO, itemWidth: CGFloat) -> some View {
        ZStack(alignment: .topTrailing) {
            NavigationLink {
                HomeFeedPinDetailView(pin: pin)
                    .environmentObject(appState)
            } label: {
                CachedAsyncImage(url: pin.imageURL) { phase in
                    switch phase {
                    case .empty:
                        ZStack {
                            Color.gray.opacity(0.14)
                            ProgressView().tint(brandGold)
                        }
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        Color.gray.opacity(0.2)
                    @unknown default:
                        Color.gray.opacity(0.2)
                    }
                }
                .frame(width: itemWidth, height: itemWidth * (4.0 / 3.0))
                .background(Color.gray.opacity(0.08))
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)

            Button {
                guard let token = appState.requireAccessToken() else { return }
                Task { await viewModel.removePin(token: token, pinID: pin.id) }
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.black.opacity(0.66))
                    if viewModel.deletingPinID == pin.id {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.85)
                    } else {
                        Image(systemName: "heart.fill")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(brandGold)
                    }
                }
                .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .padding(UITheme.spacing12)
        }
    }

    private func favoriteStoreCard(_ store: StoreDTO) -> some View {
        HStack(spacing: UITheme.spacing10) {
            NavigationLink {
                StoreDetailView(storeID: store.id)
            } label: {
                HStack(spacing: UITheme.spacing10) {
                    CachedAsyncImage(url: storeImageURL(store)) { phase in
                        switch phase {
                        case .empty:
                            ZStack {
                                Color.gray.opacity(0.18)
                                ProgressView().tint(brandGold)
                            }
                        case .success(let image):
                            image.resizable().scaledToFill()
                        case .failure:
                            Color.gray.opacity(0.2)
                        @unknown default:
                            Color.gray.opacity(0.2)
                        }
                    }
                    .frame(width: 84, height: 84)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))

                    VStack(alignment: .leading, spacing: UITheme.spacing4) {
                        Text(store.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.caption2)
                                .foregroundStyle(brandGold)
                            Text(store.formattedAddress)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundStyle(brandGold)
                            Text(String(format: "%.1f", store.rating))
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.white.opacity(0.75))
                            Text("(\(store.review_count) reviews)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Button {
                guard let token = appState.requireAccessToken() else { return }
                Task { await viewModel.removeStore(token: token, storeID: store.id) }
            } label: {
                if viewModel.deletingStoreID == store.id {
                    ProgressView()
                        .tint(.white)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                } else {
                    Image(systemName: "heart.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(brandGold)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(UITheme.spacing10)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner)
                .stroke(brandGold.opacity(0.16), lineWidth: 1)
        )
    }

    private func storeImageURL(_ store: StoreDTO) -> URL? {
        if let preferred = viewModel.favoriteStoreImageURLByID[store.id] {
            return AssetURLResolver.resolveURL(from: preferred)
        }
        return AssetURLResolver.resolveURL(from: store.image_url)
    }
}
