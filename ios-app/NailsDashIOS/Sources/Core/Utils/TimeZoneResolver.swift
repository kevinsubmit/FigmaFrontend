import Foundation

enum TimeZoneResolver {
    static func resolve(storeIdentifier: String?) -> TimeZone {
        guard let raw = storeIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty,
              let timeZone = TimeZone(identifier: raw) else {
            return .autoupdatingCurrent
        }
        return timeZone
    }
}
