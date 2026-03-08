package com.nailsdash.android.data.network

import android.content.Context
import com.nailsdash.android.BuildConfig
import com.nailsdash.android.core.session.TokenStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ServiceLocator {
    private var initialized = false

    lateinit var tokenStore: TokenStore
        private set

    lateinit var api: NailsDashApi
        private set

    fun init(context: Context) {
        if (initialized) return

        tokenStore = TokenStore(context.applicationContext)

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        api = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(NailsDashApi::class.java)

        initialized = true
    }

    fun bearerTokenOrNull(): String? {
        val token = tokenStore.accessToken() ?: return null
        return "Bearer $token"
    }
}
