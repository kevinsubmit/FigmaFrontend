package com.nailsdash.android.data.repository

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

class StoresRepository {
    private val api get() = ServiceLocator.api

    suspend fun getStores(
        sortBy: String,
        userLat: Double? = null,
        userLng: Double? = null,
        limit: Int = 100,
    ): Result<List<Store>> {
        return runCatching {
            api.getStores(
                skip = 0,
                limit = limit,
                sortBy = sortBy,
                userLat = userLat,
                userLng = userLng,
            )
        }.mapFailure()
    }

    suspend fun getStoreDetail(storeId: Int): Result<StoreDetail> =
        runCatching { api.getStoreDetail(storeId) }.mapFailure()

    suspend fun getStoreImages(storeId: Int): Result<List<StoreImage>> =
        runCatching { api.getStoreImages(storeId) }.mapFailure()

    suspend fun getStorePortfolio(storeId: Int): Result<List<StorePortfolio>> =
        runCatching { api.getStorePortfolio(storeId = storeId, skip = 0, limit = 100) }.mapFailure()

    suspend fun getStoreServices(storeId: Int): Result<List<ServiceItem>> =
        runCatching { api.getStoreServices(storeId) }.mapFailure()

    suspend fun getStoreReviews(storeId: Int): Result<List<StoreReview>> =
        runCatching { api.getStoreReviews(storeId = storeId, skip = 0, limit = 20) }.mapFailure()

    suspend fun getStoreRating(storeId: Int): Result<StoreRatingSummary> =
        runCatching { api.getStoreRating(storeId) }.mapFailure()

    suspend fun getStoreHours(storeId: Int): Result<List<StoreHour>> =
        runCatching { api.getStoreHours(storeId) }.mapFailure()

    suspend fun getStoreTechnicians(storeId: Int): Result<List<Technician>> =
        runCatching { api.getTechnicians(skip = 0, limit = 100, storeId = storeId) }.mapFailure()

    suspend fun getTechnicianAvailableSlots(
        technicianId: Int,
        date: String,
        serviceId: Int,
    ): Result<List<TechnicianAvailableSlot>> =
        runCatching {
            api.getTechnicianAvailableSlots(
                technicianId = technicianId,
                date = date,
                serviceId = serviceId,
            )
        }.mapFailure()

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
}
