import SwiftUI
import UIKit

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

@main
struct NailsDashApp: App {
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
            }
        }
    }
}
