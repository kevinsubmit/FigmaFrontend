package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.repository.DealsRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

enum class DealsSegment(val label: String) {
    Store("Store Deals"),
    Platform("Platform Deals"),
}

class DealsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = DealsRepository()

    var selectedSegment by mutableStateOf(DealsSegment.Store)
    var promotions by mutableStateOf(emptyList<Promotion>())
        private set

    var storesById by mutableStateOf<Map<Int, Store>>(emptyMap())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun load() {
        isLoading = true
        viewModelScope.launch {
            coroutineScope {
                val promotionsTask = async { repository.getPromotions() }
                val storesTask = async { repository.getStores() }

                val promotionsResult = promotionsTask.await()
                val storesResult = storesTask.await()

                promotionsResult.onSuccess { promotions = it }
                    .onFailure { errorMessage = it.message }

                storesResult.onSuccess { stores ->
                    storesById = stores.associateBy { it.id }
                }.onFailure { errorMessage = it.message }

                if (promotionsResult.isSuccess && storesResult.isSuccess) {
                    errorMessage = null
                }
            }
            isLoading = false
        }
    }

    fun filteredPromotions(): List<Promotion> {
        return when (selectedSegment) {
            DealsSegment.Store -> promotions.filter { it.scope.lowercase() != "platform" }
            DealsSegment.Platform -> promotions.filter { it.scope.lowercase() == "platform" }
        }
    }
}
