package com.nailsdash.android.data.model

data class StoreSummary(
    val id: Int,
    val name: String,
    val address: String? = null,
    val rating: Double? = null,
)
