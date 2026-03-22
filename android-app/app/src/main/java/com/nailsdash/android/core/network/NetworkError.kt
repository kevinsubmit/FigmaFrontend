package com.nailsdash.android.core.network

import okhttp3.ResponseBody
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

fun Throwable.toUserMessage(defaultMessage: String = "Request failed."): String {
    return when (this) {
        is HttpException -> {
            mapKnownServerMessage(parseApiDetail(response()?.errorBody()), code())
                ?: when (code()) {
                    400, 422 -> "Invalid request data."
                    401 -> "Session expired, please sign in again."
                    403 -> "Permission denied."
                    404 -> "Resource not found."
                    in 500..599 -> "Server error, please try again later."
                    else -> message()
                }
        }

        is IOException -> "Network error. Please check your connection and try again."
        else -> localizedMessage ?: defaultMessage
    }
}

private fun mapKnownServerMessage(raw: String?, statusCode: Int): String? {
    val text = raw?.trim().orEmpty()
    if (text.isEmpty()) return null
    val lower = text.lowercase()

    if (lower.contains("not authenticated") || lower.contains("authentication required")) {
        return "Please sign in to continue."
    }
    if (
        lower.contains("could not validate credentials") ||
        lower.contains("token has expired") ||
        lower.contains("session expired")
    ) {
        return "Session expired, please sign in again."
    }
    if (
        lower.contains("forbidden") ||
        lower.contains("permission denied") ||
        lower.contains("not enough permissions")
    ) {
        return "Permission denied."
    }

    return if (statusCode == 401) {
        "Session expired, please sign in again."
    } else {
        text
    }
}

private fun parseApiDetail(errorBody: ResponseBody?): String? {
    val raw = errorBody?.string()?.trim().orEmpty()
    if (raw.isEmpty()) return null

    return try {
        val json = JSONObject(raw)
        when {
            json.has("detail") -> {
                val detail = json.get("detail")
                when (detail) {
                    is String -> detail
                    else -> detail.toString()
                }
            }

            json.has("message") -> json.optString("message")
            else -> null
        }
    } catch (_: Exception) {
        null
    }
}
