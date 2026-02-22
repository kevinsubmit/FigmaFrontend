import Foundation

enum PhoneFormatter {
    static func normalizeUSPhone(_ input: String) -> String {
        let digits = input.filter(\.isNumber)
        if digits.count == 10 {
            return "1\(digits)"
        }
        return digits
    }
}
