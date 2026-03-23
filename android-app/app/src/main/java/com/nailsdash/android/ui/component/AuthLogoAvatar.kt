package com.nailsdash.android.ui.component

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.nailsdash.android.R

@Composable
fun AuthLogoAvatar(
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier) {
        Image(
            painter = painterResource(id = R.drawable.auth_logo),
            contentDescription = "Default avatar",
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            contentScale = ContentScale.Fit,
        )
    }
}
