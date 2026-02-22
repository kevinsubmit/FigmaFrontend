import SwiftUI

struct MyAppointmentsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = MyAppointmentsViewModel()
    @State private var selectedSegment: AppointmentSegment = .upcoming

    var body: some View {
        List {
            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }

            Section {
                Picker("Filter", selection: $selectedSegment) {
                    ForEach(AppointmentSegment.allCases, id: \.self) { segment in
                        Text(segment.title).tag(segment)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section(selectedSegment.sectionTitle) {
                ForEach(filteredItems) { item in
                    NavigationLink {
                        AppointmentDetailView(appointment: item) { updated in
                            viewModel.replace(updated)
                        }
                        .environmentObject(appState)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.store_name ?? "Store #\(item.store_id)")
                                .font(.headline)
                            Text(item.service_name ?? "Service #\(item.service_id)")
                                .font(.subheadline)
                            Text("\(formattedDate(item.appointment_date)) \(formattedTime(item.appointment_time))")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            HStack {
                                Text(statusText(item.status))
                                    .font(.caption.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(statusColor(item.status).opacity(0.12))
                                    .clipShape(Capsule())
                                    .foregroundStyle(statusColor(item.status))
                                if let order = item.order_number {
                                    Text("#\(order)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                if !viewModel.isLoading && filteredItems.isEmpty {
                    Text("No appointments yet")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("My Appointments")
        .task {
            await reload()
        }
        .refreshable {
            await reload()
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading...")
                    .padding(16)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func reload() async {
        guard let token = appState.requireAccessToken() else { return }
        await viewModel.load(token: token)
    }

    private func formattedDate(_ date: String) -> String {
        AppointmentLocalFormatter.friendlyDate(date) ?? date
    }

    private func formattedTime(_ time: String) -> String {
        AppointmentLocalFormatter.friendlyTime(time) ?? time
    }

    private var filteredItems: [AppointmentDTO] {
        switch selectedSegment {
        case .upcoming:
            return viewModel.items.filter { !isCompleted($0) && !isCancelled($0) }
        case .completed:
            return viewModel.items.filter { isCompleted($0) }
        case .cancelled:
            return viewModel.items.filter { isCancelled($0) }
        }
    }

    private func isCompleted(_ item: AppointmentDTO) -> Bool {
        item.status.lowercased() == "completed"
    }

    private func isCancelled(_ item: AppointmentDTO) -> Bool {
        item.status.lowercased() == "cancelled"
    }

    private func statusText(_ raw: String) -> String {
        raw.uppercased()
    }

    private func statusColor(_ raw: String) -> Color {
        switch raw.lowercased() {
        case "completed":
            return .green
        case "cancelled":
            return .red
        case "confirmed":
            return .blue
        default:
            return .orange
        }
    }
}

private struct AppointmentDetailView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: AppointmentDetailViewModel
    @State private var toast: ToastPayload?
    let onChanged: (AppointmentDTO) -> Void

    init(appointment: AppointmentDTO, onChanged: @escaping (AppointmentDTO) -> Void) {
        _viewModel = StateObject(wrappedValue: AppointmentDetailViewModel(appointment: appointment))
        self.onChanged = onChanged
    }

    var body: some View {
        Form {
            Section("Appointment") {
                detailRow("Order", value: viewModel.appointment.order_number ?? "#\(viewModel.appointment.id)")
                detailRow("Status", value: viewModel.appointment.status)
                detailRow("Store", value: viewModel.appointment.store_name ?? "Store #\(viewModel.appointment.store_id)")
                detailRow("Address", value: viewModel.appointment.store_address ?? "-")
                detailRow("Service", value: viewModel.appointment.service_name ?? "Service #\(viewModel.appointment.service_id)")
                detailRow("Amount", value: moneyText(viewModel.appointment.service_price))
                detailRow("Duration", value: durationText(viewModel.appointment.service_duration))
                detailRow("Technician", value: viewModel.appointment.technician_name ?? "Any")
                detailRow("Date", value: AppointmentLocalFormatter.friendlyDate(viewModel.appointment.appointment_date) ?? viewModel.appointment.appointment_date)
                detailRow("Time", value: AppointmentLocalFormatter.friendlyTime(viewModel.appointment.appointment_time) ?? viewModel.appointment.appointment_time)
                detailRow("Created At", value: formatDateTime(viewModel.appointment.created_at))
                if let reason = viewModel.appointment.cancel_reason, !reason.isEmpty {
                    detailRow("Cancel Reason", value: reason)
                }
                if let note = viewModel.appointment.notes, !note.isEmpty {
                    detailRow("Notes", value: note)
                }
            }

            Section("Reschedule") {
                DatePicker("Date", selection: $viewModel.rescheduleDate, displayedComponents: .date)
                DatePicker("Time", selection: $viewModel.rescheduleTime, displayedComponents: .hourAndMinute)
                Button {
                    Task {
                        await reschedule()
                    }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Reschedule")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(viewModel.isSubmitting || !canReschedule)
                if !canReschedule {
                    Text(disabledReasonText)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Cancel") {
                TextField("Cancel reason (optional)", text: $viewModel.cancelReason, axis: .vertical)
                    .lineLimit(2...4)
                Button(role: .destructive) {
                    Task {
                        await cancel()
                    }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Cancel Appointment")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(viewModel.isSubmitting || !canCancel)
                if !canCancel {
                    Text(disabledReasonText)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Appointment Detail")
        .navigationBarTitleDisplayMode(.inline)
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
                    .padding(16)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .overlay(alignment: .top) {
            if let toast {
                ToastView(payload: toast)
                    .padding(.top, 8)
                    .padding(.horizontal, 16)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: toast?.id)
    }

    @ViewBuilder
    private func detailRow(_ title: String, value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.trailing)
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
            onChanged(updated)
        }
    }

    private func reschedule() async {
        guard let token = appState.requireAccessToken() else { return }
        if let updated = await viewModel.reschedule(token: token) {
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

    private var canCancel: Bool {
        currentStatus != "cancelled" && currentStatus != "completed"
    }

    private var canReschedule: Bool {
        currentStatus != "cancelled" && currentStatus != "completed"
    }

    private var disabledReasonText: String {
        switch currentStatus {
        case "completed":
            return "Completed appointments cannot be changed."
        case "cancelled":
            return "Cancelled appointments cannot be changed."
        default:
            return "This appointment cannot be changed."
        }
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
        let parser = ISO8601DateFormatter()
        if let date = parser.date(from: raw) {
            let formatter = DateFormatter()
            formatter.locale = Locale.current
            formatter.dateStyle = .medium
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return raw
    }
}

private enum AppointmentSegment: CaseIterable {
    case upcoming
    case completed
    case cancelled

    var title: String {
        switch self {
        case .upcoming:
            return "Upcoming"
        case .completed:
            return "Completed"
        case .cancelled:
            return "Cancelled"
        }
    }

    var sectionTitle: String {
        switch self {
        case .upcoming:
            return "Upcoming Appointments"
        case .completed:
            return "Completed Appointments"
        case .cancelled:
            return "Cancelled Appointments"
        }
    }
}

private enum AppointmentLocalFormatter {
    private static let inputDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let outputDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }()

    private static let inputTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

    private static let outputTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    static func friendlyDate(_ raw: String) -> String? {
        guard let value = inputDateFormatter.date(from: raw) else { return nil }
        return outputDateFormatter.string(from: value)
    }

    static func friendlyTime(_ raw: String) -> String? {
        guard let value = inputTimeFormatter.date(from: raw) else { return nil }
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
        HStack(spacing: 10) {
            Image(systemName: payload.isError ? "xmark.circle.fill" : "checkmark.circle.fill")
                .foregroundStyle(.white)
            Text(payload.message)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(2)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .frame(maxWidth: .infinity)
        .background(payload.isError ? Color.red.opacity(0.9) : Color.green.opacity(0.9))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 8, y: 3)
    }
}

#Preview {
    NavigationStack {
        MyAppointmentsView()
            .environmentObject(AppState())
    }
}
