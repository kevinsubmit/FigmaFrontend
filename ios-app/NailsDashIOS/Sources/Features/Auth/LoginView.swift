import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appState: AppState

    @State private var phone: String = ""
    @State private var password: String = ""
    @State private var showPassword: Bool = false
    @State private var useVerificationCode: Bool = false
    @State private var verificationCode: String = ""
    @State private var countdown: Int = 0
    @State private var countdownTimer: Timer?
    @State private var isSendingCode: Bool = false
    @State private var localError: String?
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false
    @State private var showRegister: Bool = false

    private let brandGold = UITheme.brandGold

    var body: some View {
        NavigationStack {
            AuthBackgroundView {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: UITheme.spacing20) {
                        Spacer(minLength: UITheme.spacing24)

                        AuthLogoBlock(
                            title: "Welcome Back",
                            subtitle: "Log in to book and manage appointments"
                        )
                        .padding(.top, UITheme.spacing24)

                        loginMethodSwitcher

                        if let message = activeErrorMessage {
                            AuthErrorBanner(message: message)
                        }

                        phoneInput

                        if useVerificationCode {
                            verificationCodeInput
                        } else {
                            passwordInput
                        }

                        signInButton

                        HStack(spacing: UITheme.spacing5) {
                            Text("Don't have an account?")
                                .foregroundStyle(.secondary)
                            Button("Sign Up") {
                                showRegister = true
                            }
                            .foregroundStyle(brandGold)
                            .fontWeight(.semibold)
                        }
                        .font(.system(size: 14))
                        .padding(.top, UITheme.spacing2)

                        Text("Admin/store accounts must use admin portal")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.top, UITheme.spacing24)
                            .padding(.bottom, UITheme.spacing24)
                    }
                    .padding(.horizontal, UITheme.spacing24)
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(appState)
            }
            .onChange(of: appState.authMessage) { newValue in
                guard let message = newValue?.trimmingCharacters(in: .whitespacesAndNewlines),
                      !message.isEmpty else {
                    return
                }
                localError = message
                presentAlert(message)
            }
            .onDisappear {
                invalidateTimer()
            }
            .alert("Notice", isPresented: $showAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(alertMessage)
            }
        }
    }

    private var activeErrorMessage: String? {
        if let localError, !localError.isEmpty { return localError }
        if let authMessage = appState.authMessage, !authMessage.isEmpty { return authMessage }
        return nil
    }

    private var loginMethodSwitcher: some View {
        HStack(spacing: UITheme.spacing8) {
            methodButton(title: "Password", selected: !useVerificationCode) {
                useVerificationCode = false
                localError = nil
            }
            methodButton(title: "SMS Code", selected: useVerificationCode) {
                useVerificationCode = true
                localError = nil
            }
        }
        .padding(UITheme.spacing4)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private var phoneInput: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text("US Phone Number")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.85))

            TextField("e.g. 4151234567", text: $phone)
                .keyboardType(.phonePad)
                .authTextFieldStyle()

            Text("US numbers only (10 digits or 1+10)")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
    }

    private var passwordInput: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text("Password")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.85))

            HStack(spacing: UITheme.spacing8) {
                Group {
                    if showPassword {
                        TextField("Enter your password", text: $password)
                    } else {
                        SecureField("Enter your password", text: $password)
                    }
                }
                .authTextFieldStyle()

                Button(showPassword ? "Hide" : "Show") {
                    showPassword.toggle()
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(brandGold)
                .padding(.horizontal, UITheme.spacing10)
                .frame(height: 50)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            }
        }
    }

    private var verificationCodeInput: some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text("Verification Code")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.85))

            HStack(spacing: UITheme.spacing8) {
                TextField("6-digit code", text: $verificationCode)
                    .keyboardType(.numberPad)
                    .authTextFieldStyle()
                    .onChange(of: verificationCode) { newValue in
                        verificationCode = String(newValue.filter { $0.isNumber }.prefix(6))
                    }

                Button(countdown > 0 ? "\(countdown)s" : "Send Code") {
                    Task { await sendCode() }
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.black)
                .padding(.horizontal, UITheme.spacing14)
                .frame(height: 50)
                .background((countdown > 0 || isSendingCode) ? Color.white.opacity(0.2) : brandGold)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .disabled(countdown > 0 || isSendingCode)
            }

            Text("SMS login is currently unavailable. Use password login.")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
    }

    private var signInButton: some View {
        Button {
            Task { await handleSignIn() }
        } label: {
            HStack(spacing: UITheme.spacing8) {
                if appState.isLoadingAuth {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.black)
                }
                Text(appState.isLoadingAuth ? "Signing in..." : "Sign In")
                    .font(.system(size: 18, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 52)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.black)
        .background(signInDisabled ? Color.white.opacity(0.18) : brandGold)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .disabled(signInDisabled)
    }

    private var signInDisabled: Bool {
        appState.isLoadingAuth || phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || (useVerificationCode ? verificationCode.count != 6 : password.isEmpty)
    }

    private func methodButton(title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(height: 42)
                .foregroundStyle(selected ? .black : Color.white.opacity(0.9))
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(selected ? brandGold : Color.clear)
                )
        }
        .buttonStyle(.plain)
    }

    private func handleSignIn() async {
        localError = nil
        appState.authMessage = nil

        guard isValidUSPhone(phone) else {
            let message = "Enter a valid US phone number."
            localError = message
            presentAlert(message)
            return
        }

        if useVerificationCode {
            let message = "SMS login is not available yet. Please use password login."
            localError = message
            presentAlert(message)
            return
        }

        await appState.login(phone: phone, password: password)
    }

    private func sendCode() async {
        localError = nil
        appState.authMessage = nil

        guard isValidUSPhone(phone) else {
            let message = "Enter a valid US phone number."
            localError = message
            presentAlert(message)
            return
        }

        isSendingCode = true
        defer { isSendingCode = false }

        do {
            let _ = try await appState.sendVerificationCode(phone: phone, purpose: .login)
            startCountdown()
        } catch let error as APIError {
            let message = mapAPIError(error)
            localError = message
            presentAlert(message)
        } catch {
            let message = error.localizedDescription
            localError = message
            presentAlert(message)
        }
    }

    private func startCountdown() {
        invalidateTimer()
        countdown = 60
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            if countdown <= 1 {
                timer.invalidate()
                countdown = 0
            } else {
                countdown -= 1
            }
        }
    }

    private func invalidateTimer() {
        countdownTimer?.invalidate()
        countdownTimer = nil
    }

    private func isValidUSPhone(_ input: String) -> Bool {
        let digits = input.filter(\.isNumber)
        return digits.count == 10 || (digits.count == 11 && digits.hasPrefix("1"))
    }

    private func mapAPIError(_ error: APIError) -> String {
        switch error {
        case .unauthorized:
            return "Incorrect phone number or password."
        case .forbidden(let detail),
             .validation(let detail),
             .server(let detail),
             .network(let detail):
            return detail
        case .invalidURL:
            return "Invalid API configuration."
        case .decoding:
            return "Response parse failed."
        }
    }

    private func presentAlert(_ message: String) {
        alertMessage = message
        showAlert = true
    }
}

#Preview {
    LoginView()
        .environmentObject(AppState())
}

private struct AuthBackgroundView<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 58.0 / 255.0, green: 42.0 / 255.0, blue: 18.0 / 255.0),
                    Color.black,
                    Color.black,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            content
        }
    }
}

private struct AuthLogoBlock: View {
    var title: String
    var subtitle: String

    var body: some View {
        VStack(spacing: UITheme.spacing12) {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [UITheme.brandGold, Color(red: 176.0 / 255.0, green: 141.0 / 255.0, blue: 45.0 / 255.0)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 80)
                .overlay(
                    Text("💅")
                        .font(.system(size: 34))
                )

            VStack(spacing: UITheme.spacing6) {
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

private struct AuthErrorBanner: View {
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: UITheme.spacing8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
                .font(.system(size: 12, weight: .semibold))
                .padding(.top, UITheme.spacing2)

            Text(message)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Color(red: 1.0, green: 0.86, blue: 0.86))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(UITheme.spacing10)
        .background(Color.red.opacity(0.14))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.red.opacity(0.35), lineWidth: 1)
        )
    }
}

private struct AuthTextFieldStyleModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .foregroundStyle(.white)
            .padding(.horizontal, UITheme.cardPadding)
            .frame(minHeight: 50)
            .background(Color.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(UITheme.brandGold.opacity(0.22), lineWidth: 1)
            )
    }
}

private extension View {
    func authTextFieldStyle() -> some View {
        modifier(AuthTextFieldStyleModifier())
    }
}

private struct RegisterView: View {
    private enum Step {
        case verifyPhone
        case completeProfile
    }

    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var step: Step = .verifyPhone
    @State private var phone: String = ""
    @State private var verificationCode: String = ""
    @State private var username: String = ""
    @State private var fullName: String = ""
    @State private var password: String = ""
    @State private var showPassword: Bool = false
    @State private var confirmPassword: String = ""
    @State private var showConfirmPassword: Bool = false
    @State private var referralCode: String = ""
    @State private var countdown: Int = 0
    @State private var countdownTimer: Timer?
    @State private var isSendingCode: Bool = false
    @State private var isVerifyingCode: Bool = false
    @State private var localError: String?
    @State private var alertMessage: String = ""
    @State private var showAlert: Bool = false

    private let brandGold = UITheme.brandGold

    var body: some View {
        AuthBackgroundView {
            ScrollView(showsIndicators: false) {
                VStack(spacing: UITheme.spacing20) {
                    header

                    AuthLogoBlock(
                        title: "Create Your Account",
                        subtitle: step == .verifyPhone ? "Verify your phone number" : "Complete your profile"
                    )
                    .padding(.top, UITheme.spacing10)

                    progressIndicator

                    if let message = activeErrorMessage {
                        AuthErrorBanner(message: message)
                    }

                    if step == .verifyPhone {
                        verifyPhoneContent
                    } else {
                        completeProfileContent
                    }

                    Spacer(minLength: UITheme.spacing24)
                }
                .padding(.horizontal, UITheme.spacing24)
                .padding(.bottom, UITheme.spacing24)
            }
        }
        .navigationBarHidden(true)
        .onChange(of: appState.authMessage) { newValue in
            guard let message = newValue?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !message.isEmpty else {
                return
            }
            localError = message
            presentAlert(message)
        }
        .onChange(of: appState.isLoggedIn) { isLoggedIn in
            if isLoggedIn {
                dismiss()
            }
        }
        .onDisappear {
            invalidateTimer()
        }
        .alert("Notice", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
    }

    private var header: some View {
        HStack(spacing: UITheme.spacing12) {
            Button {
                if step == .completeProfile {
                    step = .verifyPhone
                } else {
                    dismiss()
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            Text("Sign Up")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            Spacer()

            Color.clear
                .frame(width: 40, height: 40)
        }
        .padding(.top, UITheme.spacing24)
    }

    private var progressIndicator: some View {
        HStack(spacing: UITheme.spacing10) {
            progressBubble(number: "1", active: true)

            Rectangle()
                .fill(step == .completeProfile ? brandGold : Color.white.opacity(0.18))
                .frame(width: 56, height: 3)
                .clipShape(Capsule())

            progressBubble(number: "2", active: step == .completeProfile)
        }
    }

    private var verifyPhoneContent: some View {
        VStack(spacing: UITheme.spacing14) {
            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("US Phone Number")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.85))

                TextField("e.g. 4151234567", text: $phone)
                    .keyboardType(.phonePad)
                    .authTextFieldStyle()

                Text("US numbers only (10 digits or 1+10)")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: UITheme.spacing8) {
                Text("Verification Code")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.85))

                HStack(spacing: UITheme.spacing8) {
                    TextField("6-digit code", text: $verificationCode)
                        .keyboardType(.numberPad)
                        .authTextFieldStyle()
                        .onChange(of: verificationCode) { newValue in
                            verificationCode = String(newValue.filter { $0.isNumber }.prefix(6))
                        }

                    Button(countdown > 0 ? "\(countdown)s" : "Send Code") {
                        Task { await sendCode() }
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, UITheme.spacing14)
                    .frame(height: 50)
                    .background((countdown > 0 || isSendingCode) ? Color.white.opacity(0.2) : brandGold)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .disabled(countdown > 0 || isSendingCode)
                }
            }

            Button {
                Task { await verifyPhoneStep() }
            } label: {
                HStack(spacing: UITheme.spacing8) {
                    if isVerifyingCode {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.black)
                    }
                    Text(isVerifyingCode ? "Verifying..." : "Next")
                        .font(.system(size: 18, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 52)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.black)
            .background(verifyPhoneDisabled ? Color.white.opacity(0.18) : brandGold)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .disabled(verifyPhoneDisabled)
        }
    }

    private var completeProfileContent: some View {
        VStack(spacing: UITheme.spacing14) {
            labeledField(title: "Username *", hint: "Shown on reviews and your profile") {
                TextField("At least 3 characters", text: $username)
                    .authTextFieldStyle()
            }

            labeledField(title: "Full Name", hint: nil) {
                TextField("Optional", text: $fullName)
                    .authTextFieldStyle()
            }

            labeledField(title: "Password *", hint: "At least 8 characters") {
                passwordField(
                    placeholder: "At least 8 characters",
                    text: $password,
                    isShown: $showPassword
                )
            }

            labeledField(title: "Confirm Password *", hint: nil) {
                passwordField(
                    placeholder: "Re-enter your password",
                    text: $confirmPassword,
                    isShown: $showConfirmPassword
                )
            }

            labeledField(title: "Referral Code", hint: "Optional") {
                TextField("Optional referral code", text: $referralCode)
                    .authTextFieldStyle()
            }

            Button {
                Task { await submitRegister() }
            } label: {
                HStack(spacing: UITheme.spacing8) {
                    if appState.isLoadingAuth {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.black)
                    }
                    Text(appState.isLoadingAuth ? "Creating..." : "Create Account")
                        .font(.system(size: 18, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 52)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.black)
            .background(registerDisabled ? Color.white.opacity(0.18) : brandGold)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .disabled(registerDisabled)
        }
    }

    private var activeErrorMessage: String? {
        if let localError, !localError.isEmpty { return localError }
        if let authMessage = appState.authMessage, !authMessage.isEmpty { return authMessage }
        return nil
    }

    private var verifyPhoneDisabled: Bool {
        isVerifyingCode || phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || verificationCode.count != 6
    }

    private var registerDisabled: Bool {
        appState.isLoadingAuth || username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty || confirmPassword.isEmpty
    }

    private func labeledField<Content: View>(title: String, hint: String?, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: UITheme.spacing8) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.85))
            content()
            if let hint {
                Text(hint)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func passwordField(placeholder: String, text: Binding<String>, isShown: Binding<Bool>) -> some View {
        HStack(spacing: UITheme.spacing8) {
            Group {
                if isShown.wrappedValue {
                    TextField(placeholder, text: text)
                } else {
                    SecureField(placeholder, text: text)
                }
            }
            .authTextFieldStyle()

            Button(isShown.wrappedValue ? "Hide" : "Show") {
                isShown.wrappedValue.toggle()
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(brandGold)
            .padding(.horizontal, UITheme.spacing10)
            .frame(height: 50)
            .background(Color.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
    }

    private func progressBubble(number: String, active: Bool) -> some View {
        Text(number)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(active ? .black : .secondary)
            .frame(width: 30, height: 30)
            .background(active ? brandGold : Color.white.opacity(0.08))
            .clipShape(Circle())
    }

    private func sendCode() async {
        localError = nil
        appState.authMessage = nil

        guard isValidUSPhone(phone) else {
            let message = "Enter a valid US phone number."
            localError = message
            presentAlert(message)
            return
        }

        isSendingCode = true
        defer { isSendingCode = false }

        do {
            let _ = try await appState.sendVerificationCode(phone: phone, purpose: .register)
            startCountdown()
        } catch let error as APIError {
            let message = mapAPIError(error)
            localError = message
            presentAlert(message)
        } catch {
            let message = error.localizedDescription
            localError = message
            presentAlert(message)
        }
    }

    private func verifyPhoneStep() async {
        localError = nil
        appState.authMessage = nil

        guard isValidUSPhone(phone) else {
            let message = "Enter a valid US phone number."
            localError = message
            presentAlert(message)
            return
        }

        guard verificationCode.count == 6 else {
            let message = "Please enter a valid 6-digit verification code."
            localError = message
            presentAlert(message)
            return
        }

        isVerifyingCode = true
        defer { isVerifyingCode = false }

        do {
            let result = try await appState.verifyCode(phone: phone, code: verificationCode, purpose: .register)
            if result.valid {
                step = .completeProfile
            } else {
                let message = "The verification code is invalid or expired. Please request a new code."
                localError = message
                presentAlert(message)
            }
        } catch let error as APIError {
            let message = mapAPIError(error)
            localError = message
            presentAlert(message)
        } catch {
            let message = error.localizedDescription
            localError = message
            presentAlert(message)
        }
    }

    private func submitRegister() async {
        localError = nil
        appState.authMessage = nil

        guard isValidUSPhone(phone) else {
            let message = "Enter a valid US phone number."
            localError = message
            presentAlert(message)
            return
        }

        guard verificationCode.count == 6 else {
            let message = "Please enter a valid 6-digit verification code."
            localError = message
            presentAlert(message)
            return
        }

        let trimmedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmedUsername.count >= 3 else {
            let message = "Username must be at least 3 characters."
            localError = message
            presentAlert(message)
            return
        }

        guard password.count >= 8 else {
            let message = "Password must be at least 8 characters."
            localError = message
            presentAlert(message)
            return
        }

        guard password == confirmPassword else {
            let message = "Passwords do not match."
            localError = message
            presentAlert(message)
            return
        }

        await appState.register(
            phone: phone,
            verificationCode: verificationCode,
            username: trimmedUsername,
            password: password,
            fullName: fullName,
            referralCode: referralCode
        )
    }

    private func startCountdown() {
        invalidateTimer()
        countdown = 60
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            if countdown <= 1 {
                timer.invalidate()
                countdown = 0
            } else {
                countdown -= 1
            }
        }
    }

    private func invalidateTimer() {
        countdownTimer?.invalidate()
        countdownTimer = nil
    }

    private func isValidUSPhone(_ input: String) -> Bool {
        let digits = input.filter { $0.isNumber }
        return digits.count == 10 || (digits.count == 11 && digits.hasPrefix("1"))
    }

    private func mapAPIError(_ error: APIError) -> String {
        switch error {
        case .unauthorized:
            return "Incorrect phone number or password."
        case .forbidden(let detail),
             .validation(let detail),
             .server(let detail),
             .network(let detail):
            return detail
        case .invalidURL:
            return "Invalid API configuration."
        case .decoding:
            return "Response parse failed."
        }
    }

    private func presentAlert(_ message: String) {
        alertMessage = message
        showAlert = true
    }
}
