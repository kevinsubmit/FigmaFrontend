package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.repository.HomeRepository
import kotlinx.coroutines.launch

class HomeViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = HomeRepository()

    var tags by mutableStateOf(listOf("All"))
        private set

    var selectedTag by mutableStateOf("All")
        private set

    var searchDraft by mutableStateOf("")

    var searchQuery by mutableStateOf("")
        private set

    var pins by mutableStateOf(emptyList<HomeFeedPin>())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var isLoadingMore by mutableStateOf(false)
        private set

    var hasMore by mutableStateOf(true)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    private val initialPageSize = 12
    private val loadMorePageSize = 8
    private var offset = 0
    private var didLoadOnce = false

    fun loadIfNeeded() {
        if (didLoadOnce) return
        didLoadOnce = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            loadTags()
            loadPins(reset = true)
        }
    }

    fun selectTag(tag: String) {
        if (tag == selectedTag) return
        selectedTag = tag
        searchDraft = ""
        searchQuery = ""
        viewModelScope.launch {
            loadPins(reset = true)
        }
    }

    fun applySearch() {
        searchQuery = searchDraft.trim()
        selectedTag = "All"
        viewModelScope.launch {
            loadPins(reset = true)
        }
    }

    fun clearSearch() {
        searchDraft = ""
        searchQuery = ""
        selectedTag = "All"
        viewModelScope.launch {
            loadPins(reset = true)
        }
    }

    fun loadMoreIfNeeded(currentPinId: Int) {
        if (hasMore.not() || isLoading || isLoadingMore) return
        if (pins.lastOrNull()?.id != currentPinId) return

        viewModelScope.launch {
            loadPins(reset = false)
        }
    }

    private suspend fun loadTags() {
        repository.getTags()
            .onSuccess { names ->
                val normalized = buildList {
                    add("All")
                    addAll(names.filter { it.trim().isNotEmpty() })
                }.distinct()
                tags = normalized
                if (selectedTag !in tags) {
                    selectedTag = "All"
                }
            }
            .onFailure { err ->
                errorMessage = err.message
            }
    }

    private suspend fun loadPins(reset: Boolean) {
        if (reset) {
            isLoading = true
            offset = 0
            hasMore = true
        } else {
            isLoadingMore = true
        }

        val pageSize = if (reset) initialPageSize else loadMorePageSize

        repository.getPins(
            skip = offset,
            limit = pageSize,
            tag = selectedTag.takeUnless { it == "All" },
            search = searchQuery.ifBlank { null },
        ).onSuccess { rows ->
            pins = if (reset) rows else pins + rows
            offset += rows.size
            hasMore = rows.size == pageSize
            errorMessage = null
        }.onFailure { err ->
            errorMessage = err.message
            hasMore = false
        }

        if (reset) {
            isLoading = false
        } else {
            isLoadingMore = false
        }
    }
}
