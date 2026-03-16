package com.nailsdash.android.data.repository

import com.nailsdash.android.core.cache.KeyedMutex
import com.nailsdash.android.core.cache.TimedMemoryCache
import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.network.ServiceLocator

class DealsRepository {
    private val api get() = ServiceLocator.api

    private data class PromotionsPageKey(
        val skip: Int,
        val limit: Int,
        val activeOnly: Boolean,
        val includePlatform: Boolean,
    )

    suspend fun getPromotions(
        skip: Int = 0,
        limit: Int = 100,
        activeOnly: Boolean = true,
        includePlatform: Boolean = true,
    ): Result<List<Promotion>> {
        val cacheKey = PromotionsPageKey(
            skip = skip,
            limit = limit,
            activeOnly = activeOnly,
            includePlatform = includePlatform,
        )
        promotionsCache.get(cacheKey)?.let { return Result.success(it) }
        return promotionsLocks.withLock(cacheKey) {
            promotionsCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                api.getPromotions(
                    skip = skip,
                    limit = limit,
                    activeOnly = activeOnly,
                    includePlatform = includePlatform,
                )
            }.mapFailure().onSuccess { promotionsCache.put(cacheKey, it) }
        }
    }

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }

    private companion object {
        private const val CACHE_TTL_MS = 2 * 60 * 1000L
        private val promotionsCache = TimedMemoryCache<PromotionsPageKey, List<Promotion>>(CACHE_TTL_MS, maxEntries = 16)
        private val promotionsLocks = KeyedMutex<PromotionsPageKey>()
    }
}
