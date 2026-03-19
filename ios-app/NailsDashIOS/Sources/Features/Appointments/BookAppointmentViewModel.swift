import Foundation

@MainActor
final class BookAppointmentViewModel: ObservableObject {
    private static let salonClosedHintMessage = "The salon is closed on this date."

    @Published var storeDetail: StoreDetailDTO?
    @Published var services: [ServiceDTO] = []
    @Published var storeHours: [StoreHourDTO] = []
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
    private var slotsRequestToken: Int = 0
    var activeTimeZone: TimeZone {
        TimeZoneResolver.resolve(storeIdentifier: storeDetail?.time_zone)
    }

    init(storeID: Int, service: AppointmentsServiceProtocol = AppointmentsService()) {
        self.storeID = storeID
        self.service = service
    }

    func loadData() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let storeTask = service.getStoreDetail(storeID: storeID)
            async let servicesTask = service.getStoreServices(storeID: storeID)
            async let techTask = service.getStoreTechnicians(storeID: storeID)
            async let hoursTask = service.getStoreHours(storeID: storeID)
            storeDetail = try await storeTask
            let loadedServices = try await servicesTask.filter { $0.is_active == 1 }
            let loadedTechs = try await techTask.filter { $0.is_active == 1 }
            storeHours = (try? await hoursTask) ?? []
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
        successMessage = nil
        errorMessage = nil
        guard let serviceID = selectedServiceID else {
            errorMessage = "Please select a service."
            return false
        }
        guard let slot = selectedSlot ?? availableSlots.first else {
            if isStoreClosed(on: selectedDate) {
                slotHintMessage = Self.salonClosedHintMessage
                errorMessage = Self.salonClosedHintMessage
            } else {
                slotHintMessage = "No available times for this date."
                errorMessage = "No available times for this date."
            }
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
            appointment_date: formatDate(selectedDate),
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

    func submitGroup(token: String, guestServiceIDs: [Int]) async -> Bool {
        successMessage = nil
        errorMessage = nil
        guard let hostServiceID = selectedServiceID else {
            errorMessage = "Please select a service."
            return false
        }
        guard !guestServiceIDs.isEmpty else {
            errorMessage = "Please add at least one guest service for group booking."
            return false
        }
        guard let slot = selectedSlot ?? availableSlots.first else {
            if isStoreClosed(on: selectedDate) {
                slotHintMessage = Self.salonClosedHintMessage
                errorMessage = Self.salonClosedHintMessage
            } else {
                slotHintMessage = "No available times for this date."
                errorMessage = "No available times for this date."
            }
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

        let hostNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes
        let guests = guestServiceIDs.map { serviceID in
            AppointmentGroupGuestCreateRequest(
                service_id: serviceID,
                technician_id: nil,
                notes: nil,
                guest_name: nil,
                guest_phone: nil
            )
        }
        let request = AppointmentGroupCreateRequest(
            store_id: storeID,
            appointment_date: formatDate(selectedDate),
            appointment_time: slotToRequestTime(slot),
            host_service_id: hostServiceID,
            host_technician_id: selectedTechnicianID,
            host_notes: hostNotes,
            guests: guests
        )

        do {
            let createdGroup = try await service.createAppointmentGroup(token: token, request: request)
            let host = createdGroup.host_appointment
            successMessage = "Group booking created: #\(host.order_number ?? String(host.id))"
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
        slotsRequestToken += 1
        let currentRequestToken = slotsRequestToken
        guard let serviceID = selectedServiceID else {
            availableSlots = []
            selectedSlot = nil
            return
        }

        let dateText = formatDate(selectedDate)
        isLoadingSlots = true
        defer { isLoadingSlots = false }
        slotHintMessage = nil

        if isStoreClosed(on: selectedDate) {
            availableSlots = []
            selectedSlot = nil
            errorMessage = nil
            slotHintMessage = Self.salonClosedHintMessage
            return
        }

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
            guard currentRequestToken == slotsRequestToken else { return }

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
            guard currentRequestToken == slotsRequestToken else { return }
            availableSlots = []
            selectedSlot = nil
            errorMessage = mapError(err)
            slotHintMessage = slotHint(from: errorMessage)
        } catch {
            guard currentRequestToken == slotsRequestToken else { return }
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
        if normalized.contains("store is closed")
            || normalized.contains("salon is closed")
            || normalized.contains("closed on this date")
        {
            return Self.salonClosedHintMessage
        }
        if normalized.contains("blocked") {
            return "This time slot is blocked by the store. Please choose another time."
        }
        if normalized.contains("past") || normalized.contains("future time") {
            return "Past time cannot be booked. Please choose a future time."
        }
        if normalized.contains("not available") || normalized.contains("no available") {
            return "No available times for this date."
        }
        if normalized.contains("daily booking limit")
            || (normalized.contains("booking limit reached") && normalized.contains("another day"))
        {
            return "Daily booking limit reached. Please choose another day."
        }
        return nil
    }

    private func isStoreClosed(on date: Date) -> Bool {
        guard !storeHours.isEmpty else { return false }
        let dayIndex = dayIndexForStoreHours(date)
        guard let hours = storeHours.first(where: { $0.day_of_week == dayIndex }) else {
            return false
        }
        if hours.is_closed { return true }
        let open = (hours.open_time ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let close = (hours.close_time ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return open.isEmpty || close.isEmpty
    }

    private func dayIndexForStoreHours(_ date: Date) -> Int {
        let weekday = makeCalendar().component(.weekday, from: date) // 1=Sun...7=Sat
        return weekday == 1 ? 6 : weekday - 2 // 0=Mon...6=Sun
    }

    private func makeCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = activeTimeZone
        return calendar
    }

    private func makeFormatter(format: String, locale: String) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = makeCalendar()
        formatter.timeZone = activeTimeZone
        formatter.locale = Locale(identifier: locale)
        formatter.dateFormat = format
        return formatter
    }

    private func dateFormatter() -> DateFormatter {
        makeFormatter(format: "yyyy-MM-dd", locale: "en_US_POSIX")
    }

    private func slotFormatter() -> DateFormatter {
        makeFormatter(format: "HH:mm", locale: "en_US_POSIX")
    }

    private func slotDisplayFormatter() -> DateFormatter {
        makeFormatter(format: "h:mm a", locale: "en_US")
    }

    private func formatDate(_ date: Date) -> String {
        dateFormatter().string(from: date)
    }

    func displayTime(_ slot: String) -> String {
        let formatter = slotFormatter()
        guard let date = formatter.date(from: slot) else { return slot }
        return slotDisplayFormatter().string(from: date)
    }

    private func normalizeSlots(_ raw: [String]) -> [String] {
        let formatter = slotFormatter()
        let set = Set(raw.compactMap { value -> String? in
            if formatter.date(from: value) != nil {
                return value
            }
            if value.count == 8, value.hasSuffix(":00") {
                let hhmm = String(value.prefix(5))
                if formatter.date(from: hhmm) != nil {
                    return hhmm
                }
            }
            return nil
        })
        return set.sorted(by: { lhs, rhs in
            guard
                let left = formatter.date(from: lhs),
                let right = formatter.date(from: rhs)
            else { return lhs < rhs }
            return left < right
        })
    }

    private func filterPastSlots(_ slots: [String]) -> [String] {
        let calendar = makeCalendar()
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
        let formatter = slotFormatter()
        guard let timeOnly = formatter.date(from: slot) else { return selectedDate }
        let calendar = makeCalendar()
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
    @Published var storeAddressByStoreID: [Int: String] = [:]
    @Published var isLoading: Bool = false
    @Published var isLoadingMore: Bool = false
    @Published var hasMore: Bool = true
    @Published var errorMessage: String?

    private let service: AppointmentsServiceProtocol
    private let storesService: StoresServiceProtocol
    private var didLoadOnce = false
    private var requestToken = 0
    private var offset = 0
    private let initialPageSize = 20
    private let loadMorePageSize = 20

    init(
        service: AppointmentsServiceProtocol = AppointmentsService(),
        storesService: StoresServiceProtocol = StoresService()
    ) {
        self.service = service
        self.storesService = storesService
    }

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
            order_amount: appointment.order_amount ?? old.order_amount,
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
            let loadedItems = try await service.getMyAppointments(
                token: token,
                skip: requestedOffset,
                limit: pageSize
            )
            guard currentRequestToken == requestToken else { return }

            if reset {
                items = loadedItems
            } else {
                items = mergeAppointments(existing: items, newRows: loadedItems)
            }

            offset = requestedOffset + loadedItems.count
            hasMore = loadedItems.count == pageSize && !loadedItems.isEmpty
            await loadStoreAddressFallbacks(for: items)
            errorMessage = nil
        } catch let err as APIError {
            guard currentRequestToken == requestToken else { return }
            errorMessage = mapError(err)
        } catch {
            guard currentRequestToken == requestToken else { return }
            errorMessage = error.localizedDescription
        }
    }

    private func mergeAppointments(existing: [AppointmentDTO], newRows: [AppointmentDTO]) -> [AppointmentDTO] {
        guard !newRows.isEmpty else { return existing }
        var merged = existing
        var existingIDs = Set(existing.map(\.id))
        for row in newRows where existingIDs.insert(row.id).inserted {
            merged.append(row)
        }
        return merged
    }

    private func loadStoreAddressFallbacks(for appointments: [AppointmentDTO]) async {
        var addressMap = storeAddressByStoreID
        let storeIDs = Set(appointments.map(\.store_id))
        guard !storeIDs.isEmpty else {
            storeAddressByStoreID = [:]
            return
        }

        addressMap = addressMap.filter { storeIDs.contains($0.key) }

        let existingResolved = Set(addressMap.keys)
        let missingStoreIDs = storeIDs.subtracting(existingResolved)
        guard !missingStoreIDs.isEmpty else {
            storeAddressByStoreID = addressMap
            return
        }

        await withTaskGroup(of: (Int, String?).self) { group in
            for storeID in missingStoreIDs {
                group.addTask { [storesService] in
                    do {
                        let detail = try await storesService.fetchStoreDetail(storeID: storeID)
                        let address = detail.formattedAddress.trimmingCharacters(in: .whitespacesAndNewlines)
                        return (storeID, address.isEmpty ? nil : address)
                    } catch {
                        return (storeID, nil)
                    }
                }
            }

            for await (storeID, address) in group {
                if let address {
                    addressMap[storeID] = address
                }
            }
        }
        storeAddressByStoreID = addressMap
    }
}

@MainActor
final class AppointmentDetailViewModel: ObservableObject {
    @Published var appointment: AppointmentDTO
    @Published var resolvedStoreAddress: String?
    @Published var isLoading = false
    @Published var isSubmitting = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    @Published var cancelReason: String = ""
    @Published var rescheduleDate: Date = .now
    @Published var rescheduleTime: Date = .now

    private let service: AppointmentsServiceProtocol
    private let storesService: StoresServiceProtocol

    init(
        appointment: AppointmentDTO,
        service: AppointmentsServiceProtocol = AppointmentsService(),
        storesService: StoresServiceProtocol = StoresService()
    ) {
        self.appointment = appointment
        self.service = service
        self.storesService = storesService
        self.resolvedStoreAddress = Self.normalizedAddress(appointment.store_address)
        let parsedDate = Self.dateFormatter.date(from: appointment.appointment_date) ?? .now
        let parsedTime = Self.parseAppointmentTime(appointment.appointment_time) ?? .now
        rescheduleDate = parsedDate
        rescheduleTime = Self.minutePrecisionTime(parsedTime)
    }

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let existing = appointment
            let fetched = try await service.getAppointment(token: token, appointmentID: appointment.id)
            appointment = mergeDetailFields(primary: fetched, fallback: existing)
            await enrichServiceFieldsIfNeeded()
            await enrichStoreAddress()
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func cancel(token: String) async -> AppointmentDTO? {
        successMessage = nil
        errorMessage = nil
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
            let existing = appointment
            let updatedRaw = try await service.cancelAppointment(
                token: token,
                appointmentID: appointment.id,
                reason: reason.isEmpty ? nil : reason
            )
            appointment = mergeDetailFields(primary: updatedRaw, fallback: existing)
            successMessage = "Appointment cancelled"
            errorMessage = nil
            return appointment
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
        successMessage = nil
        errorMessage = nil
        guard appointment.status.lowercased() != "cancelled" else {
            errorMessage = "Cannot reschedule a cancelled appointment"
            return nil
        }
        guard appointment.status.lowercased() != "completed" else {
            errorMessage = "Cannot reschedule a completed appointment"
            return nil
        }
        let normalizedTime = Self.minutePrecisionTime(rescheduleTime)
        if normalizedTime != rescheduleTime {
            rescheduleTime = normalizedTime
        }
        let nextDateTime = Self.combineDateAndTime(date: rescheduleDate, time: normalizedTime)
        if nextDateTime <= Date() {
            errorMessage = "Please choose a future date and time."
            return nil
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            let existing = appointment
            let updatedRaw = try await service.rescheduleAppointment(
                token: token,
                appointmentID: appointment.id,
                newDate: Self.dateFormatter.string(from: rescheduleDate),
                newTime: Self.timeFormatter.string(from: normalizedTime)
            )
            appointment = mergeDetailFields(primary: updatedRaw, fallback: existing)
            successMessage = "Appointment rescheduled"
            errorMessage = nil
            return appointment
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

    private func mergeDetailFields(primary: AppointmentDTO, fallback: AppointmentDTO) -> AppointmentDTO {
        AppointmentDTO(
            id: primary.id,
            order_number: primary.order_number ?? fallback.order_number,
            store_id: primary.store_id,
            service_id: primary.service_id,
            technician_id: primary.technician_id,
            appointment_date: primary.appointment_date,
            appointment_time: primary.appointment_time,
            status: primary.status,
            order_amount: primary.order_amount ?? fallback.order_amount,
            notes: primary.notes,
            store_name: primary.store_name ?? fallback.store_name,
            store_address: primary.store_address ?? fallback.store_address,
            service_name: primary.service_name ?? fallback.service_name,
            service_price: primary.service_price ?? fallback.service_price,
            service_duration: primary.service_duration ?? fallback.service_duration,
            technician_name: primary.technician_name ?? fallback.technician_name,
            created_at: primary.created_at ?? fallback.created_at,
            cancel_reason: primary.cancel_reason
        )
    }

    private func enrichServiceFieldsIfNeeded() async {
        let name = appointment.service_name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let needName = name.isEmpty
        let needAmountFallback = appointment.service_price == nil
        guard needName || needAmountFallback else { return }

        do {
            let services = try await service.getStoreServices(storeID: appointment.store_id)
            guard let matched = services.first(where: { $0.id == appointment.service_id }) else { return }
            appointment = AppointmentDTO(
                id: appointment.id,
                order_number: appointment.order_number,
                store_id: appointment.store_id,
                service_id: appointment.service_id,
                technician_id: appointment.technician_id,
                appointment_date: appointment.appointment_date,
                appointment_time: appointment.appointment_time,
                status: appointment.status,
                order_amount: appointment.order_amount,
                notes: appointment.notes,
                store_name: appointment.store_name,
                store_address: appointment.store_address,
                service_name: needName ? matched.name : appointment.service_name,
                service_price: appointment.service_price ?? matched.price,
                service_duration: appointment.service_duration ?? matched.duration_minutes,
                technician_name: appointment.technician_name,
                created_at: appointment.created_at,
                cancel_reason: appointment.cancel_reason
            )
        } catch {
            // Fallback to existing display fields if service lookup fails.
        }
    }

    private func enrichStoreAddress() async {
        do {
            let detail = try await storesService.fetchStoreDetail(storeID: appointment.store_id)
            let fullAddress = detail.formattedAddress.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !fullAddress.isEmpty else {
                resolvedStoreAddress = Self.normalizedAddress(appointment.store_address)
                return
            }
            resolvedStoreAddress = fullAddress
            appointment = withStoreAddress(fullAddress)
        } catch {
            resolvedStoreAddress = Self.normalizedAddress(appointment.store_address)
        }
    }

    private func withStoreAddress(_ address: String?) -> AppointmentDTO {
        AppointmentDTO(
            id: appointment.id,
            order_number: appointment.order_number,
            store_id: appointment.store_id,
            service_id: appointment.service_id,
            technician_id: appointment.technician_id,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: appointment.status,
            order_amount: appointment.order_amount,
            notes: appointment.notes,
            store_name: appointment.store_name,
            store_address: address,
            service_name: appointment.service_name,
            service_price: appointment.service_price,
            service_duration: appointment.service_duration,
            technician_name: appointment.technician_name,
            created_at: appointment.created_at,
            cancel_reason: appointment.cancel_reason
        )
    }

    private static func normalizedAddress(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = etCalendar
        f.timeZone = etTimeZone
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = etCalendar
        f.timeZone = etTimeZone
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm"
        return f
    }()

    private static let etTimeZone = TimeZone.autoupdatingCurrent
    private static var etCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = etTimeZone
        return calendar
    }

    private static func combineDateAndTime(date: Date, time: Date) -> Date {
        let calendar = etCalendar
        let dateParts = calendar.dateComponents([.year, .month, .day], from: date)
        let timeParts = calendar.dateComponents([.hour, .minute], from: time)
        var merged = DateComponents()
        merged.year = dateParts.year
        merged.month = dateParts.month
        merged.day = dateParts.day
        merged.hour = timeParts.hour
        merged.minute = timeParts.minute
        merged.second = 0
        return calendar.date(from: merged) ?? date
    }

    private static func parseAppointmentTime(_ raw: String) -> Date? {
        let full = DateFormatter()
        full.calendar = etCalendar
        full.timeZone = etTimeZone
        full.locale = Locale(identifier: "en_US_POSIX")
        full.dateFormat = "HH:mm:ss"
        if let value = full.date(from: raw) {
            return value
        }
        return timeFormatter.date(from: raw)
    }

    private static func minutePrecisionTime(_ value: Date) -> Date {
        let components = etCalendar.dateComponents([.hour, .minute], from: value)
        return etCalendar.date(from: components) ?? value
    }
}
