package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.Store
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

    fun load(sortOption: StoreSortOption = selectedSort) {
        selectedSort = sortOption
        isLoading = true
        viewModelScope.launch {
            repository.getStores(sortBy = selectedSort.apiValue)
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

    fun displayRating(store: Store): Double {
        return storeRatings[store.id]?.average_rating ?: store.rating
    }

    fun displayReviewCount(store: Store): Int {
        return storeRatings[store.id]?.total_reviews ?: store.review_count
    }
}
