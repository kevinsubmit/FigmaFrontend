import SwiftUI

@main
struct NailsDashApp: App {
    @StateObject private var appState = AppState()

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
            .task {
                appState.bootstrap()
            }
        }
    }
}
