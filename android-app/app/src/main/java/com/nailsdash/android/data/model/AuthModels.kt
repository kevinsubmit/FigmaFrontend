package com.nailsdash.android.data.model

enum class VerificationPurpose {
    register,
    login,
    reset_password,
}

data class LoginRequest(
    val phone: String,
    val password: String,
    val login_portal: String = "frontend",
)

data class RegisterRequest(
    val phone: String,
    val verification_code: String,
    val username: String,
    val password: String,
    val full_name: String? = null,
    val referral_code: String? = null,
)

data class SendVerificationCodeRequest(
    val phone: String,
    val purpose: VerificationPurpose,
)

data class SendVerificationCodeResponse(
    val message: String,
    val expires_in: Int,
)

data class VerifyCodeRequest(
    val phone: String,
    val code: String,
    val purpose: VerificationPurpose,
)

data class VerifyCodeResponse(
    val valid: Boolean,
    val message: String,
)

data class TokenResponse(
    val access_token: String,
    val refresh_token: String,
    val token_type: String,
)

data class RefreshTokenRequest(
    val refresh_token: String,
)

data class AuthUser(
    val id: Int,
    val phone: String,
    val username: String,
    val full_name: String? = null,
    val email: String? = null,
    val avatar_url: String? = null,
    val gender: String? = null,
    val date_of_birth: String? = null,
    val phone_verified: Boolean? = null,
    val is_admin: Boolean,
    val store_id: Int? = null,
)
