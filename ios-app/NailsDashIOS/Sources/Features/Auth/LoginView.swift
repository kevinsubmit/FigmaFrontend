import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appState: AppState

    @State private var phone: String = ""
    @State private var password: String = ""
    @State private var showPassword: Bool = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Spacer(minLength: 24)

                VStack(spacing: 8) {
                    Text("NailsDash")
                        .font(.system(size: 32, weight: .bold))
                    Text("Sign in to continue")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 12) {
                    TextField("Phone (US)", text: $phone)
                        .keyboardType(.numberPad)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    HStack(spacing: 8) {
                        Group {
                            if showPassword {
                                TextField("Password", text: $password)
                            } else {
                                SecureField("Password", text: $password)
                            }
                        }
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                        Button(showPassword ? "Hide" : "Show") {
                            showPassword.toggle()
                        }
                        .font(.footnote.weight(.semibold))
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                if let msg = appState.authMessage, !msg.isEmpty {
                    Text(msg)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task { await appState.login(phone: phone, password: password) }
                } label: {
                    HStack {
                        if appState.isLoadingAuth {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                        }
                        Text(appState.isLoadingAuth ? "Signing in..." : "Sign In")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .disabled(appState.isLoadingAuth || phone.isEmpty || password.isEmpty)

                Spacer()

                Text("Admin/store accounts must use admin portal")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 20)
            .navigationTitle("Login")
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AppState())
}
