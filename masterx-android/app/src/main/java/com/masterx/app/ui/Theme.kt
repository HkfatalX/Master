package com.masterx.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val MasterXColors = darkColorScheme(
    primary = Color(0xFF7C4DFF),
    onPrimary = Color.White,
    secondary = Color(0xFF00E5A0),
    onSecondary = Color(0xFF00261A),
    background = Color(0xFF0E0E14),
    onBackground = Color(0xFFEDEDF5),
    surface = Color(0xFF16161F),
    onSurface = Color(0xFFEDEDF5),
    surfaceVariant = Color(0xFF1F1F2B),
    onSurfaceVariant = Color(0xFFB5B5C8),
    error = Color(0xFFFF6B6B),
)

@Composable
fun MasterXTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = MasterXColors, content = content)
}
