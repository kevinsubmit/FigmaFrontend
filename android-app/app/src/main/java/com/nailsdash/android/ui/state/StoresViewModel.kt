package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreImage
import com.nailsdash.android.data.model.StoreRatingSummary
import com.nailsdash.android.data.repository.StoresRepository
import kotlinx.coroutines.launch

enum class StoreSortOption(val label: String, val apiValue: String) {
    Recommended("Recommended", "recommended"),
    TopRated("Top Rated", "top_rated"),
    Nearest("Nearest", "distance"),
}

class StoresViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = StoresRepository()

    var stores by mutableStateOf(emptyList<Store>())
        private set

    var storeRatings by mutableStateOf<Map<Int, StoreRatingSummary>>(emptyMap())
        private set

    var isLoading by mutableStateOf(false)
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

    var locationStatus by mutableStateOf<String?>(null)
        private set

    fun load(sortOption: StoreSortOption = selectedSort) {
        selectedSort = sortOption
        isLoading = true
        viewModelScope.launch {
            val hasLocation = userLatitude != null && userLongitude != null
            val effectiveSort = if (selectedSort == StoreSortOption.Nearest && !hasLocation) {
                locationStatus = "Location unavailable, showing recommended salons."
                StoreSortOption.Recommended.apiValue
            } else {
                selectedSort.apiValue
            }

            repository.getStores(
                sortBy = effectiveSort,
                userLat = userLatitude,
                userLng = userLongitude,
            )
                .onSuccess { rows ->
                    stores = rows
                    errorMessage = null
                }
                .onFailure { err ->
                    stores = emptyList()
                    errorMessage = err.message
                }
            isLoading = false
        }
    }

    fun onSortSelected(option: StoreSortOption) {
        if (option == selectedSort && stores.isNotEmpty()) return
        load(option)
    }

    fun updateUserLocation(latitude: Double, longitude: Double) {
        userLatitude = latitude
        userLongitude = longitude
        locationStatus = null
        if (stores.isEmpty() || selectedSort == StoreSortOption.Nearest) {
            load(selectedSort)
        }
    }

    fun onLocationUnavailable(message: String) {
        locationStatus = message
    }

    fun loadStoreRatingIfNeeded(storeId: Int) {
        if (storeRatings.containsKey(storeId)) return
        viewModelScope.launch {
            repository.getStoreRating(storeId)
                .onSuccess { summary ->
                    storeRatings = storeRatings + (storeId to summary)
                }
                .onFailure { _ ->
                    // Keep store list usable even when one rating request fails.
                }
        }
    }

    fun loadStoreImagesIfNeeded(storeId: Int) {
        if (storeImages.containsKey(storeId)) return
        viewModelScope.launch {
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
        }
    }

    fun displayRating(store: Store): Double {
        return storeRatings[store.id]?.average_rating ?: store.rating
    }

    fun displayReviewCount(store: Store): Int {
        return storeRatings[store.id]?.total_reviews ?: store.review_count
    }
}
