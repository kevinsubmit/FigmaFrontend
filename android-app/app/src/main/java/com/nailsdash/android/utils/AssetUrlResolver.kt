package com.nailsdash.android.utils

import com.nailsdash.android.BuildConfig

object AssetUrlResolver {
    fun resolveURL(raw: String?): String? {
        val value = raw?.trim().orEmpty()
        if (value.isEmpty()) return null
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value
        }

        val base = BuildConfig.API_BASE_URL
            .removeSuffix("/")
            .removeSuffix("api/v1")
            .removeSuffix("/")

        return if (value.startsWith("/")) {
            "$base$value"
        } else {
            "$base/$value"
        }
    }
}
