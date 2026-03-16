package com.nailsdash.android.ui.state

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.benchmark.BenchmarkFixtures
import com.nailsdash.android.benchmark.BenchmarkOverrides
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.repository.DealsRepository
import com.nailsdash.android.data.repository.StoresRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

enum class DealsSegment(val label: String) {
    Store("Store Deals"),
    Platform("Platform Deals"),
}

class DealsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = DealsRepository()
    private val storesRepository = StoresRepository()
    private val initialPageSize = 12
    private val loadMorePageSize = 8
    private val prefetchDistance = 4
    private var didLoadOnce = false
    private var offset = 0
    private var promotionRequestVersion = 0

    var selectedSegment by mutableStateOf(DealsSegment.Store)
        private set

    var promotions by mutableStateOf(emptyList<Promotion>())
        private set

    var storesById by mutableStateOf<Map<Int, Store>>(emptyMap())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var isLoadingMore by mutableStateOf(false)
        private set

    var hasMore by mutableStateOf(true)
        private set

    var initialLoadResolved by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadIfNeeded() {
        if (didLoadOnce && errorMessage == null) return
        load()
    }

    fun load(force: Boolean = false) {
        if (!force && isLoading) return
        if (!force && didLoadOnce && errorMessage == null) {
            initialLoadResolved = true
            return
        }
        didLoadOnce = true
        loadPage(reset = true)
    }

    fun onSegmentSelected(segment: DealsSegment) {
        if (selectedSegment == segment) return
        selectedSegment = segment
    }

    fun loadMoreIfNeeded(currentIndex: Int) {
        val visibleRows = filteredPromotions()
        if (hasMore.not() || isLoading || isLoadingMore || visibleRows.isEmpty()) return
        if (currentIndex < (visibleRows.lastIndex - prefetchDistance).coerceAtLeast(0)) return
        loadPage(reset = false)
    }

    fun loadMoreForSelectedSegmentIfNeeded() {
        if (!didLoadOnce) return
        if (filteredPromotions().isNotEmpty() || hasMore.not() || isLoading || isLoadingMore) return
        loadPage(reset = false)
    }

    fun filteredPromotions(): List<Promotion> {
        return when (selectedSegment) {
            DealsSegment.Store -> promotions.filter { it.scope.lowercase() != "platform" }
            DealsSegment.Platform -> promotions.filter { it.scope.lowercase() == "platform" }
        }
    }

    private fun loadPage(reset: Boolean) {
        val requestVersion = if (reset) {
            ++promotionRequestVersion
        } else {
            if (promotionRequestVersion == 0) {
                promotionRequestVersion = 1
            }
            promotionRequestVersion
        }
        val pageSize = if (reset) initialPageSize else loadMorePageSize
        val skip = if (reset) 0 else offset

        if (reset) {
            isLoading = true
            offset = 0
            hasMore = true
            initialLoadResolved = false
        } else {
            isLoadingMore = true
        }

        viewModelScope.launch {
            if (BenchmarkOverrides.isEnabled()) {
                val allRows = BenchmarkFixtures.promotions
                val pagedRows = allRows.drop(skip).take(pageSize)
                promotions = if (reset) {
                    pagedRows
                } else {
                    (promotions + pagedRows).distinctBy { it.id }
                }
                storesById = BenchmarkFixtures.stores("recommended").associateBy { it.id }
                offset = skip + pagedRows.size
                hasMore = offset < allRows.size
                errorMessage = null
                if (reset) {
                    isLoading = false
                    initialLoadResolved = true
                } else {
                    isLoadingMore = false
                }
                return@launch
            }

            repository.getPromotions(
                skip = skip,
                limit = pageSize,
            ).onSuccess { rows ->
                if (requestVersion != promotionRequestVersion) return@onSuccess
                promotions = if (reset) {
                    rows
                } else {
                    (promotions + rows).distinctBy { it.id }
                }
                offset = skip + rows.size
                hasMore = rows.size == pageSize
                errorMessage = null
                hydrateStores(rows)
            }.onFailure { err ->
                if (requestVersion != promotionRequestVersion) return@onFailure
                if (reset) {
                    promotions = emptyList()
                }
                errorMessage = err.message
            }

            if (requestVersion != promotionRequestVersion) return@launch
            if (reset) {
                isLoading = false
                initialLoadResolved = true
            } else {
                isLoadingMore = false
            }
        }
    }

    private suspend fun hydrateStores(page: List<Promotion>) = coroutineScope {
        val missingStoreIds = page
            .mapNotNull { it.store_id }
            .distinct()
            .filterNot { storesById.containsKey(it) }

        if (missingStoreIds.isEmpty()) return@coroutineScope

        val loadedStores = mutableMapOf<Int, Store>()
        val tasks = missingStoreIds.map { storeId ->
            async {
                storesRepository.getStoreDetail(storeId).getOrNull()?.toCardStore()
            }
        }
        tasks.forEach { task ->
            val store = task.await() ?: return@forEach
            loadedStores[store.id] = store
        }
        if (loadedStores.isNotEmpty()) {
            storesById = storesById + loadedStores
        }
    }

    private fun StoreDetail.toCardStore(): Store {
        val previewImage = images
            .sortedWith(
                compareByDescending<com.nailsdash.android.data.model.StoreImage> { it.is_primary == 1 }
                    .thenBy { it.display_order ?: Int.MAX_VALUE },
            )
            .firstOrNull()
            ?.image_url

        return Store(
            id = id,
            name = name,
            image_url = previewImage,
            address = address,
            city = city,
            state = state,
            zip_code = zip_code,
            latitude = latitude,
            longitude = longitude,
            time_zone = time_zone,
            phone = phone,
            email = email,
            description = description,
            opening_hours = opening_hours,
            rating = rating,
            review_count = review_count,
            distance = null,
        )
    }
}
