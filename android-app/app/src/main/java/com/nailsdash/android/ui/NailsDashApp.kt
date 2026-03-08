package com.nailsdash.android.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.nailsdash.android.R
import com.nailsdash.android.ui.screen.HomeScreen
import com.nailsdash.android.ui.screen.ProfileScreen
import com.nailsdash.android.ui.screen.StoresScreen

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
    Stores(
        route = "stores",
        titleRes = R.string.nav_stores,
        icon = { Icon(Icons.Filled.Storefront, contentDescription = null) },
    ),
    Profile(
        route = "profile",
        titleRes = R.string.nav_profile,
        icon = { Icon(Icons.Filled.Person, contentDescription = null) },
    ),
}

@Composable
fun NailsDashApp() {
    val navController = rememberNavController()
    val tabs = MainDestination.entries
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
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
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MainDestination.Home.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(MainDestination.Home.route) { HomeScreen() }
            composable(MainDestination.Stores.route) { StoresScreen() }
            composable(MainDestination.Profile.route) { ProfileScreen() }
        }
    }
}
