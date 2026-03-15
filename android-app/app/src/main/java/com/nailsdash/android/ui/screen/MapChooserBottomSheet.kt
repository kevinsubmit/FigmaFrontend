package com.nailsdash.android.ui.screen

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

enum class MapAppOption {
    GoogleMaps,
    SystemDefault,
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapChooserBottomSheet(
    placeTitle: String,
    onDismiss: () -> Unit,
    onChoose: (MapAppOption) -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = "Open in Maps",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = placeTitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Button(
                onClick = { onChoose(MapAppOption.GoogleMaps) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Google Maps")
            }
            Button(
                onClick = { onChoose(MapAppOption.SystemDefault) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("System Maps")
            }
            androidx.compose.foundation.layout.Box(modifier = Modifier.height(8.dp))
        }
    }
}

fun openMapWithOption(
    context: Context,
    option: MapAppOption,
    placeTitle: String,
    address: String,
    latitude: Double? = null,
    longitude: Double? = null,
): Boolean {
    val query = Uri.encode("$placeTitle, $address")
    return when (option) {
        MapAppOption.GoogleMaps -> {
            openGoogleMaps(context, query, latitude, longitude) || openSystemMap(context, query, latitude, longitude)
        }
        MapAppOption.SystemDefault -> openSystemMap(context, query, latitude, longitude)
    }
}

private fun openGoogleMaps(
    context: Context,
    encodedQuery: String,
    latitude: Double?,
    longitude: Double?,
): Boolean {
    val uri = if (latitude != null && longitude != null) {
        Uri.parse("geo:$latitude,$longitude?q=$encodedQuery")
    } else {
        Uri.parse("geo:0,0?q=$encodedQuery")
    }
    val intent = Intent(Intent.ACTION_VIEW, uri).setPackage("com.google.android.apps.maps")
    return tryStartActivity(context, intent)
}

private fun openSystemMap(
    context: Context,
    encodedQuery: String,
    latitude: Double?,
    longitude: Double?,
): Boolean {
    val uri = if (latitude != null && longitude != null) {
        Uri.parse("geo:$latitude,$longitude?q=$encodedQuery")
    } else {
        Uri.parse("geo:0,0?q=$encodedQuery")
    }
    return tryStartActivity(context, Intent(Intent.ACTION_VIEW, uri))
}

private fun tryStartActivity(context: Context, intent: Intent): Boolean {
    return runCatching {
        if (intent.resolveActivity(context.packageManager) == null) {
            false
        } else {
            context.startActivity(intent)
            true
        }
    }.getOrDefault(false)
}
