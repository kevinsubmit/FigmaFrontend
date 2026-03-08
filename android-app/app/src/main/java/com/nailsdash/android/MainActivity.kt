package com.nailsdash.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import com.nailsdash.android.ui.NailsDashApp
import com.nailsdash.android.ui.theme.NailsDashTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            NailsDashTheme {
                Surface {
                    NailsDashApp()
                }
            }
        }
    }
}
