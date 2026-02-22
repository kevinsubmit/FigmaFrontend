import SwiftUI

struct BookAppointmentView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: BookAppointmentViewModel
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    init(storeID: Int) {
        _viewModel = StateObject(wrappedValue: BookAppointmentViewModel(storeID: storeID))
    }

    var body: some View {
        Form {
            Section("Service") {
                Picker("Select Service", selection: Binding(get: {
                    viewModel.selectedServiceID ?? 0
                }, set: { viewModel.selectedServiceID = $0 })) {
                    ForEach(viewModel.services) { service in
                        Text("\(service.name) • $\(String(format: "%.2f", service.price))")
                            .tag(service.id)
                    }
                }
                .pickerStyle(.navigationLink)
            }

            Section("Technician (Optional)") {
                Picker("Select Technician", selection: Binding(get: {
                    viewModel.selectedTechnicianID ?? 0
                }, set: { viewModel.selectedTechnicianID = ($0 == 0 ? nil : $0) })) {
                    Text("Any").tag(0)
                    ForEach(viewModel.technicians) { tech in
                        Text(tech.name).tag(tech.id)
                    }
                }
                .pickerStyle(.navigationLink)
            }

            Section("Date & Time") {
                DatePicker("Date", selection: $viewModel.selectedDate, displayedComponents: .date)
                if viewModel.isLoadingSlots {
                    HStack {
                        ProgressView()
                        Text("Loading available times...")
                            .foregroundStyle(.secondary)
                    }
                } else if viewModel.availableSlots.isEmpty {
                    Text(viewModel.slotHintMessage ?? "No available times for this date.")
                        .font(.footnote)
                        .foregroundStyle(.red)
                } else {
                    Picker("Time", selection: Binding(get: {
                        viewModel.selectedSlot ?? ""
                    }, set: { value in
                        viewModel.selectSlot(value)
                    })) {
                        ForEach(viewModel.availableSlots, id: \.self) { slot in
                            Text(viewModel.displayTime(slot)).tag(slot)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }
                if let slotHint = viewModel.slotHintMessage, !slotHint.isEmpty, !viewModel.availableSlots.isEmpty {
                    Text(slotHint)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }

            Section("Notes") {
                TextField("Optional notes", text: $viewModel.notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            Section {
                Button {
                    Task {
                        guard let token = appState.requireAccessToken() else { return }
                        let ok = await viewModel.submit(token: token)
                        if ok {
                            try? await Task.sleep(for: .milliseconds(700))
                            dismiss()
                        }
                    }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView()
                    } else {
                        Text("Create Appointment")
                    }
                }
                .disabled(viewModel.isSubmitting || viewModel.selectedServiceID == nil)
            }
        }
        .navigationTitle("Book Appointment")
        .task {
            await viewModel.loadData()
        }
        .onChange(of: viewModel.selectedServiceID) { _ in
            Task { await viewModel.reloadAvailableSlots() }
        }
        .onChange(of: viewModel.selectedTechnicianID) { _ in
            Task { await viewModel.reloadAvailableSlots() }
        }
        .onChange(of: viewModel.selectedDate) { _ in
            Task { await viewModel.reloadAvailableSlots() }
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .onChange(of: viewModel.successMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Notice", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
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
}

#Preview {
    NavigationStack {
        BookAppointmentView(storeID: 1)
            .environmentObject(AppState())
    }
}
