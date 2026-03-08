package com.nailsdash.android.data.model

data class PromotionServiceRule(
    val id: Int,
    val service_id: Int,
    val min_price: Double? = null,
    val max_price: Double? = null,
)

data class Promotion(
    val id: Int,
    val scope: String,
    val store_id: Int? = null,
    val title: String,
    val type: String,
    val image_url: String? = null,
    val discount_type: String,
    val discount_value: Double,
    val rules: String? = null,
    val start_at: String,
    val end_at: String,
    val is_active: Boolean,
    val created_at: String,
    val updated_at: String,
    val service_rules: List<PromotionServiceRule> = emptyList(),
)
