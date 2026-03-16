package com.nailsdash.android.benchmark

import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.PromotionServiceRule
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.model.StoreHour
import com.nailsdash.android.data.model.StoreImage
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.model.StoreRatingSummary
import com.nailsdash.android.data.model.StoreReview
import com.nailsdash.android.data.model.Technician

object BenchmarkFixtures {
    private const val CreatedAt = "2026-03-16T10:00:00Z"
    private const val UpdatedAt = "2026-03-16T12:00:00Z"
    private const val FutureDate = "2026-03-24"
    private const val PastDate = "2026-03-04"

    val tags: List<String> = listOf("All", "French", "Chrome", "Minimal", "Spring")

    private val pins = listOf(
        HomeFeedPin(
            id = 101,
            title = "Classic French Set",
            image_url = "https://picsum.photos/seed/nailsdash-pin-101/900/1200",
            description = "Clean white French tips with a soft gloss finish.",
            tags = listOf("French", "Minimal"),
            created_at = CreatedAt,
        ),
        HomeFeedPin(
            id = 102,
            title = "Golden Chrome Almond",
            image_url = "https://picsum.photos/seed/nailsdash-pin-102/900/1200",
            description = "Warm chrome shine with almond shaping.",
            tags = listOf("Chrome", "Spring"),
            created_at = CreatedAt,
        ),
        HomeFeedPin(
            id = 103,
            title = "Pearl Milk Gradient",
            image_url = "https://picsum.photos/seed/nailsdash-pin-103/900/1200",
            description = "Soft pearl ombre for a clean everyday look.",
            tags = listOf("Minimal", "Spring"),
            created_at = CreatedAt,
        ),
        HomeFeedPin(
            id = 104,
            title = "Pink Ribbon French",
            image_url = "https://picsum.photos/seed/nailsdash-pin-104/900/1200",
            description = "French base with micro ribbon art.",
            tags = listOf("French", "Spring"),
            created_at = CreatedAt,
        ),
        HomeFeedPin(
            id = 105,
            title = "Graphite Mirror Tips",
            image_url = "https://picsum.photos/seed/nailsdash-pin-105/900/1200",
            description = "Dark mirror chrome with a clean reflective topcoat.",
            tags = listOf("Chrome", "Minimal"),
            created_at = CreatedAt,
        ),
        HomeFeedPin(
            id = 106,
            title = "Vanilla Micro Art",
            image_url = "https://picsum.photos/seed/nailsdash-pin-106/900/1200",
            description = "Neutral nude base with subtle line detailing.",
            tags = listOf("Minimal"),
            created_at = CreatedAt,
        ),
    )

    private val stores = listOf(
        Store(
            id = 201,
            name = "Lumiere Nails",
            image_url = "https://picsum.photos/seed/nailsdash-store-201/1200/900",
            address = "245 Spring St",
            city = "New York",
            state = "NY",
            zip_code = "10013",
            latitude = 40.7241,
            longitude = -74.0018,
            time_zone = "America/New_York",
            phone = "2125550001",
            email = "hello@lumiere.example",
            description = "Quiet downtown studio focused on glossy clean sets.",
            opening_hours = "10:00 AM - 8:00 PM",
            rating = 4.9,
            review_count = 128,
            distance = 0.4,
        ),
        Store(
            id = 202,
            name = "Atelier Tips",
            image_url = "https://picsum.photos/seed/nailsdash-store-202/1200/900",
            address = "18 Mercer St",
            city = "New York",
            state = "NY",
            zip_code = "10013",
            latitude = 40.7231,
            longitude = -73.9994,
            time_zone = "America/New_York",
            phone = "2125550002",
            email = "book@ateliertips.example",
            description = "Editorial nail art and precise shaping.",
            opening_hours = "9:30 AM - 7:30 PM",
            rating = 4.8,
            review_count = 94,
            distance = 0.7,
        ),
        Store(
            id = 203,
            name = "Muse Nail Loft",
            image_url = "https://picsum.photos/seed/nailsdash-store-203/1200/900",
            address = "77 Prince St",
            city = "New York",
            state = "NY",
            zip_code = "10012",
            latitude = 40.7249,
            longitude = -73.9978,
            time_zone = "America/New_York",
            phone = "2125550003",
            email = "hello@musenails.example",
            description = "Minimal nail design with soft neutral palettes.",
            opening_hours = "10:00 AM - 7:00 PM",
            rating = 4.7,
            review_count = 71,
            distance = 1.1,
        ),
    )

    private val storeImages = mapOf(
        201 to listOf(
            StoreImage(1, "https://picsum.photos/seed/nailsdash-store-201-a/1200/900", is_primary = 1, display_order = 0),
            StoreImage(2, "https://picsum.photos/seed/nailsdash-store-201-b/1200/900", display_order = 1),
            StoreImage(3, "https://picsum.photos/seed/nailsdash-store-201-c/1200/900", display_order = 2),
            StoreImage(4, "https://picsum.photos/seed/nailsdash-store-201-d/1200/900", display_order = 3),
            StoreImage(5, "https://picsum.photos/seed/nailsdash-store-201-e/1200/900", display_order = 4),
        ),
        202 to listOf(
            StoreImage(6, "https://picsum.photos/seed/nailsdash-store-202-a/1200/900", is_primary = 1, display_order = 0),
            StoreImage(7, "https://picsum.photos/seed/nailsdash-store-202-b/1200/900", display_order = 1),
            StoreImage(8, "https://picsum.photos/seed/nailsdash-store-202-c/1200/900", display_order = 2),
        ),
        203 to listOf(
            StoreImage(9, "https://picsum.photos/seed/nailsdash-store-203-a/1200/900", is_primary = 1, display_order = 0),
            StoreImage(10, "https://picsum.photos/seed/nailsdash-store-203-b/1200/900", display_order = 1),
        ),
    )

    private val storeServices = mapOf(
        201 to listOf(
            ServiceItem(id = 301, store_id = 201, name = "Signature Gel Manicure", price = 68.0, duration_minutes = 60, is_active = 1),
            ServiceItem(id = 302, store_id = 201, name = "French Tips Upgrade", price = 22.0, duration_minutes = 20, is_active = 1),
        ),
        202 to listOf(
            ServiceItem(id = 303, store_id = 202, name = "Chrome Sculpted Set", price = 84.0, duration_minutes = 75, is_active = 1),
            ServiceItem(id = 304, store_id = 202, name = "Mini Art Add-on", price = 16.0, duration_minutes = 15, is_active = 1),
        ),
        203 to listOf(
            ServiceItem(id = 305, store_id = 203, name = "Minimal Builder Gel", price = 72.0, duration_minutes = 65, is_active = 1),
        ),
    )

    private val storePortfolio = mapOf(
        201 to listOf(
            StorePortfolio(1, 201, "https://picsum.photos/seed/nailsdash-portfolio-201-a/1200/900", "French Series", null, 0, CreatedAt, UpdatedAt),
            StorePortfolio(2, 201, "https://picsum.photos/seed/nailsdash-portfolio-201-b/1200/900", "Milk Chrome", null, 1, CreatedAt, UpdatedAt),
        ),
        202 to listOf(
            StorePortfolio(3, 202, "https://picsum.photos/seed/nailsdash-portfolio-202-a/1200/900", "Editorial Chrome", null, 0, CreatedAt, UpdatedAt),
        ),
        203 to listOf(
            StorePortfolio(4, 203, "https://picsum.photos/seed/nailsdash-portfolio-203-a/1200/900", "Soft Neutral", null, 0, CreatedAt, UpdatedAt),
        ),
    )

    private val storeReviews = mapOf(
        201 to listOf(
            StoreReview(1, 1, 201, 9001, 5.0, "Perfect shape and a very clean finish.", null, CreatedAt, UpdatedAt, "Sofia", null, null),
        ),
        202 to listOf(
            StoreReview(2, 2, 202, 9002, 4.5, "Strong chrome work and good structure.", null, CreatedAt, UpdatedAt, "Maya", null, null),
        ),
        203 to listOf(
            StoreReview(3, 3, 203, 9003, 4.8, "Minimal look came out exactly right.", null, CreatedAt, UpdatedAt, "Iris", null, null),
        ),
    )

    private val storeRatings = mapOf(
        201 to StoreRatingSummary(201, 4.9, 128),
        202 to StoreRatingSummary(202, 4.8, 94),
        203 to StoreRatingSummary(203, 4.7, 71),
    )

    private val storeHours = mapOf(
        201 to weeklyHours(201),
        202 to weeklyHours(202),
        203 to weeklyHours(203),
    )

    private val storeTechnicians = mapOf(
        201 to listOf(
            Technician(401, 201, "Ava", 1, null),
            Technician(402, 201, "Mila", 1, null),
        ),
        202 to listOf(
            Technician(403, 202, "Nora", 1, null),
        ),
        203 to listOf(
            Technician(404, 203, "Elle", 1, null),
        ),
    )

    private val storeDetails = stores.associate { store ->
        store.id to StoreDetail(
            id = store.id,
            name = store.name,
            address = store.address,
            city = store.city,
            state = store.state,
            zip_code = store.zip_code,
            latitude = store.latitude,
            longitude = store.longitude,
            time_zone = store.time_zone,
            phone = store.phone,
            email = store.email,
            description = store.description,
            opening_hours = store.opening_hours,
            rating = store.rating,
            review_count = store.review_count,
            images = storeImages[store.id].orEmpty(),
        )
    }

    val promotions = listOf(
        Promotion(
            id = 501,
            scope = "store",
            store_id = 201,
            title = "French Tips Weekday Special",
            type = "percentage",
            image_url = "https://picsum.photos/seed/nailsdash-deal-501/1200/900",
            discount_type = "percentage",
            discount_value = 15.0,
            rules = "Valid Monday through Thursday on gel manicure bookings.",
            start_at = CreatedAt,
            end_at = "2026-03-30T23:59:59Z",
            is_active = true,
            created_at = CreatedAt,
            updated_at = UpdatedAt,
            service_rules = listOf(PromotionServiceRule(1, 301, min_price = 60.0, max_price = 90.0)),
        ),
        Promotion(
            id = 502,
            scope = "platform",
            store_id = null,
            title = "Spring Platform Bonus",
            type = "fixed",
            image_url = "https://picsum.photos/seed/nailsdash-deal-502/1200/900",
            discount_type = "fixed",
            discount_value = 10.0,
            rules = "Take $10 off any qualifying booking over $80.",
            start_at = CreatedAt,
            end_at = "2026-03-30T23:59:59Z",
            is_active = true,
            created_at = CreatedAt,
            updated_at = UpdatedAt,
            service_rules = listOf(PromotionServiceRule(2, 303, min_price = 80.0, max_price = 120.0)),
        ),
    )

    val appointments = listOf(
        Appointment(
            id = 601,
            order_number = "APT-601",
            store_id = 201,
            service_id = 301,
            technician_id = 401,
            appointment_date = FutureDate,
            appointment_time = "14:00:00",
            status = "confirmed",
            order_amount = 68.0,
            notes = "Benchmark upcoming appointment.",
            store_name = "Lumiere Nails",
            store_address = stores.first { it.id == 201 }.formattedAddress,
            service_name = "Signature Gel Manicure",
            service_price = 68.0,
            service_duration = 60,
            technician_name = "Ava",
            review_id = null,
            completed_at = null,
            created_at = CreatedAt,
            cancel_reason = null,
        ),
        Appointment(
            id = 602,
            order_number = "APT-602",
            store_id = 202,
            service_id = 303,
            technician_id = 403,
            appointment_date = PastDate,
            appointment_time = "11:00:00",
            status = "completed",
            order_amount = 84.0,
            notes = null,
            store_name = "Atelier Tips",
            store_address = stores.first { it.id == 202 }.formattedAddress,
            service_name = "Chrome Sculpted Set",
            service_price = 84.0,
            service_duration = 75,
            technician_name = "Nora",
            review_id = 91,
            completed_at = PastDate,
            created_at = CreatedAt,
            cancel_reason = null,
        ),
    )

    fun homePins(
        tag: String?,
        search: String?,
    ): List<HomeFeedPin> {
        val normalizedTag = tag?.trim().orEmpty()
        val normalizedSearch = search?.trim().orEmpty().lowercase()
        return pins.filter { pin ->
            val tagMatch = normalizedTag.isBlank() || pin.tags.any { it.equals(normalizedTag, ignoreCase = true) }
            val searchMatch = normalizedSearch.isBlank() ||
                pin.title.lowercase().contains(normalizedSearch) ||
                pin.description.orEmpty().lowercase().contains(normalizedSearch)
            tagMatch && searchMatch
        }
    }

    fun homePin(pinId: Int): HomeFeedPin? = pins.firstOrNull { it.id == pinId }

    fun relatedPins(pinId: Int): List<HomeFeedPin> {
        val source = homePin(pinId) ?: return emptyList()
        val tag = source.tags.firstOrNull() ?: return emptyList()
        return pins.filter { it.id != pinId && it.tags.contains(tag) }.take(6)
    }

    fun stores(sortBy: String): List<Store> {
        return when (sortBy) {
            "top_rated" -> stores.sortedByDescending { it.rating }
            "distance" -> stores.sortedBy { it.distance ?: Double.MAX_VALUE }
            else -> stores
        }
    }

    fun storeDetail(storeId: Int): StoreDetail? = storeDetails[storeId]

    fun storeImages(storeId: Int): List<StoreImage> = storeImages[storeId].orEmpty()

    fun storeServices(storeId: Int): List<ServiceItem> = storeServices[storeId].orEmpty()

    fun storeReviews(storeId: Int): List<StoreReview> = storeReviews[storeId].orEmpty()

    fun storePortfolio(storeId: Int): List<StorePortfolio> = storePortfolio[storeId].orEmpty()

    fun storeRating(storeId: Int): StoreRatingSummary? = storeRatings[storeId]

    fun storeHours(storeId: Int): List<StoreHour> = storeHours[storeId].orEmpty()

    fun storeTechnicians(storeId: Int): List<Technician> = storeTechnicians[storeId].orEmpty()

    private fun weeklyHours(storeId: Int): List<StoreHour> {
        return (0..6).map { day ->
            StoreHour(
                id = storeId * 10 + day,
                store_id = storeId,
                day_of_week = day,
                open_time = "10:00:00",
                close_time = "19:00:00",
                is_closed = false,
            )
        }
    }
}
