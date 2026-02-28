import Foundation

enum VerificationPurpose: String, Encodable {
    case register
    case login
    case resetPassword = "reset_password"
}

struct LoginRequest: Encodable {
    let phone: String
    let password: String
    let login_portal: String
}

struct RegisterRequest: Encodable {
    let phone: String
    let verification_code: String
    let username: String
    let password: String
    let full_name: String?
    let referral_code: String?
}

struct SendVerificationCodeRequest: Encodable {
    let phone: String
    let purpose: VerificationPurpose
}

struct SendVerificationCodeResponse: Decodable {
    let message: String
    let expires_in: Int
}

struct VerifyCodeRequest: Encodable {
    let phone: String
    let code: String
    let purpose: VerificationPurpose
}

struct VerifyCodeResponse: Decodable {
    let valid: Bool
    let message: String
}

struct TokenResponse: Decodable {
    let access_token: String
    let refresh_token: String
    let token_type: String
}

struct AuthUser: Decodable {
    let id: Int
    let phone: String
    let username: String
    let full_name: String?
    let email: String?
    let avatar_url: String?
    let gender: String?
    let date_of_birth: String?
    let phone_verified: Bool?
    let is_admin: Bool
    let store_id: Int?
}
