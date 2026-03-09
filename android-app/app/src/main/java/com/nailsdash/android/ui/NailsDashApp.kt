package com.nailsdash.android.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.nailsdash.android.R
import com.nailsdash.android.ui.screen.AppointmentDetailScreen
import com.nailsdash.android.ui.screen.AppointmentsScreen
import com.nailsdash.android.ui.screen.AboutUsScreen
import com.nailsdash.android.ui.screen.BookAppointmentScreen
import com.nailsdash.android.ui.screen.CouponsScreen
import com.nailsdash.android.ui.screen.DealsScreen
import com.nailsdash.android.ui.screen.FeedbackSupportScreen
import com.nailsdash.android.ui.screen.FavoritesScreen
import com.nailsdash.android.ui.screen.GiftCardsScreen
import com.nailsdash.android.ui.screen.HomeScreen
import com.nailsdash.android.ui.screen.HomePinDetailScreen
import com.nailsdash.android.ui.screen.LanguageSettingsScreen
import com.nailsdash.android.ui.screen.LoginScreen
import com.nailsdash.android.ui.screen.NotificationsScreen
import com.nailsdash.android.ui.screen.OrderHistoryScreen
import com.nailsdash.android.ui.screen.PartnershipInquiryScreen
import com.nailsdash.android.ui.screen.PhoneSettingsScreen
import com.nailsdash.android.ui.screen.PointsScreen
import com.nailsdash.android.ui.screen.ProfileSettingsScreen
import com.nailsdash.android.ui.screen.ProfileScreen
import com.nailsdash.android.ui.screen.PrivacySafetyScreen
import com.nailsdash.android.ui.screen.ReferralScreen
import com.nailsdash.android.ui.screen.ReviewsScreen
import com.nailsdash.android.ui.screen.SettingsScreen
import com.nailsdash.android.ui.screen.StoreDetailScreen
import com.nailsdash.android.ui.screen.StoresScreen
import com.nailsdash.android.ui.screen.VipScreen
import com.nailsdash.android.ui.screen.ChangePasswordScreen
import com.nailsdash.android.ui.state.AppSessionViewModel

private enum class MainDestination(
    val route: String,
    val titleRes: Int,
    val icon: @Composable () -> Unit,
) {
    Home(
        route = "home",
        titleRes = R.string.nav_home,
        icon = { Icon(Icons.Filled.Home, contentDescription = null) },
    ),
    Book(
        route = "book",
        titleRes = R.string.nav_book,
        icon = { Icon(Icons.Filled.Storefront, contentDescription = null) },
    ),
    Appointments(
        route = "appointments",
        titleRes = R.string.nav_appointments,
        icon = { Icon(Icons.Filled.CalendarMonth, contentDescription = null) },
    ),
    Deals(
        route = "deals",
        titleRes = R.string.nav_deals,
        icon = { Icon(Icons.Filled.CardGiftcard, contentDescription = null) },
    ),
    Profile(
        route = "profile",
        titleRes = R.string.nav_profile,
        icon = { Icon(Icons.Filled.Person, contentDescription = null) },
    ),
}

@Composable
fun NailsDashApp() {
    val sessionViewModel: AppSessionViewModel = viewModel()

    LaunchedEffect(Unit) {
        sessionViewModel.bootstrap()
    }

    if (!sessionViewModel.isLoggedIn) {
        LoginScreen(sessionViewModel = sessionViewModel)
        return
    }

    val navController = rememberNavController()
    val tabRoutes = MainDestination.entries.map { it.route }.toSet()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val showBottomBar = currentDestination?.route in tabRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    MainDestination.entries.forEach { tab ->
                        val selected = currentDestination
                            ?.hierarchy
                            ?.any { it.route == tab.route } == true

                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = tab.icon,
                            label = { Text(text = stringResource(id = tab.titleRes)) },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MainDestination.Home.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(MainDestination.Home.route) {
                HomeScreen(
                    onOpenPin = { pinId ->
                        navController.navigate("home/pin/$pinId")
                    },
                )
            }
            composable(
                route = "home/pin/{pinId}",
                arguments = listOf(navArgument("pinId") { type = NavType.IntType }),
            ) { backStackEntry ->
                val pinId = backStackEntry.arguments?.getInt("pinId") ?: return@composable
                HomePinDetailScreen(
                    pinId = pinId,
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                    onOpenPin = { relatedPinId ->
                        navController.navigate("home/pin/$relatedPinId")
                    },
                    onChooseSalon = { pin ->
                        sessionViewModel.openBookFlow(pin)
                        navController.navigate(MainDestination.Book.route) {
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(MainDestination.Book.route) {
                StoresScreen(
                    sessionViewModel = sessionViewModel,
                    onOpenStore = { storeId ->
                        navController.navigate("book/store/$storeId")
                    },
                )
            }
            composable(
                route = "book/store/{storeId}",
                arguments = listOf(navArgument("storeId") { type = NavType.IntType }),
            ) { backStackEntry ->
                val storeId = backStackEntry.arguments?.getInt("storeId") ?: return@composable
                StoreDetailScreen(
                    storeId = storeId,
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                    onBookNow = { routeStoreId, preselectedServiceId ->
                        val serviceArg = preselectedServiceId ?: -1
                        navController.navigate("book/form/$routeStoreId?serviceId=$serviceArg")
                    },
                )
            }
            composable(
                route = "book/form/{storeId}?serviceId={serviceId}",
                arguments = listOf(
                    navArgument("storeId") { type = NavType.IntType },
                    navArgument("serviceId") {
                        type = NavType.IntType
                        defaultValue = -1
                    },
                ),
            ) { backStackEntry ->
                val storeId = backStackEntry.arguments?.getInt("storeId") ?: return@composable
                val serviceId = backStackEntry.arguments?.getInt("serviceId") ?: -1
                BookAppointmentScreen(
                    storeId = storeId,
                    preselectedServiceId = serviceId.takeIf { it > 0 },
                    sessionViewModel = sessionViewModel,
                    onBookSuccess = {
                        sessionViewModel.resetBookFlowSource()
                        navController.navigate(MainDestination.Appointments.route) {
                            popUpTo(MainDestination.Book.route)
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(MainDestination.Appointments.route) {
                AppointmentsScreen(
                    sessionViewModel = sessionViewModel,
                    onOpenAppointment = { appointmentId ->
                        navController.navigate("appointments/detail/$appointmentId")
                    },
                    onOpenBook = {
                        navController.navigate(MainDestination.Book.route) {
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(
                route = "appointments/detail/{appointmentId}",
                arguments = listOf(navArgument("appointmentId") { type = NavType.IntType }),
            ) { backStackEntry ->
                val appointmentId = backStackEntry.arguments?.getInt("appointmentId") ?: return@composable
                AppointmentDetailScreen(
                    appointmentId = appointmentId,
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable(MainDestination.Deals.route) {
                DealsScreen(
                    onOpenStore = { storeId ->
                        navController.navigate("book/store/$storeId")
                    },
                    onBrowseStores = {
                        navController.navigate(MainDestination.Book.route) {
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(MainDestination.Profile.route) {
                ProfileScreen(
                    sessionViewModel = sessionViewModel,
                    onOpenPoints = { navController.navigate("profile/points") },
                    onOpenCoupons = { navController.navigate("profile/coupons") },
                    onOpenGiftCards = { navController.navigate("profile/giftcards") },
                    onOpenOrders = { navController.navigate("profile/orders") },
                    onOpenReviews = { navController.navigate("profile/reviews") },
                    onOpenFavorites = { navController.navigate("profile/favorites") },
                    onOpenVip = { navController.navigate("profile/vip") },
                    onOpenReferral = { navController.navigate("profile/referral") },
                    onOpenNotifications = { navController.navigate("profile/notifications") },
                    onOpenSettings = { navController.navigate("profile/settings") },
                )
            }
            composable("profile/points") {
                PointsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/coupons") {
                CouponsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/giftcards") {
                GiftCardsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/orders") {
                OrderHistoryScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/reviews") {
                ReviewsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/favorites") {
                FavoritesScreen(
                    sessionViewModel = sessionViewModel,
                    onBrowseSalons = {
                        navController.navigate(MainDestination.Book.route) {
                            launchSingleTop = true
                        }
                    },
                    onOpenPin = { pinId ->
                        navController.navigate("home/pin/$pinId")
                    },
                    onOpenStore = { storeId ->
                        navController.navigate("book/store/$storeId")
                    },
                )
            }
            composable("profile/vip") {
                VipScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/referral") {
                ReferralScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/notifications") {
                NotificationsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                    onOpenAppointment = { appointmentId ->
                        navController.navigate("appointments/detail/$appointmentId")
                    },
                )
            }
            composable("profile/settings") {
                SettingsScreen(
                    sessionViewModel = sessionViewModel,
                    onOpenProfileSettings = { navController.navigate("profile/settings/profile") },
                    onOpenChangePassword = { navController.navigate("profile/settings/password") },
                    onOpenPhoneSettings = { navController.navigate("profile/settings/phone") },
                    onOpenVipMembership = { navController.navigate("profile/vip") },
                    onOpenLanguageSettings = { navController.navigate("profile/settings/language") },
                    onOpenNotifications = { navController.navigate("profile/notifications") },
                    onOpenFeedbackSupport = { navController.navigate("profile/settings/feedback") },
                    onOpenPartnershipInquiry = { navController.navigate("profile/settings/partnership") },
                    onOpenPrivacySafety = { navController.navigate("profile/settings/privacy") },
                    onOpenAboutUs = { navController.navigate("profile/settings/about") },
                )
            }
            composable("profile/settings/profile") {
                ProfileSettingsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/settings/password") {
                ChangePasswordScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/settings/phone") {
                PhoneSettingsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/settings/language") {
                LanguageSettingsScreen(sessionViewModel = sessionViewModel)
            }
            composable("profile/settings/feedback") {
                FeedbackSupportScreen()
            }
            composable("profile/settings/partnership") {
                PartnershipInquiryScreen()
            }
            composable("profile/settings/privacy") {
                PrivacySafetyScreen()
            }
            composable("profile/settings/about") {
                AboutUsScreen()
            }
        }
    }
}
