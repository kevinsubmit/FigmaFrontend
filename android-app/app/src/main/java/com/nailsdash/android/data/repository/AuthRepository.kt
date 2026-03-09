package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.AuthUser
import com.nailsdash.android.data.model.LoginRequest
import com.nailsdash.android.data.model.RefreshTokenRequest
import com.nailsdash.android.data.model.RegisterRequest
import com.nailsdash.android.data.model.SendVerificationCodeRequest
import com.nailsdash.android.data.model.SendVerificationCodeResponse
import com.nailsdash.android.data.model.VerificationPurpose
import com.nailsdash.android.data.model.VerifyCodeRequest
import com.nailsdash.android.data.model.VerifyCodeResponse
import com.nailsdash.android.data.network.ServiceLocator
import retrofit2.HttpException

class AuthRepository {
    private val api get() = ServiceLocator.api
    private val tokenStore get() = ServiceLocator.tokenStore

    suspend fun login(phone: String, password: String): Result<AuthUser> {
        return runCatching {
            val token = api.login(LoginRequest(phone = phone, password = password))
            tokenStore.saveTokens(token.access_token, token.refresh_token)
            val me = api.getMe("Bearer ${token.access_token}")
            me
        }.mapFailure(unauthorizedMessage = "Incorrect phone number or password.")
    }

    suspend fun sendVerificationCode(
        phone: String,
        purpose: VerificationPurpose,
    ): Result<SendVerificationCodeResponse> = runCatching {
        api.sendVerificationCode(
            SendVerificationCodeRequest(phone = phone, purpose = purpose),
        )
    }.mapFailure()

    suspend fun verifyCode(
        phone: String,
        code: String,
        purpose: VerificationPurpose,
    ): Result<VerifyCodeResponse> = runCatching {
        api.verifyCode(
            VerifyCodeRequest(phone = phone, code = code, purpose = purpose),
        )
    }.mapFailure()

    suspend fun register(
        phone: String,
        verificationCode: String,
        username: String,
        password: String,
        fullName: String?,
        referralCode: String?,
    ): Result<AuthUser> = runCatching {
        api.register(
            RegisterRequest(
                phone = phone,
                verification_code = verificationCode,
                username = username,
                password = password,
                full_name = fullName,
                referral_code = referralCode,
            ),
        )
    }
        .mapFailure()

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

    private fun <T> Result<T>.mapFailure(unauthorizedMessage: String? = null): Result<T> {
        val throwable = exceptionOrNull() ?: return this
        if (unauthorizedMessage != null && throwable is HttpException && throwable.code() == 401) {
            return Result.failure(IllegalStateException(unauthorizedMessage))
        }
        return Result.failure(IllegalStateException(throwable.toUserMessage()))
    }
}
