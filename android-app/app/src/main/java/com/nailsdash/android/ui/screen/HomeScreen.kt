package com.nailsdash.android.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(text = "NailsDash Android", style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "Kotlin + Jetpack Compose baseline is ready. Next step: wire home feed endpoints.",
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}
