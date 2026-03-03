import Photos
import PhotosUI
import SwiftUI
import UIKit

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    let vipBadgeText: String
    @State private var showLogoutConfirm: Bool = false
    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground
    private let languageOptions: [(code: String, name: String)] = [
        ("en", "English"),
        ("es", "Español"),
        ("zh", "中文"),
        ("ko", "한국어"),
        ("fr", "Français"),
        ("vi", "Tiếng Việt"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Settings") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing24) {
                    sectionHeader("ACCOUNT & PREFERENCES")
                    sectionCard {
                        settingsRow(
                            icon: "person",
                            title: "Profile Settings",
                            destination: ProfileSettingsView()
                                .environmentObject(appState)
                        )
                        rowDivider
                        settingsRow(
                            icon: "lock.shield",
                            title: "Change Password",
                            destination: ChangePasswordView()
                                .environmentObject(appState)
                        )
                        rowDivider
                        settingsRow(
                            icon: "phone",
                            title: "Phone Number",
                            destination: PhoneNumberSettingsView()
                                .environmentObject(appState)
                        )
                        rowDivider
                        settingsRow(
                            icon: "crown",
                            title: "VIP Membership",
                            badge: vipBadgeText,
                            destination: VipMembershipView()
                                .environmentObject(appState)
                        )
                        rowDivider
                        settingsRow(
                            icon: "globe",
                            title: "Language",
                            badge: selectedLanguageLabel,
                            destination: LanguageSettingsView()
                                .environmentObject(appState)
                        )
                        rowDivider
                        settingsRow(
                            icon: "bell",
                            title: "Notifications",
                            destination: NotificationsView()
                                .environmentObject(appState)
                        )
                    }

                    sectionHeader("PLATFORM")
                    sectionCard {
                        settingsRow(
                            icon: "message",
                            title: "Feedback & Support",
                            destination: FeedbackSupportView()
                        )
                        rowDivider
                        settingsRow(
                            icon: "building.2",
                            title: "Partnership Inquiry",
                            destination: PartnershipInquiryView()
                        )
                        rowDivider
                        settingsRow(
                            icon: "lock.shield",
                            title: "Privacy & Safety",
                            destination: PrivacySafetyView()
                        )
                    }

                    sectionHeader("OTHERS")
                    sectionCard {
                        settingsRow(
                            icon: "info.circle",
                            title: "About Us",
                            destination: AboutUsView()
                        )
                    }

                    Button(role: .destructive) {
                        showLogoutConfirm = true
                    } label: {
                        HStack(spacing: UITheme.spacing8) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.system(size: 17, weight: .bold))
                            Text("Logout")
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundStyle(Color.red.opacity(0.86))
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 56)
                        .background(cardBG.opacity(0.94))
                        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous)
                                .stroke(Color.white.opacity(0.10), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .confirmationDialog("Log out?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
                        Button("Log out", role: .destructive) {
                            appState.forceLogout()
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("You will need to sign in again.")
                    }

                    Text("Figma Make Beauty Platform • v1.2.0")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.22))
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, UITheme.spacing8)
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing24)
                .padding(.bottom, UITheme.spacing28)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }

    private var selectedLanguageLabel: String {
        let code = UserDefaults.standard.string(forKey: "nailsdash.language") ?? "en"
        return languageOptions.first(where: { $0.code == code })?.name ?? "English"
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 10, weight: .black))
            .kerning(2.0)
            .foregroundStyle(Color.white.opacity(0.42))
            .padding(.leading, UITheme.spacing2)
    }

    private func sectionCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) {
            content()
        }
        .background(cardBG.opacity(0.94))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
    }

    private var rowDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.10))
            .frame(height: UITheme.spacing1)
            .padding(.horizontal, UITheme.spacing14)
    }

    private func settingsRow<Destination: View>(
        icon: String,
        title: String,
        badge: String? = nil,
        destination: Destination
    ) -> some View {
        let resolvedIcon = resolvedSettingsIcon(icon)
        return NavigationLink {
            destination
        } label: {
            HStack(spacing: UITheme.spacing12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.05))
                        .frame(width: 40, height: 40)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(Color.white.opacity(0.10), lineWidth: 1)
                        )
                    Image(systemName: resolvedIcon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.68))
                }

                Text(title)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Spacer()

                if let badge, !badge.isEmpty {
                    Text(badge)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(brandGold)
                        .padding(.horizontal, UITheme.spacing8)
                        .padding(.vertical, UITheme.spacing4)
                        .background(brandGold.opacity(0.12))
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(brandGold.opacity(0.26), lineWidth: 1)
                        )
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.30))
            }
            .padding(.horizontal, UITheme.spacing16)
            .padding(.vertical, UITheme.spacing14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func resolvedSettingsIcon(_ icon: String) -> String {
        if UIImage(systemName: icon) != nil {
            return icon
        }
        return "shield"
    }
}

private struct SettingsPlaceholderView: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    let icon: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: title) {
                dismiss()
            }

            ScrollView {
                UnifiedEmptyStateCard(
                    icon: icon,
                    title: "Coming Soon",
                    subtitle: subtitle,
                    compact: true
                )
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing24)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(UITheme.brandGold)
    }
}

private struct SettingsUpdateProfileRequestDTO: Encodable {
    let full_name: String?
    let gender: String?
    let birthday: String?
}

private struct SettingsUpdateProfileResponseDTO: Decodable {
    let message: String
    let user: AuthUser
}

private struct AvatarUploadResponseDTO: Decodable {
    let avatar_url: String
}

private struct SettingsUpdatePasswordRequestDTO: Encodable {
    let current_password: String
    let new_password: String
}

private struct SettingsUpdatePasswordResponseDTO: Decodable {
    let message: String
}

private struct SettingsSendVerificationCodeRequestDTO: Encodable {
    let phone: String
    let purpose: String
}

private struct SettingsSendVerificationCodeResponseDTO: Decodable {
    let message: String
    let expires_in: Int
}

private struct SettingsUpdatePhoneRequestDTO: Encodable {
    let new_phone: String
    let verification_code: String
    let current_password: String
}

private struct SettingsUpdatePhoneResponseDTO: Decodable {
    let message: String
}

private struct SettingsUpdateRequestDTO: Encodable {
    let notification_enabled: Bool?
    let language: String?
}

private struct SettingsUpdateResponseDTO: Decodable {
    let message: String
}

private struct SettingsService {
    func getCurrentUser(token: String) async throws -> AuthUser {
        try await APIClient.shared.request(path: "/auth/me", token: token)
    }

    func updateProfile(token: String, payload: SettingsUpdateProfileRequestDTO) async throws -> SettingsUpdateProfileResponseDTO {
        try await APIClient.shared.request(path: "/users/profile", method: "PUT", token: token, body: payload)
    }

    func updatePassword(token: String, payload: SettingsUpdatePasswordRequestDTO) async throws -> SettingsUpdatePasswordResponseDTO {
        try await APIClient.shared.request(path: "/users/password", method: "PUT", token: token, body: payload)
    }

    func sendVerificationCode(phone: String) async throws -> SettingsSendVerificationCodeResponseDTO {
        let payload = SettingsSendVerificationCodeRequestDTO(phone: phone, purpose: "register")
        return try await APIClient.shared.request(path: "/auth/send-verification-code", method: "POST", body: payload)
    }

    func updatePhone(token: String, payload: SettingsUpdatePhoneRequestDTO) async throws -> SettingsUpdatePhoneResponseDTO {
        try await APIClient.shared.request(path: "/users/phone", method: "PUT", token: token, body: payload)
    }

    func updateSettings(token: String, payload: SettingsUpdateRequestDTO) async throws -> SettingsUpdateResponseDTO {
        try await APIClient.shared.request(path: "/users/settings", method: "PUT", token: token, body: payload)
    }

    func uploadAvatar(
        token: String,
        imageData: Data,
        fileName: String,
        mimeType: String = "image/jpeg"
    ) async throws -> AvatarUploadResponseDTO {
        guard let url = URL(string: APIClient.shared.baseURL + "/auth/me/avatar") else {
            throw APIError.invalidURL
        }

        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = buildMultipartBody(
            boundary: boundary,
            imageData: imageData,
            fieldName: "file",
            fileName: fileName,
            mimeType: mimeType
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("Invalid response")
        }

        switch http.statusCode {
        case 200 ... 299:
            do {
                return try JSONDecoder().decode(AvatarUploadResponseDTO.self, from: data)
            } catch {
                throw APIError.decoding
            }
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden(extractUploadErrorMessage(from: data, fallback: "You do not have permission to perform this action."))
        case 422:
            throw APIError.validation(extractUploadErrorMessage(from: data, fallback: "Please upload a valid image file."))
        default:
            throw APIError.server(extractUploadErrorMessage(from: data, fallback: "Failed to upload avatar. Please try again."))
        }
    }

    private func buildMultipartBody(
        boundary: String,
        imageData: Data,
        fieldName: String,
        fileName: String,
        mimeType: String
    ) -> Data {
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }

    private func extractUploadErrorMessage(from data: Data, fallback: String) -> String {
        guard !data.isEmpty else { return fallback }
        if let object = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) {
            if let dict = object as? [String: Any], let detail = dict["detail"] {
                if let detailText = detail as? String, !detailText.isEmpty {
                    return detailText
                }
                if let array = detail as? [Any] {
                    for item in array {
                        if let text = item as? String, !text.isEmpty {
                            return text
                        }
                        if let row = item as? [String: Any], let text = row["msg"] as? String, !text.isEmpty {
                            return text
                        }
                    }
                }
            }
        }
        return fallback
    }
}

@MainActor
private final class ProfileSettingsViewModel: ObservableObject {
    @Published var fullName: String = ""
    @Published var username: String = "-"
    @Published var phone: String = "-"
    @Published var gender: String = ""
    @Published var avatarURL: String?
    @Published var birthday: Date = Date()
    @Published var canEditGender: Bool = true
    @Published var canEditBirthday: Bool = true
    @Published var birthdayDisplay: String = "Not set"
    @Published var isLoading: Bool = false
    @Published var isSaving: Bool = false
    @Published var isUploadingAvatar: Bool = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = SettingsService()
    private let birthdayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    func load(token: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let user = try await service.getCurrentUser(token: token)
            fullName = user.full_name ?? ""
            username = user.username
            phone = formatUSPhoneForDisplay(user.phone)
            avatarURL = user.avatar_url
            gender = user.gender ?? ""
            canEditGender = gender.isEmpty
            if let birthdayText = user.date_of_birth,
               !birthdayText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
               let parsed = birthdayFormatter.date(from: birthdayText) {
                birthday = parsed
                birthdayDisplay = birthdayText
                canEditBirthday = false
            } else {
                birthdayDisplay = "Not set"
                canEditBirthday = true
            }
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func uploadAvatar(token: String, image: UIImage) async -> Bool {
        guard var imageData = image.jpegData(compressionQuality: 0.9) else {
            errorMessage = "Invalid image file."
            return false
        }

        let maxSize = 5 * 1024 * 1024
        if imageData.count > maxSize {
            guard let compressed = image.jpegData(compressionQuality: 0.72), compressed.count <= maxSize else {
                errorMessage = "File size exceeds 5MB limit."
                return false
            }
            imageData = compressed
        }

        isUploadingAvatar = true
        defer { isUploadingAvatar = false }
        do {
            let fileName = "avatar_\(Int(Date().timeIntervalSince1970)).jpg"
            let response = try await service.uploadAvatar(
                token: token,
                imageData: imageData,
                fileName: fileName
            )
            avatarURL = response.avatar_url
            actionMessage = "Avatar updated successfully!"
            errorMessage = nil
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func save(token: String) async -> Bool {
        let trimmedName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.isEmpty {
            errorMessage = "Full name is required."
            return false
        }
        if trimmedName.count < 2 {
            errorMessage = "Full name must be at least 2 characters."
            return false
        }

        let payload = SettingsUpdateProfileRequestDTO(
            full_name: trimmedName,
            gender: canEditGender ? normalizedGenderValue(gender) : nil,
            birthday: canEditBirthday ? birthdayFormatter.string(from: birthday) : nil
        )

        isSaving = true
        defer { isSaving = false }
        do {
            let response = try await service.updateProfile(token: token, payload: payload)
            actionMessage = response.message
            if canEditGender, let savedGender = response.user.gender, !savedGender.isEmpty {
                gender = savedGender
                canEditGender = false
            }
            if canEditBirthday, let savedBirthday = response.user.date_of_birth, !savedBirthday.isEmpty {
                birthdayDisplay = savedBirthday
                canEditBirthday = false
            }
            errorMessage = nil
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func normalizedGenderValue(_ raw: String) -> String? {
        let value = raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return nil }
        return ["male", "female", "other"].contains(value) ? value : nil
    }
}

@MainActor
private final class ChangePasswordViewModel: ObservableObject {
    @Published var currentPassword: String = ""
    @Published var newPassword: String = ""
    @Published var confirmPassword: String = ""
    @Published var isSaving: Bool = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = SettingsService()

    func save(token: String) async -> Bool {
        if currentPassword.isEmpty {
            errorMessage = "Current password is required."
            return false
        }
        if newPassword.count < 8 {
            errorMessage = "New password must be at least 8 characters."
            return false
        }
        if newPassword != confirmPassword {
            errorMessage = "Passwords do not match."
            return false
        }
        if newPassword == currentPassword {
            errorMessage = "New password must be different from current password."
            return false
        }

        isSaving = true
        defer { isSaving = false }
        do {
            let response = try await service.updatePassword(
                token: token,
                payload: SettingsUpdatePasswordRequestDTO(
                    current_password: currentPassword,
                    new_password: newPassword
                )
            )
            actionMessage = response.message
            errorMessage = nil
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

@MainActor
private final class PhoneNumberSettingsViewModel: ObservableObject {
    @Published var currentPhone: String = "-"
    @Published var isPhoneVerified: Bool = false
    @Published var newPhone: String = ""
    @Published var verificationCode: String = ""
    @Published var currentPassword: String = ""
    @Published var countdown: Int = 0
    @Published var isSendingCode: Bool = false
    @Published var isSaving: Bool = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let service = SettingsService()
    private var countdownTask: Task<Void, Never>?

    deinit {
        countdownTask?.cancel()
    }

    func load(token: String) async {
        do {
            let user = try await service.getCurrentUser(token: token)
            currentPhone = formatUSPhoneForDisplay(user.phone)
            isPhoneVerified = user.phone_verified ?? false
            errorMessage = nil
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sendCode() async {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(newPhone)
        guard normalizedPhone.count == 11 else {
            errorMessage = "Please enter a valid US phone number."
            return
        }

        isSendingCode = true
        defer { isSendingCode = false }
        do {
            let response = try await service.sendVerificationCode(phone: normalizedPhone)
            actionMessage = response.message
            errorMessage = nil
            startCountdown(seconds: 60)
        } catch let err as APIError {
            errorMessage = mapError(err)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updatePhone(token: String) async -> Bool {
        let normalizedPhone = PhoneFormatter.normalizeUSPhone(newPhone)
        guard normalizedPhone.count == 11 else {
            errorMessage = "Please enter a valid US phone number."
            return false
        }
        guard verificationCode.count == 6 else {
            errorMessage = "Verification code must be 6 digits."
            return false
        }
        guard !currentPassword.isEmpty else {
            errorMessage = "Current password is required."
            return false
        }

        isSaving = true
        defer { isSaving = false }
        do {
            let response = try await service.updatePhone(
                token: token,
                payload: SettingsUpdatePhoneRequestDTO(
                    new_phone: normalizedPhone,
                    verification_code: verificationCode,
                    current_password: currentPassword
                )
            )
            actionMessage = response.message
            errorMessage = nil
            newPhone = ""
            verificationCode = ""
            currentPassword = ""
            countdown = 0
            await load(token: token)
            return true
        } catch let err as APIError {
            errorMessage = mapError(err)
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func startCountdown(seconds: Int) {
        countdownTask?.cancel()
        countdown = seconds
        countdownTask = Task { @MainActor [weak self] in
            guard let self else { return }
            while self.countdown > 0 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                self.countdown -= 1
            }
        }
    }
}

@MainActor
private struct ProfileSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProfileSettingsViewModel()
    @State private var pickedAvatarItem: PhotosPickerItem?
    @State private var avatarPreviewImage: UIImage?

    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Profile Settings") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: SettingsVisualTokens.sectionSpacing) {
                    settingsDescription("Keep your profile details up to date.")
                    settingsMessageBanner(error: viewModel.errorMessage, message: viewModel.actionMessage)

                    settingsCard {
                        let isUploadingAvatar = viewModel.isUploadingAvatar
                        VStack(spacing: UITheme.spacing8) {
                            ZStack(alignment: .bottomTrailing) {
                                avatarDisplay
                                    .frame(width: 128, height: 128)
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                    )
                                    .shadow(color: Color.black.opacity(0.28), radius: 14, x: 0, y: 8)

                                PhotosPicker(
                                    selection: $pickedAvatarItem,
                                    matching: .images,
                                    photoLibrary: .shared()
                                ) {
                                    ZStack {
                                        Circle()
                                            .fill(brandGold)
                                            .frame(width: 36, height: 36)
                                        if isUploadingAvatar {
                                            ProgressView()
                                                .progressViewStyle(.circular)
                                                .tint(.white)
                                                .scaleEffect(0.82)
                                        } else {
                                            Image(systemName: "camera.fill")
                                                .font(.system(size: 14, weight: .bold))
                                                .foregroundStyle(.black)
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                                .disabled(isUploadingAvatar)
                            }

                            Text(isUploadingAvatar ? "Uploading avatar..." : "Tap camera icon to change avatar")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.55))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, UITheme.spacing2)

                        settingsStaticRow(label: "Username", value: viewModel.username)
                        settingsFieldLabel("Full Name")
                        settingsInputField {
                            TextField("Enter full name", text: $viewModel.fullName)
                                .textInputAutocapitalization(.words)
                        }

                        settingsStaticRow(label: "Phone Number", value: viewModel.phone)

                        if viewModel.canEditGender {
                            settingsFieldLabel("Gender")
                            settingsInputField {
                                Picker("Gender", selection: $viewModel.gender) {
                                    Text("Select gender").tag("")
                                    Text("Male").tag("male")
                                    Text("Female").tag("female")
                                    Text("Other").tag("other")
                                }
                                .pickerStyle(.menu)
                                .tint(brandGold)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        } else {
                            settingsStaticRow(label: "Gender", value: viewModel.gender.capitalized)
                        }

                        if viewModel.canEditBirthday {
                            settingsFieldLabel("Date of Birth")
                            settingsInputField {
                                DatePicker(
                                    "Birthday",
                                    selection: $viewModel.birthday,
                                    displayedComponents: .date
                                )
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .tint(brandGold)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        } else {
                            settingsStaticRow(label: "Date of Birth", value: viewModel.birthdayDisplay)
                        }

                        Button {
                            guard let token = appState.requireAccessToken() else { return }
                            Task {
                                let success = await viewModel.save(token: token)
                                if success {
                                    await appState.refreshSession()
                                }
                            }
                        } label: {
                            HStack(spacing: UITheme.spacing8) {
                                if viewModel.isSaving {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.black)
                                }
                                Text(viewModel.isSaving ? "Saving..." : "Save Changes")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: SettingsVisualTokens.ctaHeight)
                            .background(brandGold)
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(viewModel.isSaving)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, SettingsVisualTokens.topPadding)
                .padding(.bottom, SettingsVisualTokens.bottomPadding)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
        .task {
            guard let token = appState.requireAccessToken() else { return }
            await viewModel.load(token: token)
        }
        .onChange(of: pickedAvatarItem) { item in
            guard let item else { return }
            Task {
                await handlePickedAvatar(item)
            }
        }
    }

    @ViewBuilder
    private var avatarDisplay: some View {
        if let avatarPreviewImage {
            Image(uiImage: avatarPreviewImage)
                .resizable()
                .scaledToFill()
        } else if let url = AssetURLResolver.resolveURL(from: viewModel.avatarURL) {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .tint(brandGold)
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure:
                    avatarPlaceholder
                @unknown default:
                    avatarPlaceholder
                }
            }
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        ZStack {
            Color.white.opacity(0.06)
            Image(systemName: "person.fill")
                .font(.system(size: 52, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.35))
        }
    }

    private func handlePickedAvatar(_ item: PhotosPickerItem) async {
        guard let token = appState.requireAccessToken() else {
            pickedAvatarItem = nil
            return
        }
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                viewModel.errorMessage = "Invalid image file."
                pickedAvatarItem = nil
                return
            }
            avatarPreviewImage = image
            let success = await viewModel.uploadAvatar(token: token, image: image)
            if success {
                await appState.refreshSession()
            } else {
                avatarPreviewImage = nil
            }
        } catch {
            viewModel.errorMessage = "Failed to read image."
            avatarPreviewImage = nil
        }
        pickedAvatarItem = nil
    }
}

private struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ChangePasswordViewModel()

    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Change Password") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: SettingsVisualTokens.sectionSpacing) {
                    settingsDescription("Use at least 8 characters and keep your account secure.")
                    settingsMessageBanner(error: viewModel.errorMessage, message: viewModel.actionMessage)
                    settingsInfoCard(
                        title: "Password Requirements",
                        bullets: [
                            "At least 8 characters long",
                            "Different from your current password",
                        ]
                    )

                    settingsCard {
                        settingsFieldLabel("Current Password")
                        settingsInputField {
                            SecureField("Enter current password", text: $viewModel.currentPassword)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        settingsFieldLabel("New Password")
                        settingsInputField {
                            SecureField("Enter new password", text: $viewModel.newPassword)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        settingsFieldLabel("Confirm Password")
                        settingsInputField {
                            SecureField("Confirm new password", text: $viewModel.confirmPassword)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        Button {
                            guard let token = appState.requireAccessToken() else { return }
                            Task {
                                _ = await viewModel.save(token: token)
                            }
                        } label: {
                            HStack(spacing: UITheme.spacing8) {
                                if viewModel.isSaving {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.black)
                                }
                                Text(viewModel.isSaving ? "Updating..." : "Update Password")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: SettingsVisualTokens.ctaHeight)
                            .background(brandGold)
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(viewModel.isSaving)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, SettingsVisualTokens.topPadding)
                .padding(.bottom, SettingsVisualTokens.bottomPadding)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }
}

private struct PhoneNumberSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = PhoneNumberSettingsViewModel()

    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Phone Number") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: SettingsVisualTokens.sectionSpacing) {
                    settingsDescription("Update your login phone with verification code and current password.")
                    settingsMessageBanner(error: viewModel.errorMessage, message: viewModel.actionMessage)
                    settingsInfoCard(
                        title: "Important",
                        bullets: [
                            "You'll need to verify your new phone number",
                            "Your current password is required for security",
                            "This updates your login credentials",
                        ]
                    )

                    settingsCard {
                        settingsStaticRow(label: "Current Phone", value: viewModel.currentPhone)
                        if viewModel.isPhoneVerified {
                            Text("Verified")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.green.opacity(0.90))
                                .padding(.horizontal, UITheme.spacing8)
                                .padding(.vertical, UITheme.spacing4)
                                .background(Color.green.opacity(0.10))
                                .clipShape(Capsule())
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        settingsFieldLabel("New Phone")
                        HStack(spacing: UITheme.spacing10) {
                            settingsInputField {
                                TextField("Enter new phone", text: $viewModel.newPhone)
                                    .keyboardType(.numberPad)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                            }

                            Button {
                                Task { await viewModel.sendCode() }
                            } label: {
                                Text(viewModel.countdown > 0 ? "\(viewModel.countdown)s" : (viewModel.isSendingCode ? "..." : "Send"))
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.black)
                                    .frame(width: 92)
                                    .frame(minHeight: SettingsVisualTokens.fieldHeight)
                                    .background((viewModel.isSendingCode || viewModel.countdown > 0) ? brandGold.opacity(0.50) : brandGold)
                                    .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .disabled(viewModel.isSendingCode || viewModel.countdown > 0)
                        }

                        settingsFieldLabel("Verification Code")
                        settingsInputField {
                            TextField("Enter 6-digit code", text: $viewModel.verificationCode)
                                .keyboardType(.numberPad)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        settingsFieldLabel("Current Password")
                        settingsInputField {
                            SecureField("Enter current password", text: $viewModel.currentPassword)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        Button {
                            guard let token = appState.requireAccessToken() else { return }
                            Task {
                                let success = await viewModel.updatePhone(token: token)
                                if success {
                                    await appState.refreshSession()
                                }
                            }
                        } label: {
                            HStack(spacing: UITheme.spacing8) {
                                if viewModel.isSaving {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.black)
                                }
                                Text(viewModel.isSaving ? "Updating..." : "Update Phone Number")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: SettingsVisualTokens.ctaHeight)
                            .background(brandGold)
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(viewModel.isSaving)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, SettingsVisualTokens.topPadding)
                .padding(.bottom, SettingsVisualTokens.bottomPadding)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
        .task {
            guard let token = appState.requireAccessToken() else { return }
            await viewModel.load(token: token)
        }
    }
}

private struct LanguageSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @State private var selectedLanguage: String = UserDefaults.standard.string(forKey: "nailsdash.language") ?? "en"
    @State private var isSaving: Bool = false
    @State private var errorMessage: String?
    @State private var actionMessage: String?

    private let brandGold = UITheme.brandGold
    private let service = SettingsService()
    private let options: [(code: String, name: String)] = [
        ("en", "English"),
        ("es", "Español"),
        ("zh", "中文"),
        ("ko", "한국어"),
        ("fr", "Français"),
        ("vi", "Tiếng Việt"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Language") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: SettingsVisualTokens.sectionSpacing) {
                    settingsDescription("Choose your preferred app language.")
                    settingsMessageBanner(error: errorMessage, message: actionMessage)

                    settingsCard {
                        ForEach(options, id: \.code) { item in
                            Button {
                                selectedLanguage = item.code
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: UITheme.spacing2) {
                                        Text(item.name)
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundStyle(selectedLanguage == item.code ? brandGold : .white)
                                        Text(languageSubtitle(item.code))
                                            .font(.system(size: 11, weight: .medium))
                                            .foregroundStyle(Color.white.opacity(0.40))
                                    }
                                    Spacer()
                                    Image(systemName: selectedLanguage == item.code ? "checkmark.circle.fill" : "circle")
                                        .font(.system(size: 18, weight: .semibold))
                                        .foregroundStyle(selectedLanguage == item.code ? brandGold : Color.white.opacity(0.26))
                                }
                                .padding(.horizontal, UITheme.spacing16)
                                .padding(.vertical, UITheme.spacing14)
                                .frame(minHeight: 58)
                            }
                            .buttonStyle(.plain)

                            if item.code != options.last?.code {
                                Rectangle()
                                    .fill(Color.white.opacity(0.10))
                                    .frame(height: 1)
                                    .padding(.leading, UITheme.spacing14)
                            }
                        }

                        Button {
                            guard let token = appState.requireAccessToken() else { return }
                            Task {
                                isSaving = true
                                defer { isSaving = false }
                                do {
                                    let payload = SettingsUpdateRequestDTO(notification_enabled: nil, language: selectedLanguage)
                                    let response = try await service.updateSettings(token: token, payload: payload)
                                    UserDefaults.standard.set(selectedLanguage, forKey: "nailsdash.language")
                                    actionMessage = response.message
                                    errorMessage = nil
                                } catch let err as APIError {
                                    errorMessage = mapError(err)
                                } catch {
                                    errorMessage = error.localizedDescription
                                }
                            }
                        } label: {
                            HStack(spacing: UITheme.spacing8) {
                                if isSaving {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.black)
                                }
                                Text(isSaving ? "Saving..." : "Save Language")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: SettingsVisualTokens.ctaHeight)
                            .background(brandGold)
                            .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(isSaving)
                        .padding(.top, UITheme.spacing10)
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, SettingsVisualTokens.topPadding)
                .padding(.bottom, SettingsVisualTokens.bottomPadding)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }

    private func languageSubtitle(_ code: String) -> String {
        switch code {
        case "en":
            return "English"
        case "es":
            return "Spanish"
        case "zh":
            return "Chinese"
        case "ko":
            return "Korean"
        case "fr":
            return "French"
        case "vi":
            return "Vietnamese"
        default:
            return "Language"
        }
    }
}

private struct FeedbackSupportView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Feedback & Support") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing16) {
                    settingsDescription("How can we help you today? Reach us through your preferred channel.")
                    settingsCard {
                        supportRow(title: "WhatsApp Support", subtitle: "Fastest response time", icon: "message", tint: Color.green) {
                            openURL(URL(string: "https://wa.me/14151234567")!)
                        }
                        rowDividerStyle
                        supportRow(title: "iMessage", subtitle: "Standard for iPhone users", icon: "message.circle", tint: Color.blue) {
                            openURL(URL(string: "sms:+14151234567")!)
                        }
                        rowDividerStyle
                        supportRow(title: "Instagram DM", subtitle: "Follow us for nail inspo", icon: "star", tint: brandGold) {
                            openURL(URL(string: "https://instagram.com")!)
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing32)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }

    private func supportRow(
        title: String,
        subtitle: String,
        icon: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: UITheme.spacing12) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(tint.opacity(0.12))
                    .frame(width: 42, height: 42)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(tint)
                    )

                VStack(alignment: .leading, spacing: UITheme.spacing2) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Color.white.opacity(0.45))
                }

                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.30))
            }
            .padding(.horizontal, UITheme.spacing14)
            .padding(.vertical, UITheme.spacing12)
        }
        .buttonStyle(.plain)
    }
}

private struct PartnershipInquiryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    private let brandGold = UITheme.brandGold
    private let cardBG = UITheme.cardBackground

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Partner with Us") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing16) {
                    settingsDescription("Join our salon network and reach more customers.")

                    settingsCard {
                        partnershipFeature(icon: "building.2", title: "List Your Salon", subtitle: "Get discovered by local beauty seekers")
                        rowDividerStyle
                        partnershipFeature(icon: "calendar.badge.clock", title: "Advanced Booking", subtitle: "Manage appointments with ease")
                    }

                    settingsCard {
                        Text("Contact our Partnership Team")
                            .font(.system(size: 12, weight: .bold))
                            .kerning(2.0)
                            .foregroundStyle(Color.white.opacity(0.42))
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, UITheme.spacing8)

                        HStack(spacing: UITheme.spacing12) {
                            Button {
                                openURL(URL(string: "https://wa.me/14151234567")!)
                            } label: {
                                partnershipContactCard(title: "WhatsApp", icon: "message", tint: .green)
                            }
                            .buttonStyle(.plain)

                            Button {
                                openURL(URL(string: "sms:+14151234567")!)
                            } label: {
                                partnershipContactCard(title: "iMessage", icon: "message.circle", tint: .blue)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing32)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }

    private func partnershipFeature(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: UITheme.spacing12) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(cardBG)
                .frame(width: 42, height: 42)
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(brandGold)
                )

            VStack(alignment: .leading, spacing: UITheme.spacing2) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.white.opacity(0.45))
            }
            Spacer()
        }
        .padding(.horizontal, UITheme.spacing14)
        .padding(.vertical, UITheme.spacing12)
    }

    private func partnershipContactCard(title: String, icon: String, tint: Color) -> some View {
        VStack(spacing: UITheme.spacing8) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(tint.opacity(0.12))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(tint)
                )
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, UITheme.spacing14)
        .background(UITheme.cardBackground.opacity(0.85))
        .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
    }
}

private struct PrivacySafetyView: View {
    @Environment(\.dismiss) private var dismiss

    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "Privacy & Safety") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing16) {
                    settingsCard {
                        HStack(spacing: UITheme.spacing10) {
                            Image(systemName: "hand.raised.shield.fill")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(brandGold)
                            Text("Your Data, Your Control")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        Text("We only collect the information needed to manage bookings and improve your service experience.")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.white.opacity(0.55))
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    settingsCard {
                        settingsBullet("We never sell your personal information.")
                        settingsBullet("You can request data deletion by contacting support.")
                        settingsBullet("Booking details are shared only with your selected salon.")
                        settingsBullet("Sensitive data is encrypted in transit.")
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing32)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }

    private func settingsBullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: UITheme.spacing8) {
            Text("•")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(UITheme.brandGold)
                .padding(.top, 1)
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(Color.white.opacity(0.62))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
    }
}

private struct AboutUsView: View {
    @Environment(\.dismiss) private var dismiss
    private let brandGold = UITheme.brandGold

    var body: some View {
        VStack(spacing: 0) {
            RewardsTopBar(title: "About Us") {
                dismiss()
            }

            ScrollView {
                VStack(alignment: .leading, spacing: UITheme.spacing16) {
                    settingsCard {
                        HStack(spacing: UITheme.spacing10) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(brandGold)
                            Text("NailsDash")
                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                        }

                        Text("NailsDash connects customers with top-rated nail salons. Discover styles, book appointments, and unlock exclusive deals in one place.")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.white.opacity(0.55))
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    settingsCard {
                        settingsStaticRow(label: "Version", value: "v1.2.0")
                        settingsStaticRow(label: "Market", value: "United States")
                    }
                }
                .padding(.horizontal, UITheme.pagePadding)
                .padding(.top, UITheme.spacing20)
                .padding(.bottom, UITheme.spacing32)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .background(Color.black)
        .tint(brandGold)
    }
}

private func settingsCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: UITheme.spacing12) {
        content()
    }
    .padding(UITheme.spacing16)
    .background(UITheme.cardBackground.opacity(0.94))
    .clipShape(RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous))
    .overlay(
        RoundedRectangle(cornerRadius: RewardsVisualTokens.cardCorner, style: .continuous)
            .stroke(Color.white.opacity(0.10), lineWidth: 1)
    )
}

private func settingsDescription(_ text: String) -> some View {
    Text(text)
        .font(.system(size: 13, weight: .medium))
        .lineSpacing(UITheme.spacing3)
        .foregroundStyle(Color.white.opacity(0.50))
        .frame(maxWidth: .infinity, alignment: .leading)
}

private func settingsFieldLabel(_ title: String) -> some View {
    Text(title)
        .font(.system(size: 10, weight: .bold))
        .kerning(2.0)
        .foregroundStyle(Color.white.opacity(0.46))
}

private func settingsStaticRow(label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: UITheme.spacing4) {
        Text(label)
            .font(.system(size: 10, weight: .bold))
            .kerning(2.0)
            .foregroundStyle(Color.white.opacity(0.46))
        Text(value.isEmpty ? "-" : value)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
    }
}

private func settingsMessageBanner(error: String?, message: String?) -> some View {
    Group {
        if let error, !error.isEmpty {
            Text(error)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.red.opacity(0.92))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, UITheme.spacing12)
                .padding(.vertical, UITheme.spacing10)
                .background(Color.red.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        } else if let message, !message.isEmpty {
            Text(message)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.green.opacity(0.92))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, UITheme.spacing12)
                .padding(.vertical, UITheme.spacing10)
                .background(Color.green.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }
}

private func settingsInputField<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
        .font(.system(size: 15, weight: .medium))
        .foregroundStyle(.white)
        .padding(.horizontal, UITheme.spacing14)
        .frame(minHeight: SettingsVisualTokens.fieldHeight)
        .background(UITheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: UITheme.controlCornerRadius, style: .continuous)
                .stroke(Color.white.opacity(0.16), lineWidth: 1)
        )
}

private func settingsInfoCard(title: String, bullets: [String]) -> some View {
    HStack(alignment: .top, spacing: UITheme.spacing10) {
        Image(systemName: "exclamationmark.circle.fill")
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Color.blue.opacity(0.90))
            .padding(.top, UITheme.spacing2)

        VStack(alignment: .leading, spacing: UITheme.spacing4) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.88))
            ForEach(Array(bullets.enumerated()), id: \.offset) { _, bullet in
                HStack(alignment: .top, spacing: UITheme.spacing6) {
                    Circle()
                        .fill(Color.white.opacity(0.42))
                        .frame(width: UITheme.spacing4, height: UITheme.spacing4)
                        .padding(.top, UITheme.spacing7)
                    Text(bullet)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.60))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
    .padding(UITheme.spacing12)
    .background(Color.blue.opacity(0.08))
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .stroke(Color.blue.opacity(0.20), lineWidth: 1)
    )
}

private enum SettingsVisualTokens {
    static let sectionSpacing: CGFloat = 14
    static let topPadding: CGFloat = 24
    static let bottomPadding: CGFloat = 28
    static let fieldHeight: CGFloat = 48
    static let ctaHeight: CGFloat = 48
}

private var rowDividerStyle: some View {
    Rectangle()
        .fill(Color.white.opacity(0.10))
        .frame(height: 1)
}

private func formatUSPhoneForDisplay(_ raw: String?) -> String {
    guard let raw, !raw.isEmpty else { return "-" }
    let digits = raw.filter(\.isNumber)
    if digits.count == 11, digits.hasPrefix("1") {
        let area = digits.dropFirst().prefix(3)
        let prefix = digits.dropFirst(4).prefix(3)
        let suffix = digits.suffix(4)
        return "+1 (\(area)) \(prefix)-\(suffix)"
    }
    if digits.count == 10 {
        let area = digits.prefix(3)
        let prefix = digits.dropFirst(3).prefix(3)
        let suffix = digits.suffix(4)
        return "(\(area)) \(prefix)-\(suffix)"
    }
    return raw
}
