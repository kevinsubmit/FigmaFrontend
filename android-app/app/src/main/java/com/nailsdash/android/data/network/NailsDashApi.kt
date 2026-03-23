package com.nailsdash.android.data.network

import com.nailsdash.android.data.model.Appointment
import com.nailsdash.android.data.model.AppointmentCancelRequest
import com.nailsdash.android.data.model.AppointmentCreateRequest
import com.nailsdash.android.data.model.AppointmentGroupCreateRequest
import com.nailsdash.android.data.model.AppointmentGroupResponse
import com.nailsdash.android.data.model.AppointmentRescheduleRequest
import com.nailsdash.android.data.model.AppointmentServiceItemCreateRequest
import com.nailsdash.android.data.model.AppointmentServiceSummary
import com.nailsdash.android.data.model.AppNotification
import com.nailsdash.android.data.model.AuthUser
import com.nailsdash.android.data.model.CouponTemplate
import com.nailsdash.android.data.model.CountDTO
import com.nailsdash.android.data.model.FavoriteState
import com.nailsdash.android.data.model.GiftCard
import com.nailsdash.android.data.model.GiftCardClaimRequest
import com.nailsdash.android.data.model.GiftCardClaimResponse
import com.nailsdash.android.data.model.GiftCardPurchaseResponse
import com.nailsdash.android.data.model.GiftCardRevokeResponse
import com.nailsdash.android.data.model.GiftCardSummary
import com.nailsdash.android.data.model.GiftCardTransferRequest
import com.nailsdash.android.data.model.HomeFeedPin
import com.nailsdash.android.data.model.LoginRequest
import com.nailsdash.android.data.model.MarkAllReadResponse
import com.nailsdash.android.data.model.NotificationPreferences
import com.nailsdash.android.data.model.NotificationPreferencesUpdateRequest
import com.nailsdash.android.data.model.PointTransaction
import com.nailsdash.android.data.model.PointsBalance
import com.nailsdash.android.data.model.ProfileSummary
import com.nailsdash.android.data.model.Promotion
import com.nailsdash.android.data.model.RegisterRequest
import com.nailsdash.android.data.model.ReferralCode
import com.nailsdash.android.data.model.ReferralListItem
import com.nailsdash.android.data.model.ReferralStats
import com.nailsdash.android.data.model.RefreshTokenRequest
import com.nailsdash.android.data.model.ReviewUpsertRequest
import com.nailsdash.android.data.model.SendVerificationCodeRequest
import com.nailsdash.android.data.model.SendVerificationCodeResponse
import com.nailsdash.android.data.model.ServiceItem
import com.nailsdash.android.data.model.SettingsUpdatePasswordRequest
import com.nailsdash.android.data.model.SettingsUpdatePasswordResponse
import com.nailsdash.android.data.model.SettingsUpdatePhoneRequest
import com.nailsdash.android.data.model.SettingsUpdatePhoneResponse
import com.nailsdash.android.data.model.SettingsUpdateProfileRequest
import com.nailsdash.android.data.model.SettingsUpdateProfileResponse
import com.nailsdash.android.data.model.SettingsUpdateRequest
import com.nailsdash.android.data.model.SettingsUpdateResponse
import com.nailsdash.android.data.model.Store
import com.nailsdash.android.data.model.StoreDetail
import com.nailsdash.android.data.model.StoreHour
import com.nailsdash.android.data.model.StoreImage
import com.nailsdash.android.data.model.StorePortfolio
import com.nailsdash.android.data.model.StoreRatingSummary
import com.nailsdash.android.data.model.StoreReview
import com.nailsdash.android.data.model.Technician
import com.nailsdash.android.data.model.TechnicianAvailableSlot
import com.nailsdash.android.data.model.TokenResponse
import com.nailsdash.android.data.model.UnreadCount
import com.nailsdash.android.data.model.UserCoupon
import com.nailsdash.android.data.model.UserReview
import com.nailsdash.android.data.model.VerifyCodeRequest
import com.nailsdash.android.data.model.VerifyCodeResponse
import com.nailsdash.android.data.model.VipStatus
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Part
import retrofit2.http.Query

interface NailsDashApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): TokenResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthUser

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshTokenRequest): TokenResponse

    @GET("auth/me")
    suspend fun getMe(@Header("Authorization") bearerToken: String): AuthUser

    @GET("profile/summary")
    suspend fun getProfileSummary(@Header("Authorization") bearerToken: String): ProfileSummary

    @POST("auth/send-verification-code")
    suspend fun sendVerificationCode(@Body request: SendVerificationCodeRequest): SendVerificationCodeResponse

    @POST("auth/verify-code")
    suspend fun verifyCode(@Body request: VerifyCodeRequest): VerifyCodeResponse

    @Multipart
    @POST("auth/me/avatar")
    suspend fun uploadAvatar(
        @Header("Authorization") bearerToken: String,
        @Part file: MultipartBody.Part,
    ): Map<String, String>

    @GET("pins/tags")
    suspend fun getPinTags(): List<String>

    @GET("pins")
    suspend fun getPins(
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
        @Query("tag") tag: String? = null,
        @Query("search") search: String? = null,
    ): List<HomeFeedPin>

    @GET("pins/{pinId}")
    suspend fun getPinById(@Path("pinId") pinId: Int): HomeFeedPin

    @GET("pins/{pinId}/is-favorited")
    suspend fun isPinFavorited(
        @Path("pinId") pinId: Int,
        @Header("Authorization") bearerToken: String,
    ): FavoriteState

    @POST("pins/{pinId}/favorite")
    suspend fun addFavoritePin(
        @Header("Authorization") bearerToken: String,
        @Path("pinId") pinId: Int,
    )

    @GET("pins/favorites/count")
    suspend fun getFavoritePinsCount(@Header("Authorization") bearerToken: String): CountDTO

    @GET("pins/favorites/my-favorites")
    suspend fun getFavoritePins(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<HomeFeedPin>

    @DELETE("pins/{pinId}/favorite")
    suspend fun removeFavoritePin(
        @Header("Authorization") bearerToken: String,
        @Path("pinId") pinId: Int,
    )

    @GET("stores")
    suspend fun getStores(
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
        @Query("sort_by") sortBy: String? = null,
        @Query("user_lat") userLat: Double? = null,
        @Query("user_lng") userLng: Double? = null,
    ): List<Store>

    @GET("stores/{storeId}")
    suspend fun getStoreDetail(@Path("storeId") storeId: Int): StoreDetail

    @GET("stores/{storeId}/images")
    suspend fun getStoreImages(@Path("storeId") storeId: Int): List<StoreImage>

    @GET("stores/portfolio/{storeId}")
    suspend fun getStorePortfolio(
        @Path("storeId") storeId: Int,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<StorePortfolio>

    @GET("stores/{storeId}/services")
    suspend fun getStoreServices(@Path("storeId") storeId: Int): List<ServiceItem>

    @GET("stores/{storeId}/hours")
    suspend fun getStoreHours(@Path("storeId") storeId: Int): List<StoreHour>

    @GET("stores/{storeId}/is-favorited")
    suspend fun isStoreFavorited(
        @Path("storeId") storeId: Int,
        @Header("Authorization") bearerToken: String,
    ): FavoriteState

    @POST("stores/{storeId}/favorite")
    suspend fun addStoreFavorite(
        @Path("storeId") storeId: Int,
        @Header("Authorization") bearerToken: String,
    )

    @DELETE("stores/{storeId}/favorite")
    suspend fun removeStoreFavorite(
        @Path("storeId") storeId: Int,
        @Header("Authorization") bearerToken: String,
    )

    @GET("stores/favorites/my-favorites")
    suspend fun getFavoriteStores(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<Store>

    @GET("reviews/stores/{storeId}")
    suspend fun getStoreReviews(
        @Path("storeId") storeId: Int,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<StoreReview>

    @GET("reviews/stores/{storeId}/rating")
    suspend fun getStoreRating(@Path("storeId") storeId: Int): StoreRatingSummary

    @GET("technicians")
    suspend fun getTechnicians(
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
        @Query("store_id") storeId: Int,
    ): List<Technician>

    @GET("technicians/{technicianId}/available-slots")
    suspend fun getTechnicianAvailableSlots(
        @Path("technicianId") technicianId: Int,
        @Query("date") date: String,
        @Query("service_id") serviceId: Int,
    ): List<TechnicianAvailableSlot>

    @POST("appointments/")
    suspend fun createAppointment(
        @Header("Authorization") bearerToken: String,
        @Body request: AppointmentCreateRequest,
    ): Appointment

    @POST("appointments/{appointmentId}/services")
    suspend fun addAppointmentServiceItem(
        @Header("Authorization") bearerToken: String,
        @Path("appointmentId") appointmentId: Int,
        @Body request: AppointmentServiceItemCreateRequest,
    ): AppointmentServiceSummary

    @GET("appointments/{appointmentId}/services")
    suspend fun getAppointmentServiceSummary(
        @Header("Authorization") bearerToken: String,
        @Path("appointmentId") appointmentId: Int,
    ): AppointmentServiceSummary

    @POST("appointments/groups")
    suspend fun createAppointmentGroup(
        @Header("Authorization") bearerToken: String,
        @Body request: AppointmentGroupCreateRequest,
    ): AppointmentGroupResponse

    @GET("appointments/")
    suspend fun getMyAppointments(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<Appointment>

    @GET("appointments/{appointmentId}")
    suspend fun getAppointment(
        @Header("Authorization") bearerToken: String,
        @Path("appointmentId") appointmentId: Int,
    ): Appointment

    @POST("appointments/{appointmentId}/cancel")
    suspend fun cancelAppointment(
        @Header("Authorization") bearerToken: String,
        @Path("appointmentId") appointmentId: Int,
        @Body request: AppointmentCancelRequest,
    ): Appointment

    @POST("appointments/{appointmentId}/reschedule")
    suspend fun rescheduleAppointment(
        @Header("Authorization") bearerToken: String,
        @Path("appointmentId") appointmentId: Int,
        @Body request: AppointmentRescheduleRequest,
    ): Appointment

    @GET("promotions")
    suspend fun getPromotions(
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
        @Query("active_only") activeOnly: Boolean,
        @Query("include_platform") includePlatform: Boolean,
    ): List<Promotion>

    @GET("notifications/stats/unread-count")
    suspend fun getUnreadNotificationCount(@Header("Authorization") bearerToken: String): UnreadCount

    @GET("notifications/")
    suspend fun getNotifications(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
        @Query("unread_only") unreadOnly: Boolean = false,
    ): List<AppNotification>

    @GET("notifications/settings/preferences")
    suspend fun getNotificationPreferences(
        @Header("Authorization") bearerToken: String,
    ): NotificationPreferences

    @PUT("notifications/settings/preferences")
    suspend fun updateNotificationPreferences(
        @Header("Authorization") bearerToken: String,
        @Body request: NotificationPreferencesUpdateRequest,
    ): NotificationPreferences

    @PATCH("notifications/{notificationId}/read")
    suspend fun markNotificationRead(
        @Header("Authorization") bearerToken: String,
        @Path("notificationId") notificationId: Int,
    ): AppNotification

    @POST("notifications/mark-all-read")
    suspend fun markAllNotificationsRead(
        @Header("Authorization") bearerToken: String,
    ): MarkAllReadResponse

    @DELETE("notifications/{notificationId}")
    suspend fun deleteNotification(
        @Header("Authorization") bearerToken: String,
        @Path("notificationId") notificationId: Int,
    )

    @GET("points/balance")
    suspend fun getPointsBalance(@Header("Authorization") bearerToken: String): PointsBalance

    @GET("points/transactions")
    suspend fun getPointTransactions(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<PointTransaction>

    @GET("coupons/exchangeable")
    suspend fun getExchangeableCoupons(@Header("Authorization") bearerToken: String): List<CouponTemplate>

    @POST("coupons/exchange/{couponId}")
    suspend fun exchangeCoupon(
        @Header("Authorization") bearerToken: String,
        @Path("couponId") couponId: Int,
    ): UserCoupon

    @GET("coupons/my-coupons")
    suspend fun getMyCoupons(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
        @Query("status") status: String? = null,
    ): List<UserCoupon>

    @GET("gift-cards/my-cards")
    suspend fun getMyGiftCards(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<GiftCard>

    @GET("gift-cards/summary")
    suspend fun getGiftCardSummary(
        @Header("Authorization") bearerToken: String,
    ): GiftCardSummary

    @POST("gift-cards/{giftCardId}/transfer")
    suspend fun transferGiftCard(
        @Header("Authorization") bearerToken: String,
        @Path("giftCardId") giftCardId: Int,
        @Body request: GiftCardTransferRequest,
    ): GiftCardPurchaseResponse

    @POST("gift-cards/claim")
    suspend fun claimGiftCard(
        @Header("Authorization") bearerToken: String,
        @Body request: GiftCardClaimRequest,
    ): GiftCardClaimResponse

    @POST("gift-cards/{giftCardId}/revoke")
    suspend fun revokeGiftCard(
        @Header("Authorization") bearerToken: String,
        @Path("giftCardId") giftCardId: Int,
    ): GiftCardRevokeResponse

    @GET("reviews/my-reviews")
    suspend fun getMyReviews(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<UserReview>

    @POST("reviews/")
    suspend fun createReview(
        @Header("Authorization") bearerToken: String,
        @Body request: ReviewUpsertRequest,
    ): UserReview

    @Multipart
    @POST("upload/images")
    suspend fun uploadReviewImages(
        @Header("Authorization") bearerToken: String,
        @Part files: List<MultipartBody.Part>,
    ): List<String>

    @PUT("reviews/{reviewId}")
    suspend fun updateReview(
        @Header("Authorization") bearerToken: String,
        @Path("reviewId") reviewId: Int,
        @Body request: ReviewUpsertRequest,
    ): UserReview

    @DELETE("reviews/{reviewId}")
    suspend fun deleteReview(
        @Header("Authorization") bearerToken: String,
        @Path("reviewId") reviewId: Int,
    )

    @GET("vip/status")
    suspend fun getVipStatus(@Header("Authorization") bearerToken: String): VipStatus

    @GET("referrals/my-code")
    suspend fun getReferralCode(@Header("Authorization") bearerToken: String): ReferralCode

    @GET("referrals/stats")
    suspend fun getReferralStats(@Header("Authorization") bearerToken: String): ReferralStats

    @GET("referrals/list")
    suspend fun getReferralList(
        @Header("Authorization") bearerToken: String,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int,
    ): List<ReferralListItem>

    @PUT("users/profile")
    suspend fun updateProfile(
        @Header("Authorization") bearerToken: String,
        @Body request: SettingsUpdateProfileRequest,
    ): SettingsUpdateProfileResponse

    @PUT("users/password")
    suspend fun updatePassword(
        @Header("Authorization") bearerToken: String,
        @Body request: SettingsUpdatePasswordRequest,
    ): SettingsUpdatePasswordResponse

    @PUT("users/phone")
    suspend fun updatePhone(
        @Header("Authorization") bearerToken: String,
        @Body request: SettingsUpdatePhoneRequest,
    ): SettingsUpdatePhoneResponse

    @PUT("users/settings")
    suspend fun updateSettings(
        @Header("Authorization") bearerToken: String,
        @Body request: SettingsUpdateRequest,
    ): SettingsUpdateResponse
}
