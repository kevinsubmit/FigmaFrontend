package com.nailsdash.android.data.repository

import com.nailsdash.android.core.cache.KeyedMutex
import com.nailsdash.android.core.cache.TimedMemoryCache
import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.FavoriteState
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.model.StoreHour
import com.nailsdash.android.data.model.StoreImage
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.model.StoreRatingSummary
import com.nailsdash.android.data.model.StoreReview
import com.nailsdash.android.data.model.Technician
import com.nailsdash.android.data.model.TechnicianAvailableSlot
import com.nailsdash.android.data.network.ServiceLocator
import kotlin.math.roundToInt

class StoresRepository {
    private val api get() = ServiceLocator.api

    private data class StoresListKey(
        val sortBy: String,
        val userLatKey: Int?,
        val userLngKey: Int?,
        val skip: Int,
        val limit: Int,
    )

    private data class TechnicianSlotsKey(
        val technicianId: Int,
        val date: String,
        val serviceId: Int,
    )

    suspend fun getStores(
        sortBy: String,
        userLat: Double? = null,
        userLng: Double? = null,
        skip: Int = 0,
        limit: Int = 100,
    ): Result<List<Store>> {
        val cacheKey = StoresListKey(
            sortBy = sortBy,
            userLatKey = locationCacheKey(userLat),
            userLngKey = locationCacheKey(userLng),
            skip = skip,
            limit = limit,
        )
        storesCache.get(cacheKey)?.let { return Result.success(it) }
        return storesListLocks.withLock(cacheKey) {
            storesCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                api.getStores(
                    skip = skip,
                    limit = limit,
                    sortBy = sortBy,
                    userLat = userLat,
                    userLng = userLng,
                )
            }.mapFailure().onSuccess { storesCache.put(cacheKey, it) }
        }
    }

    suspend fun getStoreDetail(storeId: Int): Result<StoreDetail> {
        storeDetailCache.get(storeId)?.let { return Result.success(it) }
        return storeDetailLocks.withLock(storeId) {
            storeDetailCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStoreDetail(storeId) }
                .mapFailure()
                .onSuccess { storeDetailCache.put(storeId, it) }
        }
    }

    suspend fun getStoreImages(storeId: Int): Result<List<StoreImage>> {
        storeImagesCache.get(storeId)?.let { return Result.success(it) }
        return storeImageLocks.withLock(storeId) {
            storeImagesCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStoreImages(storeId) }
                .mapFailure()
                .onSuccess { storeImagesCache.put(storeId, it) }
        }
    }

    suspend fun getStorePortfolio(storeId: Int): Result<List<StorePortfolio>> {
        storePortfolioCache.get(storeId)?.let { return Result.success(it) }
        return storePortfolioLocks.withLock(storeId) {
            storePortfolioCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStorePortfolio(storeId = storeId, skip = 0, limit = 100) }
                .mapFailure()
                .onSuccess { storePortfolioCache.put(storeId, it) }
        }
    }

    suspend fun getStoreServices(storeId: Int): Result<List<ServiceItem>> {
        storeServicesCache.get(storeId)?.let { return Result.success(it) }
        return storeServiceLocks.withLock(storeId) {
            storeServicesCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStoreServices(storeId) }
                .mapFailure()
                .onSuccess { storeServicesCache.put(storeId, it) }
        }
    }

    suspend fun getStoreReviews(storeId: Int): Result<List<StoreReview>> {
        storeReviewsCache.get(storeId)?.let { return Result.success(it) }
        return storeReviewLocks.withLock(storeId) {
            storeReviewsCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStoreReviews(storeId = storeId, skip = 0, limit = 20) }
                .mapFailure()
                .onSuccess { storeReviewsCache.put(storeId, it) }
        }
    }

    suspend fun getStoreRating(storeId: Int): Result<StoreRatingSummary> {
        storeRatingCache.get(storeId)?.let { return Result.success(it) }
        return storeRatingLocks.withLock(storeId) {
            storeRatingCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStoreRating(storeId) }
                .mapFailure()
                .onSuccess { storeRatingCache.put(storeId, it) }
        }
    }

    suspend fun getStoreHours(storeId: Int): Result<List<StoreHour>> {
        storeHoursCache.get(storeId)?.let { return Result.success(it) }
        return storeHourLocks.withLock(storeId) {
            storeHoursCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getStoreHours(storeId) }
                .mapFailure()
                .onSuccess { storeHoursCache.put(storeId, it) }
        }
    }

    suspend fun getStoreTechnicians(storeId: Int): Result<List<Technician>> {
        storeTechniciansCache.get(storeId)?.let { return Result.success(it) }
        return storeTechnicianLocks.withLock(storeId) {
            storeTechniciansCache.get(storeId)?.let { return@withLock Result.success(it) }
            runCatching { api.getTechnicians(skip = 0, limit = 100, storeId = storeId) }
                .mapFailure()
                .onSuccess { storeTechniciansCache.put(storeId, it) }
        }
    }

    suspend fun getTechnicianAvailableSlots(
        technicianId: Int,
        date: String,
        serviceId: Int,
    ): Result<List<TechnicianAvailableSlot>> {
        val cacheKey = TechnicianSlotsKey(
            technicianId = technicianId,
            date = date,
            serviceId = serviceId,
        )
        technicianSlotsCache.get(cacheKey)?.let { return Result.success(it) }
        return technicianSlotLocks.withLock(cacheKey) {
            technicianSlotsCache.get(cacheKey)?.let { return@withLock Result.success(it) }
            runCatching {
                api.getTechnicianAvailableSlots(
                    technicianId = technicianId,
                    date = date,
                    serviceId = serviceId,
                )
            }.mapFailure().onSuccess { technicianSlotsCache.put(cacheKey, it) }
        }
    }

    suspend fun checkFavorite(storeId: Int, bearerToken: String): Result<FavoriteState> =
        runCatching { api.isStoreFavorited(storeId = storeId, bearerToken = bearerToken) }.mapFailure()

    suspend fun setFavorite(storeId: Int, bearerToken: String, favorited: Boolean): Result<Unit> {
        return runCatching {
            if (favorited) {
                api.addStoreFavorite(storeId = storeId, bearerToken = bearerToken)
            } else {
                api.removeStoreFavorite(storeId = storeId, bearerToken = bearerToken)
            }
        }.mapFailure()
    }

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }

    private fun locationCacheKey(value: Double?): Int? {
        return value?.times(1_000)?.roundToInt()
    }

    private companion object {
        private const val SHORT_TTL_MS = 2 * 60 * 1000L
        private const val DETAIL_TTL_MS = 10 * 60 * 1000L
        private const val SLOT_TTL_MS = 45 * 1000L
        private val storesCache = TimedMemoryCache<StoresListKey, List<Store>>(SHORT_TTL_MS, maxEntries = 24)
        private val storesListLocks = KeyedMutex<StoresListKey>()
        private val storeDetailCache = TimedMemoryCache<Int, StoreDetail>(DETAIL_TTL_MS, maxEntries = 128)
        private val storeDetailLocks = KeyedMutex<Int>()
        private val storeImagesCache = TimedMemoryCache<Int, List<StoreImage>>(DETAIL_TTL_MS, maxEntries = 128)
        private val storeImageLocks = KeyedMutex<Int>()
        private val storePortfolioCache = TimedMemoryCache<Int, List<StorePortfolio>>(SHORT_TTL_MS, maxEntries = 96)
        private val storePortfolioLocks = KeyedMutex<Int>()
        private val storeServicesCache = TimedMemoryCache<Int, List<ServiceItem>>(DETAIL_TTL_MS, maxEntries = 128)
        private val storeServiceLocks = KeyedMutex<Int>()
        private val storeReviewsCache = TimedMemoryCache<Int, List<StoreReview>>(SHORT_TTL_MS, maxEntries = 96)
        private val storeReviewLocks = KeyedMutex<Int>()
        private val storeRatingCache = TimedMemoryCache<Int, StoreRatingSummary>(SHORT_TTL_MS, maxEntries = 128)
        private val storeRatingLocks = KeyedMutex<Int>()
        private val storeHoursCache = TimedMemoryCache<Int, List<StoreHour>>(DETAIL_TTL_MS, maxEntries = 128)
        private val storeHourLocks = KeyedMutex<Int>()
        private val storeTechniciansCache = TimedMemoryCache<Int, List<Technician>>(SHORT_TTL_MS, maxEntries = 128)
        private val storeTechnicianLocks = KeyedMutex<Int>()
        private val technicianSlotsCache = TimedMemoryCache<TechnicianSlotsKey, List<TechnicianAvailableSlot>>(SLOT_TTL_MS, maxEntries = 256)
        private val technicianSlotLocks = KeyedMutex<TechnicianSlotsKey>()
    }
}
