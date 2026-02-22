import Foundation

@MainActor
final class BookAppointmentViewModel: ObservableObject {
    @Published var services: [ServiceDTO] = []
    @Published var technicians: [TechnicianDTO] = []
    @Published var selectedServiceID: Int?
    @Published var selectedTechnicianID: Int?
    @Published var selectedDate: Date = .now
    @Published var selectedTime: Date = .now
    @Published var availableSlots: [String] = []
    @Published var selectedSlot: String?
    @Published var notes: String = ""
    @Published var isLoading: Bool = false
    @Published var isSubmitting: Bool = false
    @Published var isLoadingSlots: Bool = false
    @Published var errorMessage: String?
    @Published var slotHintMessage: String?
    @Published var successMessage: String?

    private let service: AppointmentsServiceProtocol
    let storeID: Int

    init(storeID: Int, service: AppointmentsServiceProtocol = AppointmentsService()) {
        self.storeID = storeID
        self.service = service
    }

    func loadData() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let servicesTask = service.getStoreServices(storeID: storeID)
            async let techTask = service.getStoreTechnicians(storeID: storeID)
            let loadedServices = try await servicesTask.filter { $0.is_active == 1 }
            let loadedTechs = try await techTask.filter { $0.is_active == 1 }
            services = loadedServices
            technicians = loadedTechs
            if selectedServiceID == nil {
                selectedServiceID = loadedServices.first?.id
            }
            await reloadAvailableSlots()
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func submit(token: String) async -> Bool {
        guard let serviceID = selectedServiceID else {
            errorMessage = "Please select a service."
            return false
        }
        guard let slot = selectedSlot ?? availableSlots.first else {
            slotHintMessage = "No available times for this date."
            errorMessage = "No available times for this date."
            return false
        }
        let selectedDateTime = slotToDate(slot)
        if selectedDateTime <= Date() {
            slotHintMessage = "Past time cannot be booked. Please choose a future time."
            errorMessage = "Past time cannot be booked. Please choose a future time."
            return false
        }

        isSubmitting = true
        defer { isSubmitting = false }

        let request = AppointmentCreateRequest(
            store_id: storeID,
            service_id: serviceID,
            technician_id: selectedTechnicianID,
            appointment_date: Self.dateFormatter.string(from: selectedDate),
            appointment_time: slotToRequestTime(slot),
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes
        )

        do {
            let created = try await service.createAppointment(token: token, request: request)
            successMessage = "Appointment created: #\(created.order_number ?? String(created.id))"
            errorMessage = nil
            slotHintMessage = nil
            return true
        } catch let err as APIError {
            successMessage = nil
            errorMessage = mapError(err)
            slotHintMessage = slotHint(from: errorMessage)
            return false
        } catch {
            successMessage = nil
            errorMessage = error.localizedDescription
            slotHintMessage = slotHint(from: errorMessage)
            return false
        }
    }

    func reloadAvailableSlots() async {
        guard let serviceID = selectedServiceID else {
            availableSlots = []
            selectedSlot = nil
            return
        }

        let dateText = Self.dateFormatter.string(from: selectedDate)
        isLoadingSlots = true
        defer { isLoadingSlots = false }
        slotHintMessage = nil

        do {
            let slotRows: [TechnicianAvailableSlotDTO]
            if let technicianID = selectedTechnicianID {
                slotRows = try await service.getTechnicianAvailableSlots(
                    technicianID: technicianID,
                    date: dateText,
                    serviceID: serviceID
                )
            } else {
                let activeTechIDs = technicians.filter { $0.is_active == 1 }.map { $0.id }
                if activeTechIDs.isEmpty {
                    availableSlots = []
                    selectedSlot = nil
                    slotHintMessage = "No available technicians for this store."
                    return
                }
                var mergedSet = Set<TechnicianAvailableSlotDTO>()
                try await withThrowingTaskGroup(of: [TechnicianAvailableSlotDTO].self) { group in
                    for id in activeTechIDs {
                        group.addTask {
                            try await self.service.getTechnicianAvailableSlots(
                                technicianID: id,
                                date: dateText,
                                serviceID: serviceID
                            )
                        }
                    }
                    for try await rows in group {
                        for row in rows {
                            mergedSet.insert(row)
                        }
                    }
                }
                slotRows = Array(mergedSet)
            }

            let normalized = normalizeSlots(slotRows.map(\.start_time))
            availableSlots = filterPastSlots(normalized)
            if let current = selectedSlot, availableSlots.contains(current) {
                // keep current
            } else {
                selectedSlot = availableSlots.first
            }
            if let slot = selectedSlot {
                selectedTime = slotToDate(slot)
            }
            if !availableSlots.isEmpty {
                errorMessage = nil
                slotHintMessage = nil
            } else {
                slotHintMessage = "No available times for this date."
            }
        } catch let err as APIError {
            availableSlots = []
            selectedSlot = nil
            errorMessage = mapError(err)
            slotHintMessage = slotHint(from: errorMessage)
        } catch {
            availableSlots = []
            selectedSlot = nil
            errorMessage = error.localizedDescription
            slotHintMessage = slotHint(from: errorMessage)
        }
    }

    func selectSlot(_ slot: String) {
        selectedSlot = slot
        selectedTime = slotToDate(slot)
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .invalidURL:
            return "Invalid API URL"
        case .decoding:
            return "Unexpected response format"
        }
    }

    private func slotHint(from message: String?) -> String? {
        guard let message, !message.isEmpty else { return nil }
        let normalized = message.lowercased()
        if normalized.contains("blocked") {
            return "This time slot is blocked by the store. Please choose another time."
        }
        if normalized.contains("past") || normalized.contains("future time") {
            return "Past time cannot be booked. Please choose a future time."
        }
        if normalized.contains("not available") || normalized.contains("no available") {
            return "No available times for this date."
        }
        return nil
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm:ss"
        return f
    }()

    private static let slotFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm"
        return f
    }()

    private static let slotDisplayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale.current
        f.dateFormat = "h:mm a"
        return f
    }()

    func displayTime(_ slot: String) -> String {
        guard let date = Self.slotFormatter.date(from: slot) else { return slot }
        return Self.slotDisplayFormatter.string(from: date)
    }

    private func normalizeSlots(_ raw: [String]) -> [String] {
        let set = Set(raw.compactMap { value -> String? in
            if Self.slotFormatter.date(from: value) != nil {
                return value
            }
            if value.count == 8, value.hasSuffix(":00") {
                let hhmm = String(value.prefix(5))
                if Self.slotFormatter.date(from: hhmm) != nil {
                    return hhmm
                }
            }
            return nil
        })
        return set.sorted(by: { lhs, rhs in
            guard
                let left = Self.slotFormatter.date(from: lhs),
                let right = Self.slotFormatter.date(from: rhs)
            else { return lhs < rhs }
            return left < right
        })
    }

    private func filterPastSlots(_ slots: [String]) -> [String] {
        let calendar = Calendar.current
        let now = Date()
        if !calendar.isDate(selectedDate, inSameDayAs: now) {
            return slots
        }
        return slots.filter { slot in
            let slotDate = slotToDate(slot)
            return slotDate > now
        }
    }

    private func slotToDate(_ slot: String) -> Date {
        guard let timeOnly = Self.slotFormatter.date(from: slot) else { return selectedDate }
        let calendar = Calendar.current
        let datePart = calendar.dateComponents([.year, .month, .day], from: selectedDate)
        let timePart = calendar.dateComponents([.hour, .minute], from: timeOnly)
        var merged = DateComponents()
        merged.year = datePart.year
        merged.month = datePart.month
        merged.day = datePart.day
        merged.hour = timePart.hour
        merged.minute = timePart.minute
        merged.second = 0
        return calendar.date(from: merged) ?? selectedDate
    }

    private func slotToRequestTime(_ slot: String) -> String {
        if slot.count == 5 {
            return "\(slot):00"
        }
        return slot
    }
}

@MainActor
final class MyAppointmentsViewModel: ObservableObject {
    @Published var items: [AppointmentDTO] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let service: AppointmentsServiceProtocol

    init(service: AppointmentsServiceProtocol = AppointmentsService()) {
        self.service = service
    }

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            items = try await service.getMyAppointments(token: token, limit: 100)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func replace(_ appointment: AppointmentDTO) {
        guard let idx = items.firstIndex(where: { $0.id == appointment.id }) else {
            return
        }
        let old = items[idx]
        items[idx] = AppointmentDTO(
            id: appointment.id,
            order_number: appointment.order_number ?? old.order_number,
            store_id: appointment.store_id,
            service_id: appointment.service_id,
            technician_id: appointment.technician_id,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: appointment.status,
            notes: appointment.notes,
            store_name: old.store_name,
            store_address: old.store_address,
            service_name: old.service_name,
            service_price: old.service_price,
            service_duration: old.service_duration,
            technician_name: old.technician_name,
            created_at: appointment.created_at ?? old.created_at,
            cancel_reason: appointment.cancel_reason
        )
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .invalidURL:
            return "Invalid API URL"
        case .decoding:
            return "Unexpected response format"
        }
    }
}

@MainActor
final class AppointmentDetailViewModel: ObservableObject {
    @Published var appointment: AppointmentDTO
    @Published var isLoading = false
    @Published var isSubmitting = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    @Published var cancelReason: String = ""
    @Published var rescheduleDate: Date = .now
    @Published var rescheduleTime: Date = .now

    private let service: AppointmentsServiceProtocol

    init(appointment: AppointmentDTO, service: AppointmentsServiceProtocol = AppointmentsService()) {
        self.appointment = appointment
        self.service = service
        let parsedDate = Self.dateFormatter.date(from: appointment.appointment_date) ?? .now
        let parsedTime = Self.timeFormatter.date(from: appointment.appointment_time) ?? .now
        rescheduleDate = parsedDate
        rescheduleTime = parsedTime
    }

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            appointment = try await service.getAppointment(token: token, appointmentID: appointment.id)
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func cancel(token: String) async -> AppointmentDTO? {
        guard appointment.status.lowercased() != "cancelled" else {
            errorMessage = "Appointment is already cancelled"
            return nil
        }
        guard appointment.status.lowercased() != "completed" else {
            errorMessage = "Cannot cancel a completed appointment"
            return nil
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let reason = cancelReason.trimmingCharacters(in: .whitespacesAndNewlines)
            let updated = try await service.cancelAppointment(
                token: token,
                appointmentID: appointment.id,
                reason: reason.isEmpty ? nil : reason
            )
            appointment = updated
            successMessage = "Appointment cancelled"
            errorMessage = nil
            return updated
        } catch let err as APIError {
            errorMessage = mapError(err)
            successMessage = nil
            return nil
        } catch {
            errorMessage = error.localizedDescription
            successMessage = nil
            return nil
        }
    }

    func reschedule(token: String) async -> AppointmentDTO? {
        guard appointment.status.lowercased() != "cancelled" else {
            errorMessage = "Cannot reschedule a cancelled appointment"
            return nil
        }
        guard appointment.status.lowercased() != "completed" else {
            errorMessage = "Cannot reschedule a completed appointment"
            return nil
        }
        let nextDateTime = Self.combineDateAndTime(date: rescheduleDate, time: rescheduleTime)
        if nextDateTime <= Date() {
            errorMessage = "Please choose a future date and time."
            return nil
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let updated = try await service.rescheduleAppointment(
                token: token,
                appointmentID: appointment.id,
                newDate: Self.dateFormatter.string(from: rescheduleDate),
                newTime: Self.timeFormatter.string(from: rescheduleTime)
            )
            appointment = updated
            successMessage = "Appointment rescheduled"
            errorMessage = nil
            return updated
        } catch let err as APIError {
            errorMessage = mapError(err)
            successMessage = nil
            return nil
        } catch {
            errorMessage = error.localizedDescription
            successMessage = nil
            return nil
        }
    }

    private func mapError(_ error: APIError) -> String {
        switch error {
        case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
            return detail
        case .unauthorized:
            return AppState.sessionExpiredMessage
        case .invalidURL:
            return "Invalid API URL"
        case .decoding:
            return "Unexpected response format"
        }
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm:ss"
        return f
    }()

    private static func combineDateAndTime(date: Date, time: Date) -> Date {
        let calendar = Calendar.current
        let dateParts = calendar.dateComponents([.year, .month, .day], from: date)
        let timeParts = calendar.dateComponents([.hour, .minute, .second], from: time)
        var merged = DateComponents()
        merged.year = dateParts.year
        merged.month = dateParts.month
        merged.day = dateParts.day
        merged.hour = timeParts.hour
        merged.minute = timeParts.minute
        merged.second = timeParts.second
        return calendar.date(from: merged) ?? date
    }
}
