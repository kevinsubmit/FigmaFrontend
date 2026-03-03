import SwiftUI

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

struct HomeFeedService {
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

struct HomeFeedView: View {
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
