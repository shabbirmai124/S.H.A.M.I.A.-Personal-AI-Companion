package com.shamia.assistant.engine

import com.shamia.assistant.model.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object IntentEngine {

    private val supportedApps = mapOf(
        "spotify" to ("Spotify" to "https://open.spotify.com"),
        "youtube music" to ("YouTube Music" to "https://music.youtube.com"),
        "youtube" to ("YouTube" to "https://www.youtube.com"),
        "maps" to ("Google Maps" to "https://maps.google.com"),
        "calendar" to ("Google Calendar" to "https://calendar.google.com"),
        "gmail" to ("Gmail" to "https://mail.google.com"),
        "whatsapp" to ("WhatsApp" to "https://web.whatsapp.com"),
        "github" to ("GitHub" to "https://github.com")
    )

    fun evaluatePermission(
        policies: Map<PermissionCapability, PermissionPolicy>,
        capability: PermissionCapability
    ): PermissionPolicy = policies[capability] ?: PermissionPolicy.ASK

    fun validatePhoneNumber(raw: String): String? {
        val cleaned = raw.replace(Regex("[^\\d+]"), "")
        val digits = cleaned.replace(Regex("\\D"), "")
        return if (digits.length in 3..15) cleaned else null
    }

    fun resolveSupportedApp(appName: String): Pair<String, String>? {
        val lower = appName.trim().lowercase(Locale.US)
        return supportedApps.entries.firstOrNull { lower.contains(it.key) }?.value
    }

    fun extractCoachingTip(raw: String): Pair<String, CoachingTip?> {
        val regex = Regex("\\[ENG_TIP:\\s*([^|\\]]+)\\|\\s*([^\\]]+)\\]", RegexOption.IGNORE_CASE)
        val match = regex.find(raw) ?: return raw.trim() to null
        val clean = raw.replace(regex, "").trim()
        val tip = CoachingTip(
            naturalPhrase = match.groupValues[1].trim(),
            tip = match.groupValues[2].trim()
        )
        return clean to tip
    }

    fun detectConversationalIntent(input: String): ConversationalIntent {
        val lower = input.lowercase(Locale.US)
        if (Regex("\\b(practice english|speak english|english tutor|grammar|fluency|correct my sentence|i am go|yesterday i go|very much tired)\\b").containsMatchIn(lower)) {
            return ConversationalIntent.ENGLISH_TUTOR
        }
        if (Regex("\\b(stressed|overwhelmed|anxious|anxiety|sad|burnt out|panic|breathe|calm me)\\b").containsMatchIn(lower)) {
            return ConversationalIntent.MENTAL_SUPPORT
        }
        if (Regex("^(call|dial|open|launch|play|set (?:an? )?alarm|turn (?:on|off)|enable|disable|set brightness)\\b").containsMatchIn(lower)) {
            return ConversationalIntent.DEVICE_ACTION
        }
        return ConversationalIntent.GENERAL
    }

    fun shouldTriggerLiveSearch(input: String, forceSearch: Boolean = false): Boolean {
        if (forceSearch) return true
        return Regex(
            "\\b(search|research|look up|google|latest|news|who won|what happened|current price|weather|real-?time|4nm|6nm|3nm|processor|chipset|snapdragon|dimensity|exynos|which phones?|what phones?|smartphones?|compare|specs|2025|2026)\\b",
            RegexOption.IGNORE_CASE
        ).containsMatchIn(input)
    }

    data class LocalIntentResult(
        val handled: Boolean,
        val replyText: String? = null,
        val proposedAction: PendingAction? = null,
        val createdTaskTitle: String? = null
    )

    fun matchLocalIntent(
        input: String,
        addressAs: String,
        controls: DeviceControlState,
        tasks: List<TaskItem>,
        routine: List<RoutineItem>,
        syllabus: List<SyllabusItem>
    ): LocalIntentResult {
        val trimmed = input.trim()
        val lower = trimmed.lowercase(Locale.US)
        val addr = addressAs.ifBlank { "Sir" }

        if (lower in listOf("time", "what is the time", "what's the time", "current time")) {
            val formatted = SimpleDateFormat("hh:mm a, EEEE MMM d", Locale.getDefault()).format(Date())
            return LocalIntentResult(true, "It is currently $formatted, $addr.")
        }

        if (lower.startsWith("status report") || lower == "diagnostics") {
            val pending = tasks.count { !it.completed }
            val studyPending = syllabus.count { !it.completed }
            return LocalIntentResult(
                true,
                "All systems nominal, $addr. Wi-Fi ${if (controls.wifi) "on" else "off"}, Bluetooth ${if (controls.bluetooth) "on" else "off"}, $pending tasks, ${routine.size} routine blocks, and $studyPending syllabus topics active."
            )
        }

        val addTaskMatch = Regex("^(?:add task|remember to|remind me to|add priority)\\s+(.+)$", RegexOption.IGNORE_CASE).find(trimmed)
        if (addTaskMatch != null) {
            val title = addTaskMatch.groupValues[1].trim()
            if (title.isNotEmpty()) {
                return LocalIntentResult(
                    handled = true,
                    replyText = "Recorded in your private ledger, $addr: \"$title\".",
                    createdTaskTitle = title
                )
            }
        }

        val alarmMatch = Regex("(?:set|create)\\s+(?:an?\\s+)?alarm\\s+(?:for|in)\\s+(\\d+)\\s*(minute|minutes|min|m|second|seconds|sec|s)?", RegexOption.IGNORE_CASE).find(lower)
        if (alarmMatch != null) {
            val amount = alarmMatch.groupValues[1].toIntOrNull()?.coerceAtLeast(1) ?: 5
            val unit = alarmMatch.groupValues[2]
            val minutes = if (unit.startsWith("s")) 1 else amount
            return LocalIntentResult(
                handled = true,
                replyText = "Alarm for $minutes minute${if (minutes == 1) "" else "s"} staged, $addr. Please confirm.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.SET_ALARM,
                    capability = PermissionCapability.SET_ALARM,
                    title = "Set $minutes min Alarm",
                    detail = "Schedule local countdown alarm chime.",
                    numericValue = minutes
                )
            )
        }

        val playMatch = Regex("^(?:play|start)\\s+(?:some\\s+)?(?:(.+?)\\s+)?music$", RegexOption.IGNORE_CASE).find(lower)
        if (playMatch != null || lower == "play focus music" || lower == "play music") {
            return LocalIntentResult(
                handled = true,
                replyText = "Obsidian focus audio is ready to play, $addr. Please authorize.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.PLAY_MUSIC,
                    capability = PermissionCapability.PLAY_MUSIC,
                    title = "Play Ambient Focus Music",
                    detail = "Start offline Obsidian Atelier Resonance synth stream.",
                    toggleState = true
                )
            )
        }

        val wifiMatch = Regex("\\b(turn on|enable|turn off|disable|toggle)\\s+(?:the\\s+)?wi-?fi\\b").find(lower)
        if (wifiMatch != null) {
            val next = wifiMatch.groupValues[1].contains("on") || wifiMatch.groupValues[1] == "enable"
            return LocalIntentResult(
                handled = true,
                replyText = "Wi-Fi ${if (next) "activation" else "deactivation"} staged, $addr. Please confirm.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.TOGGLE_WIFI,
                    capability = PermissionCapability.DEVICE_CONTROL,
                    title = "${if (next) "Enable" else "Disable"} Wi-Fi",
                    detail = "Open Android Wi-Fi control panel.",
                    toggleState = next
                )
            )
        }

        val btMatch = Regex("\\b(turn on|enable|turn off|disable|toggle)\\s+(?:the\\s+)?bluetooth\\b").find(lower)
        if (btMatch != null) {
            val next = btMatch.groupValues[1].contains("on") || btMatch.groupValues[1] == "enable"
            return LocalIntentResult(
                handled = true,
                replyText = "Bluetooth toggle staged, $addr. Please authorize.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.TOGGLE_BLUETOOTH,
                    capability = PermissionCapability.DEVICE_CONTROL,
                    title = "${if (next) "Enable" else "Disable"} Bluetooth",
                    detail = "Open Android Bluetooth settings.",
                    toggleState = next
                )
            )
        }

        val dndMatch = Regex("\\b(turn on|enable|turn off|disable)\\s+(?:do not disturb|dnd)\\b").find(lower)
        if (dndMatch != null) {
            val next = dndMatch.groupValues[1].contains("on") || dndMatch.groupValues[1] == "enable"
            return LocalIntentResult(
                handled = true,
                replyText = "Do Not Disturb mode staged, $addr. Please authorize.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.TOGGLE_DND,
                    capability = PermissionCapability.DEVICE_CONTROL,
                    title = "${if (next) "Enable" else "Disable"} Do Not Disturb",
                    detail = "Update Android DND silence state.",
                    toggleState = next
                )
            )
        }

        val torchMatch = Regex("\\b(turn on|enable|turn off|disable|toggle)\\s+(?:the\\s+)?(?:flashlight|torch)\\b").find(lower)
        if (torchMatch != null) {
            val next = torchMatch.groupValues[1].contains("on") || torchMatch.groupValues[1] == "enable"
            return LocalIntentResult(
                handled = true,
                replyText = "Flashlight beam staged, $addr. Please authorize.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.TOGGLE_FLASHLIGHT,
                    capability = PermissionCapability.DEVICE_CONTROL,
                    title = "${if (next) "Enable" else "Disable"} Flashlight",
                    detail = "Toggle device rear camera LED torch.",
                    toggleState = next
                )
            )
        }

        val brightMatch = Regex("(?:set\\s+)?brightness\\s+(?:to\\s+)?(\\d{1,3})%?").find(lower)
        if (brightMatch != null) {
            val pct = (brightMatch.groupValues[1].toIntOrNull() ?: 80).coerceIn(10, 100)
            return LocalIntentResult(
                handled = true,
                replyText = "Display brightness change to $pct% staged, $addr. Please authorize.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.SET_BRIGHTNESS,
                    capability = PermissionCapability.DEVICE_CONTROL,
                    title = "Set Brightness to $pct%",
                    detail = "Adjust window display brightness.",
                    numericValue = pct
                )
            )
        }

        val callMatch = Regex("^(?:call|dial|phone)\\s+(.+)$", RegexOption.IGNORE_CASE).find(trimmed)
        if (callMatch != null) {
            val target = callMatch.groupValues[1].trim()
            val phone = validatePhoneNumber(target)
            return LocalIntentResult(
                handled = true,
                replyText = "Call to ${phone ?: target} staged, $addr. Awaiting your authorization.",
                proposedAction = PendingAction(
                    id = "act-${System.currentTimeMillis()}",
                    type = DeviceActionType.DIAL_CONTACT,
                    capability = PermissionCapability.DIAL_CONTACT,
                    title = "Dial ${phone ?: target}",
                    detail = "Open Android Phone Dialer with ${phone ?: target}.",
                    targetValue = phone ?: target
                )
            )
        }

        val openMatch = Regex("^(?:open|launch)\\s+(?:the\\s+)?(.+?)(?:\\s+app)?$", RegexOption.IGNORE_CASE).find(trimmed)
        if (openMatch != null) {
            val app = resolveSupportedApp(openMatch.groupValues[1])
            if (app != null) {
                return LocalIntentResult(
                    handled = true,
                    replyText = "Standing by to open ${app.first}, $addr. Please authorize.",
                    proposedAction = PendingAction(
                        id = "act-${System.currentTimeMillis()}",
                        type = DeviceActionType.OPEN_APP,
                        capability = PermissionCapability.OPEN_APP,
                        title = "Open ${app.first}",
                        detail = "Launch ${app.second}",
                        targetValue = app.second
                    )
                )
            }
        }

        return LocalIntentResult(false)
    }

    fun generateOfflineCompanionReply(
        input: String,
        addressAs: String,
        routine: List<RoutineItem>,
        syllabus: List<SyllabusItem>,
        activeModelId: String = "gemma-4-free",
        activeModelLabel: String = "Gemma 4 · Real-Time Search"
    ): Pair<String, CoachingTip?> {
        val intent = detectConversationalIntent(input)
        val addr = addressAs.ifBlank { "Sir" }
        val lower = input.lowercase(Locale.US)
        val tag = "[$activeModelLabel · ID: $activeModelId]"

        if (Regex("\\b(which\\s+(?:ai\\s+)?model|what\\s+(?:ai\\s+)?model|model\\s+am\\s+i\\s+using|active\\s+model|current\\s+model|who\\s+are\\s+you)\\b").containsMatchIn(lower)) {
            return "$tag You are currently running on $activeModelLabel (Model ID: $activeModelId), $addr. All responses are generated strictly from $activeModelLabel." to null
        }

        if (lower.contains("4nm") || lower.contains("6nm") || (lower.contains("phone") && lower.contains("processor"))) {
            return "$tag Here is a clear comparison of 4nm and 6nm smartphone processors, $addr:\n• 4nm Smartphones (higher efficiency & NPU): Samsung Galaxy S24/S23 (Snapdragon 8 Gen 3/2), OnePlus 12, Pixel 8/9 (Tensor G3/G4), Poco X6 Pro (Dimensity 8300-Ultra), Redmi Note 13 Pro 5G.\n• 6nm Smartphones (balanced mid-range): Galaxy A34 & Realme 11 Pro (Dimensity 1080/7050), Poco X5 5G & Moto G84 (Snapdragon 695)." to null
        }

        if (lower.contains("study") || lower.contains("routine") || lower.contains("syllabus")) {
            val nextRoutine = routine.filter { !it.completed }.take(2).joinToString(" -> ") { "${it.timeLabel} (${it.title})" }
                .ifEmpty { "07:30 PM Evening Revision Block" }
            val nextSyl = syllabus.filter { !it.completed }.take(2).joinToString(" + ") { "${it.courseCode}: ${it.topic}" }
                .ifEmpty { "Core Course Review" }
            return "$tag Aligned with your schedule, $addr: anchor today around $nextRoutine, and cover $nextSyl in two focused 40-minute deep-work sprints followed by a 5-minute English summary." to null
        }

        if (intent == ConversationalIntent.MENTAL_SUPPORT) {
            return "$tag Take one slow breath, $addr. You don't need to carry everything at once—follow the 4-4-6 breathing guide below." to null
        }

        if (intent == ConversationalIntent.ENGLISH_TUTOR) {
            val tip = when {
                lower.contains("yesterday") && lower.contains("go") ->
                    CoachingTip("Yesterday I went to...", "Use past tense 'went' for completed past actions.")
                lower.contains("i am go") ->
                    CoachingTip("I am going to...", "Add '-ing' to the verb after 'am' for present continuous.")
                lower.contains("very much tired") ->
                    CoachingTip("I feel exhausted.", "Prefer 'really tired' or 'exhausted' instead of 'very much tired'.")
                else ->
                    CoachingTip("I have been focusing on...", "Use present perfect continuous for ongoing work.")
            }
            return "$tag Very clear thought, $addr. Keep speaking at a steady pace—what topic would you like to discuss next?" to tip
        }

        return "$tag Active on $activeModelLabel, $addr. Ask me about your daily routine, university syllabus, phone controls, 4nm/6nm phones, or live web search anytime." to null
    }
}
