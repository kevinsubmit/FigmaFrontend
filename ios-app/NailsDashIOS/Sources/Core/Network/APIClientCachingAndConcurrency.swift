import Foundation

final class ResponseMemoryCache {
    struct Entry {
        let data: Data
        let http: HTTPURLResponse
        let expiresAt: Date
    }

    private var entries: [String: Entry] = [:]
    private var insertionOrder: [String] = []
    private let lock = NSLock()

    func read(for key: String) -> Entry? {
        lock.lock()
        defer { lock.unlock() }
        purgeExpiredLocked()
        return entries[key]
    }

    func write(key: String, data: Data, http: HTTPURLResponse, ttl: TimeInterval, maxEntries: Int) {
        lock.lock()
        defer { lock.unlock() }
        purgeExpiredLocked()
        let entry = Entry(data: data, http: http, expiresAt: Date().addingTimeInterval(ttl))
        entries[key] = entry
        insertionOrder.removeAll { $0 == key }
        insertionOrder.append(key)

        if entries.count > maxEntries {
            let removeCount = entries.count - maxEntries
            for _ in 0 ..< removeCount {
                guard let oldest = insertionOrder.first else { break }
                insertionOrder.removeFirst()
                entries.removeValue(forKey: oldest)
            }
        }
    }

    func clear() {
        lock.lock()
        defer { lock.unlock() }
        entries.removeAll()
        insertionOrder.removeAll()
    }

    private func purgeExpiredLocked() {
        let now = Date()
        var expiredKeys: [String] = []
        for (key, entry) in entries where entry.expiresAt <= now {
            expiredKeys.append(key)
        }
        if expiredKeys.isEmpty { return }
        let expiredSet = Set(expiredKeys)
        for key in expiredKeys {
            entries.removeValue(forKey: key)
        }
        insertionOrder.removeAll { expiredSet.contains($0) }
    }
}

actor InFlightGETRequestDeduplicator {
    private var tasks: [String: Task<(Data, URLResponse), Error>] = [:]

    func perform(
        key: String,
        operation: @escaping @Sendable () async throws -> (Data, URLResponse)
    ) async throws -> (Data, URLResponse) {
        if let running = tasks[key] {
            return try await running.value
        }

        let task = Task.detached(priority: .utility) {
            try await operation()
        }
        tasks[key] = task
        defer { tasks[key] = nil }
        return try await task.value
    }
}

actor TokenRefreshCoordinator {
    private var running: (id: UUID, task: Task<String, Error>)?

    func acquire(
        taskFactory: @escaping @Sendable () async throws -> String
    ) -> (id: UUID, task: Task<String, Error>) {
        if let running {
            return running
        }

        let id = UUID()
        let task = Task.detached(priority: .userInitiated) {
            try await taskFactory()
        }
        let payload = (id: id, task: task)
        running = payload
        return payload
    }

    func clear(id: UUID) {
        guard let running, running.id == id else { return }
        self.running = nil
    }
}
