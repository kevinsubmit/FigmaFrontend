import Foundation

struct LoginRequest: Encodable {
    let phone: String
    let password: String
    let login_portal: String
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
    let is_admin: Bool
    let store_id: Int?
}
