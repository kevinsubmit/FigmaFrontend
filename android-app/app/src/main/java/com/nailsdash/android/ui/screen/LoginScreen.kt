package com.nailsdash.android.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.nailsdash.android.ui.state.AppSessionViewModel

@Composable
fun LoginScreen(sessionViewModel: AppSessionViewModel) {
    var phone by mutableStateOf("")
    var password by mutableStateOf("")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Welcome Back", style = MaterialTheme.typography.headlineMedium)
        Text("Log in to book and manage appointments", style = MaterialTheme.typography.bodyLarge)

        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("US Phone Number") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        sessionViewModel.authMessage?.let {
            if (it.isNotBlank()) {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }

        Button(
            onClick = {
                sessionViewModel.login(phone = phone, password = password)
            },
            enabled = !sessionViewModel.isLoadingAuth,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (sessionViewModel.isLoadingAuth) {
                CircularProgressIndicator(strokeWidth = 2.dp)
            } else {
                Text("Sign In")
            }
        }
    }
}
