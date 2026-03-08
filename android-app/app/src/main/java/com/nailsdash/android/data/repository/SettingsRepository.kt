package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.AuthUser
import com.nailsdash.android.data.model.SendVerificationCodeRequest
import com.nailsdash.android.data.model.SendVerificationCodeResponse
import com.nailsdash.android.data.model.SettingsUpdatePasswordRequest
import com.nailsdash.android.data.model.SettingsUpdatePasswordResponse
import com.nailsdash.android.data.model.SettingsUpdatePhoneRequest
import com.nailsdash.android.data.model.SettingsUpdatePhoneResponse
import com.nailsdash.android.data.model.SettingsUpdateProfileRequest
import com.nailsdash.android.data.model.SettingsUpdateProfileResponse
import com.nailsdash.android.data.model.SettingsUpdateRequest
import com.nailsdash.android.data.model.SettingsUpdateResponse
import com.nailsdash.android.data.model.VerificationPurpose
import com.nailsdash.android.data.network.ServiceLocator
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class SettingsRepository {
    private val api get() = ServiceLocator.api

    suspend fun getCurrentUser(bearerToken: String): Result<AuthUser> =
        runCatching { api.getMe(bearerToken) }.mapFailure()

    suspend fun updateProfile(
        bearerToken: String,
        payload: SettingsUpdateProfileRequest,
    ): Result<SettingsUpdateProfileResponse> = runCatching {
        api.updateProfile(bearerToken, payload)
    }.mapFailure()

    suspend fun updatePassword(
        bearerToken: String,
        payload: SettingsUpdatePasswordRequest,
    ): Result<SettingsUpdatePasswordResponse> = runCatching {
        api.updatePassword(bearerToken, payload)
    }.mapFailure()

    suspend fun sendVerificationCode(phone: String): Result<SendVerificationCodeResponse> = runCatching {
        api.sendVerificationCode(
            SendVerificationCodeRequest(phone = phone, purpose = VerificationPurpose.register),
        )
    }.mapFailure()

    suspend fun updatePhone(
        bearerToken: String,
        payload: SettingsUpdatePhoneRequest,
    ): Result<SettingsUpdatePhoneResponse> = runCatching {
        api.updatePhone(bearerToken, payload)
    }.mapFailure()

    suspend fun updateSettings(
        bearerToken: String,
        payload: SettingsUpdateRequest,
    ): Result<SettingsUpdateResponse> = runCatching {
        api.updateSettings(bearerToken, payload)
    }.mapFailure()

    suspend fun uploadAvatar(
        bearerToken: String,
        imageData: ByteArray,
        fileName: String,
        mimeType: String = "image/jpeg",
    ): Result<String> = runCatching {
        val requestFile = imageData.toRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData(
            name = "file",
            filename = fileName,
            body = requestFile,
        )
        val response = api.uploadAvatar(bearerToken = bearerToken, file = part)
        response["avatar_url"].orEmpty()
    }.mapFailure()

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }
}
