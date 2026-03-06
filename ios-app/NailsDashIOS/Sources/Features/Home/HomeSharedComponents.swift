import Foundation

enum HomeDateFormatterCache {
    private static let posixLocale = Locale(identifier: "en_US_POSIX")
    private static let utcTimeZone = TimeZone(secondsFromGMT: 0)!
    private static let newYorkTimeZone = TimeZone.autoupdatingCurrent

    private static let isoParserWithFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoParser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let serverMicrosecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = utcTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return formatter
    }()

    private static let serverSecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = utcTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter
    }()

    private static let joinedDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = newYorkTimeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    static let monthDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "MMM d"
        return formatter
    }()

    private static let displayDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = newYorkTimeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    private static let displayDateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = newYorkTimeZone
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter
    }()

    private static let nyDateTimeSecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter
    }()

    private static let nyDateTimeMinuteParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
        return formatter
    }()

    private static let nyDateParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let nyDateDisplayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "MMM d, yyyy"
        return formatter
    }()

    private static let nyTimeSecondParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()

    private static let nyTimeMinuteParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private static let nyTimeDisplayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
        formatter.timeZone = newYorkTimeZone
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    static func parseServerDate(_ raw: String) -> Date? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if let date = isoParserWithFraction.date(from: trimmed) {
            return date
        }
        if let date = isoParser.date(from: trimmed) {
            return date
        }
        if !hasTimezoneInfo(trimmed) {
            let normalizedISO = normalizedUTCISO(trimmed)
            if let date = isoParserWithFraction.date(from: normalizedISO) {
                return date
            }
            if let date = isoParser.date(from: normalizedISO) {
                return date
            }
        }
        if let date = serverMicrosecondParser.date(from: trimmed) {
            return date
        }
        if let date = serverSecondParser.date(from: trimmed) {
            return date
        }
        return parseNaiveUTC(trimmed)
    }

    static func formatJoinedDate(_ raw: String) -> String? {
        guard let date = parseServerDate(raw) else { return nil }
        return joinedDateFormatter.string(from: date)
    }

    static func appointmentDateTime(_ item: AppointmentDTO) -> Date {
        let dateTime = "\(item.appointment_date)T\(item.appointment_time)"
        if let date = nyDateTimeSecondParser.date(from: dateTime) {
            return date
        }
        if let date = nyDateTimeMinuteParser.date(from: dateTime) {
            return date
        }
        return .distantPast
    }

    static func formattedNYDate(_ raw: String) -> String? {
        guard let date = nyDateParser.date(from: raw) else { return nil }
        return nyDateDisplayFormatter.string(from: date)
    }

    static func formattedNYTime(_ raw: String) -> String? {
        if let date = nyTimeSecondParser.date(from: raw) {
            return nyTimeDisplayFormatter.string(from: date)
        }
        guard let date = nyTimeMinuteParser.date(from: raw) else { return nil }
        return nyTimeDisplayFormatter.string(from: date)
    }

    static func formatDisplayDateTime(_ raw: String) -> String? {
        guard let date = parseServerDate(raw) else { return nil }
        return displayDateTimeFormatter.string(from: date)
    }

    static func formatDisplayDateOnly(_ raw: String) -> String? {
        guard let date = parseServerDate(raw) else { return nil }
        return displayDateOnlyFormatter.string(from: date)
    }

    private static func hasTimezoneInfo(_ value: String) -> Bool {
        value.hasSuffix("Z") || value.hasSuffix("z") || value.range(of: #"[+-]\d{2}:\d{2}$"#, options: .regularExpression) != nil
    }

    private static func normalizedUTCISO(_ value: String) -> String {
        if value.contains("T") {
            return "\(value)Z"
        }
        return value.replacingOccurrences(of: " ", with: "T") + "Z"
    }

    private static func parseNaiveUTC(_ raw: String) -> Date? {
        let formats = [
            "yyyy-MM-dd HH:mm:ss.SSSSSS",
            "yyyy-MM-dd HH:mm:ss.SSS",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        ]
        for format in formats {
            let formatter = DateFormatter()
            formatter.locale = posixLocale
            formatter.timeZone = utcTimeZone
            formatter.dateFormat = format
            if let date = formatter.date(from: raw) {
                return date
            }
        }
        return nil
    }
}
