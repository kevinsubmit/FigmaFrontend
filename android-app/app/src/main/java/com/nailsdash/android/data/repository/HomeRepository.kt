package com.nailsdash.android.data.repository

import com.nailsdash.android.core.network.toUserMessage
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.network.ServiceLocator

class HomeRepository {
    private val api get() = ServiceLocator.api

    suspend fun getTags(): Result<List<String>> {
        return runCatching { api.getPinTags() }.mapFailure()
    }

    suspend fun getPins(
        skip: Int,
        limit: Int,
        tag: String?,
        search: String?,
    ): Result<List<HomeFeedPin>> {
        return runCatching {
            api.getPins(skip = skip, limit = limit, tag = tag, search = search)
        }.mapFailure()
    }

    suspend fun getPinById(pinId: Int): Result<HomeFeedPin> {
        return runCatching { api.getPinById(pinId) }.mapFailure()
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
}
