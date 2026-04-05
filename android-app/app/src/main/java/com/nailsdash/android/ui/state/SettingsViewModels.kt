package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.SettingsUpdatePasswordRequest
import com.nailsdash.android.data.model.SettingsUpdatePhoneRequest
import com.nailsdash.android.data.model.SettingsUpdateProfileRequest
import com.nailsdash.android.data.model.SettingsUpdateRequest
import com.nailsdash.android.data.model.SupportContactSettings
import com.nailsdash.android.data.repository.SettingsRepository
import com.nailsdash.android.utils.PhoneFormatter
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val SETTINGS_PREFS_NAME = "nailsdash_settings"
private const val SETTINGS_LANGUAGE_KEY = "nailsdash.language"
private const val LEGACY_SETTINGS_LANGUAGE_KEY = "language"

class ProfileSettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var fullName by mutableStateOf("")
    var username by mutableStateOf("-")
    var phone by mutableStateOf("-")
    var gender by mutableStateOf("")
    var avatarURL by mutableStateOf<String?>(null)
    var birthday by mutableStateOf(LocalDate.now())
    var canEditGender by mutableStateOf(true)
    var canEditBirthday by mutableStateOf(true)
    var birthdayDisplay by mutableStateOf("Not set")

    var isLoading by mutableStateOf(false)
        private set

    var isSaving by mutableStateOf(false)
        private set

    var isUploadingAvatar by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null && !isLoading) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        isLoading = true
        viewModelScope.launch {
            repository.getCurrentUser(bearerToken)
                .onSuccess { user ->
                    fullName = user.full_name.orEmpty()
                    username = user.username
                    phone = formatUSPhoneForDisplay(user.phone)
                    avatarURL = user.avatar_url
                    gender = user.gender.orEmpty()
                    canEditGender = gender.isBlank()

                    val birthdayRaw = user.date_of_birth?.trim().orEmpty()
                    val parsedBirthday = parseBirthday(birthdayRaw)
                    if (birthdayRaw.isNotBlank() && parsedBirthday != null) {
                        birthday = parsedBirthday
                        birthdayDisplay = birthdayRaw
                        canEditBirthday = false
                    } else {
                        birthdayDisplay = "Not set"
                        canEditBirthday = true
                    }
                    errorMessage = null
                }
                .onFailure { err -> errorMessage = err.message }
            isLoading = false
        }
    }

    fun uploadAvatar(
        bearerToken: String,
        imageData: ByteArray,
        fileName: String,
    ) {
        if (imageData.isEmpty()) {
            errorMessage = "Invalid image file."
            return
        }

        if (imageData.size > MAX_AVATAR_BYTES) {
            errorMessage = "File size exceeds 5MB limit."
            return
        }

        isUploadingAvatar = true
        viewModelScope.launch {
            repository.uploadAvatar(
                bearerToken = bearerToken,
                imageData = imageData,
                fileName = fileName,
            ).onSuccess { url ->
                if (url.isNotBlank()) {
                    avatarURL = url
                }
                actionMessage = "Avatar updated successfully!"
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
            }
            isUploadingAvatar = false
        }
    }

    fun save(bearerToken: String, onSaved: () -> Unit) {
        val trimmedName = fullName.trim()
        if (trimmedName.isEmpty()) {
            errorMessage = "Full name is required."
            return
        }
        if (trimmedName.length < 2) {
            errorMessage = "Full name must be at least 2 characters."
            return
        }

        val payload = SettingsUpdateProfileRequest(
            full_name = trimmedName,
            avatar_url = avatarURL,
            gender = normalizedGenderValue(gender).takeIf { canEditGender },
            birthday = birthday.format(DATE_FORMATTER).takeIf { canEditBirthday },
        )

        isSaving = true
        viewModelScope.launch {
            repository.updateProfile(bearerToken, payload)
                .onSuccess { response ->
                    actionMessage = response.message
                    response.user.gender?.takeIf { it.isNotBlank() }?.let {
                        gender = it
                        canEditGender = false
                    }
                    response.user.date_of_birth?.takeIf { it.isNotBlank() }?.let {
                        birthdayDisplay = it
                        canEditBirthday = false
                    }
                    errorMessage = null
                    onSaved()
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
            isSaving = false
        }
    }

    private fun normalizedGenderValue(raw: String): String? {
        val value = raw.trim().lowercase()
        return if (value in setOf("male", "female", "other")) value else null
    }

    private fun parseBirthday(raw: String): LocalDate? {
        return runCatching { LocalDate.parse(raw, DATE_FORMATTER) }.getOrNull()
    }

    companion object {
        private const val MAX_AVATAR_BYTES = 5 * 1024 * 1024
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    }
}

class ChangePasswordViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository()

    var currentPassword by mutableStateOf("")
    var newPassword by mutableStateOf("")
    var confirmPassword by mutableStateOf("")

    var isSaving by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    fun save(bearerToken: String) {
        if (currentPassword.isBlank()) {
            errorMessage = "Current password is required."
            return
        }
        if (newPassword.length < 8) {
            errorMessage = "New password must be at least 8 characters."
            return
        }
        if (newPassword != confirmPassword) {
            errorMessage = "Passwords do not match."
            return
        }
        if (newPassword == currentPassword) {
            errorMessage = "New password must be different from current password."
            return
        }

        isSaving = true
        viewModelScope.launch {
            repository.updatePassword(
                bearerToken = bearerToken,
                payload = SettingsUpdatePasswordRequest(
                    current_password = currentPassword,
                    new_password = newPassword,
                ),
            ).onSuccess { response ->
                actionMessage = response.message
                errorMessage = null
                currentPassword = ""
                newPassword = ""
                confirmPassword = ""
            }.onFailure { err ->
                errorMessage = err.message
            }
            isSaving = false
        }
    }
}

class PhoneNumberSettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository()
    private var loadedBearerToken: String? = null
    private var hasLoadedOnce = false

    var currentPhone by mutableStateOf("-")
    var isPhoneVerified by mutableStateOf(false)

    var newPhone by mutableStateOf("")
    var verificationCode by mutableStateOf("")
    var currentPassword by mutableStateOf("")

    var countdown by mutableStateOf(0)
        private set

    var isSendingCode by mutableStateOf(false)
        private set

    var isSaving by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    private var countdownJob: Job? = null

    fun loadIfNeeded(bearerToken: String) {
        if (loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        load(bearerToken)
    }

    fun load(bearerToken: String, force: Boolean = false) {
        if (!force && loadedBearerToken == bearerToken && hasLoadedOnce && errorMessage == null) return
        loadedBearerToken = bearerToken
        hasLoadedOnce = true
        viewModelScope.launch {
            repository.getCurrentUser(bearerToken)
                .onSuccess { user ->
                    currentPhone = formatUSPhoneForDisplay(user.phone)
                    isPhoneVerified = user.phone_verified == true
                    errorMessage = null
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
        }
    }

    fun sendCode() {
        val normalizedPhone = PhoneFormatter.normalizeUSPhone(newPhone)
        if (normalizedPhone.length != 11) {
            errorMessage = "Please enter a valid US phone number."
            return
        }

        isSendingCode = true
        viewModelScope.launch {
            repository.sendVerificationCode(normalizedPhone)
                .onSuccess { response ->
                    actionMessage = response.message
                    errorMessage = null
                    startCountdown(60)
                }
                .onFailure { err ->
                    errorMessage = err.message
                }
            isSendingCode = false
        }
    }

    fun updatePhone(bearerToken: String, onSaved: () -> Unit) {
        val normalizedPhone = PhoneFormatter.normalizeUSPhone(newPhone)
        if (normalizedPhone.length != 11) {
            errorMessage = "Please enter a valid US phone number."
            return
        }
        if (verificationCode.length != 6) {
            errorMessage = "Verification code must be 6 digits."
            return
        }
        if (currentPassword.isBlank()) {
            errorMessage = "Current password is required."
            return
        }

        isSaving = true
        viewModelScope.launch {
            repository.updatePhone(
                bearerToken = bearerToken,
                payload = SettingsUpdatePhoneRequest(
                    new_phone = normalizedPhone,
                    verification_code = verificationCode,
                    current_password = currentPassword,
                ),
            ).onSuccess { response ->
                actionMessage = response.message
                errorMessage = null
                newPhone = ""
                verificationCode = ""
                currentPassword = ""
                countdown = 0
                load(bearerToken, force = true)
                onSaved()
            }.onFailure { err ->
                errorMessage = err.message
            }
            isSaving = false
        }
    }

    private fun startCountdown(seconds: Int) {
        countdownJob?.cancel()
        countdown = seconds
        countdownJob = viewModelScope.launch {
            while (countdown > 0) {
                delay(1000)
                countdown -= 1
            }
        }
    }
}

class LanguageSettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository()

    var selectedLanguage by mutableStateOf("en")
    var isSaving by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var actionMessage by mutableStateOf<String?>(null)
        private set

    fun loadInitialLanguage() {
        // Mirror iOS local preference cache behavior.
        val prefs = getApplication<Application>()
            .getSharedPreferences(SETTINGS_PREFS_NAME, 0)
        selectedLanguage = prefs.getString(SETTINGS_LANGUAGE_KEY, null)
            ?: prefs.getString(LEGACY_SETTINGS_LANGUAGE_KEY, "en")
            ?: "en"
    }

    fun save(bearerToken: String) {
        isSaving = true
        viewModelScope.launch {
            repository.updateSettings(
                bearerToken = bearerToken,
                payload = SettingsUpdateRequest(
                    notification_enabled = null,
                    language = selectedLanguage,
                ),
            ).onSuccess { response ->
                val prefs = getApplication<Application>()
                    .getSharedPreferences(SETTINGS_PREFS_NAME, 0)
                prefs.edit()
                    .putString(SETTINGS_LANGUAGE_KEY, selectedLanguage)
                    .putString(LEGACY_SETTINGS_LANGUAGE_KEY, selectedLanguage)
                    .apply()
                actionMessage = response.message
                errorMessage = null
            }.onFailure { err ->
                errorMessage = err.message
            }
            isSaving = false
        }
    }
}

class SupportContactViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository()
    private var hasLoadedOnce = false

    var contactSettings by mutableStateOf(DEFAULT_SETTINGS)
        private set

    fun loadIfNeeded() {
        if (hasLoadedOnce) return
        hasLoadedOnce = true
        viewModelScope.launch {
            repository.getSupportContactSettings()
                .onSuccess { contactSettings = it }
        }
    }

    companion object {
        val DEFAULT_SETTINGS = SupportContactSettings(
            feedback_whatsapp_url = "https://wa.me/14151234567",
            feedback_imessage_url = "sms:+14151234567",
            feedback_instagram_url = "https://instagram.com",
            partnership_whatsapp_url = "https://wa.me/14151234567",
            partnership_imessage_url = "sms:+14151234567",
        )
    }
}

private fun formatUSPhoneForDisplay(phone: String): String {
    val digits = phone.filter(Char::isDigit)
    return when {
        digits.length == 11 && digits.startsWith("1") -> {
            val body = digits.drop(1)
            "(${body.substring(0, 3)}) ${body.substring(3, 6)}-${body.substring(6)}"
        }

        digits.length == 10 -> "(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}"
        else -> phone
    }
}
