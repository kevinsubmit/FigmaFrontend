package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.network.ServiceLocator

class DealsRepository {
    private val api get() = ServiceLocator.api

    suspend fun getPromotions(): Result<List<Promotion>> = runCatching {
        api.getPromotions(
            skip = 0,
            limit = 100,
            activeOnly = true,
            includePlatform = true,
        )
    }.mapFailure()

    suspend fun getStores(): Result<List<Store>> = runCatching {
        api.getStores(skip = 0, limit = 100)
    }.mapFailure()

    private fun <T> Result<T>.mapFailure(): Result<T> {
        exceptionOrNull() ?: return this
        return Result.failure(IllegalStateException(exceptionOrNull()?.toUserMessage() ?: "Request failed."))
    }
}
