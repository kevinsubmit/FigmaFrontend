import SwiftUI

enum BookAppointmentPresentationStyle {
    case fullPage
    case bottomSheet
}

private enum BookingTypeSelection {
    case single
    case group
}

private struct GroupGuestRow: Identifiable, Equatable {
    let id: UUID
    var serviceID: Int?

    init(id: UUID = UUID(), serviceID: Int? = nil) {
        self.id = id
        self.serviceID = serviceID
    }
}

struct BookAppointmentView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: BookAppointmentViewModel
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var heroPageIndex: Int = 0
    @State private var autoInjectedReferenceNote: String?
    @State private var bookingType: BookingTypeSelection = .single
    @State private var guestRows: [GroupGuestRow] = []
    @State private var depositBadgeShimmerOffset: CGFloat = -1.2
    @State private var displayedMonthStart: Date = Date()
    @State private var showAppointmentSuccessOverlay: Bool = false
    @State private var isProcessingSubmissionTransition: Bool = false
    private let preselectedServiceID: Int?
    private let preselectedServiceIDs: [Int]
    private let presentationStyle: BookAppointmentPresentationStyle
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    init(
        storeID: Int,
        preselectedServiceID: Int? = nil,
        preselectedServiceIDs: [Int] = [],
        presentationStyle: BookAppointmentPresentationStyle = .fullPage
    ) {
        self.preselectedServiceID = preselectedServiceID
        self.preselectedServiceIDs = preselectedServiceIDs
        self.presentationStyle = presentationStyle
        _viewModel = StateObject(wrappedValue: BookAppointmentViewModel(storeID: storeID))
    }

    var body: some View {
        VStack(spacing: 0) {
            if isBottomSheetPresentation {
                bottomSheetHandle
            } else {
                topBar
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing16) {
                    if isBottomSheetPresentation {
                        sheetServiceHeader
                        dateTimeCard
                        bookingTypeCard
                        if bookingType == .group {
                            groupGuestServicesCard
                        }
                        technicianCard
                        payAtSalonCard
                        bottomSheetSummaryAndActions
                    } else {
                        storeHeroCard
                        serviceCard
                        technicianCard
                        dateTimeCard
                        notesCard
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, isBottomSheetPresentation ? UITheme.spacing12 : UITheme.spacing10)
                .padding(.bottom, isBottomSheetPresentation ? UITheme.spacing8 : UITheme.spacing28)
            }
        }
        .safeAreaInset(edge: .bottom) {
            if !isBottomSheetPresentation {
                bottomCTA
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .tint(brandGold)
        .background(Color.black)
        .task {
            await viewModel.loadData()

            let preferredServiceIDs: [Int] = {
                if !preselectedServiceIDs.isEmpty { return preselectedServiceIDs }
                if let preselectedServiceID { return [preselectedServiceID] }
                return []
            }()

            if let firstPreferredID = preferredServiceIDs.first,
               viewModel.services.contains(where: { $0.id == firstPreferredID }) {
                viewModel.selectedServiceID = firstPreferredID
                await viewModel.reloadAvailableSlots()
            }
            displayedMonthStart = monthStart(for: viewModel.selectedDate)
            syncReferenceNote()
        }
        .onChange(of: viewModel.selectedServiceID) { _ in
            Task { await viewModel.reloadAvailableSlots() }
        }
        .onChange(of: viewModel.selectedTechnicianID) { _ in
            Task { await viewModel.reloadAvailableSlots() }
        }
        .onChange(of: viewModel.selectedDate) { _ in
            if !calendar.isDate(viewModel.selectedDate, equalTo: displayedMonthStart, toGranularity: .month) {
                displayedMonthStart = monthStart(for: viewModel.selectedDate)
            }
            Task { await viewModel.reloadAvailableSlots() }
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .onChange(of: viewModel.successMessage) { value in
            guard !isProcessingSubmissionTransition else { return }
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .onChange(of: appState.bookingStyleReference?.id) { _ in
            syncReferenceNote()
        }
        .alert("Message", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .overlay {
            ZStack {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                        .padding(UITheme.pagePadding)
                        .background(cardBG)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.overlayCornerRadius))
                }
                if showAppointmentSuccessOverlay {
                    appointmentSetOverlay
                }
            }
        }
    }

    private var isBottomSheetPresentation: Bool {
        presentationStyle == .bottomSheet
    }

    private var bottomSheetHandle: some View {
        VStack(spacing: UITheme.spacing10) {
            Capsule()
                .fill(Color.white.opacity(0.92))
                .frame(width: 168, height: 12)
            Capsule()
                .fill(Color.white.opacity(0.22))
                .frame(width: 78, height: 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, UITheme.spacing12)
        .padding(.bottom, UITheme.spacing8)
        .background(Color.black.opacity(0.98))
    }

    private var topBar: some View {
        ZStack {
            VStack(alignment: .center, spacing: UITheme.spacing1) {
                Text("STEP 02")
                    .font(.caption2.weight(.bold))
                    .kerning(2.2)
                    .foregroundStyle(brandGold)
                Text("Book Services")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .center)

            HStack {
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
            }
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

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.bold))
            .kerning(2.2)
            .foregroundStyle(.secondary)
    }

    private var sheetServiceHeader: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack(alignment: .center, spacing: UITheme.spacing8) {
                Text("SERVICE SELECTION")
                    .font(.system(size: 10, weight: .bold))
                    .kerning(2.0)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.9)

                depositNeededBadge

                Spacer(minLength: UITheme.spacing4)

                VStack(alignment: .trailing, spacing: UITheme.spacing1) {
                    Text(selectedServicePriceText)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                }
            }

            HStack(alignment: .center, spacing: UITheme.spacing8) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: UITheme.spacing6) {
                        ForEach(selectedServiceChips, id: \.id) { service in
                            Text(service.name)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.88))
                                .padding(.horizontal, UITheme.spacing10)
                                .padding(.vertical, UITheme.spacing6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                                        .stroke(Color.white.opacity(0.24), lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                        }
                    }
                }

                Spacer(minLength: UITheme.spacing4)

                Text(selectedServiceDurationText)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    private var depositNeededBadge: some View {
        Text("NO DEPOSIT NEEDED")
            .font(.system(size: 9, weight: .bold))
            .kerning(0.9)
            .foregroundStyle(.black)
            .lineLimit(1)
            .minimumScaleFactor(0.9)
            .padding(.horizontal, UITheme.spacing8)
            .padding(.vertical, UITheme.spacing6)
            .background(brandGold)
            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
            .overlay {
                GeometryReader { proxy in
                    LinearGradient(
                        colors: [
                            .clear,
                            Color.white.opacity(0.0),
                            Color.white.opacity(0.58),
                            Color.white.opacity(0.0),
                            .clear,
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .rotationEffect(.degrees(18))
                    .offset(x: depositBadgeShimmerOffset * max(proxy.size.width, 1))
                    .blendMode(.screen)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                }
                .allowsHitTesting(false)
            }
            .onAppear {
                depositBadgeShimmerOffset = -1.2
                withAnimation(.linear(duration: 1.25).repeatForever(autoreverses: false)) {
                    depositBadgeShimmerOffset = 1.2
                }
            }
    }

    private var serviceCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            if !isBottomSheetPresentation {
                sectionTitle("SELECT SERVICE")
            }
            Menu {
                ForEach(viewModel.services) { service in
                    Button {
                        serviceSelection.wrappedValue = service.id
                    } label: {
                        Text("\(service.name) • $\(String(format: "%.2f", service.price))")
                    }
                }
            } label: {
                HStack(spacing: UITheme.spacing10) {
                    VStack(alignment: .leading, spacing: UITheme.spacing2) {
                        Text(selectedService?.name ?? "Select Service")
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text(selectedServiceSubtext)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, UITheme.cardPadding)
                .frame(maxWidth: .infinity, minHeight: UITheme.controlHeight, alignment: .leading)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(brandGold.opacity(0.26), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
        }
        .modifier(CardStyle(cardBG: cardBG, brandGold: brandGold))
    }

    private var bookingTypeCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            sectionTitle("BOOKING TYPE")
            HStack(spacing: UITheme.spacing10) {
                bookingTypeButton(.single, label: "Single")
                bookingTypeButton(.group, label: "Group (Friends)")
            }
        }
        .modifier(CardStyle(cardBG: cardBG, brandGold: brandGold))
    }

    private func bookingTypeButton(_ value: BookingTypeSelection, label: String) -> some View {
        let selected = bookingType == value
        return Button {
            bookingType = value
            if value == .group, guestRows.isEmpty {
                guestRows = [GroupGuestRow()]
            }
        } label: {
            Text(label)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(selected ? brandGold : Color.white.opacity(0.8))
                .frame(maxWidth: .infinity, minHeight: 58)
                .background(selected ? brandGold.opacity(0.14) : Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(selected ? brandGold : Color.white.opacity(0.16), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
        }
        .buttonStyle(.plain)
    }

    private var groupGuestServicesCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            Text("Host uses selected service. Each guest needs one service.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            ForEach(Array(guestRows.enumerated()), id: \.element.id) { index, row in
                VStack(spacing: UITheme.spacing8) {
                    Text("Guest \(index + 1)")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                        .frame(maxWidth: .infinity, minHeight: UITheme.controlHeight, alignment: .leading)
                        .padding(.horizontal, UITheme.cardPadding)
                        .background(Color.white.opacity(0.02))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                                .stroke(Color.white.opacity(0.14), lineWidth: 1)
                        )

                    Menu {
                        ForEach(viewModel.services) { service in
                            Button {
                                updateGuestService(rowID: row.id, serviceID: service.id)
                            } label: {
                                Text(service.name)
                            }
                        }
                    } label: {
                        HStack(spacing: UITheme.spacing10) {
                            Text(guestServiceTitle(for: row))
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(row.serviceID == nil ? Color.white.opacity(0.72) : .white)
                                .lineLimit(1)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, UITheme.cardPadding)
                        .frame(maxWidth: .infinity, minHeight: UITheme.controlHeight, alignment: .leading)
                        .background(Color.white.opacity(0.02))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                                .stroke(Color.white.opacity(0.14), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)

                    Button {
                        removeGuestRow(rowID: row.id)
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.red.opacity(0.9))
                            .frame(maxWidth: .infinity, minHeight: 34)
                    }
                    .buttonStyle(.plain)
                    .overlay(
                        RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                            .stroke(Color.red.opacity(0.9), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                }
            }

            Button {
                guestRows.append(GroupGuestRow())
            } label: {
                HStack(spacing: UITheme.spacing6) {
                    Text("+")
                        .font(.system(size: 20, weight: .medium))
                    Text("Add Guest")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundStyle(brandGold)
                .padding(.horizontal, UITheme.spacing12)
                .frame(minHeight: 42)
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(brandGold.opacity(0.45), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
            }
            .buttonStyle(.plain)
        }
        .modifier(CardStyle(cardBG: cardBG, brandGold: brandGold))
    }

    private var technicianCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            HStack {
                sectionTitle("SELECT TECHNICIAN")
                Spacer()
                Text("OPTIONAL")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(brandGold)
                    .padding(.horizontal, UITheme.compactPillHorizontalPadding)
                    .padding(.vertical, UITheme.compactPillVerticalPadding)
                    .background(brandGold.opacity(0.16))
                    .clipShape(Capsule())
            }
            Text("Tap a preferred technician or choose Any.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: UITheme.spacing14) {
                    technicianChip(id: 0, name: "Any")
                    ForEach(viewModel.technicians) { tech in
                        technicianChip(id: tech.id, name: tech.name)
                    }
                }
                .padding(.horizontal, UITheme.spacing2)
            }
        }
        .modifier(CardStyle(cardBG: cardBG, brandGold: brandGold))
    }

    private var payAtSalonCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing14) {
            HStack(alignment: .top, spacing: UITheme.spacing12) {
                ZStack {
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .fill(brandGold.opacity(0.13))
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(brandGold.opacity(0.30), lineWidth: 1)
                    Image(systemName: "checkmark.shield")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(brandGold)
                }
                .frame(width: 74, height: 74)

                VStack(alignment: .leading, spacing: UITheme.spacing8) {
                    HStack(spacing: UITheme.spacing10) {
                        Text("Pay at Salon")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Safe & Secure")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(brandGold)
                            .padding(.horizontal, UITheme.spacing10)
                            .padding(.vertical, UITheme.spacing6)
                            .background(Color.black.opacity(0.22))
                            .overlay(
                                RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                                    .stroke(brandGold.opacity(0.36), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                    }

                    VStack(alignment: .leading, spacing: UITheme.spacing4) {
                        Text("Your appointment is secured instantly. No")
                        Text("prepayment or deposit is required today.")
                        Text("Just show up and pay after your service.")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.64))
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
                }
            }

            Rectangle()
                .fill(Color.white.opacity(0.10))
                .frame(height: 1)

            HStack(spacing: UITheme.spacing12) {
                HStack(spacing: -10) {
                    paymentMethodBadge("C")
                    paymentMethodBadge("A")
                    paymentMethodBadge("$")
                }

                Text("Accepted: Credit Card, Apple Pay, Cash")
                    .font(.system(size: 13, weight: .medium))
                    .italic()
                    .foregroundStyle(Color.white.opacity(0.56))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)

                Spacer(minLength: 0)
            }
        }
        .padding(UITheme.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                cardBG
                LinearGradient(
                    colors: [
                        brandGold.opacity(0.08),
                        Color.white.opacity(0.02),
                        .clear,
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius)
                .stroke(brandGold.opacity(0.28), lineWidth: 1)
        )
    }

    private func paymentMethodBadge(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(.white.opacity(0.85))
            .frame(width: 38, height: 38)
            .background(Color(red: 26.0 / 255.0, green: 41.0 / 255.0, blue: 72.0 / 255.0))
            .overlay(
                Circle()
                    .stroke(Color.black.opacity(0.78), lineWidth: 2)
            )
            .clipShape(Circle())
    }

    private var dateTimeCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing14) {
            sectionTitle("SELECT DATE")
            customCalendar

            sectionTitle("SELECT TIME")

            if viewModel.isLoadingSlots {
                HStack(spacing: UITheme.spacing8) {
                    ProgressView()
                    Text("Loading available times...")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, UITheme.spacing8)
            } else if viewModel.availableSlots.isEmpty {
                Text(viewModel.slotHintMessage ?? "No available times for this date.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.red.opacity(0.95))
                    .padding(.top, UITheme.spacing2)
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: UITheme.spacing8), count: 4), spacing: UITheme.spacing8) {
                    ForEach(viewModel.availableSlots, id: \.self) { slot in
                        let selected = viewModel.selectedSlot == slot
                        Button {
                            viewModel.selectSlot(slot)
                        } label: {
                            Text(viewModel.displayTime(slot))
                                .font(.footnote.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.horizontal, UITheme.spacing6)
                                .frame(minHeight: UITheme.segmentHeight)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(selected ? Color.black : Color.white)
                        .background(selected ? brandGold : Color.white.opacity(0.04))
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.chipCornerRadius))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.chipCornerRadius)
                                .stroke(brandGold.opacity(selected ? 0 : 0.25), lineWidth: 1)
                        )
                    }
                }
            }

            Text(slotHintText)
                .font(.caption2.weight(.semibold))
                .kerning(1.6)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .lineSpacing(1)
                .padding(.top, UITheme.spacing2)

            if let slotHint = viewModel.slotHintMessage, !slotHint.isEmpty, !viewModel.availableSlots.isEmpty, slotHint.lowercased().contains("blocked") {
                Text(slotHint)
                    .font(.footnote)
                    .foregroundStyle(.red.opacity(0.92))
            }
        }
        .modifier(CardStyle(cardBG: cardBG, brandGold: brandGold))
    }

    private var customCalendar: some View {
        VStack(spacing: UITheme.spacing10) {
            HStack {
                HStack(spacing: UITheme.spacing6) {
                    Text(monthHeaderText)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(brandGold)
                }
                Spacer()
                HStack(spacing: UITheme.spacing10) {
                    Button {
                        shiftMonth(by: -1)
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(canGoToPreviousMonth ? brandGold : Color.white.opacity(0.24))
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)
                    .disabled(!canGoToPreviousMonth)

                    Button {
                        shiftMonth(by: 1)
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(brandGold)
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)
                }
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: UITheme.spacing6), count: 7), spacing: UITheme.spacing8) {
                ForEach(weekdayHeaders, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 11, weight: .bold))
                        .kerning(0.6)
                        .foregroundStyle(Color.white.opacity(0.34))
                        .frame(maxWidth: .infinity, minHeight: 18)
                }

                ForEach(Array(calendarDays.enumerated()), id: \.offset) { _, day in
                    if let day {
                        let isSelected = calendar.isDate(day, inSameDayAs: viewModel.selectedDate)
                        let isPast = isPastDay(day)
                        let isToday = calendar.isDateInToday(day)
                        Group {
                            if isPast {
                                Text("\(calendar.component(.day, from: day))")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(Color.white.opacity(0.28))
                                    .frame(width: 38, height: 38)
                            } else {
                                Button {
                                    viewModel.selectedDate = day
                                } label: {
                                    Text("\(calendar.component(.day, from: day))")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(dayTextColor(isSelected: isSelected, isPast: false))
                                        .frame(width: 38, height: 38)
                                        .background(
                                            Circle()
                                                .fill(isSelected ? brandGold : .clear)
                                        )
                                        .overlay(
                                            Circle()
                                                .stroke(brandGold.opacity(isSelected ? 0 : (isToday ? 0.45 : 0)), lineWidth: 1)
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .frame(maxWidth: .infinity, minHeight: 40)
                    } else {
                        Color.clear
                            .frame(maxWidth: .infinity, minHeight: 40)
                    }
                }
            }
        }
        .padding(.horizontal, UITheme.spacing10)
        .padding(.vertical, UITheme.spacing10)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                .stroke(brandGold.opacity(0.22), lineWidth: 1)
        )
    }

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing12) {
            sectionTitle("NOTES")
            Text("Add special requests or reminders for the salon (optional).")
                .font(.footnote)
                .foregroundStyle(.secondary)
            TextField("Optional notes", text: $viewModel.notes, axis: .vertical)
                .lineLimit(4 ... 7)
                .frame(minHeight: 88, alignment: .topLeading)
                .padding(.horizontal, UITheme.spacing12)
                .padding(.vertical, UITheme.inputVerticalPadding)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(brandGold.opacity(0.26), lineWidth: 1)
                )
        }
        .modifier(CardStyle(cardBG: cardBG, brandGold: brandGold))
    }

    private var submitButton: some View {
        Button {
            handleSubmitTapped()
        } label: {
            if viewModel.isSubmitting {
                ProgressView()
                    .tint(.black)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: UITheme.ctaHeight)
            } else {
                Text(primaryCTAButtonTitle)
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: UITheme.ctaHeight)
            }
        }
        .buttonStyle(.plain)
        .foregroundStyle(canSubmit ? .black : .white.opacity(0.66))
        .background(canSubmit ? brandGold : Color.white.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
        .disabled(viewModel.isSubmitting || !canSubmit || isProcessingSubmissionTransition)
    }

    private var bottomSheetSummaryAndActions: some View {
        VStack(spacing: UITheme.spacing12) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)

            if let store = viewModel.storeDetail {
                appointmentSummaryCard(store: store)
            }

            submitButton
                .padding(.top, UITheme.spacing2)

            Button {
                dismiss()
            } label: {
                Text("Change Service")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.82))
            }
            .buttonStyle(.plain)
            .padding(.bottom, currentBottomSafeAreaInset() + UITheme.spacing10)
        }
        .padding(.top, UITheme.spacing4)
    }

    private var bottomCTA: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: UITheme.spacing1)
            VStack(spacing: UITheme.spacing8) {
                HStack(spacing: UITheme.spacing8) {
                    Text(selectedService?.name ?? "Select a service")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text("•")
                        .foregroundStyle(.secondary)
                    Text(selectedSlotDisplay ?? "Select a time")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    Spacer()
                    Text(selectedServicePriceText)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(brandGold)
                }
                .padding(.horizontal, UITheme.spacing12)
                .frame(minHeight: UITheme.controlHeight)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                        .stroke(brandGold.opacity(0.16), lineWidth: 1)
                )
            }
            .padding(.horizontal, UITheme.pagePadding)
            .padding(.top, UITheme.spacing10)
            submitButton
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing8)
                .padding(.bottom, UITheme.spacing12)
                .background(Color.black.opacity(0.96))
        }
        .background(Color.black.opacity(0.96))
    }

    private var appointmentSetOverlay: some View {
        GeometryReader { proxy in
            let compact = proxy.size.height < 760
            let titleSize: CGFloat = compact ? 42 : 52
            let subtitleSize: CGFloat = compact ? 16 : 17
            let iconRingSize: CGFloat = compact ? 92 : 104
            let iconSize: CGFloat = compact ? 50 : 56
            let summaryLabelSize: CGFloat = compact ? 16 : 17
            let summaryValueSize: CGFloat = compact ? 17 : 18

            ZStack {
                Color.black.opacity(0.96)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    VStack(spacing: UITheme.spacing10) {
                        Capsule()
                            .fill(Color.white.opacity(0.92))
                            .frame(width: 168, height: 12)
                        Capsule()
                            .fill(Color.white.opacity(0.22))
                            .frame(width: 78, height: 4)
                    }
                    .padding(.top, UITheme.spacing12)
                    .padding(.bottom, compact ? UITheme.spacing42 : 72)

                    VStack(spacing: compact ? UITheme.spacing16 : UITheme.spacing20) {
                        ZStack {
                            Circle()
                                .fill(brandGold.opacity(0.14))
                                .frame(width: iconRingSize, height: iconRingSize)
                                .overlay(
                                    Circle()
                                        .stroke(brandGold.opacity(0.32), lineWidth: 1)
                                )
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: iconSize, weight: .semibold))
                                .foregroundStyle(brandGold)
                        }

                        Text("Appointment Set!")
                            .font(.system(size: titleSize, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)

                        Text("We've sent a confirmation to your app notifications.")
                            .font(.system(size: subtitleSize, weight: .medium))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .lineSpacing(2)
                            .frame(maxWidth: 330)

                        VStack(spacing: UITheme.spacing12) {
                            successRow(label: "Services", value: successServicesText, labelSize: summaryLabelSize, valueSize: summaryValueSize)
                            successRow(label: "Total", value: successTotalText, highlight: true, labelSize: summaryLabelSize, valueSize: summaryValueSize)
                            successRow(label: "Time", value: successTimeText, labelSize: summaryLabelSize, valueSize: summaryValueSize)
                        }
                        .padding(.horizontal, compact ? UITheme.spacing14 : UITheme.spacing16)
                        .padding(.vertical, compact ? UITheme.spacing14 : UITheme.spacing16)
                        .background(cardBG)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius)
                                .stroke(Color.white.opacity(0.14), lineWidth: 1)
                        )
                        .frame(maxWidth: 430)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, UITheme.pagePadding)

                    Spacer(minLength: 0)
                }
            }
            .allowsHitTesting(true)
            .transition(.opacity)
        }
    }

    private func successRow(
        label: String,
        value: String,
        highlight: Bool = false,
        labelSize: CGFloat = 18,
        valueSize: CGFloat = 18
    ) -> some View {
        HStack(alignment: .center, spacing: UITheme.spacing12) {
            Text(label)
                .font(.system(size: labelSize, weight: .medium))
                .foregroundStyle(.secondary)
            Spacer(minLength: UITheme.spacing8)
            Text(value)
                .font(.system(size: valueSize, weight: .bold))
                .foregroundStyle(highlight ? brandGold : .white)
                .multilineTextAlignment(.trailing)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
    }

    private func handleSubmitTapped() {
        Task {
            guard let token = appState.requireAccessToken() else { return }

            await MainActor.run {
                isProcessingSubmissionTransition = true
            }

            let ok = await submitCurrentBooking(token: token)
            guard ok else {
                await MainActor.run {
                    isProcessingSubmissionTransition = false
                }
                return
            }

            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showAppointmentSuccessOverlay = true
                }
            }

            try? await Task.sleep(for: .milliseconds(1500))

            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.15)) {
                    showAppointmentSuccessOverlay = false
                }
                dismiss()
            }

            try? await Task.sleep(for: .milliseconds(120))

            await MainActor.run {
                appState.resetBookFlowSource()
                appState.selectedTab = .appointments
                isProcessingSubmissionTransition = false
            }
        }
    }

    private var serviceSelection: Binding<Int> {
        Binding(
            get: { viewModel.selectedServiceID ?? 0 },
            set: { viewModel.selectedServiceID = $0 }
        )
    }

    private var technicianSelection: Binding<Int> {
        Binding(
            get: { viewModel.selectedTechnicianID ?? 0 },
            set: { viewModel.selectedTechnicianID = ($0 == 0 ? nil : $0) }
        )
    }

    private func technicianChip(id: Int, name: String) -> some View {
        let selected = (viewModel.selectedTechnicianID ?? 0) == id
        return Button {
            technicianSelection.wrappedValue = id
        } label: {
            VStack(spacing: UITheme.spacing7) {
                ZStack {
                    Circle()
                        .fill(selected ? brandGold.opacity(0.12) : Color.white.opacity(0.02))
                        .frame(width: UITheme.technicianAvatarSize, height: UITheme.technicianAvatarSize)
                        .overlay(
                            Circle()
                                .stroke(selected ? brandGold : Color.white.opacity(0.15), lineWidth: 2)
                        )
                    Image(systemName: "person")
                        .font(.title3.weight(.medium))
                        .foregroundStyle(selected ? brandGold : Color.white.opacity(0.58))
                }
                Text(name)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(selected ? brandGold : .white)
                    .lineLimit(1)
                    .frame(width: UITheme.technicianNameWidth)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var storeHeroCard: some View {
        if let store = viewModel.storeDetail {
            VStack(alignment: .leading, spacing: UITheme.spacing10) {
                if !store.images.isEmpty {
                    ZStack(alignment: .bottomTrailing) {
                        TabView(selection: $heroPageIndex) {
                            ForEach(Array(store.images.enumerated()), id: \.element.id) { idx, img in
                                CachedAsyncImage(url: imageURL(from: img.image_url)) { phase in
                                    switch phase {
                                    case .empty:
                                        ProgressView().frame(maxWidth: .infinity, minHeight: UITheme.cardHeroHeight, maxHeight: UITheme.cardHeroHeight)
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .scaledToFill()
                                            .frame(maxWidth: .infinity, minHeight: UITheme.cardHeroHeight, maxHeight: UITheme.cardHeroHeight)
                                            .clipped()
                                            .overlay(
                                                LinearGradient(
                                                    colors: [.clear, Color.black.opacity(0.45)],
                                                    startPoint: .center,
                                                    endPoint: .bottom
                                                )
                                            )
                                    case .failure:
                                        Color.gray.opacity(0.2)
                                            .frame(maxWidth: .infinity, minHeight: UITheme.cardHeroHeight, maxHeight: UITheme.cardHeroHeight)
                                    @unknown default:
                                        EmptyView()
                                    }
                                }
                                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                                .tag(idx)
                            }
                        }
                        .frame(height: UITheme.cardHeroHeight)
                        .tabViewStyle(.page(indexDisplayMode: .never))

                        HStack(spacing: UITheme.spacing5) {
                            ForEach(0..<store.images.count, id: \.self) { idx in
                                Capsule()
                                    .fill(idx == heroPageIndex ? brandGold : Color.white.opacity(0.5))
                                    .frame(width: idx == heroPageIndex ? 14 : 6, height: 6)
                            }
                        }
                        .padding(.trailing, UITheme.spacing10)
                        .padding(.bottom, UITheme.spacing10)
                    }
                }
                Text(store.name)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                Text(store.formattedAddress)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                HStack(spacing: UITheme.spacing8) {
                    Image(systemName: "star.fill")
                        .font(.caption)
                        .foregroundStyle(brandGold)
                    Text(String(format: "%.1f", store.rating))
                        .foregroundStyle(.white)
                        .font(.subheadline.weight(.semibold))
                    Text("(\(store.review_count) reviews)")
                        .foregroundStyle(brandGold)
                        .font(.subheadline)
                }
            }
            .padding(.horizontal, UITheme.spacing2)
            .padding(.top, UITheme.spacing2)
        }
    }

    private func imageURL(from raw: String) -> URL? {
        AssetURLResolver.resolveURL(from: raw)
    }

    private var selectedService: ServiceDTO? {
        viewModel.services.first(where: { $0.id == viewModel.selectedServiceID })
    }

    private var selectedServiceChips: [ServiceDTO] {
        let chips = preselectedServiceIDs.compactMap { id in
            viewModel.services.first(where: { $0.id == id })
        }
        if chips.isEmpty, let selectedService {
            return [selectedService]
        }
        return chips
    }

    private var selectedServiceSubtext: String {
        guard let service = selectedService else {
            return "Choose from store service list"
        }
        return "$\(String(format: "%.2f", service.price)) • \(service.duration_minutes) mins"
    }

    private var selectedServicePriceText: String {
        guard let service = selectedService else { return "-" }
        return "$\(String(format: "%.2f", service.price))"
    }

    private var selectedServiceDurationText: String {
        guard let service = selectedService else { return "-" }
        return formatDuration(service.duration_minutes)
    }

    private var selectedSlotDisplay: String? {
        guard let slot = viewModel.selectedSlot else { return nil }
        return viewModel.displayTime(slot)
    }

    private var successServicesText: String {
        let names = selectedServiceChips.map(\.name)
        if names.isEmpty {
            return selectedService?.name ?? "-"
        }
        if names.count == 1 {
            return "Host: \(names[0])"
        }
        return names.joined(separator: ", ")
    }

    private var successTotalText: String {
        let sum = selectedServiceChips.reduce(0.0) { $0 + $1.price }
        let fallback = selectedService?.price ?? 0
        let total = sum > 0 ? sum : fallback
        return "$\(String(format: "%.2f", total))"
    }

    private var successTimeText: String {
        let dateText = Self.successDateFormatter.string(from: viewModel.selectedDate)
        let timeText = viewModel.selectedSlot ?? (selectedSlotDisplay ?? "Select date & time")
        return "\(dateText) at \(timeText)"
    }

    private var canSubmit: Bool {
        let baseReady = viewModel.selectedServiceID != nil && viewModel.selectedSlot != nil
        guard baseReady else { return false }
        if bookingType == .group {
            return !guestRows.isEmpty && guestRows.allSatisfy { $0.serviceID != nil }
        }
        return true
    }

    private var slotHintText: String {
        if viewModel.availableSlots.isEmpty {
            return "Times are based on store hours and staff availability."
        }
        if let hint = viewModel.slotHintMessage, !hint.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return hint
        }
        return "Times are based on store hours and staff availability."
    }

    private var primaryCTAButtonTitle: String {
        isBottomSheetPresentation ? "Confirm Appointment" : "Create Appointment"
    }

    private var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.locale = Locale(identifier: "en_US_POSIX")
        cal.firstWeekday = 1 // Sunday
        return cal
    }

    private var weekdayHeaders: [String] {
        ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    }

    private var monthHeaderText: String {
        Self.monthTitleFormatter.string(from: displayedMonthStart)
    }

    private var calendarDays: [Date?] {
        let start = monthStart(for: displayedMonthStart)
        guard let dayRange = calendar.range(of: .day, in: .month, for: start) else {
            return []
        }
        let firstWeekday = calendar.component(.weekday, from: start)
        let leadingCount = (firstWeekday - calendar.firstWeekday + 7) % 7

        var values: [Date?] = Array(repeating: nil, count: leadingCount)
        for day in dayRange {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: start) {
                values.append(date)
            }
        }
        let trailing = (7 - (values.count % 7)) % 7
        values.append(contentsOf: Array(repeating: nil, count: trailing))
        return values
    }

    private var canGoToPreviousMonth: Bool {
        guard let previousMonth = calendar.date(byAdding: .month, value: -1, to: displayedMonthStart),
              let previousMonthEnd = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart(for: previousMonth))
        else {
            return false
        }
        return calendar.startOfDay(for: previousMonthEnd) >= calendar.startOfDay(for: Date())
    }

    private static let monthTitleFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMMM yyyy"
        return formatter
    }()

    private static let successDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter
    }()

    private func shiftMonth(by offset: Int) {
        guard let next = calendar.date(byAdding: .month, value: offset, to: displayedMonthStart) else { return }
        displayedMonthStart = monthStart(for: next)
    }

    private func monthStart(for date: Date) -> Date {
        let comps = calendar.dateComponents([.year, .month], from: date)
        return calendar.date(from: comps) ?? date
    }

    private func isPastDay(_ date: Date) -> Bool {
        calendar.startOfDay(for: date) < calendar.startOfDay(for: Date())
    }

    private func dayTextColor(isSelected: Bool, isPast: Bool) -> Color {
        if isSelected {
            return .black
        }
        if isPast {
            return Color.white.opacity(0.28)
        }
        return .white
    }

    private func submitCurrentBooking(token: String) async -> Bool {
        if bookingType == .group {
            let guestServiceIDs = guestRows.compactMap(\.serviceID)
            return await viewModel.submitGroup(token: token, guestServiceIDs: guestServiceIDs)
        }
        return await viewModel.submit(token: token)
    }

    private func guestServiceTitle(for row: GroupGuestRow) -> String {
        guard let serviceID = row.serviceID,
              let service = viewModel.services.first(where: { $0.id == serviceID }) else {
            return "Select service"
        }
        return service.name
    }

    private func updateGuestService(rowID: UUID, serviceID: Int) {
        guard let index = guestRows.firstIndex(where: { $0.id == rowID }) else { return }
        guestRows[index].serviceID = serviceID
    }

    private func removeGuestRow(rowID: UUID) {
        guestRows.removeAll(where: { $0.id == rowID })
    }

    private func appointmentSummaryCard(store: StoreDetailDTO) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing10) {
            HStack {
                sectionTitle("APPOINTMENT SUMMARY")
                Spacer()
                Text(selectedServicePriceText)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(brandGold)
            }

            summaryRow(label: "Service", value: selectedService?.name ?? "Select service")
            summaryRow(label: "Duration", value: selectedServiceDurationText)
            summaryRow(label: "Time", value: selectedSlotDisplay ?? "Select date & time")
            summaryRow(label: "Location", value: store.formattedAddress)
        }
        .padding(UITheme.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBG)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.panelCornerRadius)
                .stroke(Color.white.opacity(0.14), lineWidth: 1)
        )
    }

    private func summaryRow(label: String, value: String) -> some View {
        HStack(alignment: .top, spacing: UITheme.spacing12) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.secondary)
                .frame(width: 78, alignment: .leading)
            Spacer(minLength: 0)
            Text(value)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.trailing)
        }
    }

    private func currentBottomSafeAreaInset() -> CGFloat {
        let scenes = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        guard let scene = scenes.first,
              let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first
        else {
            return 0
        }

        return window.safeAreaInsets.bottom
    }

    private func formatDuration(_ minutes: Int) -> String {
        let hours = minutes / 60
        let mins = minutes % 60
        if hours > 0 {
            return "\(hours)h \(mins)m"
        }
        return "\(mins)m"
    }

    private func syncReferenceNote() {
        let current = viewModel.notes.trimmingCharacters(in: .whitespacesAndNewlines)

        guard let styleReference = appState.bookingStyleReference else {
            if let autoInjectedReferenceNote, current == autoInjectedReferenceNote {
                viewModel.notes = ""
            }
            autoInjectedReferenceNote = nil
            return
        }

        let nextNote = styleReference.noteText
        if current.isEmpty || (autoInjectedReferenceNote != nil && current == autoInjectedReferenceNote) {
            viewModel.notes = nextNote
            autoInjectedReferenceNote = nextNote
        }
    }
}

private struct CardStyle: ViewModifier {
    let cardBG: Color
    let brandGold: Color

    func body(content: Content) -> some View {
        content
            .padding(UITheme.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(cardBG)
            .clipShape(RoundedRectangle(cornerRadius: UITheme.panelCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: UITheme.panelCornerRadius)
                    .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
            )
    }
}

#Preview {
    NavigationStack {
        BookAppointmentView(storeID: 1)
            .environmentObject(AppState())
    }
}
