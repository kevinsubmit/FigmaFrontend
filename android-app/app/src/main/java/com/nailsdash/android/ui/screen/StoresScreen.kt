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
import com.nailsdash.android.BuildConfig

@Composable
fun StoresScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(text = "Stores", style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "API base URL: ${BuildConfig.API_BASE_URL}",
            style = MaterialTheme.typography.bodyLarge,
        )
        Text(
            text = "Implement store list from GET /stores/ in data and viewmodel layers.",
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
