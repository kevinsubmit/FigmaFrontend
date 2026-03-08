package com.nailsdash.android.core.session

import android.content.Context

class TokenStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    fun accessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun refreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun clear() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .apply()
    }

    companion object {
        private const val PREF_NAME = "nailsdash_auth"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
    }
}
