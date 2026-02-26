import Foundation

struct StoreImageDTO: Decodable, Identifiable {
    let id: Int
    let image_url: String
    let is_primary: Int?
    let display_order: Int?
}

struct StoreDTO: Decodable, Identifiable {
    let id: Int
    let name: String
    let image_url: String?
    let address: String
    let city: String
    let state: String
    let zip_code: String?
    let latitude: Double?
    let longitude: Double?
    let phone: String?
    let email: String?
    let description: String?
    let opening_hours: String?
    let rating: Double
    let review_count: Int
    let distance: Double?

    var formattedAddress: String {
        let zip = (zip_code ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if zip.isEmpty {
            return "\(address), \(city), \(state)"
        }
        return "\(address), \(city), \(state) \(zip)"
    }
}

struct StoreDetailDTO: Decodable {
    let id: Int
    let name: String
    let address: String
    let city: String
    let state: String
    let zip_code: String?
    let latitude: Double?
    let longitude: Double?
    let phone: String?
    let email: String?
    let description: String?
    let opening_hours: String?
    let rating: Double
    let review_count: Int
    let images: [StoreImageDTO]

    var formattedAddress: String {
        let zip = (zip_code ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if zip.isEmpty {
            return "\(address), \(city), \(state)"
        }
        return "\(address), \(city), \(state) \(zip)"
    }
}

struct StoreReviewReplyDTO: Decodable {
    let id: Int
    let content: String?
    let admin_name: String?
    let created_at: String?
    let updated_at: String?
}

struct StoreReviewDTO: Decodable, Identifiable {
    let id: Int
    let user_id: Int
    let store_id: Int
    let appointment_id: Int
    let rating: Double
    let comment: String?
    let images: [String]?
    let created_at: String
    let updated_at: String
    let user_name: String?
    let user_avatar: String?
    let reply: StoreReviewReplyDTO?
}

struct StoreHourDTO: Decodable, Identifiable {
    let id: Int
    let store_id: Int
    let day_of_week: Int // 0=Mon ... 6=Sun
    let open_time: String?
    let close_time: String?
    let is_closed: Bool
}
