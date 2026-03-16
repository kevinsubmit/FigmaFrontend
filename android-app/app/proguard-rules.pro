# Keep metadata required by Moshi reflection and Kotlin model parsing.
-keep class kotlin.Metadata { *; }
-keepattributes Signature,*Annotation*,EnclosingMethod,InnerClasses

# Keep API interfaces and DTOs used by Retrofit/Moshi.
-keep interface com.nailsdash.android.data.network.NailsDashApi { *; }
-keep class com.nailsdash.android.data.model.** { *; }

# Keep Coil and OkHttp reflective pieces stable in release.
-dontwarn okhttp3.internal.platform.**
-dontwarn okio.**
