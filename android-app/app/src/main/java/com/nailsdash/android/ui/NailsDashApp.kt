package com.nailsdash.android.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.nailsdash.android.ui.screen.StorePortfolioDetailScreen
import com.nailsdash.android.ui.screen.StoresScreen
import com.nailsdash.android.ui.screen.VipScreen
import com.nailsdash.android.ui.screen.ChangePasswordScreen
import com.nailsdash.android.ui.component.ReportScreenDrawnWhen
import com.nailsdash.android.ui.state.AppSessionViewModel

private val BottomNavBackgroundColor = Color.Black
private val BottomNavSelectedColor = Color(0xFFD4AF37)
private val BottomNavUnselectedColor = Color.White.copy(alpha = 0.62f)
private val BottomNavShellHeight = 58.dp
private val BottomNavOuterHorizontalPadding = 14.dp
private val BottomNavOuterBottomPadding = 8.dp
private val BottomNavIndicatorInset = 5.dp
private val BottomNavCornerRadius = 22.dp
private const val NavTransitionDurationMs = 260
private const val BottomBarTransitionDurationMs = 220

private fun routeDepth(route: String?): Int {
    val base = route?.substringBefore("?").orEmpty()
    if (base.isBlank()) return 0
    return base.count { it == '/' }
}

private fun tabRouteIndex(route: String?): Int {
    val base = route?.substringBefore("?").orEmpty()
    return MainDestination.entries.indexOfFirst { it.route == base }
}

private fun tabTransitionDirection(from: String?, to: String?): Int {
    val fromIndex = tabRouteIndex(from)
    val toIndex = tabRouteIndex(to)
    if (fromIndex < 0 || toIndex < 0 || fromIndex == toIndex) return 0
    return if (toIndex > fromIndex) 1 else -1
}

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

    if (!sessionViewModel.isLoggedIn) {
        ReportScreenDrawnWhen(isReady = !sessionViewModel.isLoadingAuth)
        LoginScreen(sessionViewModel = sessionViewModel)
        return
    }

    val navController = rememberNavController()
    val tabRoutes = MainDestination.entries.map { it.route }.toSet()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val currentRoute = currentDestination?.route
    val showBottomBar = currentDestination?.route in tabRoutes

    LaunchedEffect(currentRoute) {
        if (currentRoute in tabRoutes && currentRoute != MainDestination.Book.route) {
            sessionViewModel.resetBookFlowSource()
        }
    }

    Scaffold(
        containerColor = BottomNavBackgroundColor,
        contentColor = Color.White,
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomBar,
                enter = fadeIn(animationSpec = tween(durationMillis = BottomBarTransitionDurationMs)) +
                    slideInVertically(
                        animationSpec = tween(durationMillis = BottomBarTransitionDurationMs),
                        initialOffsetY = { it / 2 },
                    ),
                exit = fadeOut(animationSpec = tween(durationMillis = BottomBarTransitionDurationMs - 40)) +
                    slideOutVertically(
                        animationSpec = tween(durationMillis = BottomBarTransitionDurationMs - 40),
                        targetOffsetY = { it / 2 },
                    ),
            ) {
                BottomTabBar(
                    currentDestination = currentDestination,
                    onSelectTab = { tab ->
                        if (tab == MainDestination.Home) {
                            val poppedToHome = navController.popBackStack(
                                route = MainDestination.Home.route,
                                inclusive = false,
                            )
                            if (!poppedToHome || navController.currentDestination?.route != MainDestination.Home.route) {
                                navController.navigate(MainDestination.Home.route) {
                                    launchSingleTop = true
                                }
                            }
                            return@BottomTabBar
                        }

                        navController.navigate(tab.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MainDestination.Home.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = {
                val from = initialState.destination.route
                val to = targetState.destination.route
                val tabToTab = from in tabRoutes && to in tabRoutes
                if (tabToTab) {
                    val direction = tabTransitionDirection(from, to)
                    slideInHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        initialOffsetX = { fullWidth ->
                            when {
                                direction > 0 -> (fullWidth * 0.18f).toInt()
                                direction < 0 -> -(fullWidth * 0.18f).toInt()
                                else -> 0
                            }
                        },
                    ) + fadeIn(animationSpec = tween(durationMillis = NavTransitionDurationMs - 30))
                } else {
                    slideInHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        initialOffsetX = { fullWidth -> (fullWidth * 0.16f).toInt() },
                    ) + fadeIn(animationSpec = tween(durationMillis = NavTransitionDurationMs))
                }
            },
            exitTransition = {
                val from = initialState.destination.route
                val to = targetState.destination.route
                val fromDepth = routeDepth(from)
                val toDepth = routeDepth(to)
                val tabToTab = from in tabRoutes && to in tabRoutes
                if (tabToTab) {
                    val direction = tabTransitionDirection(from, to)
                    slideOutHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        targetOffsetX = { fullWidth ->
                            when {
                                direction > 0 -> -(fullWidth * 0.18f).toInt()
                                direction < 0 -> (fullWidth * 0.18f).toInt()
                                else -> 0
                            }
                        },
                    ) + fadeOut(animationSpec = tween(durationMillis = NavTransitionDurationMs - 60))
                } else if (toDepth >= fromDepth) {
                    slideOutHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        targetOffsetX = { fullWidth -> -(fullWidth * 0.10f).toInt() },
                    ) + fadeOut(animationSpec = tween(durationMillis = NavTransitionDurationMs))
                } else {
                    slideOutHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        targetOffsetX = { fullWidth -> (fullWidth * 0.10f).toInt() },
                    ) + fadeOut(animationSpec = tween(durationMillis = NavTransitionDurationMs))
                }
            },
            popEnterTransition = {
                val from = initialState.destination.route
                val to = targetState.destination.route
                val tabToTab = from in tabRoutes && to in tabRoutes
                if (tabToTab) {
                    val direction = tabTransitionDirection(from, to)
                    slideInHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        initialOffsetX = { fullWidth ->
                            when {
                                direction > 0 -> (fullWidth * 0.18f).toInt()
                                direction < 0 -> -(fullWidth * 0.18f).toInt()
                                else -> 0
                            }
                        },
                    ) + fadeIn(animationSpec = tween(durationMillis = NavTransitionDurationMs - 30))
                } else {
                    slideInHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        initialOffsetX = { fullWidth -> -(fullWidth * 0.16f).toInt() },
                    ) + fadeIn(animationSpec = tween(durationMillis = NavTransitionDurationMs))
                }
            },
            popExitTransition = {
                val from = initialState.destination.route
                val to = targetState.destination.route
                val tabToTab = from in tabRoutes && to in tabRoutes
                if (tabToTab) {
                    val direction = tabTransitionDirection(from, to)
                    slideOutHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        targetOffsetX = { fullWidth ->
                            when {
                                direction > 0 -> -(fullWidth * 0.18f).toInt()
                                direction < 0 -> (fullWidth * 0.18f).toInt()
                                else -> 0
                            }
                        },
                    ) + fadeOut(animationSpec = tween(durationMillis = NavTransitionDurationMs - 60))
                } else {
                    slideOutHorizontally(
                        animationSpec = tween(durationMillis = NavTransitionDurationMs),
                        targetOffsetX = { fullWidth -> (fullWidth * 0.10f).toInt() },
                    ) + fadeOut(animationSpec = tween(durationMillis = NavTransitionDurationMs))
                }
            },
        ) {
            composable(MainDestination.Home.route) {
                HomeScreen(
                    sessionViewModel = sessionViewModel,
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
                    showBackButton = false,
                    onBack = {
                        navController.navigate(MainDestination.Home.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
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
                val requestedTab by backStackEntry.savedStateHandle
                    .getStateFlow("store_detail_selected_tab", "")
                    .collectAsState()
                StoreDetailScreen(
                    storeId = storeId,
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                    onBookingCompleted = {
                        sessionViewModel.resetBookFlowSource()
                        sessionViewModel.requestAppointmentsRefresh()
                        navController.navigate(MainDestination.Appointments.route) {
                            popUpTo(MainDestination.Book.route)
                            launchSingleTop = true
                        }
                    },
                    requestedTabLabel = requestedTab.takeIf { it.isNotBlank() },
                    onRequestedTabConsumed = {
                        backStackEntry.savedStateHandle["store_detail_selected_tab"] = ""
                    },
                    onOpenPortfolio = { portfolioId ->
                        navController.navigate("book/store/$storeId/portfolio/$portfolioId")
                    },
                )
            }
            composable(
                route = "book/store/{storeId}/portfolio/{portfolioId}",
                arguments = listOf(
                    navArgument("storeId") { type = NavType.IntType },
                    navArgument("portfolioId") { type = NavType.IntType },
                ),
            ) { backStackEntry ->
                val storeId = backStackEntry.arguments?.getInt("storeId") ?: return@composable
                val portfolioId = backStackEntry.arguments?.getInt("portfolioId") ?: return@composable
                StorePortfolioDetailScreen(
                    storeId = storeId,
                    portfolioId = portfolioId,
                    onBack = { navController.navigateUp() },
                    onBookServices = {
                        navController.previousBackStackEntry
                            ?.savedStateHandle
                            ?.set("store_detail_selected_tab", "Services")
                        navController.navigateUp()
                    },
                )
            }
            composable(
                route = "book/form/{storeId}?serviceId={serviceId}&serviceIds={serviceIds}",
                arguments = listOf(
                    navArgument("storeId") { type = NavType.IntType },
                    navArgument("serviceId") {
                        type = NavType.IntType
                        defaultValue = -1
                    },
                    navArgument("serviceIds") {
                        type = NavType.StringType
                        defaultValue = ""
                    },
                ),
            ) { backStackEntry ->
                val storeId = backStackEntry.arguments?.getInt("storeId") ?: return@composable
                val serviceId = backStackEntry.arguments?.getInt("serviceId") ?: -1
                val serviceIdsArg = backStackEntry.arguments?.getString("serviceIds").orEmpty()
                val preselectedServiceIds = serviceIdsArg
                    .split(",")
                    .mapNotNull { value -> value.trim().toIntOrNull() }
                    .distinct()
                BookAppointmentScreen(
                    storeId = storeId,
                    preselectedServiceId = serviceId.takeIf { it > 0 },
                    preselectedServiceIds = preselectedServiceIds,
                    sessionViewModel = sessionViewModel,
                    onClose = { navController.navigateUp() },
                    onBookSuccess = {
                        sessionViewModel.resetBookFlowSource()
                        sessionViewModel.requestAppointmentsRefresh()
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
                    sessionViewModel = sessionViewModel,
                    onOpenStore = { storeId ->
                        navController.navigate("book/store/$storeId")
                    },
                    onBrowseStores = {
                        navController.navigate("deals/stores")
                    },
                )
            }
            composable("deals/stores") {
                StoresScreen(
                    sessionViewModel = sessionViewModel,
                    hideTabBar = true,
                    onBack = { navController.navigateUp() },
                    onOpenStore = { storeId ->
                        navController.navigate("book/store/$storeId")
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
                PointsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/coupons") {
                CouponsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/giftcards") {
                GiftCardsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/orders") {
                OrderHistoryScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/reviews") {
                ReviewsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/favorites") {
                FavoritesScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
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
                VipScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/referral") {
                ReferralScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
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
                    onBack = { navController.navigateUp() },
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
                ProfileSettingsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/settings/password") {
                ChangePasswordScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/settings/phone") {
                PhoneSettingsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/settings/language") {
                LanguageSettingsScreen(
                    sessionViewModel = sessionViewModel,
                    onBack = { navController.navigateUp() },
                )
            }
            composable("profile/settings/feedback") {
                FeedbackSupportScreen(onBack = { navController.navigateUp() })
            }
            composable("profile/settings/partnership") {
                PartnershipInquiryScreen(onBack = { navController.navigateUp() })
            }
            composable("profile/settings/privacy") {
                PrivacySafetyScreen(onBack = { navController.navigateUp() })
            }
            composable("profile/settings/about") {
                AboutUsScreen(onBack = { navController.navigateUp() })
            }
        }
    }
}

@Composable
private fun BottomTabBar(
    currentDestination: androidx.navigation.NavDestination?,
    onSelectTab: (MainDestination) -> Unit,
) {
    val selectedIndex = MainDestination.entries.indexOfFirst { tab ->
        currentDestination?.hierarchy?.any { it.route == tab.route } == true
    }.coerceAtLeast(0)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(
                start = BottomNavOuterHorizontalPadding,
                end = BottomNavOuterHorizontalPadding,
                bottom = BottomNavOuterBottomPadding,
            ),
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(BottomNavShellHeight)
                .background(
                    color = BottomNavBackgroundColor.copy(alpha = 0.84f),
                    shape = RoundedCornerShape(BottomNavCornerRadius),
                ),
        ) {
            val itemWidth = maxWidth / MainDestination.entries.size
            val animatedIndex by animateFloatAsState(
                targetValue = selectedIndex.toFloat(),
                animationSpec = tween(durationMillis = NavTransitionDurationMs),
                label = "bottom-tab-index",
            )

            Box(
                modifier = Modifier
                    .offset(x = itemWidth * animatedIndex + BottomNavIndicatorInset)
                    .padding(top = BottomNavIndicatorInset)
                    .height(BottomNavShellHeight - (BottomNavIndicatorInset * 2))
                    .width(itemWidth - (BottomNavIndicatorInset * 2))
                    .background(
                        color = BottomNavSelectedColor.copy(alpha = 0.14f),
                        shape = RoundedCornerShape(18.dp),
                    )
                    .border(
                        width = 1.dp,
                        color = BottomNavSelectedColor.copy(alpha = 0.18f),
                        shape = RoundedCornerShape(18.dp),
                    ),
            )

            Row(modifier = Modifier.fillMaxSize()) {
                MainDestination.entries.forEachIndexed { index, tab ->
                    BottomTabBarItem(
                        title = stringResource(id = tab.titleRes),
                        selected = index == selectedIndex,
                        icon = tab.icon,
                        route = tab.route,
                        onClick = { onSelectTab(tab) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun BottomTabBarItem(
    title: String,
    selected: Boolean,
    icon: @Composable () -> Unit,
    route: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val contentColor = if (selected) BottomNavSelectedColor else BottomNavUnselectedColor
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1f else 0.94f,
        animationSpec = tween(durationMillis = 180),
        label = "bottom-tab-scale",
    )
    val interactionSource = remember { MutableInteractionSource() }

    Column(
        modifier = modifier
            .fillMaxHeight()
            .semantics { contentDescription = "tab-$route" }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 4.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size((18.dp * iconScale).coerceAtLeast(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            androidx.compose.runtime.CompositionLocalProvider(
                androidx.compose.material3.LocalContentColor provides contentColor,
            ) {
                icon()
            }
        }
        Text(
            text = title,
            color = contentColor,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            lineHeight = 11.sp,
            maxLines = 1,
            softWrap = false,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}
