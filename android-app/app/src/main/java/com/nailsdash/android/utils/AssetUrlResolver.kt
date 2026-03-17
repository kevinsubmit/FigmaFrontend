package com.nailsdash.android.utils

import com.nailsdash.android.BuildConfig
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

object AssetUrlResolver {
    private val loopbackHosts = setOf(
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "[::1]",
    )

    fun resolveURL(raw: String?): String? {
        val value = raw?.trim().orEmpty()
        if (value.isEmpty()) return null

        val base = BuildConfig.API_BASE_URL
            .removeSuffix("/")
            .removeSuffix("api/v1")
            .removeSuffix("/")

        if (value.startsWith("http://", ignoreCase = true) || value.startsWith("https://", ignoreCase = true)) {
            return normalizeLoopbackHost(value, base)
        }

        return if (value.startsWith("/")) {
            "$base$value"
        } else {
            "$base/$value"
        }
    }

    private fun normalizeLoopbackHost(value: String, assetBaseURL: String): String {
        val rawUrl = value.toHttpUrlOrNull() ?: return value
        if (rawUrl.host.lowercase() !in loopbackHosts) return value

        val baseUrl = assetBaseURL.toHttpUrlOrNull() ?: return value
        return rawUrl.newBuilder()
            .scheme(baseUrl.scheme)
            .host(baseUrl.host)
            .port(baseUrl.port)
            .build()
            .toString()
    }
}
