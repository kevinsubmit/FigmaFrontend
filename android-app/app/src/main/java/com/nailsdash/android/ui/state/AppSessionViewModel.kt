package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.benchmark.BenchmarkOverrides
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.AuthUser
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.model.SendVerificationCodeResponse
import com.nailsdash.android.data.model.VerificationPurpose
import com.nailsdash.android.data.model.VerifyCodeResponse
import com.nailsdash.android.data.network.ServiceLocator
import com.nailsdash.android.data.repository.AuthRepository
import com.nailsdash.android.utils.PhoneFormatter
import kotlinx.coroutines.launch

data class BookingStyleReference(
    val pinId: Int,
    val title: String,
    val imageUrl: String?,
    val tags: List<String>,
) {
    val noteText: String
        get() = "Reference look: $title (Pin #$pinId)"
}

class AppSessionViewModel(application: Application) : AndroidViewModel(application) {
    companion object {
        const val sessionExpiredMessage = "Session expired, please sign in again."

        fun shouldForceLogoutAfterSensitiveAuthAlert(message: String): Boolean {
            val normalized = message.trim().lowercase()
            if (normalized.isEmpty()) return false

            if (
                normalized.contains("restricted") ||
                normalized.contains("ban") ||
                normalized.contains("banned") ||
                normalized.contains("blocked") ||
                normalized.contains("suspended")
            ) {
                return true
            }

            if (
                normalized.contains("session expired") ||
                normalized.contains("sign in again") ||
                normalized.contains("unauthorized") ||
                normalized.contains("not authenticated")
            ) {
                return true
            }

            return false
        }
    }

    private val authRepository = AuthRepository()
    private val benchmarkUser = AuthUser(
        id = -1,
        phone = "0000000000",
        username = "benchmark",
        full_name = "Benchmark User",
        email = null,
        avatar_url = null,
        gender = null,
        date_of_birth = null,
        phone_verified = true,
        is_admin = false,
        store_id = null,
    )

    var isLoadingAuth by mutableStateOf(false)
        private set

    var isLoggedIn by mutableStateOf(false)
        private set

    var authMessage by mutableStateOf<String?>(null)
        private set

    var currentUser by mutableStateOf<AuthUser?>(null)
        private set

    var bookingStyleReference by mutableStateOf<BookingStyleReference?>(null)
        private set

    var bookOpenedFromStyleReference by mutableStateOf(false)
        private set

    init {
        ServiceLocator.init(application.applicationContext)
        bootstrap()
    }

    fun bootstrap() {
        refreshSession()
    }

    fun refreshSession() {
        if (BenchmarkOverrides.isEnabled()) {
            applyBenchmarkSession()
            return
        }
        viewModelScope.launch {
            val token = authRepository.accessTokenOrNull()
            if (token.isNullOrBlank()) {
                isLoggedIn = false
                currentUser = null
                return@launch
            }

            isLoadingAuth = true
            val result = authRepository.refreshSession()
            isLoadingAuth = false

            result.onSuccess { user ->
                currentUser = user
                isLoggedIn = true
                authMessage = null
            }.onFailure { err ->
                authRepository.logout()
                isLoggedIn = false
                currentUser = null
                authMessage = err.message
                bookingStyleReference = null
                bookOpenedFromStyleReference = false
            }
        }
    }

    fun login(phone: String, password: String) {
        val normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        if (!isValidUSPhone(phone) || password.isBlank()) {
            authMessage = "Please enter phone and password."
            return
        }

        viewModelScope.launch {
            performLogin(normalizedPhone, password)
        }
    }

    suspend fun sendVerificationCode(
        phone: String,
        purpose: VerificationPurpose,
    ): Result<SendVerificationCodeResponse> {
        if (!isValidUSPhone(phone)) {
            return validationFailure("Please enter a valid US phone number.")
        }
        val normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        val result = authRepository.sendVerificationCode(normalizedPhone, purpose)
        result.onSuccess {
            authMessage = null
        }.onFailure { error ->
            authMessage = error.message
        }
        return result
    }

    suspend fun verifyCode(
        phone: String,
        code: String,
        purpose: VerificationPurpose,
    ): Result<VerifyCodeResponse> {
        if (!isValidUSPhone(phone)) {
            return validationFailure("Please enter a valid US phone number.")
        }
        val trimmedCode = code.trim()
        if (trimmedCode.length != 6 || trimmedCode.any { !it.isDigit() }) {
            return validationFailure("Please enter a valid 6-digit verification code.")
        }

        val normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        val result = authRepository.verifyCode(normalizedPhone, trimmedCode, purpose)
        result.onSuccess {
            authMessage = null
        }.onFailure { error ->
            authMessage = error.message
        }
        return result
    }

    fun register(
        phone: String,
        verificationCode: String,
        username: String,
        password: String,
        fullName: String?,
        referralCode: String?,
    ) {
        if (!isValidUSPhone(phone)) {
            authMessage = "Please enter a valid US phone number."
            return
        }

        val trimmedCode = verificationCode.trim()
        val trimmedUsername = username.trim()
        val trimmedPassword = password.trim()
        val trimmedFullName = fullName?.trim().orEmpty().ifBlank { null }
        val trimmedReferralCode = referralCode?.trim().orEmpty().ifBlank { null }

        if (trimmedCode.isBlank() || trimmedUsername.isBlank() || trimmedPassword.isBlank()) {
            authMessage = "Please fill all required fields."
            return
        }

        val normalizedPhone = PhoneFormatter.normalizeUSPhone(phone)
        viewModelScope.launch {
            isLoadingAuth = true
            val registerResult = authRepository.register(
                phone = normalizedPhone,
                verificationCode = trimmedCode,
                username = trimmedUsername,
                password = trimmedPassword,
                fullName = trimmedFullName,
                referralCode = trimmedReferralCode,
            )

            if (registerResult.isFailure) {
                isLoadingAuth = false
                authMessage = registerResult.exceptionOrNull()?.message
                return@launch
            }

            val loginResult = authRepository.login(normalizedPhone, trimmedPassword)
            isLoadingAuth = false
            loginResult.onSuccess { user ->
                applyAuthenticatedUser(user)
            }.onFailure { error ->
                authMessage = error.message
            }
        }
    }

    fun logout() {
        forceLogout()
    }

    fun forceLogout(message: String? = null) {
        if (BenchmarkOverrides.isEnabled()) {
            applyBenchmarkSession()
            authMessage = message
            return
        }
        authRepository.logout()
        isLoggedIn = false
        currentUser = null
        authMessage = message
        bookingStyleReference = null
        bookOpenedFromStyleReference = false
    }

    fun accessTokenOrNull(): String? {
        if (BenchmarkOverrides.isEnabled()) return null
        val token = authRepository.accessTokenOrNull() ?: return null
        return "Bearer $token"
    }

    fun updateAuthMessage(message: String?) {
        authMessage = message
    }

    fun openBookFlow(pin: HomeFeedPin) {
        bookingStyleReference = BookingStyleReference(
            pinId = pin.id,
            title = pin.title,
            imageUrl = pin.image_url,
            tags = pin.tags,
        )
        bookOpenedFromStyleReference = true
    }

    fun clearBookingStyleReference() {
        bookingStyleReference = null
        bookOpenedFromStyleReference = false
    }

    fun resetBookFlowSource() {
        bookOpenedFromStyleReference = false
    }

    private suspend fun performLogin(phone: String, password: String) {
        isLoadingAuth = true
        val result = authRepository.login(phone, password)
        isLoadingAuth = false
        result.onSuccess { user ->
            applyAuthenticatedUser(user)
        }.onFailure { err ->
            authMessage = err.message
        }
    }

    private fun applyAuthenticatedUser(user: AuthUser) {
        currentUser = user
        isLoggedIn = true
        authMessage = null
    }

    private fun applyBenchmarkSession() {
        currentUser = benchmarkUser
        isLoggedIn = true
        isLoadingAuth = false
        authMessage = null
    }

    private fun <T> validationFailure(message: String): Result<T> {
        authMessage = message
        return Result.failure(IllegalStateException(message))
    }

    private fun isValidUSPhone(input: String): Boolean {
        val digits = input.filter(Char::isDigit)
        return digits.length == 10 || (digits.length == 11 && digits.startsWith("1"))
    }
}
