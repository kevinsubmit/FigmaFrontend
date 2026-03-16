package com.nailsdash.android.data.network

import android.content.Context
import com.nailsdash.android.BuildConfig
import com.nailsdash.android.core.session.TokenStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import java.io.File
import java.util.concurrent.TimeUnit
import okhttp3.Cache
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ServiceLocator {
    private var initialized = false
    private val sharedConnectionPool = ConnectionPool(6, 5, TimeUnit.MINUTES)

    lateinit var tokenStore: TokenStore
        private set

    lateinit var httpClient: OkHttpClient
        private set

    lateinit var api: NailsDashApi
        private set

    fun init(context: Context) {
        if (initialized) return

        tokenStore = TokenStore(context.applicationContext)

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        httpClient = OkHttpClient.Builder()
            .cache(
                Cache(
                    directory = File(context.cacheDir, "http_cache"),
                    maxSize = 20L * 1024 * 1024,
                ),
            )
            .connectionPool(sharedConnectionPool)
            .retryOnConnectionFailure(true)
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .callTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        api = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(httpClient)
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
