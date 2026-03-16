package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nailsdash.android.benchmark.BenchmarkFixtures
import com.nailsdash.android.benchmark.BenchmarkOverrides
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreImage
import com.nailsdash.android.data.model.StoreRatingSummary
import com.nailsdash.android.data.repository.StoresRepository
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

enum class StoreSortOption(val label: String, val apiValue: String) {
    Recommended("Recommended", "recommended"),
    TopRated("Top Rated", "top_rated"),
    Nearest("Nearest", "distance"),
}

class StoresViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = StoresRepository()
    private val loadingStoreRatingIds = mutableSetOf<Int>()
    private val loadingStoreImageIds = mutableSetOf<Int>()
    private val initialPageSize = 12
    private val loadMorePageSize = 8
    private val prefetchDistance = 4

    var stores by mutableStateOf(emptyList<Store>())
        private set

    var storeRatings by mutableStateOf<Map<Int, StoreRatingSummary>>(emptyMap())
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

    var selectedSort by mutableStateOf(StoreSortOption.Recommended)
        private set

    var storeImages by mutableStateOf<Map<Int, List<StoreImage>>>(emptyMap())
        private set

    var userLatitude by mutableStateOf<Double?>(null)
        private set

    var userLongitude by mutableStateOf<Double?>(null)
        private set

    private var lastLoadSignature: StoreLoadSignature? = null
    private var loadRequestVersion = 0
    private var offset = 0

    private data class StoreLoadSignature(
        val sortOption: StoreSortOption,
        val latitudeKey: Int?,
        val longitudeKey: Int?,
    )

    fun load(sortOption: StoreSortOption = selectedSort, force: Boolean = false) {
        selectedSort = sortOption
        val hasLocation = userLatitude != null && userLongitude != null
        val effectiveSortOption = if (selectedSort == StoreSortOption.Nearest && !hasLocation) {
            StoreSortOption.Recommended
        } else {
            selectedSort
        }
        val loadSignature = StoreLoadSignature(
            sortOption = effectiveSortOption,
            latitudeKey = locationCacheKey(userLatitude),
            longitudeKey = locationCacheKey(userLongitude),
        )
        if (!force && isLoading && loadSignature == lastLoadSignature) {
            selectedSort = effectiveSortOption
            return
        }
        if (!force && loadSignature == lastLoadSignature && stores.isNotEmpty() && errorMessage == null) {
            selectedSort = effectiveSortOption
            initialLoadResolved = true
            return
        }

        selectedSort = effectiveSortOption
        lastLoadSignature = loadSignature
        loadPage(reset = true, loadSignature = loadSignature)
    }

    fun onSortSelected(option: StoreSortOption) {
        if (option == selectedSort && stores.isNotEmpty()) return
        load(option)
    }

    fun updateUserLocation(latitude: Double, longitude: Double) {
        userLatitude = latitude
        userLongitude = longitude
        if (stores.isEmpty() || selectedSort == StoreSortOption.Nearest) {
            load(selectedSort)
        }
    }

    fun loadMoreIfNeeded(currentIndex: Int) {
        if (hasMore.not() || isLoading || isLoadingMore) return
        if (currentIndex < (stores.lastIndex - prefetchDistance).coerceAtLeast(0)) return

        val loadSignature = lastLoadSignature ?: StoreLoadSignature(
            sortOption = selectedSort,
            latitudeKey = locationCacheKey(userLatitude),
            longitudeKey = locationCacheKey(userLongitude),
        )
        loadPage(reset = false, loadSignature = loadSignature)
    }

    fun loadStoreRatingIfNeeded(storeId: Int) {
        if (BenchmarkOverrides.isEnabled()) {
            BenchmarkFixtures.storeRating(storeId)?.let { summary ->
                storeRatings = storeRatings + (storeId to summary)
            }
            return
        }
        if (storeRatings.containsKey(storeId) || !loadingStoreRatingIds.add(storeId)) return
        viewModelScope.launch {
            try {
                repository.getStoreRating(storeId)
                    .onSuccess { summary ->
                        storeRatings = storeRatings + (storeId to summary)
                    }
                    .onFailure { _ ->
                        // Keep store list usable even when one rating request fails.
                    }
            } finally {
                loadingStoreRatingIds.remove(storeId)
            }
        }
    }

    fun loadStoreImagesIfNeeded(storeId: Int) {
        if (BenchmarkOverrides.isEnabled()) {
            val rows = BenchmarkFixtures.storeImages(storeId)
            if (rows.isNotEmpty()) {
                storeImages = storeImages + (storeId to rows)
            }
            return
        }
        if (storeImages.containsKey(storeId) || !loadingStoreImageIds.add(storeId)) return
        viewModelScope.launch {
            try {
                repository.getStoreImages(storeId)
                    .onSuccess { rows ->
                        val sorted = rows.sortedWith(
                            compareByDescending<StoreImage> { it.is_primary == 1 }
                                .thenBy { it.display_order ?: Int.MAX_VALUE },
                        )
                        storeImages = storeImages + (storeId to sorted)
                    }
                    .onFailure {
                        // Keep store list usable even when one image request fails.
                    }
            } finally {
                loadingStoreImageIds.remove(storeId)
            }
        }
    }

    fun displayRating(store: Store): Double {
        return storeRatings[store.id]?.average_rating ?: store.rating
    }

    fun displayReviewCount(store: Store): Int {
        return storeRatings[store.id]?.total_reviews ?: store.review_count
    }

    private fun locationCacheKey(value: Double?): Int? {
        return value?.times(1_000)?.roundToInt()
    }

    private fun loadPage(
        reset: Boolean,
        loadSignature: StoreLoadSignature,
    ) {
        val requestVersion = if (reset) {
            ++loadRequestVersion
        } else {
            if (loadRequestVersion == 0) {
                loadRequestVersion = 1
            }
            loadRequestVersion
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
                val allRows = BenchmarkFixtures.stores(loadSignature.sortOption.apiValue)
                val pagedRows = allRows.drop(skip).take(pageSize)
                stores = if (reset) {
                    pagedRows
                } else {
                    (stores + pagedRows).distinctBy { it.id }
                }
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

            repository.getStores(
                sortBy = loadSignature.sortOption.apiValue,
                userLat = userLatitude,
                userLng = userLongitude,
                skip = skip,
                limit = pageSize,
            )
                .onSuccess { rows ->
                    if (requestVersion != loadRequestVersion) return@onSuccess
                    stores = if (reset) {
                        rows
                    } else {
                        (stores + rows).distinctBy { it.id }
                    }
                    offset = skip + rows.size
                    hasMore = rows.size == pageSize
                    errorMessage = null
                }
                .onFailure { err ->
                    if (requestVersion != loadRequestVersion) return@onFailure
                    if (reset && stores.isEmpty()) {
                        stores = emptyList()
                    }
                    errorMessage = err.message
                }
            if (requestVersion != loadRequestVersion) return@launch
            if (reset) {
                isLoading = false
                initialLoadResolved = true
            } else {
                isLoadingMore = false
            }
        }
    }
}
