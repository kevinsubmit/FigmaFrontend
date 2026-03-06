import Foundation

extension APIClient {
    private static let payloadMethods: Set<String> = ["POST", "PUT", "PATCH"]
    private static let suspiciousContentRegex = try! NSRegularExpression(
        pattern: "<\\s*/?\\s*script\\b|javascript:|data:text/html",
        options: [.caseInsensitive]
    )
    private static let usernameRegex = try! NSRegularExpression(
        pattern: "^[A-Za-z0-9._-]{3,100}$",
        options: []
    )
    private static let emailRegex = try! NSRegularExpression(
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        options: []
    )
    private static let dateRegex = try! NSRegularExpression(
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        options: []
    )
    private static let timeRegex = try! NSRegularExpression(
        pattern: "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$",
        options: []
    )
    private static let codeRegex = try! NSRegularExpression(
        pattern: "^\\d{6}$",
        options: []
    )
    private static let allowedPurposes: Set<String> = ["register", "login", "reset_password"]
    private static let allowedGenders: Set<String> = ["male", "female", "other"]
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    func validateRequestPayload(_ data: Data, method: String, path: String) throws {
        let normalizedMethod = method.uppercased()
        guard Self.payloadMethods.contains(normalizedMethod) else { return }

        if isEmptyPayload(data) {
            throw APIError.validation("Request payload cannot be empty.")
        }

        guard let jsonObject = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) else {
            return
        }

        if !hasMeaningfulValue(jsonObject) {
            if allowsEmptyPayload(method: normalizedMethod, path: path) {
                return
            }
            throw APIError.validation("Request payload cannot be empty.")
        }

        if let invalidError = firstInvalidField(in: jsonObject, at: "payload") {
            throw APIError.validation(invalidError)
        }

        try validateEndpointPayload(jsonObject, method: normalizedMethod, path: path)
    }

    private func hasMeaningfulValue(_ value: Any) -> Bool {
        switch value {
        case is NSNull:
            return false
        case let text as String:
            return !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case is NSNumber:
            return true
        case let array as [Any]:
            return array.contains(where: hasMeaningfulValue)
        case let dict as [String: Any]:
            return dict.values.contains(where: hasMeaningfulValue)
        default:
            return true
        }
    }

    private func allowsEmptyPayload(method: String, path: String) -> Bool {
        let normalizedPath = normalizePath(path).lowercased()
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/\\d+/cancel$") {
            return true
        }
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?stores/\\d+/favorite$") {
            return true
        }
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?pins/\\d+/favorite$") {
            return true
        }
        if method == "PATCH", pathMatches(normalizedPath, pattern: "^/(api/v1/)?notifications/\\d+/read$") {
            return true
        }
        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?notifications/mark-all-read$") {
            return true
        }
        return false
    }

    private func firstInvalidField(in value: Any, at path: String) -> String? {
        switch value {
        case let text as String:
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return nil }
            if hasInvalidControlCharacters(in: text) {
                return "Invalid control characters in \(path)."
            }
            if hasSuspiciousContent(in: text) {
                return "Invalid characters in \(path)."
            }
            if let fieldError = validateFieldByName(trimmed, at: path) {
                return fieldError
            }
            return nil
        case let array as [Any]:
            for (index, item) in array.enumerated() {
                if let invalid = firstInvalidField(in: item, at: "\(path)[\(index)]") {
                    return invalid
                }
            }
            return nil
        case let dict as [String: Any]:
            for key in dict.keys.sorted() {
                if let invalid = firstInvalidField(in: dict[key] as Any, at: "\(path).\(key)") {
                    return invalid
                }
            }
            return nil
        default:
            return nil
        }
    }

    private func hasInvalidControlCharacters(in text: String) -> Bool {
        for scalar in text.unicodeScalars {
            let isControl = CharacterSet.controlCharacters.contains(scalar)
            let isAllowedWhitespace = scalar == "\n" || scalar == "\r" || scalar == "\t"
            if isControl && !isAllowedWhitespace {
                return true
            }
        }
        return false
    }

    private func hasSuspiciousContent(in text: String) -> Bool {
        let range = NSRange(text.startIndex..., in: text)
        return Self.suspiciousContentRegex.firstMatch(in: text, options: [], range: range) != nil
    }

    private func validateFieldByName(_ value: String, at path: String) -> String? {
        let field = leafFieldName(from: path)
        switch field {
        case "phone", "new_phone", "guest_phone", "recipient_phone":
            if !isValidUSPhone(value) {
                return "\(path) must be a valid US phone number."
            }
        case "email":
            if !matchesRegex(value, regex: Self.emailRegex) {
                return "\(path) must be a valid email."
            }
        case "username":
            if !matchesRegex(value, regex: Self.usernameRegex) {
                return "\(path) must be 3-100 chars and only include letters, numbers, dot, underscore, or dash."
            }
        case "verification_code", "code":
            if !matchesRegex(value, regex: Self.codeRegex) {
                return "\(path) must be a 6-digit code."
            }
        case "appointment_date", "new_date", "birthday", "date_of_birth":
            if !isValidDateString(value) {
                return "\(path) must be in YYYY-MM-DD format."
            }
        case "appointment_time", "new_time":
            if !matchesRegex(value, regex: Self.timeRegex) {
                return "\(path) must be in HH:MM or HH:MM:SS format."
            }
        case "purpose":
            if !Self.allowedPurposes.contains(value.lowercased()) {
                return "\(path) must be one of register, login, reset_password."
            }
        case "notes", "host_notes":
            if value.count > 2000 {
                return "\(path) cannot exceed 2000 characters."
            }
        case "reason", "cancel_reason", "description", "message":
            if value.count > 255 {
                return "\(path) cannot exceed 255 characters."
            }
        default:
            break
        }
        return nil
    }

    private func validateEndpointPayload(_ value: Any, method: String, path: String) throws {
        let normalizedPath = normalizePath(path).lowercased()

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/send-verification-code$") {
            let dict = try requireDictionary(value, context: "send-verification-code payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requirePurpose(dict["purpose"], field: "purpose")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/verify-code$") {
            let dict = try requireDictionary(value, context: "verify-code payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requireCode(dict["code"], field: "code")
            try requirePurpose(dict["purpose"], field: "purpose")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/register$") {
            let dict = try requireDictionary(value, context: "register payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requireCode(dict["verification_code"], field: "verification_code")
            try requireUsername(dict["username"], field: "username")
            try requirePassword(dict["password"], field: "password", minLength: 8)
            try validateOptionalEmail(dict["email"], field: "email")
            try validateOptionalName(dict["full_name"], field: "full_name")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?auth/login$") {
            let dict = try requireDictionary(value, context: "login payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requirePassword(dict["password"], field: "password", minLength: 1)
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/phone$") {
            let dict = try requireDictionary(value, context: "bind phone payload")
            try requireUSPhone(dict["phone"], field: "phone")
            try requireCode(dict["verification_code"], field: "verification_code")
            return
        }

        if method == "PUT", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/phone$") {
            let dict = try requireDictionary(value, context: "update phone payload")
            try requireUSPhone(dict["new_phone"], field: "new_phone")
            try requireCode(dict["verification_code"], field: "verification_code")
            try requirePassword(dict["current_password"], field: "current_password", minLength: 1)
            return
        }

        if method == "PUT", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/password$") {
            let dict = try requireDictionary(value, context: "update password payload")
            let currentPassword = try requirePassword(dict["current_password"], field: "current_password", minLength: 1)
            let newPassword = try requirePassword(dict["new_password"], field: "new_password", minLength: 8)
            if currentPassword == newPassword {
                throw APIError.validation("new_password must be different from current_password.")
            }
            return
        }

        if method == "PUT", pathMatches(normalizedPath, pattern: "^/(api/v1/)?users/profile$") {
            let dict = try requireDictionary(value, context: "update profile payload")
            try validateOptionalName(dict["full_name"], field: "full_name")
            try validateOptionalEmail(dict["email"], field: "email")
            try validateOptionalGender(dict["gender"], field: "gender")
            try validateOptionalDate(dict["birthday"], field: "birthday")
            try validateOptionalDate(dict["date_of_birth"], field: "date_of_birth")
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/?$") {
            let dict = try requireDictionary(value, context: "create appointment payload")
            try requireDate(dict["appointment_date"], field: "appointment_date")
            try requireTime(dict["appointment_time"], field: "appointment_time")
            try validateOptionalText(dict["notes"], field: "notes", maxLength: 2000)
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/groups$") {
            let dict = try requireDictionary(value, context: "create appointment group payload")
            try requireDate(dict["appointment_date"], field: "appointment_date")
            try requireTime(dict["appointment_time"], field: "appointment_time")
            try requirePositiveInteger(dict["host_service_id"], field: "host_service_id")
            try validateOptionalText(dict["host_notes"], field: "host_notes", maxLength: 2000)

            guard let guests = dict["guests"] as? [Any], !guests.isEmpty else {
                throw APIError.validation("guests must include at least one guest item.")
            }
            for (index, guest) in guests.enumerated() {
                let guestDict = try requireDictionary(guest, context: "guests[\(index)]")
                try requirePositiveInteger(guestDict["service_id"], field: "guests[\(index)].service_id")
                try validateOptionalText(guestDict["notes"], field: "guests[\(index)].notes", maxLength: 2000)
                try validateOptionalName(guestDict["guest_name"], field: "guests[\(index)].guest_name")
                try validateOptionalUSPhone(guestDict["guest_phone"], field: "guests[\(index)].guest_phone")
            }
            return
        }

        if method == "POST", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/\\d+/reschedule$") {
            let dict = try requireDictionary(value, context: "reschedule payload")
            try requireDate(dict["new_date"], field: "new_date")
            try requireTime(dict["new_time"], field: "new_time")
            return
        }

        if method == "PATCH", pathMatches(normalizedPath, pattern: "^/(api/v1/)?appointments/\\d+/notes$") {
            let dict = try requireDictionary(value, context: "appointment notes payload")
            try requireText(dict["notes"], field: "notes", maxLength: 2000)
            return
        }
    }

    private func leafFieldName(from path: String) -> String {
        let cleaned = path.replacingOccurrences(of: "\\[\\d+\\]", with: "", options: .regularExpression)
        return cleaned.split(separator: ".").last.map { String($0).lowercased() } ?? cleaned.lowercased()
    }

    private func matchesRegex(_ value: String, regex: NSRegularExpression) -> Bool {
        let range = NSRange(value.startIndex..., in: value)
        return regex.firstMatch(in: value, options: [], range: range) != nil
    }

    private func isValidUSPhone(_ value: String) -> Bool {
        let digits = value.filter(\.isNumber)
        if digits.count == 10 { return true }
        return digits.count == 11 && digits.first == "1"
    }

    private func isValidDateString(_ value: String) -> Bool {
        if !matchesRegex(value, regex: Self.dateRegex) { return false }
        return Self.dateFormatter.date(from: value) != nil
    }

    private func requireDictionary(_ value: Any, context: String) throws -> [String: Any] {
        guard let dict = value as? [String: Any] else {
            throw APIError.validation("\(context) must be an object.")
        }
        return dict
    }

    private func requiredString(_ value: Any?, field: String) throws -> String {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            throw APIError.validation("\(field) is required.")
        }
        return text
    }

    @discardableResult
    private func requireText(_ value: Any?, field: String, maxLength: Int) throws -> String {
        let text = try requiredString(value, field: field)
        if text.count > maxLength {
            throw APIError.validation("\(field) cannot exceed \(maxLength) characters.")
        }
        return text
    }

    private func validateOptionalText(_ value: Any?, field: String, maxLength: Int) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if text.count > maxLength {
            throw APIError.validation("\(field) cannot exceed \(maxLength) characters.")
        }
    }

    private func requireUSPhone(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !isValidUSPhone(text) {
            throw APIError.validation("\(field) must be a valid US phone number.")
        }
    }

    private func validateOptionalUSPhone(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !isValidUSPhone(text) {
            throw APIError.validation("\(field) must be a valid US phone number.")
        }
    }

    private func requireCode(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !matchesRegex(text, regex: Self.codeRegex) {
            throw APIError.validation("\(field) must be a 6-digit code.")
        }
    }

    private func requirePurpose(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field).lowercased()
        if !Self.allowedPurposes.contains(text) {
            throw APIError.validation("\(field) must be one of register, login, reset_password.")
        }
    }

    private func requireUsername(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !matchesRegex(text, regex: Self.usernameRegex) {
            throw APIError.validation("\(field) must be 3-100 chars and only include letters, numbers, dot, underscore, or dash.")
        }
    }

    @discardableResult
    private func requirePassword(_ value: Any?, field: String, minLength: Int) throws -> String {
        let text = try requiredString(value, field: field)
        if text.count < minLength || text.count > 100 {
            throw APIError.validation("\(field) must be \(minLength)-100 characters.")
        }
        return text
    }

    private func validateOptionalEmail(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !matchesRegex(text, regex: Self.emailRegex) {
            throw APIError.validation("\(field) must be a valid email.")
        }
    }

    private func validateOptionalName(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if text.count < 2 || text.count > 200 {
            throw APIError.validation("\(field) must be 2-200 characters.")
        }
    }

    private func validateOptionalGender(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !Self.allowedGenders.contains(text.lowercased()) {
            throw APIError.validation("\(field) must be male, female, or other.")
        }
    }

    private func requireDate(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !isValidDateString(text) {
            throw APIError.validation("\(field) must be in YYYY-MM-DD format.")
        }
    }

    private func validateOptionalDate(_ value: Any?, field: String) throws {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return
        }
        if !isValidDateString(text) {
            throw APIError.validation("\(field) must be in YYYY-MM-DD format.")
        }
    }

    private func requireTime(_ value: Any?, field: String) throws {
        let text = try requiredString(value, field: field)
        if !matchesRegex(text, regex: Self.timeRegex) {
            throw APIError.validation("\(field) must be in HH:MM or HH:MM:SS format.")
        }
    }

    private func requirePositiveInteger(_ value: Any?, field: String) throws {
        guard let number = value as? NSNumber else {
            throw APIError.validation("\(field) must be a positive integer.")
        }
        if number.intValue <= 0 || floor(number.doubleValue) != number.doubleValue {
            throw APIError.validation("\(field) must be a positive integer.")
        }
    }
}
