package com.nailsdash.android.ui.screen

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import com.nailsdash.android.data.model.VerificationPurpose
import com.nailsdash.android.ui.state.AppSessionViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(sessionViewModel: AppSessionViewModel) {
    var showRegister by rememberSaveable { mutableStateOf(false) }
    AnimatedContent(targetState = showRegister, label = "auth_screen_switch") { openRegister ->
        if (openRegister) {
            RegisterScreen(
                sessionViewModel = sessionViewModel,
                onBack = { showRegister = false },
            )
        } else {
            SignInScreen(
                sessionViewModel = sessionViewModel,
                onOpenRegister = { showRegister = true },
            )
        }
    }
}

@Composable
private fun SignInScreen(
    sessionViewModel: AppSessionViewModel,
    onOpenRegister: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var phone by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var verificationCode by rememberSaveable { mutableStateOf("") }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    var useVerificationCode by rememberSaveable { mutableStateOf(false) }
    var countdown by rememberSaveable { mutableIntStateOf(0) }
    var isSendingCode by rememberSaveable { mutableStateOf(false) }
    var localError by rememberSaveable { mutableStateOf<String?>(null) }
    var noticeMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val activeMessage = localError?.takeIf { it.isNotBlank() }
        ?: sessionViewModel.authMessage?.takeIf { it.isNotBlank() }

    LaunchedEffect(activeMessage) {
        val message = activeMessage?.trim()
        if (!message.isNullOrEmpty()) {
            noticeMessage = message
        }
    }

    LaunchedEffect(countdown) {
        if (countdown > 0) {
            delay(1_000)
            countdown -= 1
        }
    }

    AuthBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            AuthLogoBlock(
                title = "Welcome Back",
                subtitle = "Log in to book and manage appointments",
            )
            Spacer(modifier = Modifier.height(20.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.05f))
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                    .padding(4.dp),
            ) {
                AuthMethodButton(
                    title = "Password",
                    selected = !useVerificationCode,
                    onClick = {
                        useVerificationCode = false
                        localError = null
                    },
                    modifier = Modifier.weight(1f),
                )
                AuthMethodButton(
                    title = "SMS Code",
                    selected = useVerificationCode,
                    onClick = {
                        useVerificationCode = true
                        localError = null
                    },
                    modifier = Modifier.weight(1f),
                )
            }

            if (activeMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                AuthErrorBanner(message = activeMessage)
            }

            Spacer(modifier = Modifier.height(14.dp))
            AuthFieldLabel("US Phone Number")
            TextField(
                value = phone,
                onValueChange = { phone = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .authTextFieldFrame(),
                placeholder = { Text("e.g. 4151234567") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                colors = authTextFieldColors(),
            )
            AuthHint("US numbers only (10 digits or 1+10)")

            Spacer(modifier = Modifier.height(12.dp))
            AnimatedContent(
                targetState = useVerificationCode,
                label = "sign_in_method",
            ) { usingCode ->
                if (usingCode) {
                    Column {
                        AuthFieldLabel("Verification Code")
                        Row(modifier = Modifier.fillMaxWidth()) {
                            TextField(
                                value = verificationCode,
                                onValueChange = { input ->
                                    verificationCode = input.filter(Char::isDigit).take(6)
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .authTextFieldFrame(),
                                placeholder = { Text("6-digit code") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                colors = authTextFieldColors(),
                            )
                            Spacer(modifier = Modifier.size(8.dp))
                            Button(
                                onClick = {
                                    scope.launch {
                                        localError = null
                                        sessionViewModel.updateAuthMessage(null)
                                        if (!isValidUSPhone(phone)) {
                                            localError = "Enter a valid US phone number."
                                            return@launch
                                        }
                                        isSendingCode = true
                                        val result = sessionViewModel.sendVerificationCode(
                                            phone = phone,
                                            purpose = VerificationPurpose.login,
                                        )
                                        isSendingCode = false
                                        result.onSuccess {
                                            countdown = 60
                                        }.onFailure { error ->
                                            localError = error.message ?: "Failed to send verification code."
                                        }
                                    }
                                },
                                enabled = countdown == 0 && !isSendingCode,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (countdown > 0 || isSendingCode) {
                                        Color.White.copy(alpha = 0.2f)
                                    } else {
                                        AuthGold
                                    },
                                    contentColor = Color.Black,
                                ),
                                border = androidx.compose.foundation.BorderStroke(
                                    width = 1.dp,
                                    color = if (countdown > 0 || isSendingCode) {
                                        Color.White.copy(alpha = 0.2f)
                                    } else {
                                        AuthGold.copy(alpha = 0.45f)
                                    },
                                ),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                modifier = Modifier.height(50.dp),
                            ) {
                                Text(
                                    text = if (countdown > 0) "${countdown}s" else "Send Code",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                        AuthHint("SMS login is currently unavailable. Use password login.")
                    }
                } else {
                    Column {
                        AuthFieldLabel("Password")
                        Row(modifier = Modifier.fillMaxWidth()) {
                            TextField(
                                value = password,
                                onValueChange = { password = it },
                                modifier = Modifier
                                    .weight(1f)
                                    .authTextFieldFrame(),
                                placeholder = { Text("Enter your password") },
                                visualTransformation = if (showPassword) {
                                    VisualTransformation.None
                                } else {
                                    PasswordVisualTransformation()
                                },
                                singleLine = true,
                                colors = authTextFieldColors(),
                            )
                            Spacer(modifier = Modifier.size(8.dp))
                            TextButton(
                                onClick = { showPassword = !showPassword },
                                modifier = Modifier
                                    .height(50.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color.White.copy(alpha = 0.06f))
                                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            ) {
                                Text(
                                    text = if (showPassword) "Hide" else "Show",
                                    color = AuthGold,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
            Button(
                onClick = {
                    localError = null
                    sessionViewModel.updateAuthMessage(null)
                    if (!isValidUSPhone(phone)) {
                        localError = "Enter a valid US phone number."
                        return@Button
                    }
                    if (useVerificationCode) {
                        localError = "SMS login is not available yet. Please use password login."
                        return@Button
                    }
                    sessionViewModel.login(phone = phone, password = password)
                },
                enabled = !sessionViewModel.isLoadingAuth &&
                    phone.trim().isNotEmpty() &&
                    if (useVerificationCode) verificationCode.length == 6 else password.isNotBlank(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = AuthGold,
                    contentColor = Color.Black,
                    disabledContainerColor = Color.White.copy(alpha = 0.18f),
                    disabledContentColor = Color.Black.copy(alpha = 0.65f),
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                Row {
                    if (sessionViewModel.isLoadingAuth) {
                        CircularProgressIndicator(
                            color = Color.Black,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.size(8.dp))
                    }
                    Text(
                        text = if (sessionViewModel.isLoadingAuth) "Signing in..." else "Sign In",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Don't have an account?",
                    color = Color.White.copy(alpha = 0.66f),
                    fontSize = 14.sp,
                )
                Spacer(modifier = Modifier.width(5.dp))
                TextButton(
                    onClick = onOpenRegister,
                    contentPadding = PaddingValues(0.dp),
                    colors = ButtonDefaults.textButtonColors(contentColor = AuthGold),
                ) {
                    Text(
                        text = "Sign Up",
                        color = AuthGold,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Admin/store accounts must use admin portal",
                color = Color.White.copy(alpha = 0.52f),
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    noticeMessage?.let { message ->
        AuthNoticeDialog(
            message = message,
            onDismiss = { noticeMessage = null },
        )
    }
}

@Composable
private fun RegisterScreen(
    sessionViewModel: AppSessionViewModel,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var step by rememberSaveable { mutableIntStateOf(0) }
    var phone by rememberSaveable { mutableStateOf("") }
    var verificationCode by rememberSaveable { mutableStateOf("") }
    var username by rememberSaveable { mutableStateOf("") }
    var fullName by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var showConfirmPassword by rememberSaveable { mutableStateOf(false) }
    var referralCode by rememberSaveable { mutableStateOf("") }
    var countdown by rememberSaveable { mutableIntStateOf(0) }
    var isSendingCode by rememberSaveable { mutableStateOf(false) }
    var isVerifyingCode by rememberSaveable { mutableStateOf(false) }
    var localError by rememberSaveable { mutableStateOf<String?>(null) }
    var noticeMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val activeMessage = localError?.takeIf { it.isNotBlank() }
        ?: sessionViewModel.authMessage?.takeIf { it.isNotBlank() }
    val isCompleteProfile = step == 1

    LaunchedEffect(activeMessage) {
        val message = activeMessage?.trim()
        if (!message.isNullOrEmpty()) {
            noticeMessage = message
        }
    }

    LaunchedEffect(countdown) {
        if (countdown > 0) {
            delay(1_000)
            countdown -= 1
        }
    }

    AuthBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                TextButton(
                    onClick = {
                        localError = null
                        sessionViewModel.updateAuthMessage(null)
                        if (isCompleteProfile) {
                            step = 0
                        } else {
                            onBack()
                        }
                    },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.08f)),
                    colors = ButtonDefaults.textButtonColors(contentColor = Color.White),
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "Sign Up",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 10.dp),
                )
                Spacer(modifier = Modifier.weight(1f))
                Spacer(modifier = Modifier.size(40.dp))
            }

            Spacer(modifier = Modifier.height(10.dp))
            AuthLogoBlock(
                title = "Create Your Account",
                subtitle = if (isCompleteProfile) "Complete your profile" else "Verify your phone number",
            )
            Spacer(modifier = Modifier.height(14.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                ProgressBubble(number = "1", active = true)
                Spacer(modifier = Modifier.size(10.dp))
                Box(
                    modifier = Modifier
                        .width(56.dp)
                        .height(3.dp)
                        .padding(top = 13.dp),
                ) {
                    LinearProgressIndicator(
                        progress = { 1f },
                        color = Color.White.copy(alpha = 0.18f),
                        trackColor = Color.White.copy(alpha = 0.18f),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (isCompleteProfile) {
                        LinearProgressIndicator(
                            progress = { 1f },
                            color = AuthGold,
                            trackColor = Color.Transparent,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                Spacer(modifier = Modifier.size(10.dp))
                ProgressBubble(number = "2", active = isCompleteProfile)
            }

            if (activeMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                AuthErrorBanner(message = activeMessage)
            }

            Spacer(modifier = Modifier.height(14.dp))
            AnimatedContent(
                targetState = isCompleteProfile,
                label = "register_step",
            ) { completeProfile ->
                if (!completeProfile) {
                AuthFieldLabel("US Phone Number")
                TextField(
                    value = phone,
                    onValueChange = { phone = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .authTextFieldFrame(),
                    placeholder = { Text("e.g. 4151234567") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = authTextFieldColors(),
                )
                AuthHint("US numbers only (10 digits or 1+10)")

                Spacer(modifier = Modifier.height(12.dp))
                AuthFieldLabel("Verification Code")
                Row(modifier = Modifier.fillMaxWidth()) {
                    TextField(
                        value = verificationCode,
                        onValueChange = { input ->
                            verificationCode = input.filter(Char::isDigit).take(6)
                        },
                        modifier = Modifier
                            .weight(1f)
                            .authTextFieldFrame(),
                        placeholder = { Text("6-digit code") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = authTextFieldColors(),
                    )
                    Spacer(modifier = Modifier.size(8.dp))
                            Button(
                                onClick = {
                            scope.launch {
                                localError = null
                                sessionViewModel.updateAuthMessage(null)
                                if (!isValidUSPhone(phone)) {
                                    localError = "Enter a valid US phone number."
                                    return@launch
                                }
                                isSendingCode = true
                                val result = sessionViewModel.sendVerificationCode(
                                    phone = phone,
                                    purpose = VerificationPurpose.register,
                                )
                                isSendingCode = false
                                result.onSuccess {
                                    countdown = 60
                                }.onFailure { error ->
                                    localError = error.message ?: "Failed to send verification code."
                                }
                            }
                        },
                        enabled = countdown == 0 && !isSendingCode,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (countdown > 0 || isSendingCode) {
                                Color.White.copy(alpha = 0.2f)
                            } else {
                                AuthGold
                            },
                            contentColor = Color.Black,
                                ),
                                border = androidx.compose.foundation.BorderStroke(
                                    width = 1.dp,
                                    color = if (countdown > 0 || isSendingCode) {
                                        Color.White.copy(alpha = 0.2f)
                                    } else {
                                        AuthGold.copy(alpha = 0.45f)
                                    },
                                ),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                modifier = Modifier.height(50.dp),
                            ) {
                        Text(
                            text = if (countdown > 0) "${countdown}s" else "Send Code",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))
                Button(
                    onClick = {
                        scope.launch {
                            localError = null
                            sessionViewModel.updateAuthMessage(null)
                            if (!isValidUSPhone(phone)) {
                                localError = "Enter a valid US phone number."
                                return@launch
                            }
                            if (verificationCode.length != 6) {
                                localError = "Please enter a valid 6-digit verification code."
                                return@launch
                            }

                            isVerifyingCode = true
                            val result = sessionViewModel.verifyCode(
                                phone = phone,
                                code = verificationCode,
                                purpose = VerificationPurpose.register,
                            )
                            isVerifyingCode = false
                            result.onSuccess { response ->
                                if (response.valid) {
                                    step = 1
                                } else {
                                    localError = "The verification code is invalid or expired. Please request a new code."
                                }
                            }.onFailure { error ->
                                localError = error.message ?: "Verification failed."
                            }
                        }
                    },
                    enabled = !isVerifyingCode && phone.trim().isNotEmpty() && verificationCode.length == 6,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AuthGold,
                        contentColor = Color.Black,
                        disabledContainerColor = Color.White.copy(alpha = 0.18f),
                        disabledContentColor = Color.Black.copy(alpha = 0.65f),
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    Row {
                        if (isVerifyingCode) {
                            CircularProgressIndicator(
                                color = Color.Black,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(modifier = Modifier.size(8.dp))
                        }
                        Text(
                            text = if (isVerifyingCode) "Verifying..." else "Next",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            } else {
                AuthLabeledInput(title = "Username *", hint = "Shown on reviews and your profile") {
                    TextField(
                        value = username,
                        onValueChange = { username = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .authTextFieldFrame(),
                        placeholder = { Text("At least 3 characters") },
                        singleLine = true,
                        colors = authTextFieldColors(),
                    )
                }
                AuthLabeledInput(title = "Full Name", hint = null) {
                    TextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .authTextFieldFrame(),
                        placeholder = { Text("Optional") },
                        singleLine = true,
                        colors = authTextFieldColors(),
                    )
                }
                AuthLabeledInput(title = "Password *", hint = "At least 8 characters") {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        TextField(
                            value = password,
                            onValueChange = { password = it },
                            modifier = Modifier
                                .weight(1f)
                                .authTextFieldFrame(),
                            placeholder = { Text("At least 8 characters") },
                            visualTransformation = if (showPassword) {
                                VisualTransformation.None
                            } else {
                                PasswordVisualTransformation()
                            },
                            singleLine = true,
                            colors = authTextFieldColors(),
                        )
                        Spacer(modifier = Modifier.size(8.dp))
                                TextButton(
                                    onClick = { showPassword = !showPassword },
                                    modifier = Modifier
                                        .height(50.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.White.copy(alpha = 0.06f))
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                                ) {
                            Text(
                                text = if (showPassword) "Hide" else "Show",
                                color = AuthGold,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                AuthLabeledInput(title = "Confirm Password *", hint = null) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        TextField(
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            modifier = Modifier
                                .weight(1f)
                                .authTextFieldFrame(),
                            placeholder = { Text("Re-enter your password") },
                            visualTransformation = if (showConfirmPassword) {
                                VisualTransformation.None
                            } else {
                                PasswordVisualTransformation()
                            },
                            singleLine = true,
                            colors = authTextFieldColors(),
                        )
                        Spacer(modifier = Modifier.size(8.dp))
                                TextButton(
                                    onClick = { showConfirmPassword = !showConfirmPassword },
                                    modifier = Modifier
                                        .height(50.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.White.copy(alpha = 0.06f))
                                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                                ) {
                            Text(
                                text = if (showConfirmPassword) "Hide" else "Show",
                                color = AuthGold,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                AuthLabeledInput(title = "Referral Code", hint = "Optional") {
                    TextField(
                        value = referralCode,
                        onValueChange = { referralCode = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .authTextFieldFrame(),
                        placeholder = { Text("Optional referral code") },
                        singleLine = true,
                        colors = authTextFieldColors(),
                    )
                }

                Button(
                    onClick = {
                        localError = null
                        sessionViewModel.updateAuthMessage(null)
                        if (!isValidUSPhone(phone)) {
                            localError = "Enter a valid US phone number."
                            return@Button
                        }
                        if (verificationCode.length != 6) {
                            localError = "Please enter a valid 6-digit verification code."
                            return@Button
                        }

                        val trimmedUsername = username.trim()
                        if (trimmedUsername.length < 3) {
                            localError = "Username must be at least 3 characters."
                            return@Button
                        }
                        if (password.length < 8) {
                            localError = "Password must be at least 8 characters."
                            return@Button
                        }
                        if (password != confirmPassword) {
                            localError = "Passwords do not match."
                            return@Button
                        }

                        sessionViewModel.register(
                            phone = phone,
                            verificationCode = verificationCode,
                            username = trimmedUsername,
                            password = password,
                            fullName = fullName,
                            referralCode = referralCode,
                        )
                    },
                    enabled = !sessionViewModel.isLoadingAuth &&
                        username.trim().isNotEmpty() &&
                        password.isNotBlank() &&
                        confirmPassword.isNotBlank(),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AuthGold,
                        contentColor = Color.Black,
                        disabledContainerColor = Color.White.copy(alpha = 0.18f),
                        disabledContentColor = Color.Black.copy(alpha = 0.65f),
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    Row {
                        if (sessionViewModel.isLoadingAuth) {
                            CircularProgressIndicator(
                                color = Color.Black,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(modifier = Modifier.size(8.dp))
                        }
                        Text(
                            text = if (sessionViewModel.isLoadingAuth) "Creating..." else "Create Account",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    noticeMessage?.let { message ->
        AuthNoticeDialog(
            message = message,
            onDismiss = { noticeMessage = null },
        )
    }
}

@Composable
private fun AuthBackground(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF3A2A12),
                        Color.Black,
                        Color.Black,
                    ),
                ),
            ),
    ) {
        content()
    }
}

@Composable
private fun AuthLogoBlock(title: String, subtitle: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Spacer(modifier = Modifier.weight(1f))
            Column {
                Column(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(AuthGold, Color(0xFFB08D2D)),
                            ),
                        ),
                ) {
                    Spacer(modifier = Modifier.weight(1f))
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Spa,
                            contentDescription = "NailsDash",
                            tint = Color.Black,
                            modifier = Modifier.size(34.dp),
                        )
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = title,
            color = Color.White,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = subtitle,
            color = Color.White.copy(alpha = 0.62f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun AuthMethodButton(
    title: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(42.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) AuthGold else Color.Transparent,
            contentColor = if (selected) Color.Black else Color.White.copy(alpha = 0.88f),
        ),
    ) {
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun AuthErrorBanner(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Red.copy(alpha = 0.14f))
            .border(1.dp, Color.Red.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(
            imageVector = Icons.Filled.Warning,
            contentDescription = null,
            tint = Color.Red,
            modifier = Modifier
                .size(12.dp)
                .padding(top = 2.dp),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = message,
            fontSize = 13.sp,
            color = Color(0xFFFFDCDC),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun AuthNoticeDialog(
    message: String,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = {},
        containerColor = Color(0xFF141414),
        titleContentColor = Color.White,
        textContentColor = Color.White.copy(alpha = 0.86f),
        title = { Text(text = "Notice") },
        text = { Text(text = message) },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(text = "OK", color = AuthGold, fontWeight = FontWeight.SemiBold)
            }
        },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
        ),
    )
}

@Composable
private fun ProgressBubble(number: String, active: Boolean) {
    Column(
        modifier = Modifier
            .size(30.dp)
            .clip(CircleShape)
            .background(if (active) AuthGold else Color.White.copy(alpha = 0.08f)),
    ) {
        Spacer(modifier = Modifier.weight(1f))
        Text(
            text = number,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            color = if (active) Color.Black else Color.White.copy(alpha = 0.66f),
            fontWeight = FontWeight.Bold,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun AuthLabeledInput(
    title: String,
    hint: String?,
    content: @Composable () -> Unit,
) {
    AuthFieldLabel(title)
    content()
    if (hint != null) {
        AuthHint(hint)
    }
}

@Composable
private fun AuthFieldLabel(title: String) {
    Text(
        text = title,
        color = Color.White.copy(alpha = 0.85f),
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
private fun AuthHint(text: String) {
    Text(
        text = text,
        color = Color.White.copy(alpha = 0.52f),
        fontSize = 11.sp,
        modifier = Modifier.padding(top = 6.dp),
    )
}

@Composable
private fun authTextFieldColors() = TextFieldDefaults.colors(
    focusedContainerColor = Color.White.copy(alpha = 0.06f),
    unfocusedContainerColor = Color.White.copy(alpha = 0.06f),
    disabledContainerColor = Color.White.copy(alpha = 0.04f),
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    disabledTextColor = Color.White.copy(alpha = 0.5f),
    cursorColor = AuthGold,
    focusedIndicatorColor = Color.Transparent,
    unfocusedIndicatorColor = Color.Transparent,
    disabledIndicatorColor = Color.Transparent,
    focusedLabelColor = Color.White.copy(alpha = 0.85f),
    unfocusedLabelColor = Color.White.copy(alpha = 0.75f),
    focusedPlaceholderColor = Color.White.copy(alpha = 0.45f),
    unfocusedPlaceholderColor = Color.White.copy(alpha = 0.35f),
)

private val AuthGold = Color(0xFFD4AF37)

private fun Modifier.authTextFieldFrame(): Modifier {
    val shape = RoundedCornerShape(14.dp)
    return this
        .height(50.dp)
        .clip(shape)
        .border(1.dp, AuthGold.copy(alpha = 0.22f), shape)
}

private fun isValidUSPhone(input: String): Boolean {
    val digits = input.filter(Char::isDigit)
    return digits.length == 10 || (digits.length == 11 && digits.startsWith("1"))
}
