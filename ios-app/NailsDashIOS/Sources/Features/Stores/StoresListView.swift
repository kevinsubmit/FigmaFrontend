import SwiftUI

struct StoresListView: View {
    @StateObject private var viewModel = StoresViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    var body: some View {
        List {
            Section("Stores") {
                ForEach(viewModel.stores) { store in
                    NavigationLink {
                        StoreDetailView(storeID: store.id)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(store.name)
                                .font(.headline)
                            Text(store.formattedAddress)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            HStack(spacing: 8) {
                                Text(String(format: "⭐ %.1f", store.rating))
                                Text("(\(store.review_count) reviews)")
                                    .foregroundStyle(.secondary)
                                if let distance = store.distance {
                                    Text(String(format: "• %.1f mi", distance))
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .font(.footnote)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Stores")
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading stores...")
                    .padding(20)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .task {
            if viewModel.stores.isEmpty {
                await viewModel.loadStores()
            }
        }
        .refreshable {
            await viewModel.loadStores()
        }
        .onChange(of: viewModel.errorMessage) { value in
            guard let value, !value.isEmpty else { return }
            alertMessage = value
            showAlert = true
        }
        .alert("Notice", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
    }
}

#Preview {
    NavigationStack {
        StoresListView()
    }
}
