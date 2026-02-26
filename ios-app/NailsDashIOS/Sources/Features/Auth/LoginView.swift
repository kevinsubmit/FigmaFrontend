import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appState: AppState

    @State private var phone: String = ""
    @State private var password: String = ""
    @State private var showPassword: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        NavigationStack {
            VStack(spacing: UITheme.spacing20) {
                Spacer(minLength: UITheme.spacing24)

                VStack(spacing: UITheme.spacing8) {
                    Text("NailsDash")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Sign in to continue")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: UITheme.spacing12) {
                    TextField("Phone (US)", text: $phone)
                        .keyboardType(.numberPad)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(.white)
                        .padding(.horizontal, UITheme.cardPadding)
                        .frame(minHeight: UITheme.controlHeight)
                        .background(cardBG)
                        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                        .overlay(
                            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                                .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
                        )

                    HStack(spacing: UITheme.spacing8) {
                        Group {
                            if showPassword {
                                TextField("Password", text: $password)
                            } else {
                                SecureField("Password", text: $password)
                            }
                        }
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(.white)

                        Button(showPassword ? "Hide" : "Show") {
                            showPassword.toggle()
                        }
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(brandGold)
                    }
                    .padding(.horizontal, UITheme.cardPadding)
                    .frame(minHeight: UITheme.controlHeight)
                    .background(cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                    .overlay(
                        RoundedRectangle(cornerRadius: UITheme.controlCornerRadius)
                            .stroke(brandGold.opacity(UITheme.cardStrokeOpacity), lineWidth: 1)
                    )
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
                                .tint(.black)
                        }
                        Text(appState.isLoadingAuth ? "Signing in..." : "Sign In")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: UITheme.ctaHeight)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.black)
                .background((appState.isLoadingAuth || phone.isEmpty || password.isEmpty) ? Color.white.opacity(0.18) : brandGold)
                .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius))
                .disabled(appState.isLoadingAuth || phone.isEmpty || password.isEmpty)

                Spacer()

                Text("Admin/store accounts must use admin portal")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, UITheme.spacing20)
            .background(Color.black.ignoresSafeArea())
            .navigationTitle("Login")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AppState())
}
