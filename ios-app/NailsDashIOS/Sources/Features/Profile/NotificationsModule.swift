import SwiftUI

private struct UnreadCountDTO: Decodable {
    let unread_count: Int
}

private struct NotificationPreferencesDTO: Decodable {
    let push_enabled: Bool
}

private struct NotificationPreferencesUpdateRequest: Encodable {
    let push_enabled: Bool
}

private enum NotificationsFilter: String {
    case all = "All"
    case unread = "Unread"

    var unreadOnly: Bool { self == .unread }
}

private struct AppNotificationDTO: Decodable, Identifiable {
    let id: Int
    let type: String
    let title: String
    let message: String
    let appointment_id: Int?
    var is_read: Bool
    let created_at: String
    var read_at: String?
}

private struct NotificationsService {
    private enum CacheTTL {
        static let notifications: TimeInterval = 20
        static let unreadCount: TimeInterval = 20
        static let preferences: TimeInterval = 60
    }

    private static let notificationsCache = TimedAsyncRequestCache<String, [AppNotificationDTO]>()
    private static let unreadCountCache = TimedAsyncRequestCache<String, Int>()
    private static let preferencesCache = TimedAsyncRequestCache<String, NotificationPreferencesDTO>()

    func getNotifications(token: String, unreadOnly: Bool, skip: Int = 0, limit: Int = 100) async throws -> [AppNotificationDTO] {
        var params = ["skip=\(skip)", "limit=\(limit)"]
        if unreadOnly {
            params.append("unread_only=true")
        }
        let path = "/notifications/?\(params.joined(separator: "&"))"
        let cacheKey = "\(token)|\(unreadOnly)|\(skip)|\(limit)"
        return try await Self.notificationsCache.value(for: cacheKey, ttl: CacheTTL.notifications) {
            try await APIClient.shared.request(path: path, token: token)
        }
    }

    func getUnreadCount(token: String) async throws -> Int {
        try await Self.unreadCountCache.value(for: token, ttl: CacheTTL.unreadCount) {
            let payload: UnreadCountDTO = try await APIClient.shared.request(path: "/notifications/stats/unread-count", token: token)
            return payload.unread_count
        }
    }

    func getNotificationPreferences(token: String) async throws -> NotificationPreferencesDTO {
        try await Self.preferencesCache.value(for: token, ttl: CacheTTL.preferences) {
            try await APIClient.shared.request(path: "/notifications/settings/preferences", token: token)
        }
    }

    func updateNotificationPreferences(pushEnabled: Bool, token: String) async throws -> NotificationPreferencesDTO {
        let updated: NotificationPreferencesDTO = try await APIClient.shared.request(
            path: "/notifications/settings/preferences",
            method: "PUT",
            token: token,
            body: NotificationPreferencesUpdateRequest(push_enabled: pushEnabled)
        )
        Self.preferencesCache.removeValue(for: token)
        return updated
    }

    func markAsRead(notificationID: Int, token: String) async throws -> AppNotificationDTO {
        let updated: AppNotificationDTO = try await APIClient.shared.request(
            path: "/notifications/\(notificationID)/read",
            method: "PATCH",
            token: token
        )
        Self.invalidateNotificationCaches(for: token)
        return updated
    }

    func deleteNotification(notificationID: Int, token: String) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(
            path: "/notifications/\(notificationID)",
            method: "DELETE",
            token: token
        )
        Self.invalidateNotificationCaches(for: token)
    }

    private static func invalidateNotificationCaches(for token: String) {
        notificationsCache.removeValues { key in
            key.hasPrefix("\(token)|")
        }
        unreadCountCache.removeValue(for: token)
    }
}

@MainActor
private final class NotificationsViewModel: ObservableObject {
    @Published var items: [AppNotificationDTO] = []
    @Published var selectedFilter: NotificationsFilter = .all
    @Published var unreadCount: Int = 0
    @Published var pushEnabled: Bool = true
    @Published var isUpdatingPushPreference = false
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var hasMore = true
    @Published var errorMessage: String?

    private let service = NotificationsService()
    private var didLoadOnce = false
    private var requestToken: Int = 0
    private var offset = 0
    private let initialPageSize = 20
    private let loadMorePageSize = 20

    func loadIfNeeded(token: String) async {
        guard !didLoadOnce else { return }
        didLoadOnce = true
        await load(token: token, force: false)
    }

    func load(token: String, force: Bool) async {
        await loadPage(token: token, reset: true, force: force)
    }

    func loadMore(token: String) async {
        guard hasMore, !isLoading, !isLoadingMore else { return }
        await loadPage(token: token, reset: false, force: false)
    }

    func selectFilter(_ filter: NotificationsFilter, token: String) async {
        guard filter != selectedFilter else { return }
        selectedFilter = filter
        await load(token: token, force: false)
    }

    func markAsRead(notificationID: Int, token: String) async {
        guard let index = items.firstIndex(where: { $0.id == notificationID }) else { return }
        guard !items[index].is_read else { return }

        do {
            let updated = try await service.markAsRead(notificationID: notificationID, token: token)
            if selectedFilter == .unread {
                items.remove(at: index)
            } else {
                items[index] = updated
            }
            unreadCount = max(unreadCount - 1, 0)
            syncAppBadgeCount()
            errorMessage = nil
            await backfillIfNeeded(token: token)
        } catch let err as APIError {
            setAPIErrorIfNeeded(err)
        } catch {
            setUnexpectedErrorIfNeeded(error)
        }
    }

    func deleteNotification(notificationID: Int, token: String) async {
        let wasUnread = items.first(where: { $0.id == notificationID })?.is_read == false

        do {
            try await service.deleteNotification(notificationID: notificationID, token: token)
            items.removeAll { $0.id == notificationID }
            if wasUnread {
                unreadCount = max(unreadCount - 1, 0)
            }
            syncAppBadgeCount()
            errorMessage = nil
            await backfillIfNeeded(token: token)
        } catch let err as APIError {
            setAPIErrorIfNeeded(err)
        } catch {
            setUnexpectedErrorIfNeeded(error)
        }
    }

    func handleTap(_ item: AppNotificationDTO, token: String) async -> Bool {
        if !item.is_read {
            await markAsRead(notificationID: item.id, token: token)
        }
        return item.appointment_id != nil
    }

    func updatePushPreference(enabled: Bool, token: String) async {
        let previous = pushEnabled
        pushEnabled = enabled
        isUpdatingPushPreference = true
        defer { isUpdatingPushPreference = false }

        do {
            let updated = try await service.updateNotificationPreferences(pushEnabled: enabled, token: token)
            pushEnabled = updated.push_enabled
            PushNotificationManager.shared.setPushPreferenceEnabled(pushEnabled)
            syncAppBadgeCount()
            errorMessage = nil
        } catch let err as APIError {
            pushEnabled = previous
            setAPIErrorIfNeeded(err)
        } catch {
            pushEnabled = previous
            setUnexpectedErrorIfNeeded(error)
        }
    }

    private func setAPIErrorIfNeeded(_ error: APIError) {
        if case .unauthorized = error {
            // 401 is handled globally by AppState listener.
            return
        }
        let message = mapError(error)
        if !message.isEmpty {
            errorMessage = message
        }
    }

    private func setUnexpectedErrorIfNeeded(_ error: Error) {
        if error is CancellationError {
            return
        }
        let message = error.localizedDescription
        if message.lowercased().contains("cancel") {
            return
        }
        if !message.isEmpty {
            errorMessage = message
        }
    }

    private func syncAppBadgeCount() {
        PushNotificationManager.shared.setAppBadge(pushEnabled ? unreadCount : 0)
    }

    private func loadPage(token: String, reset: Bool, force: Bool) async {
        let currentRequestToken: Int
        if reset {
            requestToken += 1
            currentRequestToken = requestToken
        } else {
            currentRequestToken = requestToken
        }

        if force {
            didLoadOnce = true
        }

        let requestedOffset = reset ? 0 : offset
        let pageSize = reset ? initialPageSize : loadMorePageSize

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
            async let notificationsTask = service.getNotifications(
                token: token,
                unreadOnly: selectedFilter.unreadOnly,
                skip: requestedOffset,
                limit: pageSize
            )

            let unreadTask: Int?
            let preferenceTask: NotificationPreferencesDTO?
            if reset {
                unreadTask = try await service.getUnreadCount(token: token)
                preferenceTask = try await service.getNotificationPreferences(token: token)
            } else {
                unreadTask = nil
                preferenceTask = nil
            }

            let notifications = try await notificationsTask
            guard currentRequestToken == requestToken else { return }

            items = reset ? notifications : mergeUniqueRows(existing: items, newRows: notifications)
            offset = requestedOffset + notifications.count
            hasMore = notifications.count == pageSize && !notifications.isEmpty

            if let unreadTask {
                unreadCount = unreadTask
            }
            if let preferenceTask {
                pushEnabled = preferenceTask.push_enabled
                PushNotificationManager.shared.setPushPreferenceEnabled(pushEnabled)
            }
            syncAppBadgeCount()
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            setAPIErrorIfNeeded(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
            setUnexpectedErrorIfNeeded(error)
        }
    }

    private func backfillIfNeeded(token: String) async {
        guard items.isEmpty, hasMore else { return }
        await loadMore(token: token)
    }
}

struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = NotificationsViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            topBar
            filterBar
            pushPreferenceBar
            content
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
        .task { await loadIfNeeded() }
        .onChange(of: viewModel.errorMessage) { value in
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

    private var topBar: some View {
        HStack(spacing: UITheme.spacing10) {
            Button {
                dismiss()
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

            VStack(spacing: UITheme.spacing2) {
                Text("Notifications")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                if viewModel.unreadCount > 0 {
                    Text("\(viewModel.unreadCount) unread")
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.64))
                }
            }

            Spacer()
            Color.clear.frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
        .frame(maxWidth: .infinity)
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

    private var filterBar: some View {
        HStack(spacing: UITheme.spacing8) {
            filterButton(.all)
            filterButton(.unread)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.vertical, UITheme.spacing8)
        .background(Color.black)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private var pushPreferenceBar: some View {
        HStack(spacing: UITheme.spacing10) {
            VStack(alignment: .leading, spacing: UITheme.spacing2) {
                Text("Push Notifications")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Text(viewModel.pushEnabled ? "Enabled" : "Disabled")
                    .font(.caption)
                    .foregroundStyle(Color.white.opacity(0.58))
            }
            Spacer(minLength: UITheme.spacing10)
            Toggle(
                "",
                isOn: Binding(
                    get: { viewModel.pushEnabled },
                    set: { enabled in
                        Task {
                            guard let token = appState.requireAccessToken() else { return }
                            await viewModel.updatePushPreference(enabled: enabled, token: token)
                        }
                    }
                )
            )
            .labelsHidden()
            .toggleStyle(SwitchToggleStyle(tint: brandGold))
            .disabled(viewModel.isUpdatingPushPreference)
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.vertical, UITheme.spacing10)
        .background(Color.black)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private func filterButton(_ filter: NotificationsFilter) -> some View {
        Button {
            Task {
                guard let token = appState.requireAccessToken() else { return }
                await viewModel.selectFilter(filter, token: token)
            }
        } label: {
            HStack(spacing: UITheme.spacing4) {
                Text(filter.rawValue)
                if filter == .unread && viewModel.unreadCount > 0 {
                    Text("(\(viewModel.unreadCount))")
                }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(viewModel.selectedFilter == filter ? Color.black : Color.white.opacity(0.78))
            .frame(maxWidth: .infinity)
            .frame(minHeight: UITheme.segmentHeight)
            .background(viewModel.selectedFilter == filter ? brandGold : Color.white.opacity(0.05))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(viewModel.selectedFilter == filter ? Color.clear : brandGold.opacity(0.22), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                if !viewModel.isLoading && viewModel.items.isEmpty {
                    UnifiedEmptyStateCard(
                        icon: "bell.slash",
                        title: "No notifications",
                        subtitle: viewModel.selectedFilter == .unread ? "You're all caught up!" : "You'll see notifications here",
                        compact: true
                    )
                    .padding(.top, UITheme.spacing20)
                } else {
                    LazyVStack(alignment: .leading, spacing: UITheme.spacing10) {
                        ForEach(Array(viewModel.items.enumerated()), id: \.element.id) { index, item in
                            notificationCard(item)
                                .onAppear {
                                    Task {
                                        await loadMoreNotificationsIfNeeded(currentIndex: index)
                                    }
                                }
                        }

                        if viewModel.isLoadingMore {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(brandGold)
                                .frame(maxWidth: .infinity)
                                .padding(.top, UITheme.spacing8)
                        }
                    }
                }
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.vertical, UITheme.spacing10)
        }
        .refreshable {
            await reload()
        }
    }

    private func notificationCard(_ item: AppNotificationDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            HStack(alignment: .top, spacing: UITheme.spacing10) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 40, height: 40)
                    Image(systemName: iconName(for: item.type))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(brandGold)
                }

                VStack(alignment: .leading, spacing: UITheme.spacing4) {
                    Text(item.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text(item.message)
                        .font(.footnote)
                        .foregroundStyle(Color.white.opacity(0.68))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineLimit(2)
                    Text(relativeTimeText(item.created_at))
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.50))
                }
            }

            HStack(spacing: UITheme.spacing8) {
                if !item.is_read {
                    Button {
                        Task {
                            guard let token = appState.requireAccessToken() else { return }
                            await viewModel.markAsRead(notificationID: item.id, token: token)
                        }
                    } label: {
                        HStack(spacing: UITheme.spacing4) {
                            Image(systemName: "checkmark")
                            Text("Mark as read")
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 34)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }

                Button {
                    Task {
                        guard let token = appState.requireAccessToken() else { return }
                        await viewModel.deleteNotification(notificationID: item.id, token: token)
                    }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.red.opacity(0.86))
                        .frame(minWidth: 52, minHeight: 34)
                        .background(Color.red.opacity(0.10))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .padding(.top, UITheme.spacing2)
        }
        .padding(UITheme.spacing12)
        .background(item.is_read ? Color.white.opacity(0.05) : brandGold.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
        .overlay(alignment: .topTrailing) {
            if !item.is_read {
                Circle()
                    .fill(brandGold)
                    .frame(width: 8, height: 8)
                    .padding(UITheme.spacing10)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous)
                .stroke(item.is_read ? Color.white.opacity(0.10) : brandGold.opacity(0.32), lineWidth: 1)
        )
        .contentShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
        .onTapGesture {
            Task {
                guard let token = appState.requireAccessToken() else { return }
                let goAppointments = await viewModel.handleTap(item, token: token)
                if goAppointments {
                    appState.selectedTab = .appointments
                }
            }
        }
    }

    private func iconName(for type: String) -> String {
        switch type {
        case "appointment_created", "appointment_confirmed", "appointment_completed":
            return "calendar"
        case "appointment_reminder":
            return "clock"
        default:
            return "bell"
        }
    }

    private func relativeTimeText(_ raw: String) -> String {
        guard let date = HomeDateFormatterCache.parseServerDate(raw) else { return raw }
        let diff = max(0, Date().timeIntervalSince(date))
        let minutes = Int(diff / 60)
        let hours = Int(diff / 3600)
        let days = Int(diff / 86_400)

        if minutes < 1 { return "Just now" }
        if minutes < 60 { return "\(minutes)m ago" }
        if hours < 24 { return "\(hours)h ago" }
        if days < 7 { return "\(days)d ago" }
        return HomeDateFormatterCache.monthDayFormatter.string(from: date)
    }

    private func loadMoreNotificationsIfNeeded(currentIndex: Int) async {
        let thresholdIndex = max(viewModel.items.count - 3, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMore(token: token)
    }

}
