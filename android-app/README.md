# Android App (Kotlin + Jetpack Compose)

This directory contains the native Android client for NailsDash.

## Stack
- Kotlin
- Jetpack Compose + Material3
- Navigation Compose
- Retrofit + OkHttp + Moshi
- AndroidViewModel + Coroutines

## Structure
- `app/src/main/java/com/nailsdash/android/ui`: app shell, navigation, screens, theme
- `app/src/main/java/com/nailsdash/android/data`: network layer, repositories, models
- `app/src/main/java/com/nailsdash/android/ui/state`: feature viewmodels and session state
- `app/src/main/java/com/nailsdash/android/utils`: shared formatting / URL / helpers

## Prerequisites
- Android Studio (Koala or newer)
- Android SDK 34
- JDK 17

## Run
1. Open Android Studio and select this folder: `android-app`.
2. Let Gradle sync the project.
3. Run the `app` configuration on emulator or device.

## Backend integration
- Debug build default: `http://10.0.2.2:8000/api/v1/` (Android emulator)
- Real device debug override: add `API_BASE_URL_DEBUG=http://<YOUR_MAC_LAN_IP>:8000/api/v1/` to `android-app/local.properties`
  - Example: `API_BASE_URL_DEBUG=http://192.168.1.225:8000/api/v1/`
  - Backend should bind `0.0.0.0` and phone/Mac must be on the same Wi-Fi
- Debug manifest enables cleartext HTTP for local development (`app/src/debug/AndroidManifest.xml`)
- Release build currently uses a placeholder URL in `app/build.gradle.kts`

## iOS parity status (current)
- iOS-aligned app shell: `Home / Book / Appointments / Deals / Profile`
- Login/session bootstrap + token refresh + auth gate
- Home feed:
  - search + tag filter + pagination
  - pin detail page, favorite toggle, share, image download
  - related pin recommendations
- Book flow:
  - store list, store detail tabs, booking form (service/technician/date/time/notes)
  - booking success transition overlay and appointments jump
  - style reference flow from Home -> Book (Step 01/02/03 reference card + notes auto-injection)
- Appointments:
  - list view + detail view
  - integrated open-from-notification routing
- Deals:
  - segmented store/platform promotions
  - rich promo cards + CTA routing
- Profile:
  - profile center overview + VIP/referral summary
  - subpages: points, coupons, gift cards, order history, reviews, favorites, VIP, referral
- Settings:
  - settings hub + profile/password/phone/language/about/privacy/support/partnership pages

## Remaining parity gaps
- Fine-grained visual parity with iOS dark-gold design system (spacing, typography, motion, overlays)
- Some advanced iOS interactions are still simplified on Android (gesture-driven detail interactions and complex transitions)
