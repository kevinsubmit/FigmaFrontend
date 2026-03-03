import Photos
import PhotosUI
import SwiftUI
import UIKit

struct HomeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            NavigationStack {
                HomeFeedView()
            }
            .tag(AppTab.home)
            .tabItem {
                Label("Home", systemImage: "house")
            }

            NavigationStack {
                StoresListView()
            }
            .id(appState.bookTabResetID)
            .tag(AppTab.book)
            .tabItem {
                Label("Book", systemImage: "storefront")
            }

            NavigationStack {
                MyAppointmentsView()
            }
            .tag(AppTab.appointments)
            .tabItem {
                Label("Appointments", systemImage: "calendar")
            }

            NavigationStack {
                DealsView()
            }
            .id(appState.dealsTabResetID)
            .tag(AppTab.deals)
            .tabItem {
                Label("Deals", systemImage: "tag")
            }

            NavigationStack {
                ProfileCenterView()
                    .environmentObject(appState)
            }
            .tag(AppTab.profile)
            .tabItem {
                Label("Profile", systemImage: "person")
            }
        }
        .tint(UITheme.brandGold)
        .onChange(of: appState.selectedTab) { newValue in
            if newValue != .book {
                appState.resetBookFlowSource()
            }
        }
    }
}

#Preview {
    HomeView()
        .environmentObject(AppState())
}


struct HomeFeedPinDTO: Decodable, Identifiable {
    let id: Int
    let title: String
    let image_url: String
    let description: String?
    let tags: [String]
    let created_at: String

    var imageURL: URL? {
        AssetURLResolver.resolveURL(from: image_url)
    }
}

private struct HomeFeedService {
    func getTags() async throws -> [String] {
        try await APIClient.shared.request(path: "/pins/tags")
    }

    func getPins(skip: Int, limit: Int, tag: String?, search: String?) async throws -> [HomeFeedPinDTO] {
        var params: [String] = ["skip=\(skip)", "limit=\(limit)"]
        if let tag, !tag.isEmpty {
            let encoded = tag.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? tag
            params.append("tag=\(encoded)")
        }
        if let search, !search.isEmpty {
            let encoded = search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? search
            params.append("search=\(encoded)")
        }
        return try await APIClient.shared.request(path: "/pins?\(params.joined(separator: "&"))")
    }

    func getPinByID(_ pinID: Int) async throws -> HomeFeedPinDTO {
        try await APIClient.shared.request(path: "/pins/\(pinID)")
    }

    func checkFavorite(pinID: Int, token: String) async throws -> Bool {
        struct FavoriteStatusDTO: Decodable {
            let pin_id: Int
            let is_favorited: Bool
        }
        let row: FavoriteStatusDTO = try await APIClient.shared.request(
            path: "/pins/\(pinID)/is-favorited",
            token: token
        )
        return row.is_favorited
    }

    func setFavorite(pinID: Int, token: String, favorited: Bool) async throws {
        if favorited {
            let _: EmptyResponse = try await APIClient.shared.request(
                path: "/pins/\(pinID)/favorite",
                method: "POST",
                token: token
            )
        } else {
            let _: EmptyResponse = try await APIClient.shared.request(
                path: "/pins/\(pinID)/favorite",
                method: "DELETE",
                token: token
            )
        }
    }
}

@MainActor
private final class HomeFeedViewModel: ObservableObject {
    @Published var tags: [String] = ["All"]
    @Published var selectedTag: String = "All"
    @Published var searchDraft: String = ""
    @Published var searchQuery: String = ""
    @Published var pins: [HomeFeedPinDTO] = []
    @Published var isLoading: Bool = false
    @Published var isLoadingMore: Bool = false
    @Published var hasMore: Bool = true
    @Published var errorMessage: String?

    private let service = HomeFeedService()
    private let initialPageSize = 12
    private let loadMorePageSize = 8
    private var offset = 0
    private var didLoadOnce = false

    func loadIfNeeded() async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await refresh()
    }

    func refresh() async {
        await loadTags()
        await loadPins(reset: true)
    }

    func loadMoreIfNeeded(current pin: HomeFeedPinDTO) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        guard let last = pins.last, last.id == pin.id else { return }
        await loadPins(reset: false)
    }

    func selectTag(_ tag: String) async {
        guard tag != selectedTag else { return }
        selectedTag = tag
        searchDraft = ""
        searchQuery = ""
        await loadPins(reset: true)
    }

    func applySearch() async {
        searchQuery = searchDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        selectedTag = "All"
        await loadPins(reset: true)
    }

    func clearSearch() async {
        searchDraft = ""
        searchQuery = ""
        selectedTag = "All"
        await loadPins(reset: true)
    }

    private func loadTags() async {
        do {
            let names = try await service.getTags()
            let normalized = ["All"] + names.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            tags = Array(NSOrderedSet(array: normalized)) as? [String] ?? ["All"]
            if !tags.contains(selectedTag) {
                selectedTag = "All"
            }
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadPins(reset: Bool) async {
        if reset {
            isLoading = true
            offset = 0
            hasMore = true
        } else {
            isLoadingMore = true
        }
        defer {
            if reset {
                isLoading = false
            } else {
                isLoadingMore = false
            }
        }

        let pageSize = reset ? initialPageSize : loadMorePageSize
        do {
            let tag = selectedTag == "All" ? nil : selectedTag
            let rows = try await service.getPins(
                skip: offset,
                limit: pageSize,
                tag: tag,
                search: searchQuery.isEmpty ? nil : searchQuery
            )
            if reset {
                pins = rows
            } else {
                pins.append(contentsOf: rows)
            }
            offset += rows.count
            hasMore = rows.count == pageSize
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
            hasMore = false
        } catch {
            errorMessage = error.localizedDescription
            hasMore = false
        }
    }
}

private struct HomeFeedView: View {
    @StateObject private var viewModel = HomeFeedViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold

    private let columnSpacing: CGFloat = 10
    private let cardSpacing: CGFloat = 16
    private func gridColumns(itemWidth: CGFloat) -> [GridItem] {
        [
            GridItem(.fixed(itemWidth), spacing: columnSpacing, alignment: .top),
            GridItem(.fixed(itemWidth), spacing: 0, alignment: .top),
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            headerSearchArea

            GeometryReader { proxy in
                let availableWidth = max(proxy.size.width - (UITheme.pagePadding * 2) - columnSpacing, 0)
                let itemWidth = max(floor(availableWidth / 2), 120)

                ScrollView {
                    if let error = viewModel.errorMessage, !error.isEmpty {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red.opacity(0.9))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, UITheme.pagePadding)
                            .padding(.top, UITheme.spacing8)
                    }

                    LazyVGrid(columns: gridColumns(itemWidth: itemWidth), alignment: .center, spacing: cardSpacing) {
                        ForEach(viewModel.pins) { pin in
                            NavigationLink {
                                HomeFeedPinDetailView(pin: pin)
                            } label: {
                                pinCard(pin, itemWidth: itemWidth)
                            }
                            .buttonStyle(.plain)
                            .onAppear {
                                Task { await viewModel.loadMoreIfNeeded(current: pin) }
                            }
                        }
                    }
                    .padding(.horizontal, UITheme.pagePadding)
                    .padding(.top, UITheme.spacing8)
                    .padding(.bottom, UITheme.spacing16)

                    if !viewModel.isLoading && viewModel.pins.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "photo.on.rectangle.angled",
                            title: viewModel.searchQuery.isEmpty ? "No images yet" : "No images found",
                            subtitle: viewModel.searchQuery.isEmpty
                                ? "New inspiration will appear here."
                                : "Try another search keyword.",
                            compact: true
                        )
                        .padding(.horizontal, UITheme.pagePadding)
                        .padding(.bottom, UITheme.spacing8)
                    }

                    if viewModel.isLoadingMore {
                        ProgressView()
                            .tint(brandGold)
                            .padding(.vertical, UITheme.spacing14)
                    }
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .background(Color.black)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
        .task {
            await viewModel.loadIfNeeded()
        }
        .refreshable {
            await viewModel.refresh()
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
    }

    private var headerSearchArea: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            ZStack {
                TextField("Search by title (e.g. Classic French Set)", text: $viewModel.searchDraft)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit {
                        Task { await viewModel.applySearch() }
                    }
                    .padding(.leading, UITheme.spacing42)
                    .padding(.trailing, UITheme.spacing36)
                    .frame(minHeight: UITheme.controlHeight)
                    .background(Color(red: 26.0 / 255.0, green: 26.0 / 255.0, blue: 26.0 / 255.0))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(brandGold.opacity(0.22), lineWidth: 1)
                    )
                    .overlay(alignment: .leading) {
                        Button {
                            Task { await viewModel.applySearch() }
                        } label: {
                            Image(systemName: "magnifyingglass")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                        }
                        .buttonStyle(.plain)
                        .padding(.leading, UITheme.spacing5)
                    }
                    .overlay(alignment: .trailing) {
                        if !viewModel.searchDraft.isEmpty {
                            Button {
                                Task { await viewModel.clearSearch() }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                    .frame(width: UITheme.compactControlSize, height: UITheme.compactControlSize)
                                    .background(Color.white.opacity(0.07))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                            .padding(.trailing, UITheme.spacing8 - 1)
                        }
                    }
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.top, UITheme.spacing8)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: UITheme.spacing8) {
                    ForEach(viewModel.tags, id: \.self) { tag in
                        Button {
                            Task { await viewModel.selectTag(tag) }
                        } label: {
                            Text(tag)
                                .font(.footnote.weight(.semibold))
                                .padding(.horizontal, UITheme.pillHorizontalPadding + 4)
                                .frame(minHeight: UITheme.segmentHeight)
                                .background(viewModel.selectedTag == tag ? brandGold : Color(red: 26.0 / 255.0, green: 26.0 / 255.0, blue: 26.0 / 255.0))
                                .foregroundStyle(viewModel.selectedTag == tag ? Color.black : Color.white)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(viewModel.selectedTag == tag ? Color.clear : brandGold.opacity(0.26), lineWidth: 1)
                                )
                                .shadow(color: viewModel.selectedTag == tag ? brandGold.opacity(0.25) : .clear, radius: 6, y: 2)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.bottom, UITheme.spacing6)
            }
        }
        .padding(.bottom, UITheme.spacing8)
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

    private func pinCard(_ pin: HomeFeedPinDTO, itemWidth: CGFloat) -> some View {
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
                    .overlay(Text("Image unavailable").font(.caption).foregroundStyle(.secondary))
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
}

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

private struct PromotionServiceRuleDTO: Decodable, Identifiable {
    let id: Int
    let service_id: Int
    let min_price: Double?
    let max_price: Double?
}

private struct PromotionDTO: Decodable, Identifiable {
    let id: Int
    let scope: String
    let store_id: Int?
    let title: String
    let type: String
    let image_url: String?
    let discount_type: String
    let discount_value: Double
    let rules: String?
    let start_at: String
    let end_at: String
    let is_active: Bool
    let created_at: String
    let updated_at: String
    let service_rules: [PromotionServiceRuleDTO]
}

private struct DealsService {
    func getPromotions() async throws -> [PromotionDTO] {
        try await APIClient.shared.request(path: "/promotions?skip=0&limit=100&active_only=true&include_platform=true")
    }

    func getStores() async throws -> [StoreDTO] {
        try await APIClient.shared.request(path: "/stores?skip=0&limit=100")
    }
}

private enum DealsSegment: String, CaseIterable, Identifiable {
    case store = "Store Deals"
    case platform = "Platform Deals"

    var id: String { rawValue }
}

@MainActor
private final class DealsViewModel: ObservableObject {
    @Published var selectedSegment: DealsSegment = .store
    @Published var promotions: [PromotionDTO] = []
    @Published var storesByID: [Int: StoreDTO] = [:]
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let service = DealsService()

    var filtered: [PromotionDTO] {
        switch selectedSegment {
        case .store:
            return promotions.filter { $0.scope.lowercased() != "platform" }
        case .platform:
            return promotions.filter { $0.scope.lowercased() == "platform" }
        }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let promoTask = service.getPromotions()
            async let storeTask = service.getStores()
            let promoRows = try await promoTask
            let storeRows = try await storeTask
            promotions = promoRows
            storesByID = Dictionary(uniqueKeysWithValues: storeRows.map { ($0.id, $0) })
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
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
}

private struct DealsView: View {
    @StateObject private var viewModel = DealsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var selectedStoreIDForNavigation: Int?
    @State private var navigateToStoreDetail: Bool = false
    @State private var navigateToStoresList: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            dealsHeader

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing12) {
                    if !viewModel.isLoading && viewModel.filtered.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "tag.fill",
                            title: "No active deals right now",
                            subtitle: "Check back soon for new offers.",
                            compact: true
                        )
                    } else {
                        let totalCount = viewModel.filtered.count
                        ForEach(Array(viewModel.filtered.enumerated()), id: \.offset) { idx, promotion in
                            dealRow(promotion, index: idx, totalCount: totalCount)
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing12)
                .padding(.bottom, UITheme.spacing26)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .background(Color.black)
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .unifiedNoticeAlert(isPresented: $showAlert, message: alertMessage)
        .overlay {
            UnifiedLoadingOverlay(isLoading: viewModel.isLoading)
        }
        .navigationDestination(isPresented: $navigateToStoreDetail) {
            if let storeID = selectedStoreIDForNavigation {
                StoreDetailView(storeID: storeID)
            }
        }
        .navigationDestination(isPresented: $navigateToStoresList) {
            StoresListView(hideTabBar: true)
        }
    }

    private var dealsHeader: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("Limited-time offers")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: UITheme.spacing8) {
                segmentButton(.store)
                segmentButton(.platform)
            }
            .frame(maxWidth: .infinity)
            .padding(UITheme.spacing4)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            .padding(.top, UITheme.spacing2)
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

    private func segmentButton(_ segment: DealsSegment) -> some View {
        Button {
            viewModel.selectedSegment = segment
        } label: {
            Text(segment.rawValue)
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, UITheme.pillHorizontalPadding)
                .frame(maxWidth: .infinity)
                .frame(minHeight: UITheme.segmentHeight)
                .background(viewModel.selectedSegment == segment ? brandGold : Color.clear)
                .foregroundStyle(viewModel.selectedSegment == segment ? .black : Color.white.opacity(0.86))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                        .stroke(viewModel.selectedSegment == segment ? Color.clear : brandGold.opacity(0.24), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func dealRow(_ promotion: PromotionDTO, index: Int, totalCount: Int) -> some View {
        let storeID = promotion.store_id
        let store = storeID.flatMap { viewModel.storesByID[$0] }
        let hasDirectStoreTarget = storeID != nil
        let scopeLabel = hasDirectStoreTarget ? "STORE DEAL" : "PLATFORM DEAL"
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                Group {
                    if let coverURL = promotionCoverURL(promotion: promotion, store: store) {
                        CachedAsyncImage(url: coverURL) { phase in
                            switch phase {
                            case .empty:
                                ZStack {
                                    Color.white.opacity(0.03)
                                    ProgressView().tint(brandGold)
                                }
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                            case .failure:
                                dealCoverFallback
                            @unknown default:
                                dealCoverFallback
                            }
                        }
                    } else {
                        dealCoverFallback
                    }
                }
                .frame(height: UITheme.dealCoverHeight)
                .frame(maxWidth: .infinity)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [Color.black.opacity(0.06), Color.black.opacity(0.82)],
                        startPoint: .center,
                        endPoint: .bottom
                    )
                )

                Text(formatOffer(promotion))
                    .font(.caption.bold())
                    .padding(.horizontal, UITheme.pillHorizontalPadding)
                    .padding(.vertical, UITheme.compactPillVerticalPadding + 1)
                    .background(brandGold)
                    .foregroundStyle(.black)
                    .clipShape(Capsule())
                    .padding(UITheme.spacing10)
            }
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))

            VStack(alignment: .leading, spacing: UITheme.spacing12) {
                HStack(alignment: .top, spacing: UITheme.spacing8) {
                    VStack(alignment: .leading, spacing: UITheme.spacing5) {
                        Text(promotion.title)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                        Text(hasDirectStoreTarget ? (store?.name ?? "Store Offer") : "Platform Offer")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.78))
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    Text(scopeLabel)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                        .padding(.vertical, UITheme.compactPillVerticalPadding)
                        .background(Color.white.opacity(0.05))
                        .foregroundStyle(.secondary)
                        .clipShape(Capsule())
                }

                HStack(spacing: UITheme.spacing4 + 1) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text(formatExpiry(promotion.end_at))
                        .font(.caption)
                }
                .foregroundStyle(Color.white.opacity(0.74))
                .padding(.horizontal, UITheme.compactPillHorizontalPadding + 1)
                .padding(.vertical, UITheme.compactPillVerticalPadding + 1)
                .background(Color.white.opacity(0.04))
                .clipShape(Capsule())

                if let store {
                    HStack(spacing: UITheme.spacing4 + 1) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.caption2)
                            .foregroundStyle(brandGold)
                        Text(store.formattedAddress)
                            .font(.footnote)
                            .lineLimit(1)
                    }
                    .foregroundStyle(Color.white.opacity(0.72))
                }

                HStack(spacing: UITheme.spacing8) {
                    if let firstRule = promotion.service_rules.first {
                        Text(formatPriceRange(min: firstRule.min_price, max: firstRule.max_price))
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                            .padding(.vertical, UITheme.compactPillVerticalPadding)
                            .background(Color.white.opacity(0.04))
                            .clipShape(Capsule())
                    }
                    Text(promotion.type.uppercased())
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                        .padding(.vertical, UITheme.compactPillVerticalPadding)
                        .background(Color.white.opacity(0.04))
                        .clipShape(Capsule())
                        .foregroundStyle(.secondary)
                }

                if let rules = promotion.rules, !rules.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Text(rules)
                        .font(.footnote)
                        .foregroundStyle(Color.white.opacity(0.66))
                        .lineLimit(3)
                }

                if let targetStoreID = storeID {
                    Button {
                        selectedStoreIDForNavigation = targetStoreID
                        navigateToStoreDetail = true
                    } label: {
                        HStack(spacing: UITheme.spacing6) {
                            Text("Book Now")
                            Image(systemName: "arrow.right")
                                .font(.caption.weight(.semibold))
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        .background(brandGold)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                } else {
                    Button {
                        navigateToStoresList = true
                    } label: {
                        HStack(spacing: UITheme.spacing6) {
                            Text("Browse Stores")
                            Image(systemName: "arrow.right")
                                .font(.caption.weight(.semibold))
                        }
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: UITheme.ctaHeight)
                        .background(Color.white.opacity(0.04))
                        .foregroundStyle(brandGold)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(brandGold.opacity(0.28), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, UITheme.cardPadding)
            .padding(.top, UITheme.spacing12)
            .padding(.bottom, UITheme.cardPadding)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(brandGold.opacity(0.42))
                .frame(height: UITheme.spacing1)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
                .allowsHitTesting(false)
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
                .allowsHitTesting(false)
        )
        .shadow(color: .black.opacity(0.22), radius: 6, y: 3)
        .contentShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .zIndex(Double(max(totalCount - index, 0)))
    }

    private var dealCoverFallback: some View {
        LinearGradient(
            colors: [
                Color(red: 45.0 / 255.0, green: 34.0 / 255.0, blue: 10.0 / 255.0),
                Color(red: 22.0 / 255.0, green: 22.0 / 255.0, blue: 22.0 / 255.0),
                Color.black,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func promotionCoverURL(promotion: PromotionDTO, store: StoreDTO?) -> URL? {
        if let promotionImage = promotion.image_url,
           let promotionURL = resolveMediaURL(promotionImage) {
            return promotionURL
        }
        guard let store,
              let storeImage = store.image_url,
              let storeURL = resolveMediaURL(storeImage) else {
            return nil
        }
        return storeURL
    }

    private func resolveMediaURL(_ rawValue: String) -> URL? {
        AssetURLResolver.resolveURL(from: rawValue)
    }

    private func formatOffer(_ promotion: PromotionDTO) -> String {
        if promotion.discount_type.lowercased() == "percentage" {
            return "\(Int(promotion.discount_value))% OFF"
        }
        return "$\(String(format: "%.0f", promotion.discount_value)) OFF"
    }

    private func formatPriceRange(min: Double?, max: Double?) -> String {
        if min == nil && max == nil { return "All prices" }
        if let min, let max { return "$\(Int(min)) - $\(Int(max))" }
        if let min { return "From $\(Int(min))" }
        if let max { return "Up to $\(Int(max))" }
        return "All prices"
    }

    private func formatExpiry(_ endAt: String) -> String {
        guard let endDate = HomeDateFormatterCache.parseServerDate(endAt) else { return "Ends soon" }
        let now = Date()
        let diff = endDate.timeIntervalSince(now)
        if diff <= 0 { return "Expired" }
        let days = Int(ceil(diff / 86400))
        if days == 1 { return "Ends today" }
        if days < 7 { return "Ends in \(days) days" }
        return "Ends on \(HomeDateFormatterCache.monthDayFormatter.string(from: endDate))"
    }
}


enum HomeDateFormatterCache {
    private static let posixLocale = Locale(identifier: "en_US_POSIX")
    private static let utcTimeZone = TimeZone(secondsFromGMT: 0)
    private static let newYorkTimeZone = TimeZone(identifier: "America/New_York")

    private static let isoParserWithFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoParser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let serverMicrosecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = utcTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return formatter
    }()

    private static let serverSecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = utcTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter
    }()

    private static let joinedDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    static let monthDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MMM d"
        return formatter
    }()

    private static let displayDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    private static let displayDateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter
    }()

    private static let nyDateTimeSecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter
    }()

    private static let nyDateTimeMinuteParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
        return formatter
    }()

    private static let nyDateParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let nyDateDisplayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }()

    private static let nyTimeSecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

    private static let nyTimeMinuteParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private static let nyTimeDisplayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    static func parseServerDate(_ raw: String) -> Date? {
        if let date = isoParserWithFraction.date(from: raw) {
            return date
        }
        if let date = isoParser.date(from: raw) {
            return date
        }
        if let date = serverMicrosecondParser.date(from: raw) {
            return date
        }
        return serverSecondParser.date(from: raw)
    }

    static func formatJoinedDate(_ raw: String) -> String? {
        guard let date = parseServerDate(raw) else { return nil }
        return joinedDateFormatter.string(from: date)
    }

    static func appointmentDateTime(_ item: AppointmentDTO) -> Date {
        let dateTime = "\(item.appointment_date)T\(item.appointment_time)"
        if let date = nyDateTimeSecondParser.date(from: dateTime) {
            return date
        }
        if let date = nyDateTimeMinuteParser.date(from: dateTime) {
            return date
        }
        return .distantPast
    }

    static func formattedNYDate(_ raw: String) -> String? {
        guard let date = nyDateParser.date(from: raw) else { return nil }
        return nyDateDisplayFormatter.string(from: date)
    }

    static func formattedNYTime(_ raw: String) -> String? {
        if let date = nyTimeSecondParser.date(from: raw) {
            return nyTimeDisplayFormatter.string(from: date)
        }
        guard let date = nyTimeMinuteParser.date(from: raw) else { return nil }
        return nyTimeDisplayFormatter.string(from: date)
    }

    static func formatDisplayDateTime(_ raw: String) -> String? {
        guard let date = parseServerDate(raw) else { return nil }
        return displayDateTimeFormatter.string(from: date)
    }

    static func formatDisplayDateOnly(_ raw: String) -> String? {
        guard let date = parseServerDate(raw) else { return nil }
        return displayDateOnlyFormatter.string(from: date)
    }
}
