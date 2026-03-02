import CoreLocation
import Foundation

struct UserLocationCoordinate: Equatable {
    let latitude: Double
    let longitude: Double
}

enum UserLocationCache {
    private static let storageKey = "stores.userLocationCache.v1"
    private static let maxAge: TimeInterval = 3600

    private struct Payload: Codable {
        let latitude: Double
        let longitude: Double
        let timestamp: TimeInterval
    }

    static func loadValid() -> UserLocationCoordinate? {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return nil
        }
        guard let payload = try? JSONDecoder().decode(Payload.self, from: data) else {
            UserDefaults.standard.removeObject(forKey: storageKey)
            return nil
        }
        guard Date().timeIntervalSince1970 - payload.timestamp < maxAge else {
            UserDefaults.standard.removeObject(forKey: storageKey)
            return nil
        }
        return UserLocationCoordinate(latitude: payload.latitude, longitude: payload.longitude)
    }

    static func save(_ coordinate: UserLocationCoordinate) {
        let payload = Payload(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            timestamp: Date().timeIntervalSince1970
        )
        if let data = try? JSONEncoder().encode(payload) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
}

@MainActor
final class UserLocationService: NSObject, @preconcurrency CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var authContinuation: CheckedContinuation<CLAuthorizationStatus, Never>?
    private var locationContinuation: CheckedContinuation<UserLocationCoordinate?, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    func requestCurrentLocation() async -> UserLocationCoordinate? {
        guard CLLocationManager.locationServicesEnabled() else {
            return nil
        }

        let status = await ensureAuthorization()
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            return nil
        }

        if let coordinate = manager.location?.coordinate {
            return UserLocationCoordinate(latitude: coordinate.latitude, longitude: coordinate.longitude)
        }

        return await withCheckedContinuation { continuation in
            locationContinuation = continuation
            manager.requestLocation()

            Task { @MainActor [weak self] in
                try? await Task.sleep(for: .seconds(8))
                guard let self, let pending = self.locationContinuation else { return }
                self.locationContinuation = nil
                pending.resume(returning: nil)
            }
        }
    }

    private func ensureAuthorization() async -> CLAuthorizationStatus {
        let status = manager.authorizationStatus
        switch status {
        case .authorizedAlways, .authorizedWhenInUse, .denied, .restricted:
            return status
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
            return await withCheckedContinuation { continuation in
                authContinuation = continuation
            }
        @unknown default:
            return .denied
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard let continuation = authContinuation else { return }
        authContinuation = nil
        continuation.resume(returning: manager.authorizationStatus)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let continuation = locationContinuation else { return }
        locationContinuation = nil
        guard let coordinate = locations.first?.coordinate else {
            continuation.resume(returning: nil)
            return
        }
        continuation.resume(returning: UserLocationCoordinate(latitude: coordinate.latitude, longitude: coordinate.longitude))
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard let continuation = locationContinuation else { return }
        locationContinuation = nil
        continuation.resume(returning: nil)
    }
}
