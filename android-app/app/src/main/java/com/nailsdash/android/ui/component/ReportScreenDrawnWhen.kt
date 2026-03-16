package com.nailsdash.android.ui.component

import androidx.activity.compose.ReportDrawnWhen
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos

@Composable
fun ReportScreenDrawnWhen(isReady: Boolean) {
    var frameCommitted by remember { mutableStateOf(false) }

    LaunchedEffect(isReady) {
        frameCommitted = false
        if (isReady) {
            withFrameNanos { }
            frameCommitted = true
        }
    }

    ReportDrawnWhen { frameCommitted }
}
