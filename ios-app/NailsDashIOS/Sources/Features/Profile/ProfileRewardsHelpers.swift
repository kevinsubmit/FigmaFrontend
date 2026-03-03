import Foundation

func displayDate(_ raw: String) -> String {
    HomeDateFormatterCache.formatDisplayDateTime(raw) ?? raw
}

func displayDateOnly(_ raw: String) -> String {
    HomeDateFormatterCache.formatDisplayDateOnly(raw) ?? raw
}

func couponSummary(_ coupon: CouponTemplateDTO) -> String {
    if coupon.type.lowercased() == "percentage" {
        return "\(Int(coupon.discount_value))% OFF"
    }
    return "$\(String(format: "%.2f", coupon.discount_value)) OFF"
}

func mapError(_ error: APIError) -> String {
    switch error {
    case .forbidden(let detail), .validation(let detail), .server(let detail), .network(let detail):
        return detail
    case .unauthorized:
        return AppState.sessionExpiredMessage
    case .invalidURL:
        return "Invalid API endpoint."
    case .decoding:
        return "Unexpected response from server."
    }
}
