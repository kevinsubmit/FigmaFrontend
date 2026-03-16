package com.nailsdash.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import com.nailsdash.android.benchmark.BenchmarkOverrides
import com.nailsdash.android.ui.NailsDashApp
import com.nailsdash.android.ui.theme.NailsDashTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        BenchmarkOverrides.syncFromIntent(intent)
        enableEdgeToEdge()

        setContent {
            NailsDashTheme {
                Surface {
                    NailsDashApp()
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        BenchmarkOverrides.syncFromIntent(intent)
    }
}
