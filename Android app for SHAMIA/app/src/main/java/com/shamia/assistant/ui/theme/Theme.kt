package com.shamia.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ObsidianVoid = Color(0xFF06080C)
val GraphiteSurface = Color(0xFF0B0F15)
val CardSlate = Color(0xFF101620)
val SapphirePulse = Color(0xFF38BDF8)
val SapphireBright = Color(0xFF7DD3FC)
val TextPrimary = Color(0xFFE8EEF3)
val TextSecondary = Color(0xFF94A3B8)
val EmeraldOk = Color(0xFF34D399)
val AmberWarn = Color(0xFFFBBF24)
val RoseDeny = Color(0xFFFB7185)

private val ShamiaDarkColors = darkColorScheme(
    primary = SapphirePulse,
    onPrimary = ObsidianVoid,
    secondary = SapphireBright,
    background = ObsidianVoid,
    surface = GraphiteSurface,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary
)

@Composable
fun ShamiaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ShamiaDarkColors,
        content = content
    )
}
