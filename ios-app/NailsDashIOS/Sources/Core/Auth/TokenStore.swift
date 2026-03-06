import Foundation
import os
import Security

final class TokenStore {
    enum Keys {
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
    }

    static let shared = TokenStore()

    private let service: String
    private let logger: Logger

    private init(service: String = Bundle.main.bundleIdentifier ?? "com.figmafrontend.nailsdash.ios") {
        self.service = service
        self.logger = Logger(subsystem: service, category: "TokenStore")
    }

    func save(_ value: String, key: String) {
        let data = Data(value.utf8)
        let query = baseQuery(for: key)
        let deleteStatus = SecItemDelete(query as CFDictionary)
        if deleteStatus != errSecSuccess && deleteStatus != errSecItemNotFound {
            logKeychainError(action: "delete-before-save", key: key, status: deleteStatus)
        }

        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(item as CFDictionary, nil)
        if addStatus != errSecSuccess {
            logKeychainError(action: "save", key: key, status: addStatus)
        }
    }

    func read(key: String) -> String? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            if status != errSecItemNotFound {
                logKeychainError(action: "read", key: key, status: status)
            }
            return nil
        }
        return value
    }

    func clear(key: String) {
        let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            logKeychainError(action: "clear", key: key, status: status)
        }
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }

    private func logKeychainError(action: String, key: String, status: OSStatus) {
        let rawMessage = SecCopyErrorMessageString(status, nil) as String?
        let trimmed = rawMessage?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let message = trimmed.isEmpty ? "Unknown Keychain error" : trimmed
        logger.error("[\(action, privacy: .public)] key=\(key, privacy: .public) status=\(Int(status), privacy: .public) message=\(message, privacy: .public)")
    }
}
