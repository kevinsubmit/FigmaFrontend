package com.nailsdash.android.ui.component

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import coil.imageLoader
import coil.request.CachePolicy
import coil.request.ImageRequest

@Composable
fun ImagePrefetchEffect(
    urls: List<String>,
    maxCount: Int = 8,
) {
    val context = LocalContext.current
    val prefetchTargets = remember(urls, maxCount) {
        urls
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
            .take(maxCount)
    }

    LaunchedEffect(prefetchTargets) {
        prefetchTargets.forEach { url ->
            if (!ImagePrefetchRegistry.shouldPrefetch(url)) return@forEach
            context.imageLoader.enqueue(
                ImageRequest.Builder(context)
                    .data(url)
                    .memoryCachePolicy(CachePolicy.ENABLED)
                    .diskCachePolicy(CachePolicy.ENABLED)
                    .networkCachePolicy(CachePolicy.ENABLED)
                    .build(),
            )
        }
    }
}

private object ImagePrefetchRegistry {
    private const val MAX_TRACKED_URLS = 512
    private val tracked = object : LinkedHashMap<String, Unit>(MAX_TRACKED_URLS, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Unit>?): Boolean {
            return size > MAX_TRACKED_URLS
        }
    }

    @Synchronized
    fun shouldPrefetch(url: String): Boolean {
        if (tracked.containsKey(url)) return false
        tracked[url] = Unit
        return true
    }
}
