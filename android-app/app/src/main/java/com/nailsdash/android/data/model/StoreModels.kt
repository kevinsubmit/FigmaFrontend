package com.nailsdash.android.data.model

data class StoreImage(
    val id: Int,
    val image_url: String,
    val is_primary: Int? = null,
    val display_order: Int? = null,
)

data class StorePortfolio(
    val id: Int,
    val store_id: Int,
    val image_url: String,
    val title: String? = null,
    val description: String? = null,
    val display_order: Int,
    val created_at: String,
    val updated_at: String? = null,
)

data class Store(
    val id: Int,
    val name: String,
    val image_url: String? = null,
    val address: String,
    val city: String,
    val state: String,
    val zip_code: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val time_zone: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val description: String? = null,
    val opening_hours: String? = null,
    val rating: Double,
    val review_count: Int,
    val distance: Double? = null,
) {
    val formattedAddress: String
        get() {
            val zip = zip_code?.trim().orEmpty()
            return if (zip.isEmpty()) {
                "$address, $city, $state"
            } else {
                "$address, $city, $state $zip"
            }
        }
}

data class StoreDetail(
    val id: Int,
    val name: String,
    val address: String,
    val city: String,
    val state: String,
    val zip_code: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val time_zone: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val description: String? = null,
    val opening_hours: String? = null,
    val rating: Double,
    val review_count: Int,
    val images: List<StoreImage> = emptyList(),
) {
    val formattedAddress: String
        get() {
            val zip = zip_code?.trim().orEmpty()
            return if (zip.isEmpty()) {
                "$address, $city, $state"
            } else {
                "$address, $city, $state $zip"
            }
        }
}

data class StoreReviewReply(
    val id: Int,
    val content: String? = null,
    val admin_name: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)

data class StoreReview(
    val id: Int,
    val user_id: Int,
    val store_id: Int,
    val appointment_id: Int,
    val rating: Double,
    val comment: String? = null,
    val images: List<String>? = null,
    val created_at: String,
    val updated_at: String,
    val user_name: String? = null,
    val user_avatar: String? = null,
    val reply: StoreReviewReply? = null,
)

data class StoreHour(
    val id: Int,
    val store_id: Int,
    val day_of_week: Int,
    val open_time: String? = null,
    val close_time: String? = null,
    val is_closed: Boolean,
)

data class StoreRatingSummary(
    val store_id: Int,
    val average_rating: Double,
    val total_reviews: Int,
    val rating_distribution: Map<String, Int>? = null,
)

data class FavoriteState(
    val is_favorited: Boolean,
)
