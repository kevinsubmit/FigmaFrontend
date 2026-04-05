package com.nailsdash.android.ui.screen

import android.app.DatePickerDialog
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nailsdash.android.BuildConfig
import com.nailsdash.android.data.repository.ProfileRepository
import com.nailsdash.android.ui.component.AuthLogoAvatar
import com.nailsdash.android.ui.state.AppSessionViewModel
import com.nailsdash.android.ui.state.ChangePasswordViewModel
import com.nailsdash.android.ui.state.LanguageSettingsViewModel
import com.nailsdash.android.ui.state.PhoneNumberSettingsViewModel
import com.nailsdash.android.ui.state.ProfileSettingsViewModel
import com.nailsdash.android.ui.state.SupportContactViewModel
import java.time.LocalDate

private data class SettingsMenuItem(
    val title: String,
    val icon: ImageVector,
    val badge: String? = null,
    val onClick: () -> Unit,
)

private data class SettingsMenuSection(val title: String, val items: List<SettingsMenuItem>)

private val SettingsGold = Color(0xFFD4AF37)
private val SettingsBackground = Color(0xFF000000)
private val SettingsCardBackground = Color(0xFF181818)
private val SettingsPrimaryText = Color.White
private val SettingsSecondaryText = Color.White.copy(alpha = 0.68f)
private val SettingsPagePadding = 16.dp
private val SettingsCardCorner = 18.dp
private const val SettingsPrefsName = "nailsdash_settings"
private const val SettingsLanguageKey = "nailsdash.language"
private const val LegacySettingsLanguageKey = "language"
private const val SettingsMotionDurationMs = 220

@Composable
fun SettingsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
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
    val context = LocalContext.current
    val bearerToken = sessionViewModel.accessTokenOrNull()
    val profileRepository = remember { ProfileRepository() }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var vipBadgeText by remember { mutableStateOf("VIP 1") }

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) {
            profileRepository.getVipStatus(bearerToken)
                .onSuccess { vipBadgeText = "VIP ${it.current_level.level}" }
        }
    }

    val languageOptions = listOf(
        "en" to "English",
        "es" to "Español",
        "zh" to "中文",
        "ko" to "한국어",
        "fr" to "Français",
        "vi" to "Tiếng Việt",
    )
    val selectedLanguageCode = context
        .getSharedPreferences(SettingsPrefsName, 0)
        .getString(SettingsLanguageKey, null)
        ?: context.getSharedPreferences(SettingsPrefsName, 0).getString(LegacySettingsLanguageKey, "en")
        ?: "en"
    val selectedLanguageLabel = languageOptions.firstOrNull { it.first == selectedLanguageCode }?.second ?: "English"

    val sections = listOf(
        SettingsMenuSection(
            title = "ACCOUNT & PREFERENCES",
            items = listOf(
                SettingsMenuItem("Profile Settings", icon = Icons.Filled.Person, onClick = onOpenProfileSettings),
                SettingsMenuItem("Change Password", icon = Icons.Filled.Security, onClick = onOpenChangePassword),
                SettingsMenuItem("Phone Number", icon = Icons.Filled.Phone, onClick = onOpenPhoneSettings),
                SettingsMenuItem("VIP Membership", icon = Icons.Filled.WorkspacePremium, badge = vipBadgeText, onClick = onOpenVipMembership),
                SettingsMenuItem("Language", icon = Icons.Filled.Public, badge = selectedLanguageLabel, onClick = onOpenLanguageSettings),
                SettingsMenuItem("Notifications", icon = Icons.Filled.Notifications, onClick = onOpenNotifications),
            ),
        ),
        SettingsMenuSection(
            title = "PLATFORM",
            items = listOf(
                SettingsMenuItem("Feedback & Support", icon = Icons.AutoMirrored.Filled.Message, onClick = onOpenFeedbackSupport),
                SettingsMenuItem("Partnership Inquiry", icon = Icons.Filled.Storefront, onClick = onOpenPartnershipInquiry),
                SettingsMenuItem("Privacy & Safety", icon = Icons.Filled.Security, onClick = onOpenPrivacySafety),
            ),
        ),
        SettingsMenuSection(
            title = "OTHERS",
            items = listOf(
                SettingsMenuItem("About Us", icon = Icons.Filled.Info, onClick = onOpenAboutUs),
            ),
        ),
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Settings", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 24.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                sections.forEach { section ->
                    item {
                        Text(
                            text = section.title,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Black,
                                fontSize = 10.sp,
                                letterSpacing = 2.sp,
                            ),
                            color = Color.White.copy(alpha = 0.42f),
                            modifier = Modifier.padding(start = 2.dp),
                        )
                    }
                    item {
                        Card(
                            shape = RoundedCornerShape(SettingsCardCorner),
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SettingsCardBackground.copy(alpha = 0.94f)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                        ) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                section.items.forEachIndexed { index, item ->
                                    SettingsMenuRow(item = item)
                                    if (index < section.items.lastIndex) {
                                        HorizontalDivider(
                                            color = Color.White.copy(alpha = 0.10f),
                                            modifier = Modifier.padding(horizontal = 14.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Button(
                        onClick = { showLogoutConfirm = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SettingsCardBackground.copy(alpha = 0.94f),
                            contentColor = Color(0xFFFF7A7A).copy(alpha = 0.86f),
                        ),
                        shape = RoundedCornerShape(SettingsCardCorner),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                                contentDescription = null,
                                modifier = Modifier.size(17.dp),
                            )
                            Text(
                                text = "Logout",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                ),
                            )
                        }
                    }
                }

                item {
                    Text(
                        text = "Figma Make Beauty Platform • ${BuildConfig.VERSION_NAME}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.22f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp),
                    )
                }
            }
        }

        if (showLogoutConfirm) {
            AlertDialog(
                onDismissRequest = { showLogoutConfirm = false },
                containerColor = SettingsCardBackground,
                titleContentColor = SettingsPrimaryText,
                textContentColor = SettingsSecondaryText,
                title = { Text("Log out?") },
                text = { Text("You will need to sign in again.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showLogoutConfirm = false
                            sessionViewModel.logout()
                        },
                    ) {
                        Text("Log out", color = Color(0xFFFF8A8A))
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutConfirm = false }) {
                        Text("Cancel", color = SettingsGold)
                    }
                },
            )
        }
    }
}

@Composable
private fun SettingsTopBar(
    title: String,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Black,
                        Color.Black.copy(alpha = 0.96f),
                    ),
                ),
            ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = SettingsPagePadding, end = SettingsPagePadding, top = 4.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(38.dp)
                    .background(Color.White.copy(alpha = 0.07f), CircleShape),
            ) {
                Icon(
                    imageVector = Icons.Filled.ChevronLeft,
                    contentDescription = "Back",
                    tint = SettingsPrimaryText,
                    modifier = Modifier.size(16.dp),
                )
            }

            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = SettingsPrimaryText,
                    maxLines = 1,
                )
            }

            Spacer(modifier = Modifier.size(38.dp))
        }

        HorizontalDivider(
            color = Color.White.copy(alpha = 0.08f),
            thickness = 1.dp,
        )
    }
}

@Composable
private fun SettingsMenuRow(item: SettingsMenuItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = item.onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.68f),
                modifier = Modifier.size(18.dp),
            )
        }

        Text(
            text = item.title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Medium),
            color = SettingsPrimaryText,
            modifier = Modifier.weight(1f),
        )

        item.badge?.takeIf { it.isNotBlank() }?.let { badge ->
            Text(
                text = badge,
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = SettingsGold,
                modifier = Modifier
                    .background(SettingsGold.copy(alpha = 0.12f), CircleShape)
                    .border(1.dp, SettingsGold.copy(alpha = 0.26f), CircleShape)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }

        Icon(
            imageVector = Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.30f),
            modifier = Modifier.size(14.dp),
        )
    }
}

@Composable
fun ProfileSettingsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    profileSettingsViewModel: ProfileSettingsViewModel = viewModel(),
) {
    val context = LocalContext.current
    val bearerToken = sessionViewModel.accessTokenOrNull()
    var selectedAvatarUri by remember { mutableStateOf<Uri?>(null) }
    var showGenderPicker by remember { mutableStateOf(false) }
    val pickAvatarLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        selectedAvatarUri = uri
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
        if (bearerToken != null) profileSettingsViewModel.loadIfNeeded(bearerToken)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Profile Settings", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 24.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    SettingsDescription("Keep your profile details up to date.")
                }
                item {
                    SettingsMessageBanner(
                        error = profileSettingsViewModel.errorMessage,
                        message = profileSettingsViewModel.actionMessage,
                    )
                }
                item {
                    SettingsStaticCard {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(
                            modifier = Modifier.size(128.dp),
                            contentAlignment = Alignment.BottomEnd,
                        ) {
                            val avatarModel: Any? = selectedAvatarUri ?: profileSettingsViewModel.avatarURL?.takeIf { it.isNotBlank() }
                            if (avatarModel != null) {
                                AsyncImage(
                                    model = avatarModel,
                                    contentDescription = "Avatar",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .matchParentSize()
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.06f))
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), CircleShape),
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .matchParentSize()
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.06f))
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    AuthLogoAvatar(modifier = Modifier.matchParentSize())
                                }
                            }

                            Button(
                                onClick = { pickAvatarLauncher.launch("image/*") },
                                enabled = !profileSettingsViewModel.isUploadingAvatar,
                                modifier = Modifier.size(36.dp),
                                shape = CircleShape,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = SettingsGold,
                                    contentColor = Color.Black,
                                    disabledContainerColor = SettingsGold.copy(alpha = 0.45f),
                                    disabledContentColor = Color.Black.copy(alpha = 0.5f),
                                ),
                                contentPadding = PaddingValues(0.dp),
                            ) {
                                if (profileSettingsViewModel.isUploadingAvatar) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(15.dp),
                                        strokeWidth = 2.dp,
                                        color = Color.Black,
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Filled.Edit,
                                        contentDescription = "Change avatar",
                                        modifier = Modifier.size(14.dp),
                                    )
                                }
                            }
                        }

                        Text(
                            text = if (profileSettingsViewModel.isUploadingAvatar) {
                                "Uploading avatar..."
                            } else {
                                "Tap icon to change avatar"
                            },
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                            color = Color.White.copy(alpha = 0.55f),
                        )
                    }

                    SettingsStaticInfo(label = "Username", value = profileSettingsViewModel.username)
                    SettingsFieldLabel("Full Name")
                    OutlinedTextField(
                        value = profileSettingsViewModel.fullName,
                        onValueChange = { profileSettingsViewModel.fullName = it },
                        placeholder = { Text("Enter full name", color = Color.White.copy(alpha = 0.34f)) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = settingsFieldColors(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                    )
                    SettingsStaticInfo(label = "Phone Number", value = profileSettingsViewModel.phone)

                    if (profileSettingsViewModel.canEditGender) {
                        SettingsFieldLabel("Gender")
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SettingsCardBackground, RoundedCornerShape(12.dp))
                                .border(1.dp, Color.White.copy(alpha = 0.16f), RoundedCornerShape(12.dp))
                                .clickable { showGenderPicker = true }
                                .padding(horizontal = 14.dp, vertical = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            val genderValue = profileSettingsViewModel.gender
                                .replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                                .ifBlank { "Select gender" }
                            Text(
                                text = genderValue,
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (profileSettingsViewModel.gender.isBlank()) {
                                    Color.White.copy(alpha = 0.34f)
                                } else {
                                    SettingsPrimaryText
                                },
                            )
                            Icon(
                                imageVector = Icons.Filled.ChevronRight,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.30f),
                                modifier = Modifier.size(16.dp),
                            )
                        }
                    } else {
                        SettingsStaticInfo(
                            label = "Gender",
                            value = profileSettingsViewModel.gender
                                .replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                                .ifBlank { "-" },
                        )
                    }

                    if (profileSettingsViewModel.canEditBirthday) {
                        SettingsFieldLabel("Date of Birth")
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SettingsCardBackground, RoundedCornerShape(12.dp))
                                .border(1.dp, Color.White.copy(alpha = 0.16f), RoundedCornerShape(12.dp))
                                .clickable {
                                    showSettingsDatePickerDialog(
                                        context = context,
                                        initial = profileSettingsViewModel.birthday,
                                        onSelected = { date ->
                                            profileSettingsViewModel.birthday = date
                                        },
                                    )
                                }
                                .padding(horizontal = 14.dp, vertical = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = profileSettingsViewModel.birthday.toString(),
                                style = MaterialTheme.typography.bodyLarge,
                                color = SettingsPrimaryText,
                            )
                            Icon(
                                imageVector = Icons.Filled.ChevronRight,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.30f),
                                modifier = Modifier.size(16.dp),
                            )
                        }
                    } else {
                        SettingsStaticInfo(label = "Date of Birth", value = profileSettingsViewModel.birthdayDisplay)
                    }

                    if (showGenderPicker) {
                        AlertDialog(
                            onDismissRequest = { showGenderPicker = false },
                            containerColor = SettingsCardBackground,
                            titleContentColor = SettingsPrimaryText,
                            textContentColor = SettingsSecondaryText,
                            title = {
                                Text(
                                    text = "Select Gender",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                )
                            },
                            text = {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf("male", "female", "other").forEach { option ->
                                        TextButton(
                                            onClick = {
                                                profileSettingsViewModel.gender = option
                                                showGenderPicker = false
                                            },
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Text(
                                                text = option.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() },
                                                color = SettingsPrimaryText,
                                            )
                                        }
                                    }
                                }
                            },
                            confirmButton = {
                                TextButton(onClick = { showGenderPicker = false }) {
                                    Text("Close", color = SettingsGold)
                                }
                            },
                        )
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SettingsGold,
                            contentColor = Color.Black,
                            disabledContainerColor = SettingsGold.copy(alpha = 0.45f),
                            disabledContentColor = Color.Black.copy(alpha = 0.50f),
                        ),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (profileSettingsViewModel.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.Black,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = if (profileSettingsViewModel.isSaving) "Saving..." else "Save Changes",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        )
                    }
                }
                }
            }
        }

        if (profileSettingsViewModel.isLoading) {
            SettingsLoadingOverlay("Loading profile...")
        }
    }
}

@Composable
fun ChangePasswordScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    changePasswordViewModel: ChangePasswordViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Change Password", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 24.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    SettingsDescription("Use at least 8 characters and keep your account secure.")
                }
                item {
                    SettingsMessageBanner(
                        error = changePasswordViewModel.errorMessage,
                        message = changePasswordViewModel.actionMessage,
                    )
                }
                item {
                    SettingsStaticCard {
                    SettingsInfoCard(
                        title = "PASSWORD REQUIREMENTS",
                        bullets = listOf(
                            "At least 8 characters long",
                            "Different from your current password",
                        ),
                    )

                    SettingsFieldLabel("Current Password")
                    OutlinedTextField(
                        value = changePasswordViewModel.currentPassword,
                        onValueChange = { changePasswordViewModel.currentPassword = it },
                        placeholder = { Text("Enter current password", color = Color.White.copy(alpha = 0.34f)) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        colors = settingsFieldColors(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                    )

                    SettingsFieldLabel("New Password")
                    OutlinedTextField(
                        value = changePasswordViewModel.newPassword,
                        onValueChange = { changePasswordViewModel.newPassword = it },
                        placeholder = { Text("Enter new password", color = Color.White.copy(alpha = 0.34f)) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        colors = settingsFieldColors(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                    )

                    SettingsFieldLabel("Confirm Password")
                    OutlinedTextField(
                        value = changePasswordViewModel.confirmPassword,
                        onValueChange = { changePasswordViewModel.confirmPassword = it },
                        placeholder = { Text("Confirm new password", color = Color.White.copy(alpha = 0.34f)) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        colors = settingsFieldColors(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                    )

                    Button(
                        onClick = {
                            if (bearerToken != null) {
                                changePasswordViewModel.save(bearerToken)
                            }
                        },
                        enabled = !changePasswordViewModel.isSaving,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SettingsGold,
                            contentColor = Color.Black,
                            disabledContainerColor = SettingsGold.copy(alpha = 0.45f),
                            disabledContentColor = Color.Black.copy(alpha = 0.50f),
                        ),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (changePasswordViewModel.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.Black,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = if (changePasswordViewModel.isSaving) "Updating..." else "Update Password",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        )
                    }
                }
                }
            }
        }
    }
}

@Composable
fun PhoneSettingsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
    phoneNumberSettingsViewModel: PhoneNumberSettingsViewModel = viewModel(),
) {
    val bearerToken = sessionViewModel.accessTokenOrNull()

    LaunchedEffect(bearerToken) {
        if (bearerToken != null) phoneNumberSettingsViewModel.loadIfNeeded(bearerToken)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Phone Number", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 24.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    SettingsDescription("Update your login phone with verification code and current password.")
                }
                item {
                    SettingsMessageBanner(
                        error = phoneNumberSettingsViewModel.errorMessage,
                        message = phoneNumberSettingsViewModel.actionMessage,
                    )
                }
                item {
                    SettingsStaticCard {
                    SettingsInfoCard(
                        title = "IMPORTANT",
                        bullets = listOf(
                            "You'll need to verify your new phone number",
                            "Your current password is required for security",
                            "This updates your login credentials",
                        ),
                    )

                    SettingsStaticInfo(label = "Current Phone", value = phoneNumberSettingsViewModel.currentPhone)
                    if (phoneNumberSettingsViewModel.isPhoneVerified) {
                        Text(
                            text = "Verified",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = Color(0xFF7DE39A),
                            modifier = Modifier
                                .background(Color(0xFF7DE39A).copy(alpha = 0.10f), CircleShape)
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }

                    SettingsFieldLabel("New Phone")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedTextField(
                            value = phoneNumberSettingsViewModel.newPhone,
                            onValueChange = { phoneNumberSettingsViewModel.newPhone = it },
                            placeholder = { Text("Enter new phone", color = Color.White.copy(alpha = 0.34f)) },
                            modifier = Modifier.weight(1f),
                            colors = settingsFieldColors(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        )
                        Button(
                            onClick = { phoneNumberSettingsViewModel.sendCode() },
                            enabled = !phoneNumberSettingsViewModel.isSendingCode && phoneNumberSettingsViewModel.countdown == 0,
                            modifier = Modifier
                                .width(92.dp)
                                .height(48.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (phoneNumberSettingsViewModel.isSendingCode || phoneNumberSettingsViewModel.countdown > 0) {
                                    SettingsGold.copy(alpha = 0.50f)
                                } else {
                                    SettingsGold
                                },
                                contentColor = Color.Black,
                            ),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(0.dp),
                        ) {
                            if (phoneNumberSettingsViewModel.isSendingCode) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    strokeWidth = 2.dp,
                                    color = Color.Black,
                                )
                            } else {
                                Text(
                                    text = if (phoneNumberSettingsViewModel.countdown > 0) {
                                        "${phoneNumberSettingsViewModel.countdown}s"
                                    } else {
                                        "Send"
                                    },
                                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                                )
                            }
                        }
                    }

                    SettingsFieldLabel("Verification Code")
                    OutlinedTextField(
                        value = phoneNumberSettingsViewModel.verificationCode,
                        onValueChange = {
                            phoneNumberSettingsViewModel.verificationCode = it.filter(Char::isDigit).take(6)
                        },
                        placeholder = { Text("Enter 6-digit code", color = Color.White.copy(alpha = 0.34f)) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = settingsFieldColors(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    )

                    SettingsFieldLabel("Current Password")
                    OutlinedTextField(
                        value = phoneNumberSettingsViewModel.currentPassword,
                        onValueChange = { phoneNumberSettingsViewModel.currentPassword = it },
                        placeholder = { Text("Enter current password", color = Color.White.copy(alpha = 0.34f)) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        colors = settingsFieldColors(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SettingsGold,
                            contentColor = Color.Black,
                            disabledContainerColor = SettingsGold.copy(alpha = 0.45f),
                            disabledContentColor = Color.Black.copy(alpha = 0.50f),
                        ),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (phoneNumberSettingsViewModel.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.Black,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = if (phoneNumberSettingsViewModel.isSaving) "Updating..." else "Update Phone Number",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        )
                    }
                }
                }
            }
        }
    }
}

@Composable
fun LanguageSettingsScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit = {},
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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Language", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 24.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    SettingsDescription("Choose your preferred app language.")
                }
                item {
                    SettingsMessageBanner(
                        error = languageSettingsViewModel.errorMessage,
                        message = languageSettingsViewModel.actionMessage,
                    )
                }

                item {
                    SettingsStaticCard {
                    options.forEachIndexed { index, (code, label) ->
                        val selected = languageSettingsViewModel.selectedLanguage == code
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { languageSettingsViewModel.selectedLanguage = code }
                                .heightIn(min = 58.dp)
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp),
                            ) {
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                    color = if (selected) SettingsGold else SettingsPrimaryText,
                                )
                                Text(
                                    text = languageSubtitle(code),
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                    ),
                                    color = Color.White.copy(alpha = 0.40f),
                                )
                            }
                            Icon(
                                imageVector = if (selected) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (selected) SettingsGold else Color.White.copy(alpha = 0.26f),
                                modifier = Modifier.size(18.dp),
                            )
                        }
                        if (index < options.lastIndex) {
                            HorizontalDivider(
                                color = Color.White.copy(alpha = 0.10f),
                                modifier = Modifier.padding(start = 14.dp),
                            )
                        }
                    }

                    Button(
                        onClick = {
                            if (bearerToken != null) languageSettingsViewModel.save(bearerToken)
                        },
                        enabled = !languageSettingsViewModel.isSaving,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .padding(top = 10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SettingsGold,
                            contentColor = Color.Black,
                            disabledContainerColor = SettingsGold.copy(alpha = 0.45f),
                            disabledContentColor = Color.Black.copy(alpha = 0.50f),
                        ),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (languageSettingsViewModel.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.Black,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = if (languageSettingsViewModel.isSaving) "Saving..." else "Save Language",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        )
                    }
                }
                }
            }
        }
    }
}

@Composable
private fun SettingsDescription(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodySmall.copy(
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            lineHeight = 16.sp,
        ),
        color = Color.White.copy(alpha = 0.50f),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun SettingsFieldLabel(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelSmall.copy(
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp,
        ),
        color = Color.White.copy(alpha = 0.46f),
    )
}

@Composable
private fun SettingsMessageBanner(
    error: String?,
    message: String?,
) {
    data class BannerState(
        val text: String,
        val isError: Boolean,
    )

    val state = when {
        !error.isNullOrBlank() -> BannerState(text = error, isError = true)
        !message.isNullOrBlank() -> BannerState(text = message, isError = false)
        else -> null
    }

    AnimatedContent(
        targetState = state,
        transitionSpec = {
            (
                fadeIn(
                    animationSpec = tween(
                        durationMillis = SettingsMotionDurationMs,
                        easing = FastOutSlowInEasing,
                    ),
                ) + expandVertically(
                    animationSpec = tween(
                        durationMillis = SettingsMotionDurationMs,
                        easing = FastOutSlowInEasing,
                    ),
                )
                ) togetherWith (
                fadeOut(
                    animationSpec = tween(
                        durationMillis = SettingsMotionDurationMs,
                        easing = FastOutSlowInEasing,
                    ),
                ) + shrinkVertically(
                    animationSpec = tween(
                        durationMillis = SettingsMotionDurationMs,
                        easing = FastOutSlowInEasing,
                    ),
                )
                )
        },
        label = "settings_message_banner",
    ) { banner ->
        if (banner != null) {
            val tone = if (banner.isError) Color.Red.copy(alpha = 0.92f) else Color(0xFF7FE3A0).copy(alpha = 0.92f)
            Text(
                text = banner.text,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(tone.copy(alpha = 0.08f), RoundedCornerShape(14.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = tone,
            )
        } else {
            Spacer(modifier = Modifier.height(0.dp))
        }
    }
}

@Composable
private fun SettingsInfoCard(
    title: String,
    bullets: List<String>,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF5CA9FF).copy(alpha = 0.08f), RoundedCornerShape(14.dp))
            .border(1.dp, Color(0xFF5CA9FF).copy(alpha = 0.20f), RoundedCornerShape(14.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            imageVector = Icons.Filled.Error,
            contentDescription = null,
            tint = Color(0xFF5CA9FF).copy(alpha = 0.90f),
            modifier = Modifier
                .size(17.dp)
                .padding(top = 2.dp),
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = Color.White.copy(alpha = 0.88f),
            )
            bullets.forEach { line ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        modifier = Modifier
                            .padding(top = 7.dp)
                            .size(4.dp)
                            .background(Color.White.copy(alpha = 0.42f), CircleShape),
                    )
                    Text(
                        text = line,
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        color = Color.White.copy(alpha = 0.60f),
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun settingsFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = SettingsPrimaryText,
    unfocusedTextColor = SettingsPrimaryText,
    disabledTextColor = SettingsPrimaryText.copy(alpha = 0.42f),
    focusedContainerColor = SettingsCardBackground,
    unfocusedContainerColor = SettingsCardBackground,
    disabledContainerColor = SettingsCardBackground,
    focusedBorderColor = SettingsGold.copy(alpha = 0.45f),
    unfocusedBorderColor = Color.White.copy(alpha = 0.16f),
    disabledBorderColor = Color.White.copy(alpha = 0.10f),
    cursorColor = SettingsGold,
)

@Composable
private fun SettingsLoadingOverlay(label: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.42f)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = SettingsCardBackground),
            border = androidx.compose.foundation.BorderStroke(1.dp, SettingsGold.copy(alpha = 0.30f)),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = SettingsGold,
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SettingsPrimaryText,
                )
            }
        }
    }
}

private fun languageSubtitle(code: String): String {
    return when (code) {
        "en" -> "English"
        "es" -> "Spanish"
        "zh" -> "Chinese"
        "ko" -> "Korean"
        "fr" -> "French"
        "vi" -> "Vietnamese"
        else -> "Language"
    }
}

private fun showSettingsDatePickerDialog(
    context: android.content.Context,
    initial: LocalDate,
    onSelected: (LocalDate) -> Unit,
) {
    DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            onSelected(LocalDate.of(year, month + 1, dayOfMonth))
        },
        initial.year,
        initial.monthValue - 1,
        initial.dayOfMonth,
    ).show()
}

@Composable
fun FeedbackSupportScreen(onBack: () -> Unit = {}) {
    val uriHandler = LocalUriHandler.current
    val supportContactViewModel: SupportContactViewModel = viewModel()
    val contactSettings = supportContactViewModel.contactSettings
    val channels = listOf(
        SupportChannel("WhatsApp Support", "Fastest response time", Icons.AutoMirrored.Filled.Message, Color(0xFF5EDB89), contactSettings.feedback_whatsapp_url),
        SupportChannel("iMessage", "Standard for iPhone users", Icons.AutoMirrored.Filled.Message, Color(0xFF79B5FF), contactSettings.feedback_imessage_url),
        SupportChannel("Instagram DM", "Follow us for nail inspo", Icons.Filled.Star, SettingsGold, contactSettings.feedback_instagram_url),
    )

    LaunchedEffect(Unit) {
        supportContactViewModel.loadIfNeeded()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Feedback & Support", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 20.dp,
                    bottom = 32.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    SettingsDescription("How can we help you today? Reach us through your preferred channel.")
                }

                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SettingsCardBackground.copy(alpha = 0.94f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            channels.forEachIndexed { index, channel ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { uriHandler.openUri(channel.uri) }
                                        .padding(horizontal = 14.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .background(channel.tint.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            imageVector = channel.icon,
                                            contentDescription = null,
                                            tint = channel.tint,
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                    Column(
                                        modifier = Modifier.weight(1f),
                                        verticalArrangement = Arrangement.spacedBy(2.dp),
                                    ) {
                                        Text(
                                            text = channel.title,
                                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                            color = SettingsPrimaryText,
                                        )
                                        Text(
                                            text = channel.subtitle,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.White.copy(alpha = 0.45f),
                                        )
                                    }
                                    Icon(
                                        imageVector = Icons.Filled.ChevronRight,
                                        contentDescription = null,
                                        tint = Color.White.copy(alpha = 0.30f),
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                                if (index < channels.lastIndex) {
                                    HorizontalDivider(
                                        color = Color.White.copy(alpha = 0.10f),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PartnershipInquiryScreen(onBack: () -> Unit = {}) {
    val uriHandler = LocalUriHandler.current
    val supportContactViewModel: SupportContactViewModel = viewModel()
    val contactSettings = supportContactViewModel.contactSettings
    val highlights = listOf(
        Triple(Icons.Filled.Storefront, "List Your Salon", "Get discovered by local beauty seekers"),
        Triple(Icons.Filled.Schedule, "Advanced Booking", "Manage appointments with ease"),
    )

    LaunchedEffect(Unit) {
        supportContactViewModel.loadIfNeeded()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Partner with Us", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 20.dp,
                    bottom = 32.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    SettingsDescription("Join our salon network and reach more customers.")
                }

                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SettingsCardBackground.copy(alpha = 0.94f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            highlights.forEachIndexed { index, feature ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .background(SettingsCardBackground, RoundedCornerShape(12.dp)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            imageVector = feature.first,
                                            contentDescription = null,
                                            tint = SettingsGold,
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                    Column(
                                        modifier = Modifier.weight(1f),
                                        verticalArrangement = Arrangement.spacedBy(2.dp),
                                    ) {
                                        Text(
                                            text = feature.second,
                                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                            color = SettingsPrimaryText,
                                        )
                                        Text(
                                            text = feature.third,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.White.copy(alpha = 0.45f),
                                        )
                                    }
                                }
                                if (index < highlights.lastIndex) {
                                    HorizontalDivider(
                                        color = Color.White.copy(alpha = 0.10f),
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SettingsCardBackground.copy(alpha = 0.94f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(
                                text = "Contact our Partnership Team",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 2.sp,
                                ),
                                color = Color.White.copy(alpha = 0.42f),
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp),
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Button(
                                    onClick = { uriHandler.openUri(contactSettings.partnership_whatsapp_url) },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(92.dp),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = SettingsCardBackground.copy(alpha = 0.85f),
                                        contentColor = SettingsPrimaryText,
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Filled.Message,
                                            contentDescription = null,
                                            tint = Color(0xFF5EDB89),
                                            modifier = Modifier.size(22.dp),
                                        )
                                        Text("WhatsApp", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold))
                                    }
                                }
                                Button(
                                    onClick = { uriHandler.openUri(contactSettings.partnership_imessage_url) },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(92.dp),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = SettingsCardBackground.copy(alpha = 0.85f),
                                        contentColor = SettingsPrimaryText,
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Filled.Message,
                                            contentDescription = null,
                                            tint = Color(0xFF79B5FF),
                                            modifier = Modifier.size(22.dp),
                                        )
                                        Text("iMessage", style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PrivacySafetyScreen(onBack: () -> Unit = {}) {
    val bullets = listOf(
        "We never sell your personal information.",
        "You can request data deletion by contacting support.",
        "Booking details are shared only with your selected salon.",
        "Sensitive data is encrypted in transit.",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "Privacy & Safety", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 20.dp,
                    bottom = 32.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    SettingsStaticCard {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Security,
                                contentDescription = null,
                                tint = SettingsGold,
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                text = "Your Data, Your Control",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                ),
                                color = SettingsPrimaryText,
                            )
                        }
                        Text(
                            text = "We only collect the information needed to manage bookings and improve your service experience.",
                            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                            color = Color.White.copy(alpha = 0.55f),
                        )
                    }
                }

                item {
                    SettingsStaticCard {
                        bullets.forEach { line ->
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.Top,
                            ) {
                                Text(
                                    text = "•",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                    color = SettingsGold,
                                    modifier = Modifier.padding(top = 1.dp),
                                )
                                Text(
                                    text = line,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                                    color = Color.White.copy(alpha = 0.62f),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AboutUsScreen(onBack: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SettingsBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            SettingsTopBar(title = "About Us", onBack = onBack)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = SettingsPagePadding,
                    end = SettingsPagePadding,
                    top = 20.dp,
                    bottom = 32.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    SettingsStaticCard {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.AutoAwesome,
                                contentDescription = null,
                                tint = SettingsGold,
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                text = "NailsDash",
                                style = MaterialTheme.typography.headlineSmall.copy(
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                ),
                                color = SettingsPrimaryText,
                            )
                        }
                        Text(
                            text = "NailsDash connects customers with top-rated nail salons. Discover styles, book appointments, and unlock exclusive deals in one place.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.55f),
                        )
                    }
                }

                item {
                    SettingsStaticCard {
                        SettingsStaticInfo(label = "Version", value = "v${BuildConfig.VERSION_NAME}")
                        SettingsStaticInfo(label = "Market", value = "United States")
                    }
                }
            }
        }
    }
}

private data class SupportChannel(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val tint: Color,
    val uri: String,
)

@Composable
private fun SettingsStaticCard(
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SettingsCardBackground.copy(alpha = 0.94f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.10f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}

@Composable
private fun SettingsStaticInfo(
    label: String,
    value: String,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            ),
            color = Color.White.copy(alpha = 0.46f),
        )
        Text(
            text = value.ifBlank { "-" },
            style = MaterialTheme.typography.titleMedium.copy(
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            color = SettingsPrimaryText,
        )
    }
}
