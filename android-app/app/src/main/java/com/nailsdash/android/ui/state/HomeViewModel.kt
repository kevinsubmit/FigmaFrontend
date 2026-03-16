package com.nailsdash.android.ui.state

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.nailsdash.android.benchmark.BenchmarkFixtures
import com.nailsdash.android.benchmark.BenchmarkOverrides
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.repository.HomeRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class HomeViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = HomeRepository()
    private val prefetchDistance = 4

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

    var initialLoadResolved by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    private val initialPageSize = 12
    private val loadMorePageSize = 8
    private var offset = 0
    private var didLoadOnce = false
    private var pinsRequestVersion = 0

    fun loadIfNeeded() {
        if (didLoadOnce) return
        didLoadOnce = true
        refresh()
    }

    fun refresh() {
        initialLoadResolved = false
        viewModelScope.launch {
            coroutineScope {
                val tagsTask = async { loadTags() }
                val pinsTask = async { loadPins(reset = true) }
                tagsTask.await()
                pinsTask.await()
                initialLoadResolved = true
            }
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

    fun loadMoreIfNeeded(currentIndex: Int) {
        if (hasMore.not() || isLoading || isLoadingMore) return
        if (currentIndex < (pins.lastIndex - prefetchDistance).coerceAtLeast(0)) return

        viewModelScope.launch {
            loadPins(reset = false)
        }
    }

    private suspend fun loadTags() {
        if (BenchmarkOverrides.isEnabled()) {
            tags = BenchmarkFixtures.tags
            if (selectedTag !in tags) {
                selectedTag = "All"
            }
            errorMessage = null
            return
        }

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
        val requestVersion = if (reset) {
            ++pinsRequestVersion
        } else {
            if (pinsRequestVersion == 0) {
                pinsRequestVersion = 1
            }
            pinsRequestVersion
        }

        if (reset) {
            isLoading = true
            offset = 0
            hasMore = true
        } else {
            isLoadingMore = true
        }

        val pageSize = if (reset) initialPageSize else loadMorePageSize

        if (BenchmarkOverrides.isEnabled()) {
            val allRows = BenchmarkFixtures.homePins(
                tag = selectedTag.takeUnless { it == "All" },
                search = searchQuery.ifBlank { null },
            )
            val pagedRows = allRows.drop(offset).take(pageSize)
            if (requestVersion != pinsRequestVersion) return
            pins = if (reset) pagedRows else pins + pagedRows
            offset += pagedRows.size
            hasMore = offset < allRows.size
            errorMessage = null
            if (reset) {
                isLoading = false
            } else {
                isLoadingMore = false
            }
            return
        }

        repository.getPins(
            skip = offset,
            limit = pageSize,
            tag = selectedTag.takeUnless { it == "All" },
            search = searchQuery.ifBlank { null },
        ).onSuccess { rows ->
            if (requestVersion != pinsRequestVersion) return@onSuccess
            pins = if (reset) rows else pins + rows
            offset += rows.size
            hasMore = rows.size == pageSize
            errorMessage = null
        }.onFailure { err ->
            if (requestVersion != pinsRequestVersion) return@onFailure
            errorMessage = err.message
            hasMore = false
        }

        if (requestVersion != pinsRequestVersion) return
        if (reset) {
            isLoading = false
        } else {
            isLoadingMore = false
        }
    }
}
