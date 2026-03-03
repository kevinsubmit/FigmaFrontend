import Foundation

enum HomeDateFormatterCache {
    private static let posixLocale = Locale(identifier: "en_US_POSIX")
    private static let utcTimeZone = TimeZone(secondsFromGMT: 0)
    private static let newYorkTimeZone = TimeZone(identifier: "America/New_York")

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
        formatter.locale = posixLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    static let monthDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MMM d"
        return formatter
    }()

    private static let displayDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    private static let displayDateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = posixLocale
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
        if let date = isoParserWithFraction.date(from: raw) {
            return date
        }
        if let date = isoParser.date(from: raw) {
            return date
        }
        if let date = serverMicrosecondParser.date(from: raw) {
            return date
        }
        return serverSecondParser.date(from: raw)
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
}
