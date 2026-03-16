package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.benchmark.BenchmarkFixtures
import com.nailsdash.android.benchmark.BenchmarkOverrides
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.repository.HomeRepository
import kotlinx.coroutines.launch

class HomePinDetailViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = HomeRepository()

    var pin by mutableStateOf<HomeFeedPin?>(null)
        private set

    var relatedPins by mutableStateOf(emptyList<HomeFeedPin>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var isFavorited by mutableStateOf(false)
        private set

    var isFavoriteLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    private var loadedPinId: Int? = null

    fun load(pinId: Int, force: Boolean = false) {
        if (!force && loadedPinId == pinId && pin != null) return
        loadedPinId = pinId
        isLoading = true
        errorMessage = null

        if (BenchmarkOverrides.isEnabled()) {
            pin = BenchmarkFixtures.homePin(pinId)
            relatedPins = BenchmarkFixtures.relatedPins(pinId)
            errorMessage = if (pin == null) "Pin unavailable." else null
            isLoading = false
            return
        }

        viewModelScope.launch {
            repository.getPinById(pinId)
                .onSuccess { detail ->
                    pin = detail
                    loadRelatedPins(detail)
                }
                .onFailure { err ->
                    pin = null
                    relatedPins = emptyList()
                    errorMessage = err.message
                }
            isLoading = false
        }
    }

    fun loadFavoriteState(bearerToken: String?) {
        val pinId = pin?.id ?: loadedPinId ?: return
        if (bearerToken == null) {
            isFavorited = false
            return
        }
        if (BenchmarkOverrides.isEnabled()) {
            isFavorited = false
            return
        }

        viewModelScope.launch {
            repository.checkFavorite(pinId = pinId, bearerToken = bearerToken)
                .onSuccess { isFavorited = it }
                .onFailure { isFavorited = false }
        }
    }

    suspend fun toggleFavorite(bearerToken: String) {
        val pinId = pin?.id ?: return
        if (isFavoriteLoading) return
        if (BenchmarkOverrides.isEnabled()) {
            isFavorited = !isFavorited
            errorMessage = null
            return
        }
        isFavoriteLoading = true
        val targetState = !isFavorited
        errorMessage = null

        try {
            repository.setFavorite(pinId = pinId, bearerToken = bearerToken, favorited = targetState)
                .onSuccess {
                    isFavorited = targetState
                    errorMessage = null
                }
                .onFailure { err ->
                    val detail = err.message.orEmpty()
                    if (!recoverFavoriteState(detail, targetState)) {
                        errorMessage = detail.ifBlank { "Failed to update favorite state." }
                    }
                }
        } catch (_: Throwable) {
            errorMessage = "Failed to update favorite state."
        } finally {
            isFavoriteLoading = false
        }
    }

    private fun recoverFavoriteState(message: String, targetState: Boolean): Boolean {
        val normalized = message.lowercase()
        if (normalized.contains("already in favorites")) {
            isFavorited = true
            errorMessage = null
            return true
        }

        if (normalized.contains("not in favorites")) {
            isFavorited = false
            errorMessage = null
            return true
        }

        if (normalized.contains("favorite") && (normalized.contains("already") || normalized.contains("not"))) {
            isFavorited = targetState
            errorMessage = null
            return true
        }

        return false
    }

    private suspend fun loadRelatedPins(detail: HomeFeedPin) {
        val primaryTag = detail.tags.firstOrNull()?.trim().orEmpty()
        if (primaryTag.isEmpty()) {
            relatedPins = emptyList()
            return
        }

        repository.getPins(
            skip = 0,
            limit = 8,
            tag = primaryTag,
            search = null,
        ).onSuccess { rows ->
            relatedPins = rows.filter { it.id != detail.id }.take(6)
        }.onFailure {
            relatedPins = emptyList()
        }
    }
}
