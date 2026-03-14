package com.nailsdash.android.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.nailsdash.android.ui.state.BookingStyleReference
import com.nailsdash.android.utils.AssetUrlResolver

private val ReferenceCardBackground = Color(0xFF111111)
private val ReferenceGold = Color(0xFFD4AF37)
private val ReferenceBorder = ReferenceGold.copy(alpha = 0.22f)
private val ReferenceSecondary = Color.White.copy(alpha = 0.62f)

@Composable
fun BookingStyleReferenceCard(
    reference: BookingStyleReference,
    onClear: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val tagsText = remember(reference.tags) {
        reference.tags
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .take(4)
            .joinToString(separator = " · ")
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = ReferenceCardBackground,
        ),
        border = BorderStroke(1.dp, ReferenceBorder),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.White.copy(alpha = 0.08f)),
            ) {
                AsyncImage(
                    model = remember(reference.imageUrl) { AssetUrlResolver.resolveURL(reference.imageUrl) },
                    contentDescription = reference.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.matchParentSize(),
                )
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = "Reference look",
                    color = ReferenceGold.copy(alpha = 0.88f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.4.sp,
                )
                Text(
                    text = reference.title,
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (tagsText.isNotEmpty()) {
                    Text(
                        text = tagsText,
                        color = ReferenceSecondary,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            val clearInteraction = remember { MutableInteractionSource() }
            Box(
                modifier = Modifier
                    .heightIn(min = 30.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White.copy(alpha = 0.04f))
                    .border(1.dp, ReferenceGold.copy(alpha = 0.20f), RoundedCornerShape(999.dp))
                    .clickable(
                        interactionSource = clearInteraction,
                        indication = null,
                        onClick = onClear,
                    )
                    .padding(horizontal = 12.dp, vertical = 7.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Clear",
                    color = ReferenceSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
