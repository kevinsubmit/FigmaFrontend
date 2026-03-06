import XCTest
@testable import NailsDashIOS

final class TokenStoreTests: XCTestCase {
    private var keysToCleanup: [String] = []

    override func tearDown() {
        let store = TokenStore.shared
        for key in keysToCleanup {
            store.clear(key: key)
        }
        keysToCleanup.removeAll()
        super.tearDown()
    }

    func testSaveReadClearRoundTrip() {
        let key = makeTestKey()
        let store = TokenStore.shared

        store.save("token-A", key: key)
        XCTAssertEqual(store.read(key: key), "token-A")

        store.clear(key: key)
        XCTAssertNil(store.read(key: key))
    }

    func testSaveOverwritesPreviousValue() {
        let key = makeTestKey()
        let store = TokenStore.shared

        store.save("token-A", key: key)
        store.save("token-B", key: key)

        XCTAssertEqual(store.read(key: key), "token-B")
    }

    private func makeTestKey() -> String {
        let key = "codex.tests.tokenstore.\(UUID().uuidString)"
        keysToCleanup.append(key)
        return key
    }
}
