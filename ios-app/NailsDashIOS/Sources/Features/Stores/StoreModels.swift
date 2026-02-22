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
