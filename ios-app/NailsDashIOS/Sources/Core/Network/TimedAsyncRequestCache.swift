import Foundation

private extension NSLock {
    func withLock<T>(_ body: () throws -> T) rethrows -> T {
        lock()
        defer { unlock() }
        return try body()
    }
}

final class TimedAsyncRequestCache<Key: Hashable, Value> {
    private struct Entry {
        let value: Value
        let expiresAt: Date
    }

    private var entries: [Key: Entry] = [:]
    private var insertionOrder: [Key] = []
    private var inFlight: [Key: Task<Value, Error>] = [:]
    private let lock = NSLock()

    func value(
        for key: Key,
        ttl: TimeInterval,
        maxEntries: Int = 128,
        loader: @escaping @Sendable () async throws -> Value
    ) async throws -> Value {
        if let cached = cachedValue(for: key) {
            return cached
        }

        let resolution: (cached: Value?, task: Task<Value, Error>?) = lock.withLock {
            purgeExpiredLocked()
            if let entry = entries[key], entry.expiresAt > Date() {
                return (entry.value, nil)
            }

            if let existing = inFlight[key] {
                return (nil, existing)
            }

            let task = Task(priority: .utility) {
                try await loader()
            }
            inFlight[key] = task
            return (nil, task)
        }

        if let cached = resolution.cached {
            return cached
        }

        guard let task = resolution.task else {
            return try await loader()
        }

        do {
            let value = try await task.value
            lock.withLock {
                inFlight[key] = nil
                writeLocked(value: value, for: key, ttl: ttl, maxEntries: maxEntries)
            }
            return value
        } catch {
            lock.withLock {
                inFlight[key] = nil
            }
            throw error
        }
    }

    func cachedValue(for key: Key) -> Value? {
        lock.withLock {
            purgeExpiredLocked()
            return entries[key]?.value
        }
    }

    func removeValue(for key: Key) {
        lock.withLock {
            entries.removeValue(forKey: key)
            insertionOrder.removeAll { $0 == key }
            inFlight[key] = nil
        }
    }

    func removeValues(where shouldRemove: (Key) -> Bool) {
        lock.withLock {
            let doomed = Set(entries.keys.filter(shouldRemove))
            if !doomed.isEmpty {
                doomed.forEach { entries.removeValue(forKey: $0) }
                insertionOrder.removeAll { doomed.contains($0) }
            }
            let inFlightKeys = Array(inFlight.keys).filter(shouldRemove)
            for key in inFlightKeys {
                inFlight[key]?.cancel()
                inFlight[key] = nil
            }
        }
    }

    func removeAll() {
        lock.withLock {
            entries.removeAll()
            insertionOrder.removeAll()
            inFlight.values.forEach { $0.cancel() }
            inFlight.removeAll()
        }
    }

    private func writeLocked(value: Value, for key: Key, ttl: TimeInterval, maxEntries: Int) {
        entries[key] = Entry(value: value, expiresAt: Date().addingTimeInterval(ttl))
        insertionOrder.removeAll { $0 == key }
        insertionOrder.append(key)
        trimToMaxEntriesLocked(maxEntries: maxEntries)
    }

    private func trimToMaxEntriesLocked(maxEntries: Int) {
        guard maxEntries > 0 else {
            entries.removeAll()
            insertionOrder.removeAll()
            return
        }

        while entries.count > maxEntries, let oldest = insertionOrder.first {
            insertionOrder.removeFirst()
            entries.removeValue(forKey: oldest)
        }
    }

    private func purgeExpiredLocked() {
        let now = Date()
        let expiredKeys = entries.compactMap { key, entry in
            entry.expiresAt <= now ? key : nil
        }
        guard !expiredKeys.isEmpty else { return }

        let expired = Set(expiredKeys)
        expiredKeys.forEach { entries.removeValue(forKey: $0) }
        insertionOrder.removeAll { expired.contains($0) }
    }
}
