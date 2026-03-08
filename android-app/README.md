# Android App (Kotlin + Jetpack Compose)

This directory contains the native Android client bootstrap for NailsDash.

## Stack
- Kotlin
- Jetpack Compose + Material3
- Navigation Compose
- Retrofit + OkHttp + Moshi

## Structure
- `app/src/main/java/com/nailsdash/android/ui`: App shell, screens, theme
- `app/src/main/java/com/nailsdash/android/data`: API and models

## Prerequisites
- Android Studio (Koala or newer)
- Android SDK 34
- JDK 17

## Run
1. Open Android Studio and select this folder: `android-app`.
2. Let Gradle sync the project.
3. Run the `app` configuration on emulator or device.

## Backend integration
- Debug build points to: `http://10.0.2.2:8000/api/v1/`
- Release build currently uses a placeholder URL in `app/build.gradle.kts`

## Next suggested steps
1. Implement auth flow (`/auth/login`, token persistence).
2. Add repository + viewmodel per feature.
3. Start with Stores and Appointments modules to match existing backend APIs.
