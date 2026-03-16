package com.nailsdash.android.baselineprofile

import android.content.Intent
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.BySelector
import androidx.test.uiautomator.StaleObjectException
import androidx.test.uiautomator.UiObject2
import androidx.test.uiautomator.Until
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    private companion object {
        private const val BenchmarkModeExtra = "com.nailsdash.android.extra.BENCHMARK_MODE"
    }

    @get:Rule
    val baselineProfileRule = BaselineProfileRule()

    @Test
    fun generate() = baselineProfileRule.collect(
        packageName = "com.nailsdash.android",
        includeInStartupProfile = true,
    ) {
        launchBenchmarkApp()

        requireHasObject(By.desc("tab-home"))
        device.waitForIdle()
        swipeUp()

        clickByDesc("benchmark-pin-101")
        requireHasObject(By.desc("Back"))
        pressHome()

        launchBenchmarkApp()
        requireHasObject(By.desc("tab-home"))

        navigateToTab("tab-book")
        clickByDesc("benchmark-store-201")
        requireHasObject(By.desc("Back"))
        pressHome()

        launchBenchmarkApp()
        requireHasObject(By.desc("tab-home"))

        navigateToTab("tab-appointments")
        device.waitForIdle()

        navigateToTab("tab-deals")
        swipeUp()

        navigateToTab("tab-profile")
        device.waitForIdle()

        navigateToTab("tab-home")
        device.waitForIdle()
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.launchBenchmarkApp() {
        pressHome()
        startActivityAndWait(
            Intent(Intent.ACTION_MAIN).apply {
                setClassName(packageName, "com.nailsdash.android.MainActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra(BenchmarkModeExtra, true)
            },
        )
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.navigateToTab(description: String) {
        clickByDesc(description)
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.clickByText(text: String) {
        clickWithRetry(targetName = "text:$text") {
            device.wait(Until.findObject(By.text(text)), 5_000)
        }
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.clickByDesc(description: String) {
        clickWithRetry(targetName = "desc:$description") {
            device.wait(Until.findObject(By.desc(description)), 5_000)
        }
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.clickWithRetry(
        targetName: String,
        block: () -> androidx.test.uiautomator.UiObject2?,
    ) {
        repeat(3) { attempt ->
            try {
                val target = block()
                    ?: error("Unable to find benchmark target: $targetName")
                tap(target)
                device.waitForIdle()
                return
            } catch (error: StaleObjectException) {
                if (attempt == 2) throw error
            } catch (error: IllegalStateException) {
                if (attempt == 2) throw error
            }
        }
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.requireHasObject(
        selector: BySelector,
        timeoutMs: Long = 5_000,
    ) {
        check(device.wait(Until.hasObject(selector), timeoutMs)) {
            "Expected benchmark node was not visible: $selector"
        }
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.tap(target: UiObject2) {
        val bounds = target.visibleBounds
        check(bounds.width() > 0 && bounds.height() > 0) {
            "Target node has no visible bounds: ${target.contentDescription ?: target.text}"
        }
        device.click(bounds.centerX(), bounds.centerY())
    }

    private fun androidx.benchmark.macro.MacrobenchmarkScope.swipeUp() {
        val centerX = device.displayWidth / 2
        val startY = (device.displayHeight * 0.78f).toInt()
        val endY = (device.displayHeight * 0.28f).toInt()
        device.swipe(centerX, startY, centerX, endY, 14)
        device.waitForIdle()
    }
}
