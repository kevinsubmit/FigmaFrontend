package com.nailsdash.android.data.model

data class SettingsUpdateProfileRequest(
    val full_name: String? = null,
    val avatar_url: String? = null,
    val gender: String? = null,
    val birthday: String? = null,
)

data class SettingsUpdateProfileResponse(
    val message: String,
    val user: AuthUser,
)

data class SettingsUpdatePasswordRequest(
    val current_password: String,
    val new_password: String,
)

data class SettingsUpdatePasswordResponse(
    val message: String,
)

data class SettingsUpdatePhoneRequest(
    val new_phone: String,
    val verification_code: String,
    val current_password: String,
)

data class SettingsUpdatePhoneResponse(
    val message: String,
)

data class UserSettingsPayload(
    val notification_enabled: Boolean? = null,
    val language: String? = null,
)

data class SettingsUpdateRequest(
    val notification_enabled: Boolean? = null,
    val language: String? = null,
)

data class SettingsUpdateResponse(
    val message: String,
    val settings: UserSettingsPayload? = null,
)
