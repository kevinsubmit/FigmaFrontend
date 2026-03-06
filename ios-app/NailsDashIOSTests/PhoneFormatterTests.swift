import XCTest
@testable import NailsDashIOS

final class PhoneFormatterTests: XCTestCase {
    func testNormalizeAddsCountryCodeForTenDigits() {
        XCTAssertEqual(PhoneFormatter.normalizeUSPhone("4151234567"), "14151234567")
        XCTAssertEqual(PhoneFormatter.normalizeUSPhone("(415) 123-4567"), "14151234567")
    }

    func testNormalizeKeepsElevenDigitsStartingWithOne() {
        XCTAssertEqual(PhoneFormatter.normalizeUSPhone("1-415-123-4567"), "14151234567")
    }

    func testNormalizeReturnsDigitsForNonTenDigitInputs() {
        XCTAssertEqual(PhoneFormatter.normalizeUSPhone("415123"), "415123")
        XCTAssertEqual(PhoneFormatter.normalizeUSPhone(""), "")
    }
}
