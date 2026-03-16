package com.nailsdash.android.data.repository

import com.nailsdash.android.core.cache.KeyedMutex
import com.nailsdash.android.core.cache.TimedMemoryCache
import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.network.ServiceLocator

class HomeRepository {
    private val api get() = ServiceLocator.api

    private data class PinsQueryKey(
        val skip: Int,
        val limit: Int,
        val tag: String?,
        val search: String?,
    )

    suspend fun getTags(): Result<List<String>> {
        tagsCache.get(TAGS_CACHE_KEY)?.let { return Result.success(it) }
        return tagLocks.withLock(TAGS_CACHE_KEY) {
            tagsCache.get(TAGS_CACHE_KEY)?.let { return@withLock Result.success(it) }
            runCatching { api.getPinTags() }
                .mapFailure()
                .onSuccess { tagsCache.put(TAGS_CACHE_KEY, it) }
        }
    }

    suspend fun getPins(
        skip: Int,
        limit: Int,
        tag: String?,
        search: String?,
    ): Result<List<HomeFeedPin>> {
        val cacheKey = PinsQueryKey(
            skip = skip,
            limit = limit,
            tag = tag?.trim()?.takeIf { it.isNotEmpty() },
            search = search?.trim()?.takeIf { it.isNotEmpty() },
        )
        pinsCache.get(cacheKey)?.let { return Result.success(it) }
        return pinListLocks.withLock(cacheKey) {
            pinsCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                api.getPins(skip = skip, limit = limit, tag = tag, search = search)
            }.mapFailure().onSuccess { pinsCache.put(cacheKey, it) }
        }
    }

    suspend fun getPinById(pinId: Int): Result<HomeFeedPin> {
        pinDetailCache.get(pinId)?.let { return Result.success(it) }
        return pinDetailLocks.withLock(pinId) {
            pinDetailCache.get(pinId)?.let { return@withLock Result.success(it) }
            runCatching { api.getPinById(pinId) }
                .mapFailure()
                .onSuccess { pinDetailCache.put(pinId, it) }
        }
    }

    suspend fun checkFavorite(pinId: Int, bearerToken: String): Result<Boolean> {
        return runCatching { api.isPinFavorited(pinId = pinId, bearerToken = bearerToken).is_favorited }
            .mapFailure()
    }

    suspend fun setFavorite(pinId: Int, bearerToken: String, favorited: Boolean): Result<Unit> {
        return runCatching {
            if (favorited) {
                api.addFavoritePin(bearerToken = bearerToken, pinId = pinId)
            } else {
                api.removeFavoritePin(bearerToken = bearerToken, pinId = pinId)
            }
        }.mapFailure()
    }

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }

    private companion object {
        private const val TAGS_CACHE_KEY = "all"
        private const val LIST_TTL_MS = 2 * 60 * 1000L
        private const val DETAIL_TTL_MS = 10 * 60 * 1000L
        private const val TAGS_TTL_MS = 30 * 60 * 1000L
        private val tagsCache = TimedMemoryCache<String, List<String>>(TAGS_TTL_MS, maxEntries = 1)
        private val tagLocks = KeyedMutex<String>()
        private val pinsCache = TimedMemoryCache<PinsQueryKey, List<HomeFeedPin>>(LIST_TTL_MS, maxEntries = 32)
        private val pinListLocks = KeyedMutex<PinsQueryKey>()
        private val pinDetailCache = TimedMemoryCache<Int, HomeFeedPin>(DETAIL_TTL_MS, maxEntries = 128)
        private val pinDetailLocks = KeyedMutex<Int>()
    }
}
