package com.nailsdash.android.ui.screen

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nailsdash.android.BuildConfig
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.ChangePasswordViewModel
import com.nailsdash.android.ui.state.LanguageSettingsViewModel
import com.nailsdash.android.ui.state.PhoneNumberSettingsViewModel
import com.nailsdash.android.ui.state.ProfileSettingsViewModel

private data class SettingsMenuItem(val title: String, val onClick: () -> Unit)
private data class SettingsMenuSection(val title: String, val items: List<SettingsMenuItem>)

@Composable
fun SettingsScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenProfileSettings: () -> Unit,
    onOpenChangePassword: () -> Unit,
    onOpenPhoneSettings: () -> Unit,
    onOpenVipMembership: () -> Unit,
    onOpenLanguageSettings: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenFeedbackSupport: () -> Unit,
    onOpenPartnershipInquiry: () -> Unit,
    onOpenPrivacySafety: () -> Unit,
    onOpenAboutUs: () -> Unit,
) {
    val sections = listOf(
        SettingsMenuSection(
            title = "ACCOUNT & PREFERENCES",
            items = listOf(
                SettingsMenuItem("Profile Settings", onOpenProfileSettings),
                SettingsMenuItem("Change Password", onOpenChangePassword),
                SettingsMenuItem("Phone Number", onOpenPhoneSettings),
                SettingsMenuItem("VIP Membership", onOpenVipMembership),
                SettingsMenuItem("Language", onOpenLanguageSettings),
                SettingsMenuItem("Notifications", onOpenNotifications),
            ),
        ),
        SettingsMenuSection(
            title = "PLATFORM",
            items = listOf(
                SettingsMenuItem("Feedback & Support", onOpenFeedbackSupport),
                SettingsMenuItem("Partnership Inquiry", onOpenPartnershipInquiry),
                SettingsMenuItem("Privacy & Safety", onOpenPrivacySafety),
            ),
        ),
        SettingsMenuSection(
            title = "OTHERS",
            items = listOf(
                SettingsMenuItem("About Us", onOpenAboutUs),
            ),
        ),
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineSmall)

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(sections) { section ->
                Text(section.title, style = MaterialTheme.typography.labelMedium)
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        section.items.forEachIndexed { index, item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(item.title)
                                Button(onClick = item.onClick) {
                                    Text("Open")
                                }
                            }
                            if (index < section.items.lastIndex) {
                                HorizontalDivider()
                            }
                        }
                    }
                }
            }

            item {
                Button(onClick = { sessionViewModel.logout() }, modifier = Modifier.fillMaxWidth()) {
                    Text("Logout")
                }
            }
        }
    }
}

@Composable
fun ProfileSettingsScreen(
    sessionViewModel: AppSessionViewModel,
    profileSettingsViewModel: ProfileSettingsViewModel = viewModel(),
) {
    val context = LocalContext.current
    val bearerToken = sessionViewModel.accessTokenOrNull()

    val selectedAvatarUri = remember { mutableStateOf<Uri?>(null) }
    val pickAvatarLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        selectedAvatarUri.value = uri
        if (uri != null && bearerToken != null) {
            val bytes = runCatching {
                context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            }.getOrNull()

            val imageBytes = bytes ?: return@rememberLauncherForActivityResult
            val fileName = "avatar_${System.currentTimeMillis()}.jpg"
            profileSettingsViewModel.uploadAvatar(
                bearerToken = bearerToken,
                imageData = imageBytes,
                fileName = fileName,
            )
        }
    }

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) profileSettingsViewModel.load(bearerToken)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Profile Settings", style = MaterialTheme.typography.headlineSmall)

        if (profileSettingsViewModel.isLoading) {
            CircularProgressIndicator()
        }

        profileSettingsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        profileSettingsViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }

        Text("Username: ${profileSettingsViewModel.username}")
        Text("Phone: ${profileSettingsViewModel.phone}")

        profileSettingsViewModel.avatarURL?.takeIf { it.isNotBlank() }?.let {
            Text("Avatar URL: $it", style = MaterialTheme.typography.bodySmall)
        }

        Button(
            onClick = { pickAvatarLauncher.launch("image/*") },
            enabled = !profileSettingsViewModel.isUploadingAvatar,
        ) {
            Text(if (profileSettingsViewModel.isUploadingAvatar) "Uploading..." else "Upload Avatar")
        }

        OutlinedTextField(
            value = profileSettingsViewModel.fullName,
            onValueChange = { profileSettingsViewModel.fullName = it },
            label = { Text("Full Name") },
            modifier = Modifier.fillMaxWidth(),
        )

        if (profileSettingsViewModel.canEditGender) {
            OutlinedTextField(
                value = profileSettingsViewModel.gender,
                onValueChange = { profileSettingsViewModel.gender = it },
                label = { Text("Gender (male/female/other)") },
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Text("Gender: ${profileSettingsViewModel.gender}")
        }

        if (profileSettingsViewModel.canEditBirthday) {
            OutlinedTextField(
                value = profileSettingsViewModel.birthday.toString(),
                onValueChange = {
                    runCatching {
                        java.time.LocalDate.parse(it)
                    }.onSuccess { date ->
                        profileSettingsViewModel.birthday = date
                    }
                },
                label = { Text("Birthday (yyyy-MM-dd)") },
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Text("Birthday: ${profileSettingsViewModel.birthdayDisplay}")
        }

        Button(
            onClick = {
                if (bearerToken != null) {
                    profileSettingsViewModel.save(bearerToken) {
                        sessionViewModel.refreshSession()
                    }
                }
            },
            enabled = !profileSettingsViewModel.isSaving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (profileSettingsViewModel.isSaving) "Saving..." else "Save Changes")
        }
    }
}

@Composable
fun ChangePasswordScreen(
    sessionViewModel: AppSessionViewModel,
    changePasswordViewModel: ChangePasswordViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Change Password", style = MaterialTheme.typography.headlineSmall)

        changePasswordViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        changePasswordViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }

        OutlinedTextField(
            value = changePasswordViewModel.currentPassword,
            onValueChange = { changePasswordViewModel.currentPassword = it },
            label = { Text("Current password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = changePasswordViewModel.newPassword,
            onValueChange = { changePasswordViewModel.newPassword = it },
            label = { Text("New password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = changePasswordViewModel.confirmPassword,
            onValueChange = { changePasswordViewModel.confirmPassword = it },
            label = { Text("Confirm new password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )

        Button(
            onClick = {
                if (bearerToken != null) {
                    changePasswordViewModel.save(bearerToken)
                }
            },
            enabled = !changePasswordViewModel.isSaving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (changePasswordViewModel.isSaving) "Saving..." else "Update Password")
        }
    }
}

@Composable
fun PhoneSettingsScreen(
    sessionViewModel: AppSessionViewModel,
    phoneNumberSettingsViewModel: PhoneNumberSettingsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) phoneNumberSettingsViewModel.load(bearerToken)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Phone Number", style = MaterialTheme.typography.headlineSmall)
        Text("Current: ${phoneNumberSettingsViewModel.currentPhone}")
        Text(if (phoneNumberSettingsViewModel.isPhoneVerified) "Verified" else "Not verified")

        phoneNumberSettingsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        phoneNumberSettingsViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }

        OutlinedTextField(
            value = phoneNumberSettingsViewModel.newPhone,
            onValueChange = { phoneNumberSettingsViewModel.newPhone = it },
            label = { Text("New US phone") },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = phoneNumberSettingsViewModel.verificationCode,
                onValueChange = {
                    phoneNumberSettingsViewModel.verificationCode = it.filter(Char::isDigit).take(6)
                },
                label = { Text("Code") },
                modifier = Modifier.weight(1f),
            )
            Button(
                onClick = { phoneNumberSettingsViewModel.sendCode() },
                enabled = phoneNumberSettingsViewModel.countdown == 0 && !phoneNumberSettingsViewModel.isSendingCode,
            ) {
                Text(
                    if (phoneNumberSettingsViewModel.countdown > 0) {
                        "${phoneNumberSettingsViewModel.countdown}s"
                    } else {
                        "Send"
                    },
                )
            }
        }

        OutlinedTextField(
            value = phoneNumberSettingsViewModel.currentPassword,
            onValueChange = { phoneNumberSettingsViewModel.currentPassword = it },
            label = { Text("Current password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )

        Button(
            onClick = {
                if (bearerToken != null) {
                    phoneNumberSettingsViewModel.updatePhone(bearerToken) {
                        sessionViewModel.refreshSession()
                    }
                }
            },
            enabled = !phoneNumberSettingsViewModel.isSaving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (phoneNumberSettingsViewModel.isSaving) "Saving..." else "Update Phone")
        }
    }
}

@Composable
fun LanguageSettingsScreen(
    sessionViewModel: AppSessionViewModel,
    languageSettingsViewModel: LanguageSettingsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val options = listOf(
        "en" to "English",
        "es" to "Español",
        "zh" to "中文",
        "ko" to "한국어",
        "fr" to "Français",
        "vi" to "Tiếng Việt",
    )

    LaunchedEffect(Unit) {
        languageSettingsViewModel.loadInitialLanguage()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Language", style = MaterialTheme.typography.headlineSmall)

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { (code, label) ->
                        FilterChip(
                            selected = languageSettingsViewModel.selectedLanguage == code,
                            onClick = { languageSettingsViewModel.selectedLanguage = code },
                            label = { Text(label) },
                        )
                    }
                }
            }
        }

        Text("Current: ${options.firstOrNull { it.first == languageSettingsViewModel.selectedLanguage }?.second ?: "English"}")

        languageSettingsViewModel.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        languageSettingsViewModel.actionMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }

        Button(
            onClick = {
                if (bearerToken != null) languageSettingsViewModel.save(bearerToken)
            },
            enabled = !languageSettingsViewModel.isSaving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (languageSettingsViewModel.isSaving) "Saving..." else "Save Language")
        }
    }
}

@Composable
fun FeedbackSupportScreen() {
    val uriHandler = LocalUriHandler.current
    val channels = listOf(
        Triple("WhatsApp Support", "Fastest response time", "https://wa.me/14151234567"),
        Triple("iMessage", "Standard for iPhone users", "sms:+14151234567"),
        Triple("Instagram DM", "Follow us for nail inspo", "https://instagram.com"),
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Feedback & Support", style = MaterialTheme.typography.headlineSmall)
        Text("How can we help you today? Reach us through your preferred channel.")

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(channels) { (title, subtitle, uri) ->
                Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(title, style = MaterialTheme.typography.titleMedium)
                            Text(subtitle, style = MaterialTheme.typography.bodySmall)
                        }
                        Button(onClick = { uriHandler.openUri(uri) }) {
                            Text("Open")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PartnershipInquiryScreen() {
    val uriHandler = LocalUriHandler.current
    val highlights = listOf(
        "List Your Salon - Get discovered by local beauty seekers",
        "Advanced Booking - Manage appointments with ease",
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Partner with Us", style = MaterialTheme.typography.headlineSmall)
        Text("Join our salon network and reach more customers.")

        Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                highlights.forEach { line ->
                    Text(line, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = { uriHandler.openUri("https://wa.me/14151234567") },
                modifier = Modifier.weight(1f),
            ) {
                Text("WhatsApp")
            }
            Button(
                onClick = { uriHandler.openUri("sms:+14151234567") },
                modifier = Modifier.weight(1f),
            ) {
                Text("iMessage")
            }
        }
    }
}

@Composable
fun PrivacySafetyScreen() {
    val bullets = listOf(
        "We never sell your personal information.",
        "You can request data deletion by contacting support.",
        "Booking details are shared only with your selected salon.",
        "Sensitive data is encrypted in transit.",
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Privacy & Safety", style = MaterialTheme.typography.headlineSmall)

        Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Your Data, Your Control", style = MaterialTheme.typography.titleMedium)
                Text(
                    "We only collect the information needed to manage bookings and improve your service experience.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                bullets.forEach { line ->
                    Text("• $line")
                }
            }
        }
    }
}

@Composable
fun AboutUsScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("About Us", style = MaterialTheme.typography.headlineSmall)

        Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("NailsDash", style = MaterialTheme.typography.titleLarge)
                Text(
                    "NailsDash connects customers with top-rated nail salons. Discover styles, book appointments, and unlock exclusive deals in one place.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        Card(shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Version: v${BuildConfig.VERSION_NAME}")
                Text("Market: United States")
                Text("Figma Make Beauty Platform")
            }
        }
    }
}
