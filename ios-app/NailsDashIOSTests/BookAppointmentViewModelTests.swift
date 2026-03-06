import XCTest
@testable import NailsDashIOS

@MainActor
final class BookAppointmentViewModelTests: XCTestCase {
    func testLoadDataMergesAndSortsSlotsAcrossTechnicians() async {
        let mock = MockAppointmentsService()
        mock.servicesResult = [Fixtures.service(id: 10)]
        mock.techniciansResult = [Fixtures.technician(id: 1), Fixtures.technician(id: 2)]
        mock.slotsByTechnicianID = [
            1: [Fixtures.slot("10:00"), Fixtures.slot("09:00")],
            2: [Fixtures.slot("10:00"), Fixtures.slot("11:00:00")],
        ]

        let viewModel = BookAppointmentViewModel(storeID: Fixtures.storeID, service: mock)
        viewModel.selectedDate = ET.dayOffset(from: Date(), days: 1)

        await viewModel.loadData()

        XCTAssertEqual(viewModel.selectedServiceID, 10)
        XCTAssertEqual(viewModel.availableSlots, ["09:00", "10:00", "11:00"])
        XCTAssertEqual(viewModel.selectedSlot, "09:00")
        XCTAssertNil(viewModel.errorMessage)
    }

    func testLoadDataShowsClosedHintWhenStoreClosedOnSelectedDate() async {
        let mock = MockAppointmentsService()
        mock.servicesResult = [Fixtures.service(id: 10)]
        mock.techniciansResult = [Fixtures.technician(id: 1)]
        mock.slotsByTechnicianID = [1: [Fixtures.slot("09:00")]]

        let today = Date()
        mock.storeHoursResult = [
            StoreHourDTO(
                id: 1,
                store_id: Fixtures.storeID,
                day_of_week: ET.dayIndex(for: today),
                open_time: "09:00",
                close_time: "18:00",
                is_closed: true
            ),
        ]

        let viewModel = BookAppointmentViewModel(storeID: Fixtures.storeID, service: mock)
        viewModel.selectedDate = today

        await viewModel.loadData()

        XCTAssertTrue(viewModel.availableSlots.isEmpty)
        XCTAssertNil(viewModel.selectedSlot)
        XCTAssertEqual(viewModel.slotHintMessage, "The salon is closed on this date.")
        XCTAssertNil(viewModel.errorMessage)
    }

    func testSubmitRejectsPastSlotWithoutNetworkCall() async {
        let mock = MockAppointmentsService()
        let viewModel = BookAppointmentViewModel(storeID: Fixtures.storeID, service: mock)

        let pastSlot = ET.pastSlotForNow()
        viewModel.selectedServiceID = 10
        viewModel.selectedDate = Date()
        viewModel.selectedSlot = pastSlot
        viewModel.availableSlots = [pastSlot]

        let result = await viewModel.submit(token: "token")

        XCTAssertFalse(result)
        XCTAssertEqual(viewModel.errorMessage, "Past time cannot be booked. Please choose a future time.")
        XCTAssertTrue(mock.createAppointmentCalls.isEmpty)
    }

    func testSubmitUsesExpectedDateAndTimeFormatting() async {
        let mock = MockAppointmentsService()
        let viewModel = BookAppointmentViewModel(storeID: Fixtures.storeID, service: mock)

        let tomorrow = ET.dayOffset(from: Date(), days: 1)
        viewModel.selectedServiceID = 10
        viewModel.selectedDate = tomorrow
        viewModel.selectedSlot = "14:30"
        viewModel.availableSlots = ["14:30"]
        viewModel.notes = "   "

        let result = await viewModel.submit(token: "token")

        XCTAssertTrue(result)
        XCTAssertEqual(mock.createAppointmentCalls.count, 1)
        guard let request = mock.createAppointmentCalls.first else {
            XCTFail("Expected appointment create request")
            return
        }
        XCTAssertEqual(request.appointment_date, ET.dateText(tomorrow))
        XCTAssertEqual(request.appointment_time, "14:30:00")
        XCTAssertNil(request.notes)
    }
}

private final class MockAppointmentsService: AppointmentsServiceProtocol {
    var createAppointmentResult: AppointmentDTO = Fixtures.appointment()
    var createGroupResult: AppointmentGroupResponseDTO = AppointmentGroupResponseDTO(
        group_id: 1,
        group_code: "G1",
        host_appointment: Fixtures.appointment(),
        guest_appointments: []
    )
    var myAppointmentsResult: [AppointmentDTO] = []
    var appointmentResult: AppointmentDTO = Fixtures.appointment()
    var cancelResult: AppointmentDTO = Fixtures.appointment(status: "cancelled")
    var rescheduleResult: AppointmentDTO = Fixtures.appointment(status: "confirmed")

    var servicesResult: [ServiceDTO] = [Fixtures.service()]
    var storeDetailResult: StoreDetailDTO = Fixtures.storeDetail()
    var techniciansResult: [TechnicianDTO] = [Fixtures.technician(id: 1)]
    var storeHoursResult: [StoreHourDTO] = []
    var slotsByTechnicianID: [Int: [TechnicianAvailableSlotDTO]] = [:]

    private(set) var createAppointmentCalls: [AppointmentCreateRequest] = []
    private(set) var createGroupCalls: [AppointmentGroupCreateRequest] = []

    func createAppointment(token: String, request: AppointmentCreateRequest) async throws -> AppointmentDTO {
        createAppointmentCalls.append(request)
        return createAppointmentResult
    }

    func createAppointmentGroup(token: String, request: AppointmentGroupCreateRequest) async throws -> AppointmentGroupResponseDTO {
        createGroupCalls.append(request)
        return createGroupResult
    }

    func getMyAppointments(token: String, limit: Int) async throws -> [AppointmentDTO] {
        myAppointmentsResult
    }

    func getAppointment(token: String, appointmentID: Int) async throws -> AppointmentDTO {
        appointmentResult
    }

    func cancelAppointment(token: String, appointmentID: Int, reason: String?) async throws -> AppointmentDTO {
        cancelResult
    }

    func rescheduleAppointment(token: String, appointmentID: Int, newDate: String, newTime: String) async throws -> AppointmentDTO {
        rescheduleResult
    }

    func getStoreServices(storeID: Int) async throws -> [ServiceDTO] {
        servicesResult
    }

    func getStoreDetail(storeID: Int) async throws -> StoreDetailDTO {
        storeDetailResult
    }

    func getStoreTechnicians(storeID: Int) async throws -> [TechnicianDTO] {
        techniciansResult
    }

    func getStoreHours(storeID: Int) async throws -> [StoreHourDTO] {
        storeHoursResult
    }

    func getTechnicianAvailableSlots(technicianID: Int, date: String, serviceID: Int) async throws -> [TechnicianAvailableSlotDTO] {
        slotsByTechnicianID[technicianID] ?? []
    }
}

private enum Fixtures {
    static let storeID = 88

    static func storeDetail() -> StoreDetailDTO {
        StoreDetailDTO(
            id: storeID,
            name: "Test Store",
            address: "1 Main St",
            city: "Westfield",
            state: "MA",
            zip_code: "01085",
            latitude: 42.1251,
            longitude: -72.7495,
            time_zone: "America/New_York",
            phone: "14151234567",
            email: nil,
            description: nil,
            opening_hours: nil,
            rating: 4.6,
            review_count: 12,
            images: []
        )
    }

    static func service(id: Int = 10, isActive: Int = 1) -> ServiceDTO {
        ServiceDTO(
            id: id,
            store_id: storeID,
            name: "Manicure",
            price: 35,
            duration_minutes: 45,
            is_active: isActive
        )
    }

    static func technician(id: Int, isActive: Int = 1) -> TechnicianDTO {
        TechnicianDTO(
            id: id,
            store_id: storeID,
            name: "Tech \(id)",
            is_active: isActive,
            avatar_url: nil
        )
    }

    static func slot(_ startTime: String) -> TechnicianAvailableSlotDTO {
        TechnicianAvailableSlotDTO(
            start_time: startTime,
            end_time: startTime,
            duration_minutes: 45
        )
    }

    static func appointment(id: Int = 1, status: String = "confirmed") -> AppointmentDTO {
        AppointmentDTO(
            id: id,
            order_number: "#A\(id)",
            store_id: storeID,
            service_id: 10,
            technician_id: 1,
            appointment_date: "2026-03-06",
            appointment_time: "14:30:00",
            status: status,
            order_amount: 35,
            notes: nil,
            store_name: "Test Store",
            store_address: "1 Main St, Westfield, MA",
            service_name: "Manicure",
            service_price: 35,
            service_duration: 45,
            technician_name: "Tech 1",
            created_at: "2026-03-05T12:00:00Z",
            cancel_reason: nil
        )
    }
}

private enum ET {
    private static let timeZone = TimeZone(identifier: "America/New_York")!

    private static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func dateText(_ date: Date) -> String {
        dateFormatter.string(from: date)
    }

    static func dayOffset(from date: Date, days: Int) -> Date {
        calendar.date(byAdding: .day, value: days, to: date) ?? date
    }

    static func dayIndex(for date: Date) -> Int {
        let weekday = calendar.component(.weekday, from: date) // 1=Sun...7=Sat
        return weekday == 1 ? 6 : weekday - 2 // 0=Mon...6=Sun
    }

    static func pastSlotForNow(reference: Date = Date()) -> String {
        let components = calendar.dateComponents([.hour, .minute], from: reference)
        var hour = components.hour ?? 0
        var minute = components.minute ?? 0

        if minute > 0 {
            minute -= 1
        } else if hour > 0 {
            hour -= 1
            minute = 59
        }

        return String(format: "%02d:%02d", hour, minute)
    }
}
