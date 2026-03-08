package com.nailsdash.android.core.network

import okhttp3.ResponseBody
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

fun Throwable.toUserMessage(defaultMessage: String = "Request failed."): String {
    return when (this) {
        is HttpException -> {
            parseApiDetail(response()?.errorBody())
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
