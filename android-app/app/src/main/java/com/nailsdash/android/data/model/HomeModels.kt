package com.nailsdash.android.data.model

data class HomeFeedPin(
    val id: Int,
    val title: String,
    val image_url: String,
    val description: String? = null,
    val tags: List<String> = emptyList(),
    val created_at: String,
)
