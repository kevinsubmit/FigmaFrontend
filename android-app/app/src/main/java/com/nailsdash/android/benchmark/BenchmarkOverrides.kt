package com.nailsdash.android.benchmark

import android.content.Intent

object BenchmarkOverrides {
    const val ExtraBenchmarkMode = "com.nailsdash.android.extra.BENCHMARK_MODE"

    @Volatile
    private var benchmarkModeEnabled = false

    fun syncFromIntent(intent: Intent?) {
        benchmarkModeEnabled = intent?.getBooleanExtra(ExtraBenchmarkMode, false) == true
    }

    fun isEnabled(): Boolean = benchmarkModeEnabled
}
