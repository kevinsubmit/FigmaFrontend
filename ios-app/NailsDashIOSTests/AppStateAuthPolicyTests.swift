import XCTest
@testable import NailsDashIOS

final class AppStateAuthPolicyTests: XCTestCase {
    func testShouldForceLogoutForRestrictionKeywords() {
        XCTAssertTrue(AppState.shouldForceLogoutAfterSensitiveAuthAlert("Account restricted until tomorrow."))
        XCTAssertTrue(AppState.shouldForceLogoutAfterSensitiveAuthAlert("User is permanently banned"))
        XCTAssertTrue(AppState.shouldForceLogoutAfterSensitiveAuthAlert("Profile BLOCKED by admin"))
    }

    func testShouldForceLogoutForSessionExpiredKeywords() {
        XCTAssertTrue(AppState.shouldForceLogoutAfterSensitiveAuthAlert("Session expired, please sign in again."))
        XCTAssertTrue(AppState.shouldForceLogoutAfterSensitiveAuthAlert("Unauthorized"))
        XCTAssertTrue(AppState.shouldForceLogoutAfterSensitiveAuthAlert("not authenticated"))
    }

    func testDoesNotForceLogoutForRegularErrors() {
        XCTAssertFalse(AppState.shouldForceLogoutAfterSensitiveAuthAlert(""))
        XCTAssertFalse(AppState.shouldForceLogoutAfterSensitiveAuthAlert("Failed to load stores"))
        XCTAssertFalse(AppState.shouldForceLogoutAfterSensitiveAuthAlert("Network appears offline."))
    }
}
