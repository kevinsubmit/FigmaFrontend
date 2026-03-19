import SwiftUI
import UIKit
import ImageIO
import ObjectiveC.runtime
@preconcurrency import UserNotifications

extension Notification.Name {
    static let pushOpenAppointments = Notification.Name("pushOpenAppointments")
}

private struct PushDeviceRegisterRequest: Encodable {
    let device_token: String
    let platform: String
    let apns_environment: String
    let app_version: String?
    let device_name: String?
    let locale: String?
    let timezone: String?
}

private struct PushDeviceUnregisterRequest: Encodable {
    let device_token: String
}

private struct PushDeviceRegisterResponse: Decodable {
    let detail: String?
    let device_id: Int?
    let apns_environment: String?
}

private struct PushDeviceUnregisterResponse: Decodable {
    let detail: String?
    let deactivated: Bool?
}

@MainActor
final class PushNotificationManager: NSObject {
    static let shared = PushNotificationManager()

    private let persistedDeviceTokenKey = "push.apns.device_token"
    private let persistedUploadedFingerprintKey = "push.apns.last_uploaded_fingerprint"
    private let persistedPushPermissionRequestedKey = "push.apns.permission_requested"
    private let persistedPushEnabledKey = "push.apns.user_enabled"

    private var activeUserID: Int?
    private var hasConfiguredNotificationCenter = false
    private var isUploadingToken = false
    private var pushEnabledByUser: Bool = true {
        didSet {
            UserDefaults.standard.set(pushEnabledByUser, forKey: persistedPushEnabledKey)
        }
    }
    private var uploadedFingerprint: String? {
        didSet {
            UserDefaults.standard.set(uploadedFingerprint, forKey: persistedUploadedFingerprintKey)
        }
    }

    private(set) var deviceToken: String? {
        didSet {
            if let deviceToken, !deviceToken.isEmpty {
                UserDefaults.standard.set(deviceToken, forKey: persistedDeviceTokenKey)
            } else {
                UserDefaults.standard.removeObject(forKey: persistedDeviceTokenKey)
            }
        }
    }

    private override init() {
        self.deviceToken = UserDefaults.standard.string(forKey: persistedDeviceTokenKey)
        self.uploadedFingerprint = UserDefaults.standard.string(forKey: persistedUploadedFingerprintKey)
        if UserDefaults.standard.object(forKey: persistedPushEnabledKey) == nil {
            self.pushEnabledByUser = true
        } else {
            self.pushEnabledByUser = UserDefaults.standard.bool(forKey: persistedPushEnabledKey)
        }
        super.init()
    }

    func configureNotificationCenterIfNeeded() {
        guard !hasConfiguredNotificationCenter else { return }
        hasConfiguredNotificationCenter = true
        UNUserNotificationCenter.current().delegate = self
    }

    func syncForSession(isLoggedIn: Bool, userID: Int?) {
        activeUserID = userID
        if !isLoggedIn {
            uploadedFingerprint = nil
            setAppBadge(0)
            return
        }

        guard pushEnabledByUser else { return }

        configureNotificationCenterIfNeeded()
        requestPermissionAndRegisterIfNeeded()

        Task { [weak self] in
            await self?.uploadDeviceTokenIfPossible(force: true)
        }
    }

    func didRegisterRemoteDeviceToken(_ data: Data) {
        guard pushEnabledByUser else { return }
        let token = data.map { String(format: "%02x", $0) }.joined()
        guard !token.isEmpty else { return }
        if token != deviceToken {
            deviceToken = token
        }
        Task { [weak self] in
            await self?.uploadDeviceTokenIfPossible(force: true)
        }
    }

    func didFailToRegisterRemoteNotifications(_ error: Error) {
        #if DEBUG
        print("APNs register failed: \(error.localizedDescription)")
        #endif
    }

    func unregisterCurrentTokenOnLogout(accessToken: String?) {
        guard let accessToken, !accessToken.isEmpty else { return }
        guard let token = deviceToken, !token.isEmpty else { return }
        Task { [weak self] in
            await self?.unregisterDeviceToken(token, accessToken: accessToken)
        }
    }

    func setPushPreferenceEnabled(_ enabled: Bool) {
        pushEnabledByUser = enabled
        if !enabled {
            uploadedFingerprint = nil
            UIApplication.shared.unregisterForRemoteNotifications()
            setAppBadge(0)
            return
        }
        requestPermissionAndRegisterIfNeeded()
        Task { [weak self] in
            await self?.uploadDeviceTokenIfPossible(force: true)
        }
    }

    func isPushPreferenceEnabled() -> Bool {
        pushEnabledByUser
    }

    func setAppBadge(_ count: Int) {
        UIApplication.shared.applicationIconBadgeNumber = max(0, count)
    }

    func handleRemoteNotificationPayload(_ userInfo: [AnyHashable: Any]) {
        if let notificationType = (userInfo["notification_type"] as? String)?.lowercased(),
           notificationType.contains("appointment")
        {
            NotificationCenter.default.post(name: .pushOpenAppointments, object: nil, userInfo: userInfo)
            return
        }

        if userInfo["appointment_id"] != nil {
            NotificationCenter.default.post(name: .pushOpenAppointments, object: nil, userInfo: userInfo)
        }
    }

    private func requestPermissionAndRegisterIfNeeded() {
        guard pushEnabledByUser else { return }
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            case .notDetermined:
                let alreadyRequested = UserDefaults.standard.bool(forKey: self.persistedPushPermissionRequestedKey)
                if alreadyRequested {
                    return
                }
                UserDefaults.standard.set(true, forKey: self.persistedPushPermissionRequestedKey)
                center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    guard granted else { return }
                    DispatchQueue.main.async {
                        UIApplication.shared.registerForRemoteNotifications()
                    }
                }
            case .denied:
                return
            @unknown default:
                return
            }
        }
    }

    private func uploadDeviceTokenIfPossible(force: Bool) async {
        guard pushEnabledByUser else { return }
        guard !isUploadingToken else { return }
        guard let userID = activeUserID, userID > 0 else { return }
        guard let token = deviceToken, !token.isEmpty else { return }
        guard let accessToken = TokenStore.shared.read(key: TokenStore.Keys.accessToken), !accessToken.isEmpty else {
            return
        }

        let fingerprint = "\(userID)|\(token)"
        if !force, uploadedFingerprint == fingerprint {
            return
        }

        let payload = PushDeviceRegisterRequest(
            device_token: token,
            platform: "ios",
            apns_environment: Self.currentAPNSEnvironment,
            app_version: Self.appVersionString,
            device_name: UIDevice.current.name,
            locale: Locale.current.identifier,
            timezone: TimeZone.current.identifier
        )

        isUploadingToken = true
        defer { isUploadingToken = false }

        do {
            let _: PushDeviceRegisterResponse = try await APIClient.shared.request(
                path: "/notifications/devices/register",
                method: "POST",
                token: accessToken,
                body: payload
            )
            uploadedFingerprint = fingerprint
        } catch {
            #if DEBUG
            print("APNs token upload failed: \(error)")
            #endif
        }
    }

    private func unregisterDeviceToken(_ token: String, accessToken: String) async {
        let payload = PushDeviceUnregisterRequest(device_token: token)
        do {
            let _: PushDeviceUnregisterResponse = try await APIClient.shared.request(
                path: "/notifications/devices/unregister",
                method: "POST",
                token: accessToken,
                body: payload
            )
            uploadedFingerprint = nil
        } catch {
            #if DEBUG
            print("APNs token unregister failed: \(error)")
            #endif
        }
    }

    private static var appVersionString: String? {
        let short = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
        switch (short, build) {
        case let (s?, b?) where !s.isEmpty && !b.isEmpty:
            return "\(s) (\(b))"
        case let (s?, _) where !s.isEmpty:
            return s
        case let (_, b?) where !b.isEmpty:
            return b
        default:
            return nil
        }
    }

    private static var currentAPNSEnvironment: String {
        #if DEBUG
        return "sandbox"
        #else
        return "production"
        #endif
    }
}

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .list, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            self.handleRemoteNotificationPayload(response.notification.request.content.userInfo)
        }
        completionHandler()
    }
}

final class PushAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Task { @MainActor in
            PushNotificationManager.shared.configureNotificationCenterIfNeeded()
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushNotificationManager.shared.didRegisterRemoteDeviceToken(deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            PushNotificationManager.shared.didFailToRegisterRemoteNotifications(error)
        }
    }

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        completionHandler(.noData)
    }
}

enum UITheme {
    static let brandGold = Color(red: 212.0 / 255.0, green: 175.0 / 255.0, blue: 55.0 / 255.0)
    static let cardBackground = Color(red: 24.0 / 255.0, green: 24.0 / 255.0, blue: 24.0 / 255.0)
    static let pageBackground = Color.black
    static let sectionHeaderKerning: CGFloat = 2
    static let cardCornerRadius: CGFloat = 14
    static let panelCornerRadius: CGFloat = 16
    static let overlayCornerRadius: CGFloat = 12
    static let controlCornerRadius: CGFloat = 12
    static let chipCornerRadius: CGFloat = 10
    static let cardPadding: CGFloat = 14
    static let pagePadding: CGFloat = 16
    static let cardStrokeOpacity: Double = 0.18
    static let controlHeight: CGFloat = 44
    static let ctaHeight: CGFloat = 46
    static let segmentHeight: CGFloat = 40
    static let miniControlSize: CGFloat = 22
    static let compactControlSize: CGFloat = 26
    static let iconControlSize: CGFloat = 34
    static let navControlSize: CGFloat = 38
    static let floatingControlSize: CGFloat = 40
    static let navIconSize: CGFloat = 16
    static let tinyBadgeFontSize: CGFloat = 9
    static let technicianAvatarSize: CGFloat = 64
    static let technicianNameWidth: CGFloat = 80
    static let thumbnailSize: CGFloat = 88
    static let cardHeroHeight: CGFloat = 220
    static let storeHeroHeight: CGFloat = 240
    static let dealCoverHeight: CGFloat = 168
    static let pillHorizontalPadding: CGFloat = 10
    static let pillVerticalPadding: CGFloat = 6
    static let compactPillHorizontalPadding: CGFloat = 8
    static let compactPillVerticalPadding: CGFloat = 4
    static let inputVerticalPadding: CGFloat = 10
    static let spacing1: CGFloat = 1
    static let spacing2: CGFloat = 2
    static let spacing3: CGFloat = 3
    static let spacing4: CGFloat = 4
    static let spacing5: CGFloat = 5
    static let spacing6: CGFloat = 6
    static let spacing7: CGFloat = 7
    static let spacing8: CGFloat = 8
    static let spacing9: CGFloat = 9
    static let spacing10: CGFloat = 10
    static let spacing11: CGFloat = 11
    static let spacing12: CGFloat = 12
    static let spacing13: CGFloat = 13
    static let spacing14: CGFloat = 14
    static let spacing15: CGFloat = 15
    static let spacing16: CGFloat = 16
    static let spacing18: CGFloat = 18
    static let spacing20: CGFloat = 20
    static let spacing24: CGFloat = 24
    static let spacing26: CGFloat = 26
    static let spacing28: CGFloat = 28
    static let spacing32: CGFloat = 32
    static let spacing34: CGFloat = 34
    static let spacing36: CGFloat = 36
    static let spacing42: CGFloat = 42
    static let spacing52: CGFloat = 52
    static let spacing54: CGFloat = 54
    static let spacing56: CGFloat = 56

    static let uiBrandGold = UIColor(red: 212.0 / 255.0, green: 175.0 / 255.0, blue: 55.0 / 255.0, alpha: 1.0)
    static let uiBackgroundBlack = UIColor.black
    static let uiSecondaryText = UIColor(white: 0.62, alpha: 1.0)
    static let tabFontNormal = UIFont.systemFont(ofSize: 11, weight: .medium)
    static let tabFontSelected = UIFont.systemFont(ofSize: 11, weight: .semibold)
}

private extension UIImage {
    var decodedCost: Int {
        guard let cgImage else { return 1 }
        return max(cgImage.bytesPerRow * cgImage.height, 1)
    }
}

actor CachedImagePipeline {
    static let shared = CachedImagePipeline()

    private let memoryCache: NSCache<NSURL, UIImage> = {
        let cache = NSCache<NSURL, UIImage>()
        cache.countLimit = 240
        cache.totalCostLimit = 96 * 1024 * 1024
        return cache
    }()

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .returnCacheDataElseLoad
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 60
        config.httpMaximumConnectionsPerHost = 8
        // Avoid long placeholder loading when network is disconnected.
        config.waitsForConnectivity = false
        config.urlCache = URLCache(
            memoryCapacity: 96 * 1024 * 1024,
            diskCapacity: 512 * 1024 * 1024,
            diskPath: "nailsdash_image_cache"
        )
        return URLSession(configuration: config)
    }()

    private var inFlight: [URL: Task<UIImage?, Never>] = [:]

    func image(for url: URL, scale: CGFloat) async -> UIImage? {
        let key = url as NSURL
        if let cached = memoryCache.object(forKey: key) {
            return cached
        }

        if let existing = inFlight[url] {
            return await existing.value
        }

        let maxPixelSize = max(960, 1280 * max(scale, 1))
        let task = Task.detached(priority: .utility) { [session] in
            await CachedImagePipeline.fetchImage(url: url, session: session, maxPixelSize: maxPixelSize)
        }
        inFlight[url] = task
        let image = await task.value
        inFlight[url] = nil

        if let image {
            memoryCache.setObject(image, forKey: key, cost: image.decodedCost)
        }
        return image
    }

    func prefetch(urls: [URL], scale: CGFloat, limit: Int = 12) async {
        guard limit > 0 else { return }

        var seen: Set<URL> = []
        var warmedCount = 0
        for url in urls {
            guard seen.insert(url).inserted else { continue }
            _ = await image(for: url, scale: scale)
            warmedCount += 1
            if warmedCount >= limit {
                break
            }
        }
    }

    private static func fetchImage(url: URL, session: URLSession, maxPixelSize: CGFloat) async -> UIImage? {
        var request = URLRequest(url: url)
        request.cachePolicy = .returnCacheDataElseLoad
        request.timeoutInterval = 20
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
                return nil
            }
            if let downsampled = downsample(data: data, maxPixelSize: maxPixelSize) {
                return downsampled
            }
            return UIImage(data: data)
        } catch {
            return nil
        }
    }

    private static func downsample(data: Data, maxPixelSize: CGFloat) -> UIImage? {
        let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else { return nil }
        let options = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: false,
            kCGImageSourceThumbnailMaxPixelSize: Int(maxPixelSize.rounded(.up)),
        ] as CFDictionary
        guard let imageRef = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else { return nil }
        return UIImage(cgImage: imageRef)
    }
}

struct CachedAsyncImage<Content: View>: View {
    let url: URL?
    let content: (AsyncImagePhase) -> Content

    @Environment(\.displayScale) private var displayScale
    @State private var phase: AsyncImagePhase = .empty

    init(
        url: URL?,
        @ViewBuilder content: @escaping (AsyncImagePhase) -> Content
    ) {
        self.url = url
        self.content = content
    }

    var body: some View {
        content(phase)
            .task(id: cacheKey) {
                await load()
            }
    }

    private var cacheKey: String {
        url?.absoluteString ?? "nil-url"
    }

    @MainActor
    private func load() async {
        guard let url else {
            phase = .empty
            return
        }

        if Task.isCancelled { return }
        phase = .empty
        if let uiImage = await CachedImagePipeline.shared.image(for: url, scale: displayScale) {
            if Task.isCancelled { return }
            phase = .success(Image(uiImage: uiImage))
        } else {
            if Task.isCancelled { return }
            phase = .failure(URLError(.badServerResponse))
        }
    }
}

struct ImagePrefetcher: View {
    let urls: [URL?]
    let limit: Int

    @Environment(\.displayScale) private var displayScale

    init(urls: [URL?], limit: Int = 12) {
        self.urls = urls
        self.limit = limit
    }

    var body: some View {
        Color.clear
            .frame(width: 0, height: 0)
            .task(id: cacheKey) {
                await CachedImagePipeline.shared.prefetch(
                    urls: normalizedURLs,
                    scale: displayScale,
                    limit: limit
                )
            }
    }

    private var normalizedURLs: [URL] {
        urls.compactMap { $0 }
    }

    private var cacheKey: String {
        normalizedURLs
            .prefix(limit)
            .map(\.absoluteString)
            .joined(separator: "|")
    }
}

private struct SwipeBackEnabler: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> SwipeBackEnablerController {
        SwipeBackEnablerController()
    }

    func updateUIViewController(_ uiViewController: SwipeBackEnablerController, context: Context) {
        uiViewController.enableSwipeBackIfNeeded()
    }
}

private final class SwipeBackEnablerController: UIViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        UIViewController.installGlobalSwipeBackEnablerIfNeeded()
        enableSwipeBackIfNeeded()
    }

    func enableSwipeBackIfNeeded() {
        guard let navigationController else { return }
        guard let popGesture = navigationController.interactivePopGestureRecognizer else { return }
        popGesture.isEnabled = true
        popGesture.delegate = nil
    }
}

private extension UIViewController {
    private final class SwipeBackFallbackHandler: NSObject, UIGestureRecognizerDelegate {
        weak var host: UIViewController?

        init(host: UIViewController) {
            self.host = host
            super.init()
        }

        @objc
        func handleEdgePan(_ gesture: UIScreenEdgePanGestureRecognizer) {
            guard let host else { return }
            guard gesture.state == .ended else { return }

            let translation = gesture.translation(in: gesture.view)
            let velocity = gesture.velocity(in: gesture.view)
            let passedDistance = translation.x > 72
            let passedVelocity = velocity.x > 900
            guard passedDistance || passedVelocity else { return }

            if let nav = host.navigationController,
               nav.viewControllers.count > 1,
               nav.topViewController === host
            {
                nav.popViewController(animated: true)
                return
            }

            if host.presentingViewController != nil {
                host.dismiss(animated: true)
            }
        }

        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let host else { return false }

            if let nav = host.navigationController,
               nav.viewControllers.count > 1,
               nav.topViewController === host
            {
                return true
            }

            return host.presentingViewController != nil
        }
    }

    private struct SwipeBackFallbackAssociationKeys {
        static var recognizerKey: UInt8 = 0
        static var handlerKey: UInt8 = 0
    }

    static func installGlobalSwipeBackEnablerIfNeeded() {
        guard self === UIViewController.self else { return }
        struct Holder {
            static var didInstall = false
        }
        guard !Holder.didInstall else { return }
        Holder.didInstall = true

        let original = #selector(UIViewController.viewDidAppear(_:))
        let swizzled = #selector(UIViewController.nd_swizzled_viewDidAppear(_:))
        guard
            let originalMethod = class_getInstanceMethod(UIViewController.self, original),
            let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzled)
        else {
            return
        }
        method_exchangeImplementations(originalMethod, swizzledMethod)
    }

    @objc
    func nd_swizzled_viewDidAppear(_ animated: Bool) {
        // Calls original implementation after swizzle.
        nd_swizzled_viewDidAppear(animated)
        if let nav = navigationController, nav.viewControllers.count > 1 {
            if let popGesture = nav.interactivePopGestureRecognizer {
                popGesture.isEnabled = true
                popGesture.delegate = nil
            }
        }
        nd_installSwipeBackFallbackIfNeeded()
    }

    private func nd_installSwipeBackFallbackIfNeeded() {
        guard objc_getAssociatedObject(self, &SwipeBackFallbackAssociationKeys.recognizerKey) == nil else {
            if let handler = objc_getAssociatedObject(self, &SwipeBackFallbackAssociationKeys.handlerKey) as? SwipeBackFallbackHandler {
                handler.host = self
            }
            return
        }

        let handler = SwipeBackFallbackHandler(host: self)
        let recognizer = UIScreenEdgePanGestureRecognizer(target: handler, action: #selector(SwipeBackFallbackHandler.handleEdgePan(_:)))
        recognizer.edges = .left
        recognizer.cancelsTouchesInView = false
        recognizer.delegate = handler

        view.addGestureRecognizer(recognizer)
        objc_setAssociatedObject(
            self,
            &SwipeBackFallbackAssociationKeys.handlerKey,
            handler,
            .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )
        objc_setAssociatedObject(
            self,
            &SwipeBackFallbackAssociationKeys.recognizerKey,
            recognizer,
            .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )
    }
}

extension View {
    func enableSwipeBackGesture() -> some View {
        background(SwipeBackEnabler())
            .onAppear {
                UIViewController.installGlobalSwipeBackEnablerIfNeeded()
            }
    }
}

@main
struct NailsDashApp: App {
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var pushAppDelegate
    @StateObject private var appState = AppState()

    init() {
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UITheme.uiBackgroundBlack
        nav.titleTextAttributes = [.foregroundColor: UIColor.white]
        nav.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        UINavigationBar.appearance().tintColor = UITheme.uiBrandGold

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UITheme.uiBackgroundBlack
        tab.stackedLayoutAppearance.selected.iconColor = UITheme.uiBrandGold
        tab.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UITheme.uiBrandGold,
            .font: UITheme.tabFontSelected,
        ]
        tab.stackedLayoutAppearance.normal.iconColor = UITheme.uiSecondaryText
        tab.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UITheme.uiSecondaryText,
            .font: UITheme.tabFontNormal,
        ]
        tab.stackedLayoutAppearance.selected.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: -2)
        tab.stackedLayoutAppearance.normal.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: -2)
        UITabBar.appearance().standardAppearance = tab
        if #available(iOS 15.0, *) {
            UITabBar.appearance().scrollEdgeAppearance = tab
        }

        UITableView.appearance().backgroundColor = UITheme.uiBackgroundBlack
        UICollectionView.appearance().backgroundColor = UITheme.uiBackgroundBlack
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if appState.isLoggedIn {
                    HomeView()
                } else {
                    LoginView()
                }
            }
            .environmentObject(appState)
            .preferredColorScheme(.dark)
            .task {
                appState.bootstrap()
                await appState.checkAppVersionIfNeeded(force: true)
                PushNotificationManager.shared.syncForSession(
                    isLoggedIn: appState.isLoggedIn,
                    userID: appState.currentUser?.id
                )
            }
            .onChange(of: scenePhase) { phase in
                guard phase == .active else { return }
                Task {
                    await appState.checkAppVersionIfNeeded(force: true)
                }
            }
            .onChange(of: appState.isLoggedIn) { isLoggedIn in
                PushNotificationManager.shared.syncForSession(
                    isLoggedIn: isLoggedIn,
                    userID: appState.currentUser?.id
                )
            }
            .onChange(of: appState.currentUser?.id) { userID in
                PushNotificationManager.shared.syncForSession(
                    isLoggedIn: appState.isLoggedIn,
                    userID: userID
                )
            }
            .onReceive(NotificationCenter.default.publisher(for: .pushOpenAppointments)) { _ in
                guard appState.isLoggedIn else { return }
                appState.selectedTab = .appointments
                appState.resetBookFlowSource()
                appState.resetBookNavigationStack()
                appState.resetDealsNavigationStack()
            }
            .alert(item: $appState.appVersionPrompt) { prompt in
                let message = appVersionAlertMessage(for: prompt)
                if prompt.forceUpdate {
                    return Alert(
                        title: Text(prompt.title),
                        message: Text(message),
                        dismissButton: .default(Text("Update Now")) {
                            if let url = prompt.appStoreURL {
                                openURL(url)
                            }
                            appState.clearAppVersionPromptWithoutPersisting()
                        }
                    )
                }
                return Alert(
                    title: Text(prompt.title),
                    message: Text(message),
                    primaryButton: .default(Text("Update Now")) {
                        if let url = prompt.appStoreURL {
                            openURL(url)
                        }
                        appState.clearAppVersionPromptWithoutPersisting()
                    },
                    secondaryButton: .cancel(Text("Later")) {
                        appState.dismissAppVersionPrompt()
                    }
                )
            }
        }
    }

    private func appVersionAlertMessage(for prompt: AppVersionPrompt) -> String {
        let trimmedNotes = prompt.releaseNotes?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmedNotes.isEmpty else { return prompt.message }
        return "\(prompt.message)\n\n\(trimmedNotes)"
    }
}
