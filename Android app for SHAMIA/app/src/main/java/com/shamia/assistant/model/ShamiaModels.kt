package com.shamia.assistant.model

/**
 * S.H.A.M.I.A. — Smart Human-aligned Assistant & Mindful Interactive Aid
 * Kotlin Mobile Architecture Models (1:1 Parity with Web Engine)
 * Author: Md Shabbir Mia <shabbirmia520@gmail.com>
 */

enum class ConversationalIntent {
    GENERAL,
    ENGLISH_TUTOR,
    MENTAL_SUPPORT,
    DEVICE_ACTION
}

enum class CoreVisualState {
    IDLE,
    LISTENING,
    THINKING,
    SPEAKING,
    AWAITING_PERMISSION
}

enum class PermissionCapability(val label: String, val description: String) {
    DIAL_CONTACT("Phone Dialer", "Open Android dialer only after your explicit confirmation."),
    OPEN_APP("App Launcher", "Launch verified Android apps (Spotify, Maps, Calendar, Gmail)."),
    DEVICE_CONTROL("Device Controls", "Toggle Wi-Fi panel, Bluetooth settings, DND, Torch, Brightness."),
    PLAY_MUSIC("Audio & Music", "Play offline focus tones and ambient audio."),
    SET_ALARM("Alarms & Timers", "Schedule countdown reminders and Android alarm intents."),
    MANAGE_MEMORY("Routine & Syllabus", "Persist tasks, notes, daily routine, and university syllabus locally."),
    MICROPHONE("Voice Microphone", "Capture spoken input via Android SpeechRecognizer / Whisper.")
}

enum class PermissionPolicy {
    ASK,
    ALWAYS,
    DENY
}

enum class ActionStatus {
    PENDING,
    APPROVED,
    DENIED,
    BLOCKED
}

enum class DeviceActionType {
    DIAL_CONTACT,
    OPEN_APP,
    TOGGLE_WIFI,
    TOGGLE_BLUETOOTH,
    TOGGLE_DND,
    TOGGLE_FLASHLIGHT,
    SET_BRIGHTNESS,
    SET_ALARM,
    PLAY_MUSIC
}

enum class VoiceModelKind {
    STT,
    TTS
}

data class UserIdentityProfile(
    val fullName: String = "Md Shabbir Mia",
    val addressAs: String = "Sir"
)

data class OpenSourceModelSpec(
    val id: String,
    val name: String,
    val provider: String,
    val params: String,
    val sizeLabel: String,
    val minRamGb: Int,
    val chipsetNote: String,
    val runtimeLabel: String = "Free Cloud + Ollama / On-Device",
    val hfRepo: String? = null,
    val ollamaTag: String? = null,
    val summary: String = "",
    val isBuiltInOffline: Boolean = false,
    val isCustom: Boolean = false
)

data class OfflineVoiceModelSpec(
    val id: String,
    val name: String,
    val kind: VoiceModelKind,
    val provider: String,
    val sizeLabel: String,
    val minRamGb: Int,
    val hfRepo: String,
    val summary: String
)

data class DeviceHardwareSpec(
    val ramGb: Int,
    val cpuCores: Int,
    val deviceLabel: String
)

data class GroundingLink(
    val title: String,
    val uri: String
)

data class CoachingTip(
    val naturalPhrase: String,
    val tip: String
)

data class PendingAction(
    val id: String,
    val type: DeviceActionType,
    val capability: PermissionCapability,
    val title: String,
    val detail: String,
    val targetValue: String = "",
    val toggleState: Boolean = true,
    val numericValue: Int = 100,
    val status: ActionStatus = ActionStatus.PENDING
)

data class HudMessage(
    val id: String,
    val isUser: Boolean,
    val text: String,
    val timestampLabel: String,
    val modelLabel: String? = null,
    val pendingAction: PendingAction? = null,
    val coachingTip: CoachingTip? = null,
    val showBreathingGuide: Boolean = false,
    val groundingLinks: List<GroundingLink> = emptyList()
)

data class RoutineItem(
    val id: String,
    val timeLabel: String,
    val title: String,
    val completed: Boolean = false
)

data class SyllabusItem(
    val id: String,
    val courseCode: String,
    val courseTitle: String,
    val topic: String,
    val completed: Boolean = false
)

data class TaskItem(
    val id: String,
    val title: String,
    val isHighPriority: Boolean = false,
    val completed: Boolean = false
)

data class NoteItem(
    val id: String,
    val content: String
)

data class AlarmItem(
    val id: String,
    val label: String,
    val minutesFromNow: Int,
    val triggerAtMillis: Long,
    val active: Boolean = true
)

data class AmbientTrack(
    val id: String,
    val title: String,
    val mood: String,
    val baseFreqHz: Double
)

data class DeviceControlState(
    val wifi: Boolean = true,
    val bluetooth: Boolean = true,
    val dnd: Boolean = false,
    val flashlight: Boolean = false,
    val brightnessPct: Int = 90
)
