package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.AuthUser
import com.nailsdash.android.data.model.HomeFeedPin
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
    private val authRepository = AuthRepository()

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
        if (normalizedPhone.isBlank() || password.isBlank()) {
            authMessage = "Please enter phone and password."
            return
        }

        viewModelScope.launch {
            isLoadingAuth = true
            val result = authRepository.login(normalizedPhone, password)
            isLoadingAuth = false
            result.onSuccess { user ->
                currentUser = user
                isLoggedIn = true
                authMessage = null
            }.onFailure { err ->
                authMessage = err.message
            }
        }
    }

    fun logout() {
        authRepository.logout()
        isLoggedIn = false
        currentUser = null
        authMessage = null
        bookingStyleReference = null
        bookOpenedFromStyleReference = false
    }

    fun accessTokenOrNull(): String? {
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
}
