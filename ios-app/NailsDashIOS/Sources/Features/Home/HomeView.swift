import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            NavigationStack {
                HomeFeedView()
            }
            .enableSwipeBackGesture()
            .tag(AppTab.home)
            .tabItem {
                Label("Home", systemImage: "house")
            }

            NavigationStack {
                StoresListView()
            }
            .enableSwipeBackGesture()
            .id(appState.bookTabResetID)
            .tag(AppTab.book)
            .tabItem {
                Label("Book", systemImage: "storefront")
            }

            NavigationStack {
                MyAppointmentsView()
            }
            .enableSwipeBackGesture()
            .tag(AppTab.appointments)
            .tabItem {
                Label("Appointments", systemImage: "calendar")
            }

            NavigationStack {
                DealsView()
            }
            .enableSwipeBackGesture()
            .id(appState.dealsTabResetID)
            .tag(AppTab.deals)
            .tabItem {
                Label("Deals", systemImage: "tag")
            }

            NavigationStack {
                ProfileCenterView()
                    .environmentObject(appState)
            }
            .enableSwipeBackGesture()
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
    private enum CacheTTL {
        static let promotions: TimeInterval = 45
        static let storesList: TimeInterval = 45
    }

    private static let promotionsCache = TimedAsyncRequestCache<String, [PromotionDTO]>()
    private static let storesCache = TimedAsyncRequestCache<String, [StoreDTO]>()

    func getPromotions(skip: Int = 0, limit: Int = 100) async throws -> [PromotionDTO] {
        let path = "/promotions?skip=\(skip)&limit=\(limit)&active_only=true&include_platform=true"
        return try await Self.promotionsCache.value(for: path, ttl: CacheTTL.promotions) {
            try await APIClient.shared.request(path: path)
        }
    }

    func getStores() async throws -> [StoreDTO] {
        let path = "/stores?skip=0&limit=100"
        return try await Self.storesCache.value(for: path, ttl: CacheTTL.storesList) {
            try await APIClient.shared.request(path: path)
        }
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
    @Published var isLoadingMore: Bool = false
    @Published var hasMore: Bool = true
    @Published var errorMessage: String?

    private let service = DealsService()
    private let storesService: StoresServiceProtocol
    private var didLoadOnce = false
    private var requestToken: Int = 0
    private var offset: Int = 0
    private let initialPageSize = 8
    private let loadMorePageSize = 6

    init(storesService: StoresServiceProtocol = StoresService()) {
        self.storesService = storesService
    }

    var filtered: [PromotionDTO] {
        switch selectedSegment {
        case .store:
            return promotions.filter { $0.scope.lowercased() != "platform" }
        case .platform:
            return promotions.filter { $0.scope.lowercased() == "platform" }
        }
    }

    func loadIfNeeded() async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(force: false)
    }

    func load(force: Bool) async {
        await loadPromotions(reset: true, force: force)
        await ensureSelectedSegmentLoaded()
    }

    func loadMore() async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        await loadPromotions(reset: false, force: false)
    }

    func ensureSelectedSegmentLoaded() async {
        while filtered.isEmpty && hasMore && !isLoading && !isLoadingMore {
            let beforeCount = promotions.count
            await loadMore()
            if promotions.count == beforeCount {
                break
            }
        }
    }

    private func loadPromotions(reset: Bool, force: Bool) async {
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
        }

        let requestedOffset = reset ? 0 : offset
        let pageSize = reset ? initialPageSize : loadMorePageSize
        if force {
            didLoadOnce = true
        }
        if reset {
            isLoading = true
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
        do {
            let promoRows = try await service.getPromotions(skip: requestedOffset, limit: pageSize)
            guard currentRequestToken == requestToken else { return }
            let mergedPromotions = reset ? promoRows : mergePromotions(existing: promotions, newRows: promoRows)
            let mergedStoreIDs = Set(mergedPromotions.compactMap(\.store_id))
            let missingStoreIDs = mergedStoreIDs.subtracting(Set(storesByID.keys))
            let storeRows = await resolveStores(for: Array(missingStoreIDs).sorted())
            guard currentRequestToken == requestToken else { return }

            promotions = mergedPromotions
            offset = requestedOffset + promoRows.count
            hasMore = promoRows.count == pageSize && !promoRows.isEmpty

            if reset {
                storesByID = [:]
            }
            for row in storeRows {
                storesByID[row.id] = row
            }
            storesByID = storesByID.filter { mergedStoreIDs.contains($0.key) }
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
            errorMessage = error.localizedDescription
        }
    }

    private func mergePromotions(existing: [PromotionDTO], newRows: [PromotionDTO]) -> [PromotionDTO] {
        guard !newRows.isEmpty else { return existing }
        var merged = existing
        var existingIDs = Set(existing.map(\.id))
        for row in newRows where existingIDs.insert(row.id).inserted {
            merged.append(row)
        }
        return merged
    }

    private func resolveStores(for ids: [Int]) async -> [StoreDTO] {
        guard !ids.isEmpty else { return [] }

        return await withTaskGroup(of: StoreDTO?.self, returning: [StoreDTO].self) { group in
            for id in ids {
                group.addTask { [storesService] in
                    do {
                        let detail = try await storesService.fetchStoreDetail(storeID: id)
                        return Self.listStore(from: detail)
                    } catch {
                        return nil
                    }
                }
            }

            var resolved: [StoreDTO] = []
            for await row in group {
                if let row {
                    resolved.append(row)
                }
            }
            return resolved
        }
    }

    nonisolated private static func listStore(from detail: StoreDetailDTO) -> StoreDTO {
        StoreDTO(
            id: detail.id,
            name: detail.name,
            image_url: detail.images.first?.image_url,
            address: detail.address,
            city: detail.city,
            state: detail.state,
            zip_code: detail.zip_code,
            latitude: detail.latitude,
            longitude: detail.longitude,
            time_zone: detail.time_zone,
            phone: detail.phone,
            email: detail.email,
            description: detail.description,
            opening_hours: detail.opening_hours,
            rating: detail.rating,
            review_count: detail.review_count,
            distance: nil
        )
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
    @Environment(\.displayScale) private var displayScale
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
                LazyVStack(alignment: .leading, spacing: UITheme.spacing12) {
                    if !viewModel.isLoading && viewModel.filtered.isEmpty {
                        UnifiedEmptyStateCard(
                            icon: "tag.fill",
                            title: "No active deals right now",
                            subtitle: "Check back soon for new offers.",
                            compact: true
                        )
                    } else {
                        let totalCount = viewModel.filtered.count
                        ForEach(Array(viewModel.filtered.enumerated()), id: \.element.id) { idx, promotion in
                            dealRow(promotion, index: idx, totalCount: totalCount)
                                .onAppear {
                                    let visiblePromotions = viewModel.filtered
                                    Task {
                                        async let prefetchTask: Void = prefetchDealImages(around: idx, within: visiblePromotions)
                                        async let loadMoreTask: Void = loadMoreDealsIfNeeded(currentIndex: idx, within: visiblePromotions)
                                        _ = await (prefetchTask, loadMoreTask)
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
        .toolbar(.hidden, for: .navigationBar)
        .tint(brandGold)
        .background(Color.black)
        .background(
            ImagePrefetcher(
                urls: Array(viewModel.filtered.prefix(8)).map { promotion in
                    let store = promotion.store_id.flatMap { viewModel.storesByID[$0] }
                    return promotionCoverURL(promotion: promotion, store: store)
                },
                limit: 8
            )
        )
        .task { await viewModel.loadIfNeeded() }
        .refreshable { await viewModel.load(force: true) }
        .onChange(of: viewModel.selectedSegment) { _ in
            Task { await viewModel.ensureSelectedSegmentLoaded() }
        }
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

    private func loadMoreDealsIfNeeded(currentIndex: Int, within promotions: [PromotionDTO]) async {
        let thresholdIndex = max(promotions.count - 3, 0)
        guard currentIndex >= thresholdIndex else { return }
        await viewModel.loadMore()
        await viewModel.ensureSelectedSegmentLoaded()
    }

    private func prefetchDealImages(around currentIndex: Int, within promotions: [PromotionDTO]) async {
        guard !promotions.isEmpty else { return }
        let upperBound = min(currentIndex + 4, promotions.count)
        let urls = promotions[currentIndex..<upperBound].compactMap { promotion in
            let store = promotion.store_id.flatMap { viewModel.storesByID[$0] }
            return promotionCoverURL(promotion: promotion, store: store)
        }
        await CachedImagePipeline.shared.prefetch(
            urls: urls,
            scale: displayScale,
            limit: 8
        )
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
