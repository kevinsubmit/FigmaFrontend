import SwiftUI

struct StoreDetailView: View {
    let storeID: Int
    @StateObject private var viewModel = StoreDetailViewModel()
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let store = viewModel.store {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(store.name)
                            .font(.largeTitle.bold())
                        Text(store.formattedAddress)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(String(format: "⭐ %.1f (%d reviews)", store.rating, store.review_count))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    NavigationLink {
                        BookAppointmentView(storeID: store.id)
                    } label: {
                        Text("Book This Store")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    if !store.images.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(store.images) { image in
                                    AsyncImage(url: imageURL(from: image.image_url)) { phase in
                                        switch phase {
                                        case .empty:
                                            ProgressView()
                                                .frame(width: 220, height: 140)
                                        case .success(let img):
                                            img
                                                .resizable()
                                                .scaledToFill()
                                                .frame(width: 220, height: 140)
                                                .clipped()
                                        case .failure:
                                            Color.gray.opacity(0.2)
                                                .overlay(Text("Image failed").font(.caption))
                                                .frame(width: 220, height: 140)
                                        @unknown default:
                                            EmptyView()
                                        }
                                    }
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                            }
                        }
                    }

                    if let desc = store.description, !desc.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Description")
                                .font(.headline)
                            Text(desc)
                                .font(.body)
                                .foregroundStyle(.secondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Contact")
                            .font(.headline)
                        Text("Phone: \(store.phone ?? "-")")
                            .font(.subheadline)
                        Text("Email: \(store.email ?? "-")")
                            .font(.subheadline)
                        Text("Hours: \(store.opening_hours ?? "-")")
                            .font(.subheadline)
                    }
                    .foregroundStyle(.secondary)
                }
            }
            .padding(16)
        }
        .navigationTitle("Store Detail")
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if viewModel.isLoading {
                ProgressView("Loading detail...")
                    .padding(20)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .task {
            await viewModel.loadStore(storeID: storeID)
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

    private func imageURL(from raw: String) -> URL? {
        if raw.lowercased().hasPrefix("http") {
            return URL(string: raw)
        }
        let base = APIClient.shared.baseURL.replacingOccurrences(of: "/api/v1", with: "")
        return URL(string: "\(base)\(raw)")
    }
}

#Preview {
    NavigationStack {
        StoreDetailView(storeID: 1)
    }
}
