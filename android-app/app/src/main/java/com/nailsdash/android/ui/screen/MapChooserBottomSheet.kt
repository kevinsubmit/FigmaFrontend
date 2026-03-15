package com.nailsdash.android.ui.screen

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class MapAppOption {
    GoogleMaps,
    SystemDefault,
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapChooserBottomSheet(
    onDismiss: () -> Unit,
    onChoose: (MapAppOption) -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        dragHandle = null,
        containerColor = Color(0xFF121212),
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 68.dp, height = 8.dp)
                        .background(Color.White.copy(alpha = 0.90f), RoundedCornerShape(999.dp)),
                )
            }
            Text(
                text = "Open in Maps",
                style = MaterialTheme.typography.titleLarge.copy(fontSize = 24.sp),
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 16.dp),
            )

            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                MapChooserOptionCard(
                    title = "Google Maps",
                    icon = Icons.Filled.Map,
                    iconTint = Color(0xFF4285F4),
                    onClick = { onChoose(MapAppOption.GoogleMaps) },
                )
                MapChooserOptionCard(
                    title = "System Maps",
                    icon = Icons.Filled.LocationOn,
                    iconTint = Color(0xFFD4AF37),
                    onClick = { onChoose(MapAppOption.SystemDefault) },
                )
            }

            val cancelInteraction = remember { MutableInteractionSource() }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, start = 16.dp, end = 16.dp)
                    .height(48.dp)
                    .clickable(
                        interactionSource = cancelInteraction,
                        indication = null,
                        onClick = onDismiss,
                    ),
                contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
                Text(
                    text = "Cancel",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = Color.White.copy(alpha = 0.72f),
                )
            }
        }
    }
}

@Composable
private fun MapChooserOptionCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    onClick: () -> Unit,
) {
    val optionInteraction = remember(title) { MutableInteractionSource() }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(66.dp)
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(18.dp))
            .border(
                width = 1.dp,
                color = Color.White.copy(alpha = 0.12f),
                shape = RoundedCornerShape(18.dp),
            )
            .clickable(
                interactionSource = optionInteraction,
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .background(Color.White.copy(alpha = 0.06f), CircleShape),
            contentAlignment = androidx.compose.ui.Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(18.dp),
            )
        }
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(
                fontSize = 19.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = Color.White,
        )
        Spacer(modifier = Modifier.weight(1f))
        Icon(
            imageVector = Icons.Filled.NorthEast,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.44f),
            modifier = Modifier.size(16.dp),
        )
    }
}

fun openMapWithOption(
    context: Context,
    option: MapAppOption,
    address: String,
    latitude: Double? = null,
    longitude: Double? = null,
): Boolean {
    val query = Uri.encode(address.trim())
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
