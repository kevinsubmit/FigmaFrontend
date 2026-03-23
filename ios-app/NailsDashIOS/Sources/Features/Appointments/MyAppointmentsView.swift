import SwiftUI
import UIKit

struct MyAppointmentsView: View {
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = MyAppointmentsViewModel()
    @State private var selectedSegment: AppointmentSegment = .upcoming
    @State private var selectedDetailAppointment: AppointmentDTO?
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var mapChooserAddress: String = ""
    @State private var showMapAppChooser: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            pageHeader

            ScrollView {
                LazyVStack(alignment: .leading, spacing: UITheme.spacing12) {
                    if let error = viewModel.errorMessage, !error.isEmpty {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red.opacity(0.9))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, UITheme.spacing2)
                    }

                    if !viewModel.isLoading && filteredItems.isEmpty {
                        emptyState
                    } else {
                        ForEach(Array(filteredItems.enumerated()), id: \.element.id) { index, item in
                            appointmentCard(item)
                                .onAppear {
                                    let visibleItems = filteredItems
                                    Task {
                                        await loadMoreAppointmentsIfNeeded(currentIndex: index, within: visibleItems)
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
                .padding(.top, UITheme.spacing10)
                .padding(.bottom, UITheme.spacing28)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.visible, for: .tabBar)
        .tint(brandGold)
        .background(Color.black)
        .task {
            await loadIfNeeded()
        }
        .refreshable {
            await reload()
        }
        .onChange(of: appState.appointmentsTabRefreshID) { _ in
            Task {
                guard let token = appState.requireAccessToken() else { return }
                await viewModel.load(token: token, force: true)
                await ensureContentForSelectedSegment()
            }
        }
        .onChange(of: selectedSegment) { _ in
            Task { await ensureContentForSelectedSegment() }
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
        .sheet(isPresented: $showMapAppChooser) {
            mapChooserSheet
                .presentationDetents([.height(382)])
                .presentationDragIndicator(.hidden)
                .h5BottomSheetStyle()
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading...")
                    .padding(UITheme.pagePadding)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.overlayCornerRadius))
            }
        }
        .fullScreenCover(item: $selectedDetailAppointment) { item in
            AppointmentDetailView(appointment: item) { updated in
                viewModel.replace(updated)
            }
            .environmentObject(appState)
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token, force: true)
        await ensureContentForSelectedSegment()
    }

    private func loadIfNeeded() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadIfNeeded(token: token)
        await ensureContentForSelectedSegment()
    }

    private func formattedDate(_ date: String) -> String {
        AppointmentLocalFormatter.friendlyDate(date) ?? date
    }

    private func formattedTime(_ time: String) -> String {
        AppointmentLocalFormatter.friendlyTime(time) ?? time
    }

    private var pageHeader: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            Text("My Appointments")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(.white)
            Text("Manage upcoming and past bookings")
                .font(.footnote)
                .foregroundStyle(.secondary)
            tabHeader
        }
        .padding(.horizontal, UITheme.pagePadding)
        .padding(.top, UITheme.spacing4)
        .padding(.bottom, UITheme.spacing6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.black.opacity(0.96))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private var tabHeader: some View {
        HStack(spacing: UITheme.spacing8) {
            tabButton(.upcoming, count: upcomingCount)
            tabButton(.past, count: nil)
        }
        .frame(maxWidth: .infinity)
        .padding(UITheme.spacing4)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
        .padding(.top, UITheme.spacing2)
    }

    private func tabButton(_ segment: AppointmentSegment, count: Int?) -> some View {
        Button {
            selectedSegment = segment
        } label: {
            HStack(spacing: UITheme.spacing6) {
                Text(segment.title)
                    .font(.footnote.weight(.semibold))
                if segment == .upcoming, let count, count > 0 {
                    Text("\(count)")
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, UITheme.compactPillHorizontalPadding - 2)
                        .padding(.vertical, UITheme.compactPillVerticalPadding - 2)
                        .background(selectedSegment == segment ? Color.black.opacity(0.14) : Color.white.opacity(0.10))
                        .foregroundStyle(selectedSegment == segment ? .black : Color.white.opacity(0.86))
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, UITheme.pillHorizontalPadding)
            .frame(maxWidth: .infinity)
            .frame(minHeight: UITheme.segmentHeight)
            .background(selectedSegment == segment ? brandGold : Color.clear)
            .foregroundStyle(selectedSegment == segment ? .black : Color.white.opacity(0.86))
            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                    .stroke(selectedSegment == segment ? Color.clear : brandGold.opacity(0.24), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }

    private var emptyState: some View {
        VStack(spacing: UITheme.spacing14) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.05))
                    .frame(width: UITheme.technicianAvatarSize, height: UITheme.technicianAvatarSize)
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
                Image(systemName: "calendar.badge.exclamationmark")
                    .font(.system(size: UITheme.compactControlSize, weight: .regular))
                    .foregroundStyle(Color.white.opacity(0.66))
            }
            Text(selectedSegment == .upcoming ? "No upcoming appointments" : "No past appointments")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            if selectedSegment == .upcoming {
                NavigationLink {
                    StoresListView(hideTabBar: true)
                } label: {
                    Text("Book Now")
                        .font(.subheadline.weight(.bold))
                        .padding(.horizontal, UITheme.pillHorizontalPadding + 10)
                        .frame(minHeight: UITheme.ctaHeight)
                        .background(brandGold)
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                }
                .buttonStyle(.plain)
                .padding(.top, UITheme.spacing4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, UITheme.pillHorizontalPadding)
        .padding(.top, UITheme.spacing56)
    }

    private var filteredItems: [AppointmentDTO] {
        switch selectedSegment {
        case .upcoming:
            return viewModel.items.filter { isUpcomingAppointment($0) }
        case .past:
            return viewModel.items.filter { !isUpcomingAppointment($0) }
        }
    }

    private var upcomingCount: Int {
        viewModel.items.filter { isUpcomingAppointment($0) }.count
    }

    private func isUpcomingAppointment(_ item: AppointmentDTO) -> Bool {
        let status = item.status.lowercased()
        if status == "cancelled" || status == "completed" {
            return false
        }
        guard let dateTime = appointmentDateTime(item) else { return false }
        return dateTime >= Date()
    }

    private func appointmentDateTime(_ item: AppointmentDTO) -> Date? {
        let dateParts = item.appointment_date.split(separator: "-").compactMap { Int($0) }
        guard dateParts.count == 3 else { return nil }
        let timeParts = item.appointment_time.split(separator: ":").compactMap { Int($0) }
        guard !timeParts.isEmpty else { return nil }
        var components = DateComponents()
        components.year = dateParts[0]
        components.month = dateParts[1]
        components.day = dateParts[2]
        components.hour = timeParts[0]
        components.minute = timeParts.count > 1 ? timeParts[1] : 0
        components.second = timeParts.count > 2 ? timeParts[2] : 0
        return Self.etCalendar.date(from: components)
    }

    private static let etTimeZone = TimeZone.autoupdatingCurrent
    private static var etCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = etTimeZone
        return calendar
    }

    private func effectiveStatus(_ item: AppointmentDTO) -> String {
        let raw = item.status.lowercased()
        if !isUpcomingAppointment(item) && (raw == "pending" || raw == "confirmed") {
            return "expired"
        }
        return raw
    }

    private func statusText(_ raw: String) -> String {
        if raw == "expired" {
            return "Expired"
        }
        guard let first = raw.first else { return raw }
        return String(first).uppercased() + raw.dropFirst()
    }

    @ViewBuilder
    private func statusCapsule(_ raw: String) -> some View {
        Text(statusText(raw))
            .font(.caption.weight(.semibold))
            .padding(.horizontal, UITheme.pillHorizontalPadding)
            .padding(.vertical, UITheme.pillVerticalPadding - 1)
            .background(statusColor(raw).opacity(0.14))
            .clipShape(Capsule())
            .foregroundStyle(statusColor(raw))
    }

    private func statusColor(_ raw: String) -> Color {
        switch raw.lowercased() {
        case "pending":
            return .yellow
        case "confirmed":
            return .green
        case "completed":
            return .blue
        case "cancelled":
            return .red
        case "expired":
            return .gray
        default:
            return .orange
        }
    }

    private func mapsURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "https://www.google.com/maps/search/?api=1&query=\(encoded)")
    }

    private func appleMapsURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "http://maps.apple.com/?q=\(encoded)")
    }

    private func googleMapsAppURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "comgooglemaps://?q=\(encoded)")
    }

    private func presentMapChooser(for address: String) {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        mapChooserAddress = trimmed
        showMapAppChooser = true
    }

    private func openAppleMaps() {
        guard let url = appleMapsURL(mapChooserAddress) else { return }
        openURL(url)
    }

    private func openGoogleMaps() {
        if let appURL = googleMapsAppURL(mapChooserAddress), UIApplication.shared.canOpenURL(appURL) {
            openURL(appURL)
            return
        }
        guard let webURL = mapsURL(mapChooserAddress) else { return }
        openURL(webURL)
    }

    private var mapChooserSheet: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(Color.white.opacity(0.9))
                .frame(width: 68, height: 8)
                .padding(.top, UITheme.spacing12)

            Text("Open in Maps")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing16)

            VStack(spacing: UITheme.spacing10) {
                mapChooserButton(
                    title: "Google Maps",
                    icon: "map.fill",
                    tint: Color(red: 66.0 / 255.0, green: 133.0 / 255.0, blue: 244.0 / 255.0)
                ) {
                    showMapAppChooser = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                        openGoogleMaps()
                    }
                }

                mapChooserButton(
                    title: "Apple Maps",
                    icon: "location.fill",
                    tint: brandGold
                ) {
                    showMapAppChooser = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                        openAppleMaps()
                    }
                }
            }
            .padding(.horizontal, UITheme.pagePadding)

            Button {
                showMapAppChooser = false
            } label: {
                Text("Cancel")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.72))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
            }
            .buttonStyle(.plain)
            .padding(.top, UITheme.spacing12)
            .padding(.horizontal, UITheme.pagePadding)
        }
        .padding(.bottom, UITheme.spacing20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color(red: 18.0 / 255.0, green: 18.0 / 255.0, blue: 18.0 / 255.0))
    }

    private func mapChooserButton(
        title: String,
        icon: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: UITheme.spacing12) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.06))
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(tint)
                }
                .frame(width: 42, height: 42)

                Text(title)
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(.white)

                Spacer()

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.44))
            }
            .padding(.horizontal, UITheme.spacing14)
            .frame(maxWidth: .infinity)
            .frame(height: 66)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func resolvedStoreAddress(_ item: AppointmentDTO) -> String? {
        if let fullAddress = viewModel.storeAddressByStoreID[item.store_id]?.trimmingCharacters(in: .whitespacesAndNewlines),
           !fullAddress.isEmpty {
            return fullAddress
        }
        if let rawAddress = item.store_address?.trimmingCharacters(in: .whitespacesAndNewlines),
           !rawAddress.isEmpty {
            return rawAddress
        }
        return nil
    }

    private func loadMoreAppointmentsIfNeeded(currentIndex: Int, within visibleItems: [AppointmentDTO]) async {
        let thresholdIndex = max(visibleItems.count - 3, 0)
        guard currentIndex >= thresholdIndex else { return }
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.loadMore(token: token)
        await ensureContentForSelectedSegment()
    }

    private func ensureContentForSelectedSegment() async {
        guard let token = appState.requireAccessToken() else { return }
        while filteredItems.isEmpty && viewModel.hasMore && !viewModel.isLoading && !viewModel.isLoadingMore {
            let beforeCount = viewModel.items.count
            await viewModel.loadMore(token: token)
            if viewModel.items.count == beforeCount {
                break
            }
        }
    }

    private func appointmentCard(_ item: AppointmentDTO) -> some View {
        let isPast = !isUpcomingAppointment(item)

        return Group {
            if isPast {
                appointmentCardBody(item: item, isPast: true)
            } else {
                Button {
                    selectedDetailAppointment = item
                } label: {
                    appointmentCardBody(item: item, isPast: false)
                }
                .buttonStyle(CardTapButtonStyle())
            }
        }
    }

    private func appointmentCardBody(item: AppointmentDTO, isPast: Bool) -> some View {
        let state = effectiveStatus(item)
        let displayAddress = resolvedStoreAddress(item)
        return VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(alignment: .center, spacing: UITheme.spacing8) {
                statusCapsule(state)
                Spacer(minLength: 0)
                if !isPast {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.white.opacity(0.75))
                }
            }

            VStack(alignment: .leading, spacing: UITheme.spacing6) {
                HStack(spacing: UITheme.spacing6) {
                    Image(systemName: "storefront.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(brandGold.opacity(0.95))
                    Text(item.store_name ?? "Store #\(item.store_id)")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                }

                if let address = displayAddress {
                    HStack(alignment: .top, spacing: UITheme.spacing6) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.caption)
                            .foregroundStyle(brandGold)
                            .padding(.top, UITheme.spacing1)
                        Button {
                            presentMapChooser(for: address)
                        } label: {
                            Text(address)
                                .font(.caption)
                                .foregroundStyle(Color.white.opacity(0.72))
                                .lineLimit(nil)
                                .underline(true, color: Color.white.opacity(0.35))
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, UITheme.spacing10)
            .padding(.vertical, UITheme.spacing8)
            .background(Color.white.opacity(0.03))
            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))

            VStack(alignment: .leading, spacing: UITheme.spacing7) {
                Text(item.service_name ?? "Service #\(item.service_id)")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)

                HStack(alignment: .center, spacing: UITheme.spacing8) {
                    if let amount = item.order_amount ?? item.service_price {
                        HStack(spacing: UITheme.spacing5) {
                            Image(systemName: "dollarsign.circle")
                                .font(.caption)
                            Text(String(format: "$%.2f", amount))
                                .font(.footnote.weight(.semibold))
                        }
                        .foregroundStyle(brandGold)
                    }

                    if let duration = item.service_duration {
                        HStack(spacing: UITheme.spacing5) {
                            Image(systemName: "clock")
                                .font(.caption)
                            Text("\(duration) min")
                                .font(.footnote.weight(.medium))
                        }
                        .foregroundStyle(Color.white.opacity(0.72))
                    }

                    if let tech = item.technician_name,
                       !tech.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        HStack(spacing: UITheme.spacing5) {
                            Image(systemName: "person.crop.circle")
                                .font(.caption)
                            Text(tech)
                                .font(.footnote.weight(.medium))
                                .lineLimit(1)
                        }
                        .foregroundStyle(Color.white.opacity(0.72))
                    } else {
                        HStack(spacing: UITheme.spacing5) {
                            Image(systemName: "person.crop.circle.badge.questionmark")
                                .font(.caption)
                            Text("Any technician")
                                .font(.footnote.weight(.medium))
                        }
                        .foregroundStyle(Color.white.opacity(0.58))
                    }
                }
            }
            .padding(.horizontal, UITheme.spacing10)
            .padding(.vertical, UITheme.spacing8)
            .background(Color.white.opacity(0.03))
            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))

            HStack(spacing: UITheme.spacing10) {
                HStack(spacing: UITheme.spacing6) {
                    Image(systemName: "calendar")
                        .font(.caption)
                    Text(formattedDate(item.appointment_date))
                        .font(.footnote.weight(.medium))
                }
                .padding(.horizontal, UITheme.pillHorizontalPadding)
                .padding(.vertical, UITheme.pillVerticalPadding)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                HStack(spacing: UITheme.spacing6) {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text(formattedTime(item.appointment_time))
                        .font(.footnote.weight(.medium))
                }
                .padding(.horizontal, UITheme.pillHorizontalPadding)
                .padding(.vertical, UITheme.pillVerticalPadding)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
            }
            .foregroundStyle(.white)
        }
        .padding(UITheme.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [cardBG, Color.white.opacity(0.01)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(brandGold.opacity(isPast ? 0.22 : 0.34))
                .frame(height: UITheme.spacing1)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        }
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: UITheme.spacing2)
                .fill(statusColor(state).opacity(0.95))
                .frame(width: 3, height: 28)
                .padding(.leading, UITheme.spacing6)
        }
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(isPast ? 0.12 : 0.20), lineWidth: 1)
        )
        .opacity(isPast ? 0.72 : 1)
        .shadow(color: .black.opacity(0.22), radius: 6, y: 3)
    }
}

private struct AppointmentDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: AppointmentDetailViewModel
    @State private var toast: ToastPayload?
    @State private var showRescheduleSheet = false
    @State private var showCancelSheet = false
    @State private var mapChooserAddress: String = ""
    @State private var showMapAppChooser: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    let onChanged: (AppointmentDTO) -> Void

    init(appointment: AppointmentDTO, onChanged: @escaping (AppointmentDTO) -> Void) {
        _viewModel = StateObject(wrappedValue: AppointmentDetailViewModel(appointment: appointment))
        self.onChanged = onChanged
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing10) {
                    statusCard
                    appointmentInfoCard
                    serviceCard
                    locationCard
                    notesCard
                    cancelReasonCard
                    detailChipsRow
                }
                .padding(.horizontal, 12)
                .padding(.top, 10)
                .padding(.bottom, UITheme.spacing28)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .tint(brandGold)
        .background(Color.black)
        .task {
            await reloadDetail()
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            showToast(message: value, isError: true)
        }
        .onChange(of: viewModel.successMessage) { value in
            guard let value, !value.isEmpty else { return }
            showToast(message: value, isError: false)
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading...")
                    .padding(UITheme.pagePadding)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.overlayCornerRadius))
            }
        }
        .safeAreaInset(edge: .bottom) {
            actionBar
        }
        .overlay(alignment: .top) {
            if let toast {
                ToastView(payload: toast)
                    .padding(.top, UITheme.spacing56)
                    .padding(.horizontal, UITheme.pagePadding)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .sheet(isPresented: $showRescheduleSheet) {
            rescheduleSheet
        }
        .sheet(isPresented: $showCancelSheet) {
            cancelSheet
        }
        .sheet(isPresented: $showMapAppChooser) {
            mapChooserSheet
                .presentationDetents([.height(382)])
                .presentationDragIndicator(.hidden)
                .h5BottomSheetStyle()
        }
        .animation(.easeInOut(duration: 0.2), value: toast?.id)
    }

    private var topBar: some View {
        HStack(alignment: .center, spacing: UITheme.spacing12) {
            Text("Appointment Details")
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(height: UITheme.navControlSize)
            Spacer()
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: UITheme.navIconSize, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: UITheme.navControlSize, height: UITheme.navControlSize)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
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

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            HStack {
                Text("STATUS")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.65))
                Spacer()
                Text(formattedStatusText(viewModel.appointment.status))
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, UITheme.pillHorizontalPadding)
                    .padding(.vertical, UITheme.pillVerticalPadding - 1)
                    .background(statusColor(viewModel.appointment.status).opacity(0.15))
                    .clipShape(Capsule())
                    .foregroundStyle(statusColor(viewModel.appointment.status))
            }
            Text(resolvedStoreDisplayName)
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.86)
            Text(resolvedServiceName)
                .font(.subheadline)
                .foregroundStyle(Color.white.opacity(0.78))
                .lineLimit(2)
        }
        .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
    }

    private var appointmentInfoCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            androidStyleDetailRow(
                systemImage: "calendar",
                title: "DATE",
                value: AppointmentLocalFormatter.friendlyDate(viewModel.appointment.appointment_date) ?? viewModel.appointment.appointment_date
            )
            androidStyleDetailRow(
                systemImage: "clock",
                title: "TIME",
                value: AppointmentLocalFormatter.friendlyTime(viewModel.appointment.appointment_time) ?? viewModel.appointment.appointment_time
            )
            androidStyleDetailRow(
                systemImage: "person",
                title: "TECHNICIAN",
                value: viewModel.appointment.technician_name?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                    ? (viewModel.appointment.technician_name ?? "Any technician")
                    : "Any technician"
            )
            if let orderNumber = viewModel.appointment.order_number?.trimmingCharacters(in: .whitespacesAndNewlines), !orderNumber.isEmpty {
                androidStyleDetailRow(
                    systemImage: "storefront",
                    title: "ORDER",
                    value: "#\(orderNumber)"
                )
            }
        }
        .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
    }

    @ViewBuilder
    private var locationCard: some View {
        let displayAddress = resolvedDetailStoreAddress
        if viewModel.appointment.store_name != nil || displayAddress != nil {
            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("LOCATION")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.65))
                Text(resolvedStoreDisplayName)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.86)
                if let address = displayAddress {
                    HStack(alignment: .top, spacing: UITheme.spacing8) {
                        Image(systemName: "location.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(brandGold)
                            .padding(.top, UITheme.spacing1)
                        Text(address)
                            .font(.subheadline)
                            .underline()
                            .foregroundStyle(Color.white.opacity(0.78))
                            .multilineTextAlignment(.leading)
                            .lineLimit(nil)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button {
                        presentMapChooser(for: address)
                    } label: {
                        HStack {
                            Spacer(minLength: 0)
                            Text("Open in Maps")
                                .font(.subheadline.weight(.semibold))
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity, minHeight: UITheme.controlHeight)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(.black)
                    .background(brandGold)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                    .contentShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                }
            }
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
        }
    }

    @ViewBuilder
    private var serviceCard: some View {
        if !viewModel.serviceDisplayItems.isEmpty {
            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                sectionHeader(viewModel.serviceDisplayItems.count > 1 ? "SERVICES" : "SERVICE", systemImage: "dollarsign")
                ForEach(Array(viewModel.serviceDisplayItems.enumerated()), id: \.element.id) { index, item in
                    VStack(alignment: .leading, spacing: UITheme.spacing6) {
                        HStack(alignment: .center, spacing: UITheme.spacing8) {
                            Text(item.name)
                                .font(.headline.weight(.semibold))
                                .foregroundStyle(.white)
                                .lineLimit(2)
                            if item.isPrimary && viewModel.serviceDisplayItems.count > 1 {
                                Text("Primary")
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(brandGold)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(brandGold.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            Spacer(minLength: 8)
                            Text(moneyText(item.amount))
                                .font(.headline.weight(.bold))
                                .foregroundStyle(brandGold)
                        }
                        Text(item.durationMinutes.map(durationText) ?? "Duration unavailable")
                            .font(.subheadline)
                            .foregroundStyle(Color.white.opacity(0.72))
                    }

                    if index < viewModel.serviceDisplayItems.count - 1 {
                        Rectangle()
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 1)
                    }
                }
            }
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
        } else if !resolvedServiceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                sectionHeader("SERVICE", systemImage: "dollarsign")
                Text(resolvedServiceName)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                HStack(spacing: UITheme.spacing6) {
                    Text("Amount:")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                    Text(moneyText(resolvedServiceAmount))
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                    Text("•")
                        .foregroundStyle(.secondary)
                    Text(durationText(viewModel.appointment.service_duration))
                        .font(.subheadline)
                        .foregroundStyle(Color.white.opacity(0.72))
                }
            }
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
        }
    }

    private var dateTimeGrid: some View {
        HStack(spacing: UITheme.spacing12) {
            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                sectionHeader("DATE", systemImage: "calendar")
                Text(friendlyWeekDate)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))

            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                sectionHeader("TIME", systemImage: "clock")
                Text(friendlyTime)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
        }
    }

    private var technicianCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            sectionHeader("TECHNICIAN", systemImage: "person")
            Text(viewModel.appointment.technician_name ?? "Any")
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
        }
        .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
    }

    @ViewBuilder
    private var notesCard: some View {
        if let note = viewModel.appointment.notes, !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("NOTES")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.65))
                Text(note)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
        }
    }

    private var cutoffCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing6) {
            sectionHeader("CANCEL/RESCHEDULE CUTOFF", systemImage: "hourglass")
            Text("2 hours before appointment")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)
            Text("Deadline: \(cutoffDisplayText)")
                .font(.footnote)
                .foregroundStyle(.secondary)
            if !isWithinCutoff {
                Text("Cutoff passed. Changes are disabled.")
                    .font(.footnote)
                    .foregroundStyle(.red.opacity(0.9))
            } else {
                Text("You can still reschedule or cancel before the cutoff.")
                    .font(.footnote)
                    .foregroundStyle(Color.white.opacity(0.65))
            }
        }
        .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
    }

    private var metaCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            sectionHeader("ORDER & CREATED", systemImage: "info.circle")
            VStack(alignment: .leading, spacing: UITheme.spacing4) {
                Text("Order")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(orderCode)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
            detailRow("Created At", value: formatDateTime(viewModel.appointment.created_at))
        }
        .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
    }

    @ViewBuilder
    private var cancelReasonCard: some View {
        if let reason = viewModel.appointment.cancel_reason, !reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("CANCEL REASON")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(red: 1.0, green: 138.0 / 255.0, blue: 138.0 / 255.0))
                Text(reason)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .modifier(AppointmentDetailCard(cardBG: cardBG, brandGold: brandGold))
        }
    }

    @ViewBuilder
    private var detailChipsRow: some View {
        let price = viewModel.appointment.service_price
        let duration = viewModel.appointment.service_duration
        if price != nil || duration != nil {
            HStack(spacing: UITheme.spacing8) {
                if let price {
                    detailChip(title: moneyText(price), foreground: brandGold)
                }
                if let duration {
                    detailChip(title: durationText(duration), foreground: Color.white.opacity(0.78))
                }
            }
        }
    }

    private var actionBar: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text(actionMessageText)
                .font(.footnote)
                .foregroundStyle(actionMessageColor)

            HStack(spacing: UITheme.spacing8) {
                Button {
                    showRescheduleSheet = true
                } label: {
                    Text("Reschedule")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: UITheme.ctaHeight)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.black)
                .background(canReschedule ? brandGold : brandGold.opacity(0.32))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .disabled(viewModel.isSubmitting || !canReschedule)

                Button {
                    showCancelSheet = true
                } label: {
                    Text("Cancel")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: UITheme.ctaHeight)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(canCancel ? Color(red: 138.0 / 255.0, green: 46.0 / 255.0, blue: 46.0 / 255.0) : Color.white.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .disabled(viewModel.isSubmitting || !canCancel)
            }

            Button {
                dismiss()
            } label: {
                Text("Close")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: UITheme.ctaHeight)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white)
            .background(Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                    .stroke(Color.white.opacity(0.18), lineWidth: 1)
            )
        }
        .padding(.horizontal, 12)
        .padding(.top, 10)
        .padding(.bottom, 10)
        .background(Color.black.opacity(0.96))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
        }
    }

    private var rescheduleSheet: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing16) {
            HStack {
                Text("Reschedule")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                Spacer()
                Button {
                    showRescheduleSheet = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            Text("Choose a new date and time for this appointment.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            reschedulePickerRow(title: "DATE", systemImage: "calendar") {
                DatePicker("", selection: $viewModel.rescheduleDate, displayedComponents: .date)
                    .labelsHidden()
                    .colorScheme(.dark)
                    .tint(brandGold)
            }

            reschedulePickerRow(title: "TIME", systemImage: "clock") {
                DatePicker("", selection: $viewModel.rescheduleTime, displayedComponents: .hourAndMinute)
                    .labelsHidden()
                    .colorScheme(.dark)
                    .tint(brandGold)
            }

            if !canReschedule {
                HStack(spacing: UITheme.spacing6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                    Text(disabledReasonText)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, UITheme.spacing10)
                .padding(.vertical, UITheme.spacing8)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            }

            VStack(spacing: UITheme.spacing10) {
                Button {
                    Task {
                        await reschedule()
                    }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView()
                            .tint(.black)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: UITheme.ctaHeight + 2)
                    } else {
                        Text("Save Time")
                            .font(.headline.weight(.bold))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: UITheme.ctaHeight + 2)
                    }
                }
                .buttonStyle(.plain)
                .foregroundStyle(.black)
                .background(canReschedule ? brandGold : Color.white.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .disabled(viewModel.isSubmitting || !canReschedule)

                Button("Close") {
                    showRescheduleSheet = false
                }
                .buttonStyle(.plain)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.8))
                .frame(maxWidth: .infinity)
                .frame(minHeight: UITheme.ctaHeight - 2)
                .background(Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                )
            }
        }
        .padding(UITheme.pagePadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.black.ignoresSafeArea())
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    private var cancelSheet: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            HStack {
                Text("Cancel Appointment")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                Spacer()
                Button {
                    showCancelSheet = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: UITheme.navIconSize, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: UITheme.iconControlSize, height: UITheme.iconControlSize)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            Text("Add a reason if needed, then confirm cancellation.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("CANCEL REASON")
                    .font(.caption.weight(.semibold))
                    .kerning(UITheme.sectionHeaderKerning)
                    .foregroundStyle(.secondary)
                ZStack(alignment: .topLeading) {
                    if viewModel.cancelReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Text("Cancel reason (optional)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.top, UITheme.spacing12)
                            .padding(.leading, UITheme.spacing12)
                    }
                    TextEditor(text: $viewModel.cancelReason)
                        .scrollContentBackground(.hidden)
                        .foregroundStyle(.white)
                        .padding(.horizontal, UITheme.spacing8)
                        .padding(.vertical, UITheme.spacing6)
                        .frame(minHeight: 110)
                }
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(brandGold.opacity(0.20), lineWidth: 1)
                )
            }
            .padding(UITheme.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(cardBG)
            .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                    .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
            )

            if !canCancel {
                HStack(spacing: UITheme.spacing6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                    Text(disabledReasonText)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, UITheme.spacing10)
                .padding(.vertical, UITheme.spacing8)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            }

            VStack(spacing: UITheme.spacing10) {
                Button {
                    Task {
                        await cancel()
                    }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: UITheme.ctaHeight + 2)
                    } else {
                        Text("Cancel Booking")
                            .font(.headline.weight(.bold))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: UITheme.ctaHeight + 2)
                    }
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(canCancel ? Color.red.opacity(0.9) : Color.white.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .disabled(viewModel.isSubmitting || !canCancel)

                Button("Close") {
                    showCancelSheet = false
                }
                .buttonStyle(.plain)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.8))
                .frame(maxWidth: .infinity)
                .frame(minHeight: UITheme.ctaHeight - 2)
                .background(Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                )
            }
        }
        .padding(UITheme.pagePadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.black.ignoresSafeArea())
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    @ViewBuilder
    private func reschedulePickerRow<Content: View>(
        title: String,
        systemImage: String,
        @ViewBuilder picker: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            HStack(spacing: UITheme.spacing8) {
                Image(systemName: systemImage)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(brandGold)
                Text(title)
                    .font(.caption.weight(.semibold))
                    .kerning(UITheme.sectionHeaderKerning)
                    .foregroundStyle(.secondary)
            }
            HStack {
                picker()
                Spacer(minLength: 0)
            }
            .padding(.horizontal, UITheme.spacing12)
            .frame(minHeight: UITheme.controlHeight)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                    .stroke(brandGold.opacity(0.22), lineWidth: 1)
            )
        }
        .padding(UITheme.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.cardCornerRadius)
                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func detailRow(_ title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
                .multilineTextAlignment(.trailing)
        }
    }

    private func sectionHeader(_ text: String, systemImage: String) -> some View {
        HStack(spacing: UITheme.spacing8) {
            Image(systemName: systemImage)
                .font(.caption.weight(.bold))
                .foregroundStyle(brandGold)
            Text(text)
                .font(.caption.weight(.semibold))
                .kerning(UITheme.sectionHeaderKerning)
                .foregroundStyle(.secondary)
        }
    }

    private func reloadDetail() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
        onChanged(viewModel.appointment)
    }

    private func cancel() async {
        guard let token = appState.requireAccessToken() else { return }
        if let updated = await viewModel.cancel(token: token) {
            showCancelSheet = false
            onChanged(updated)
        }
    }

    private func reschedule() async {
        guard let token = appState.requireAccessToken() else { return }
        if let updated = await viewModel.reschedule(token: token) {
            showRescheduleSheet = false
            onChanged(updated)
        }
    }

    private func showToast(message: String, isError: Bool) {
        let payload = ToastPayload(message: message, isError: isError)
        toast = payload
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            if toast?.id == payload.id {
                toast = nil
            }
        }
    }

    private var currentStatus: String {
        viewModel.appointment.status.lowercased()
    }

    private var orderCode: String {
        viewModel.appointment.order_number ?? "ORD-\(viewModel.appointment.id)"
    }

    private var friendlyWeekDate: String {
        guard let date = appointmentDateTime else {
            return AppointmentLocalFormatter.friendlyDate(viewModel.appointment.appointment_date) ?? viewModel.appointment.appointment_date
        }
        return Self.weekDateFormatter.string(from: date)
    }

    private var friendlyTime: String {
        AppointmentLocalFormatter.friendlyTime(viewModel.appointment.appointment_time) ?? viewModel.appointment.appointment_time
    }

    private var appointmentDateTime: Date? {
        let dateParts = viewModel.appointment.appointment_date.split(separator: "-").compactMap { Int($0) }
        guard dateParts.count == 3 else { return nil }
        let timeParts = viewModel.appointment.appointment_time.split(separator: ":").compactMap { Int($0) }
        guard !timeParts.isEmpty else { return nil }
        var components = DateComponents()
        components.year = dateParts[0]
        components.month = dateParts[1]
        components.day = dateParts[2]
        components.hour = timeParts[0]
        components.minute = timeParts.count > 1 ? timeParts[1] : 0
        components.second = timeParts.count > 2 ? timeParts[2] : 0
        return Self.etCalendar.date(from: components)
    }

    private static let etTimeZone = TimeZone.autoupdatingCurrent
    private static var etCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = etTimeZone
        return calendar
    }

    private var cutoffDateTime: Date? {
        appointmentDateTime?.addingTimeInterval(-2 * 60 * 60)
    }

    private var cutoffDisplayText: String {
        guard let cutoffDateTime else { return "-" }
        return Self.cutoffFormatter.string(from: cutoffDateTime)
    }

    private var isWithinCutoff: Bool {
        guard let cutoffDateTime else { return true }
        return Date() < cutoffDateTime
    }

    private var canCancelByStatus: Bool {
        currentStatus != "cancelled" && currentStatus != "completed"
    }

    private var canRescheduleByStatus: Bool {
        currentStatus != "cancelled" && currentStatus != "completed"
    }

    private var canCancel: Bool { canCancelByStatus }

    private var canReschedule: Bool { canRescheduleByStatus }

    private var resolvedStoreDisplayName: String {
        let trimmed = viewModel.appointment.store_name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "Store" : trimmed
    }

    private var resolvedServiceName: String {
        let raw = viewModel.appointment.service_name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !raw.isEmpty { return raw }
        return "Service"
    }

    private var resolvedServiceAmount: Double? {
        viewModel.appointment.order_amount ?? viewModel.appointment.service_price
    }

    private var resolvedDetailStoreAddress: String? {
        let resolved = viewModel.resolvedStoreAddress?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !resolved.isEmpty {
            return resolved
        }
        let fallback = viewModel.appointment.store_address?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return fallback.isEmpty ? nil : fallback
    }

    private var disabledReasonText: String {
        switch currentStatus {
        case "completed":
            return "Completed appointments can't be changed."
        case "cancelled":
            return "This appointment is already cancelled."
        default:
            return "This appointment cannot be changed."
        }
    }

    private var actionMessageText: String {
        canReschedule && canCancel
            ? "You can still reschedule or cancel before the cutoff."
            : disabledReasonText
    }

    private var actionMessageColor: Color {
        canReschedule && canCancel
            ? Color.white.opacity(0.65)
            : Color(red: 1.0, green: 138.0 / 255.0, blue: 138.0 / 255.0)
    }

    private func moneyText(_ value: Double?) -> String {
        guard let value else { return "-" }
        return "$\(String(format: "%.2f", value))"
    }

    private func durationText(_ minutes: Int?) -> String {
        guard let minutes else { return "-" }
        return "\(minutes) min"
    }

    private func formatDateTime(_ raw: String?) -> String {
        guard let raw, !raw.isEmpty else { return "-" }
        if let date = AppointmentDetailDateFormatter.parse(raw) {
            return AppointmentDetailDateFormatter.outputFormatter.string(from: date)
        }
        return raw
    }

    private func statusColor(_ raw: String) -> Color {
        switch raw.lowercased() {
        case "pending":
            return Color(red: 1.0, green: 193.0 / 255.0, blue: 7.0 / 255.0)
        case "confirmed":
            return Color(red: 76.0 / 255.0, green: 175.0 / 255.0, blue: 80.0 / 255.0)
        case "completed":
            return Color(red: 66.0 / 255.0, green: 165.0 / 255.0, blue: 245.0 / 255.0)
        case "cancelled":
            return Color(red: 239.0 / 255.0, green: 83.0 / 255.0, blue: 80.0 / 255.0)
        case "expired":
            return Color(red: 158.0 / 255.0, green: 158.0 / 255.0, blue: 158.0 / 255.0)
        default:
            return Color(red: 1.0, green: 152.0 / 255.0, blue: 0.0)
        }
    }

    private func androidStyleDetailRow(systemImage: String, title: String, value: String) -> some View {
        HStack(alignment: .center, spacing: UITheme.spacing8) {
            Image(systemName: systemImage)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(brandGold)
                .frame(width: 18)
            Text("\(title):")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Color.white.opacity(0.65))
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(2)
            Spacer(minLength: 0)
        }
    }

    private func detailChip(title: String, foreground: Color) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(foreground)
            .padding(.horizontal, UITheme.spacing10)
            .padding(.vertical, UITheme.spacing6)
            .background(Color.white.opacity(0.04))
            .clipShape(Capsule())
    }

    private func formattedStatusText(_ raw: String) -> String {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let first = value.first else { return raw }
        return String(first).uppercased() + value.dropFirst().lowercased()
    }

    private func mapsURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "https://www.google.com/maps/search/?api=1&query=\(encoded)")
    }

    private func appleMapsURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "http://maps.apple.com/?q=\(encoded)")
    }

    private func googleMapsAppURL(_ address: String) -> URL? {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "comgooglemaps://?q=\(encoded)")
    }

    private func presentMapChooser(for address: String) {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        mapChooserAddress = trimmed
        showMapAppChooser = true
    }

    private func openAppleMaps() {
        guard let url = appleMapsURL(mapChooserAddress) else { return }
        openURL(url)
    }

    private func openGoogleMaps() {
        if let appURL = googleMapsAppURL(mapChooserAddress), UIApplication.shared.canOpenURL(appURL) {
            openURL(appURL)
            return
        }
        guard let webURL = mapsURL(mapChooserAddress) else { return }
        openURL(webURL)
    }

    private var mapChooserSheet: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(Color.white.opacity(0.9))
                .frame(width: 68, height: 8)
                .padding(.top, UITheme.spacing12)

            Text("Open in Maps")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing16)

            VStack(spacing: UITheme.spacing10) {
                mapChooserButton(
                    title: "Google Maps",
                    icon: "map.fill",
                    tint: Color(red: 66.0 / 255.0, green: 133.0 / 255.0, blue: 244.0 / 255.0)
                ) {
                    showMapAppChooser = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                        openGoogleMaps()
                    }
                }

                mapChooserButton(
                    title: "Apple Maps",
                    icon: "location.fill",
                    tint: brandGold
                ) {
                    showMapAppChooser = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                        openAppleMaps()
                    }
                }
            }
            .padding(.horizontal, UITheme.pagePadding)

            Button {
                showMapAppChooser = false
            } label: {
                Text("Cancel")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.72))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
            }
            .buttonStyle(.plain)
            .padding(.top, UITheme.spacing12)
            .padding(.horizontal, UITheme.pagePadding)
        }
        .padding(.bottom, UITheme.spacing20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color(red: 18.0 / 255.0, green: 18.0 / 255.0, blue: 18.0 / 255.0))
    }

    private func mapChooserButton(
        title: String,
        icon: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: UITheme.spacing12) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.06))
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(tint)
                }
                .frame(width: 42, height: 42)

                Text(title)
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(.white)

                Spacer()

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.44))
            }
            .padding(.horizontal, UITheme.spacing14)
            .frame(maxWidth: .infinity)
            .frame(height: 66)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private static let weekDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "EEE, MMM d"
        return formatter
    }()

    private static let cutoffFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "MMM d 'at' h:mm a"
        return formatter
    }()
}

private extension View {
    @ViewBuilder
    func h5BottomSheetStyle() -> some View {
        if #available(iOS 16.4, *) {
            self
                .presentationCornerRadius(26)
                .presentationBackground(Color.black)
        } else {
            self
        }
    }
}

private enum AppointmentDetailDateFormatter {
    private static let etTimeZone = TimeZone.autoupdatingCurrent
    private static let utcTimeZone = TimeZone(secondsFromGMT: 0)!

    private static let iso8601FractionalParser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let iso8601Parser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let outputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "M/d/yyyy, h:mm:ss a 'ET'"
        return formatter
    }()

    static func parse(_ raw: String) -> Date? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if let date = iso8601FractionalParser.date(from: trimmed) {
            return date
        }
        if let date = iso8601Parser.date(from: trimmed) {
            return date
        }
        if !hasTimezoneInfo(trimmed) {
            let normalizedISO = trimmed.contains("T") ? "\(trimmed)Z" : trimmed.replacingOccurrences(of: " ", with: "T") + "Z"
            if let date = iso8601FractionalParser.date(from: normalizedISO) {
                return date
            }
            if let date = iso8601Parser.date(from: normalizedISO) {
                return date
            }
        }
        return parseNaiveUTC(trimmed)
    }

    private static func hasTimezoneInfo(_ value: String) -> Bool {
        value.hasSuffix("Z") || value.hasSuffix("z") || value.range(of: #"[+-]\d{2}:\d{2}$"#, options: .regularExpression) != nil
    }

    private static func parseNaiveUTC(_ raw: String) -> Date? {
        let formats = [
            "yyyy-MM-dd HH:mm:ss.SSSSSS",
            "yyyy-MM-dd HH:mm:ss.SSS",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        ]
        for format in formats {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = utcTimeZone
            formatter.dateFormat = format
            if let date = formatter.date(from: raw) {
                return date
            }
        }
        return nil
    }
}

private struct AppointmentDetailCard: ViewModifier {
    let cardBG: Color
    let brandGold: Color

    func body(content: Content) -> some View {
        content
            .padding(UITheme.spacing16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                LinearGradient(
                    colors: [cardBG, Color.white.opacity(0.01)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.panelCornerRadius)
                    .stroke(brandGold.opacity(0.22), lineWidth: 1)
            )
    }
}

private struct CardTapButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.985 : 1.0)
            .opacity(configuration.isPressed ? 0.93 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

private enum AppointmentSegment: CaseIterable {
    case upcoming
    case past

    var title: String {
        switch self {
        case .upcoming:
            return "Upcoming"
        case .past:
            return "Past"
        }
    }
}

private enum AppointmentLocalFormatter {
    private static let etTimeZone = TimeZone.autoupdatingCurrent

    private static let inputDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let outputDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }()

    private static let inputTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

    private static let inputTimeMinuteFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private static let outputTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = etTimeZone
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    static func friendlyDate(_ raw: String) -> String? {
        guard let value = inputDateFormatter.date(from: raw) else { return nil }
        return outputDateFormatter.string(from: value)
    }

    static func friendlyTime(_ raw: String) -> String? {
        if let value = inputTimeFormatter.date(from: raw) {
            return outputTimeFormatter.string(from: value)
        }
        guard let value = inputTimeMinuteFormatter.date(from: raw) else { return nil }
        return outputTimeFormatter.string(from: value)
    }
}

private struct ToastPayload: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let isError: Bool
}

private struct ToastView: View {
    let payload: ToastPayload

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

#Preview {
    NavigationStack {
        MyAppointmentsView()
            .environmentObject(AppState())
    }
}
