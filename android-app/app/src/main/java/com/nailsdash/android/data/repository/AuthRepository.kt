package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.AuthUser
import com.nailsdash.android.data.model.LoginRequest
import com.nailsdash.android.data.model.RefreshTokenRequest
import com.nailsdash.android.data.network.ServiceLocator

class AuthRepository {
    private val api get() = ServiceLocator.api
    private val tokenStore get() = ServiceLocator.tokenStore

    suspend fun login(phone: String, password: String): Result<AuthUser> {
        return runCatching {
            val token = api.login(LoginRequest(phone = phone, password = password))
            tokenStore.saveTokens(token.access_token, token.refresh_token)
            val me = api.getMe("Bearer ${token.access_token}")
            me
        }.mapFailure()
    }

    suspend fun refreshSession(): Result<AuthUser> {
        val access = tokenStore.accessToken()
        if (access.isNullOrBlank()) {
            return Result.failure(IllegalStateException("No session"))
        }

        return runCatching {
            api.getMe("Bearer $access")
        }.recoverCatching { error ->
            val refresh = tokenStore.refreshToken() ?: throw error
            val refreshed = api.refresh(RefreshTokenRequest(refresh_token = refresh))
            tokenStore.saveTokens(refreshed.access_token, refreshed.refresh_token)
            api.getMe("Bearer ${refreshed.access_token}")
        }.mapFailure()
    }

    fun accessTokenOrNull(): String? = tokenStore.accessToken()

    fun logout() {
        tokenStore.clear()
    }

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }
}
