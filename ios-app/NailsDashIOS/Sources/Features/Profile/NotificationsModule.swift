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
    func getNotifications(token: String, unreadOnly: Bool) async throws -> [AppNotificationDTO] {
        var params = ["skip=0", "limit=100"]
        if unreadOnly {
            params.append("unread_only=true")
        }
        let path = "/notifications/?\(params.joined(separator: "&"))"
        return try await APIClient.shared.request(path: path, token: token)
    }

    func getUnreadCount(token: String) async throws -> Int {
        let payload: UnreadCountDTO = try await APIClient.shared.request(path: "/notifications/stats/unread-count", token: token)
        return payload.unread_count
    }

    func getNotificationPreferences(token: String) async throws -> NotificationPreferencesDTO {
        try await APIClient.shared.request(path: "/notifications/settings/preferences", token: token)
    }

    func updateNotificationPreferences(pushEnabled: Bool, token: String) async throws -> NotificationPreferencesDTO {
        try await APIClient.shared.request(
            path: "/notifications/settings/preferences",
            method: "PUT",
            token: token,
            body: NotificationPreferencesUpdateRequest(push_enabled: pushEnabled)
        )
    }

    func markAsRead(notificationID: Int, token: String) async throws -> AppNotificationDTO {
        try await APIClient.shared.request(
            path: "/notifications/\(notificationID)/read",
            method: "PATCH",
            token: token
        )
    }

    func deleteNotification(notificationID: Int, token: String) async throws {
        let _: EmptyResponse = try await APIClient.shared.request(
            path: "/notifications/\(notificationID)",
            method: "DELETE",
            token: token
        )
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
    @Published var errorMessage: String?

    private let service = NotificationsService()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let notificationsTask = service.getNotifications(token: token, unreadOnly: selectedFilter.unreadOnly)
            async let unreadTask = service.getUnreadCount(token: token)
            async let preferenceTask = service.getNotificationPreferences(token: token)
            let notifications = try await notificationsTask
            let unread = try await unreadTask
            let preference = try await preferenceTask

            items = notifications
            unreadCount = unread
            pushEnabled = preference.push_enabled
            PushNotificationManager.shared.setPushPreferenceEnabled(pushEnabled)
            syncAppBadgeCount()
            errorMessage = nil
        } catch let err as APIError {
            setAPIErrorIfNeeded(err)
        } catch {
            setUnexpectedErrorIfNeeded(error)
        }
    }

    func selectFilter(_ filter: NotificationsFilter, token: String) async {
        guard filter != selectedFilter else { return }
        selectedFilter = filter
        await load(token: token)
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
        .task { await reload() }
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
        await viewModel.load(token: token)
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
                        ForEach(viewModel.items) { item in
                            notificationCard(item)
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

}
