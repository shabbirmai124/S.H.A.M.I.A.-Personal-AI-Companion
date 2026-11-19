package com.shamia.assistant.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shamia.assistant.engine.*
import com.shamia.assistant.model.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ShamiaUiState(
    val identity: UserIdentityProfile = UserIdentityProfile(),
    val hardware: DeviceHardwareSpec = DeviceHardwareSpec(4, 8, "Android Device"),
    val messages: List<HudMessage> = emptyList(),
    val coreState: CoreVisualState = CoreVisualState.IDLE,
    val liveTranscript: String = "",
    val voiceReplyEnabled: Boolean = true,
    val useResearch: Boolean = true,
    val selectedModelId: String = "gemma-4-free",
    val ensembleEnabled: Boolean = false,
    val ensembleModelIds: List<String> = listOf("gemma-4-free", "qwen3-8b-chinese", "gpt-oss-20b-free"),
    val customModels: List<OpenSourceModelSpec> = emptyList(),
    val installedModelIds: Set<String> = setOf("offline-core"),
    val installedVoiceIds: Set<String> = emptySet(),
    val loadingProgress: Map<String, Int> = emptyMap(),
    val ollamaEndpoint: String = "http://127.0.0.1:11434",
    val serverBaseUrl: String = "",
    val ollamaTestStatus: String = "",
    val tasks: List<TaskItem> = emptyList(),
    val notes: List<NoteItem> = emptyList(),
    val routine: List<RoutineItem> = emptyList(),
    val syllabus: List<SyllabusItem> = emptyList(),
    val alarms: List<AlarmItem> = emptyList(),
    val controls: DeviceControlState = DeviceControlState(),
    val activeTrackId: String? = null,
    val permissions: Map<PermissionCapability, PermissionPolicy> = emptyMap(),
    val statusBanner: String? = null
) {
    val allModels: List<OpenSourceModelSpec>
        get() = OpenSourceAiRepository.CATALOG + customModels

    val selectedModel: OpenSourceModelSpec
        get() = allModels.find { it.id == selectedModelId } ?: OpenSourceAiRepository.CATALOG.first()
}

class ShamiaViewModel(application: Application) : AndroidViewModel(application) {
    private val store = RoutineSyllabusStore(application)
    val voiceEngine = VoiceAssistantEngine(application)

    private val _ui = MutableStateFlow(ShamiaUiState())
    val ui: StateFlow<ShamiaUiState> = _ui.asStateFlow()

    init {
        val identity = store.loadIdentity()
        val hardware = OpenSourceAiRepository.detectHardware(application)
        val routine = store.loadRoutine()
        val syllabus = store.loadSyllabus()
        val tasks = store.loadTasks()
        val notes = store.loadNotes()
        val permissions = store.loadPermissions()
        val customModels = store.loadCustomModels()
        val installedModels = store.loadInstalledModelIds()
        val installedVoice = store.loadInstalledVoiceIds()
        val selectedModelId = store.loadSelectedModelId()
        val ensembleEnabled = store.loadEnsembleEnabled()
        val ensembleIds = store.loadEnsembleIds()
        val useResearch = store.loadUseResearch()
        val ollamaEndpoint = store.loadOllamaEndpoint()
        val serverBaseUrl = store.loadServerBaseUrl()

        _ui.update {
            it.copy(
                identity = identity,
                hardware = hardware,
                routine = routine,
                syllabus = syllabus,
                tasks = tasks,
                notes = notes,
                permissions = permissions,
                customModels = customModels,
                installedModelIds = installedModels,
                installedVoiceIds = installedVoice,
                selectedModelId = selectedModelId,
                ensembleEnabled = ensembleEnabled,
                ensembleModelIds = ensembleIds,
                useResearch = useResearch,
                ollamaEndpoint = ollamaEndpoint,
                serverBaseUrl = serverBaseUrl,
                messages = listOf(
                    HudMessage(
                        id = "welcome",
                        isUser = false,
                        text = "Good day, ${identity.addressAs}. I'm S.H.A.M.I.A., created for ${identity.fullName}. Gemma 4 · Real-Time Google Search, Qwen 3 8B/4B, MiniCPM-o 2.6, GLM-4 9B, GPT-OSS 20B, DeepSeek 2B Offline Core, Multi-Model Ensemble, and your Daily Routine & University Syllabus are all ready.",
                        timestampLabel = nowLabel(),
                        modelLabel = "S.H.A.M.I.A. Core"
                    )
                )
            )
        }

        voiceEngine.initTts { isSpeaking ->
            _ui.update { state ->
                state.copy(
                    coreState = if (isSpeaking) CoreVisualState.SPEAKING else if (state.coreState == CoreVisualState.SPEAKING) CoreVisualState.IDLE else state.coreState
                )
            }
        }
    }

    private fun nowLabel(): String = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

    private fun appendMessage(msg: HudMessage) {
        _ui.update { it.copy(messages = it.messages + msg) }
    }

    fun clearBanner() {
        _ui.update { it.copy(statusBanner = null) }
    }

    private var activeGenerationJob: kotlinx.coroutines.Job? = null

    fun stopCurrentResponse() {
        activeGenerationJob?.cancel()
        activeGenerationJob = null
        voiceEngine.stopSpeaking()
        voiceEngine.stopListening()
        val state = _ui.value
        val addr = state.identity.addressAs.ifBlank { "Sir" }
        _ui.update { it.copy(coreState = CoreVisualState.IDLE, liveTranscript = "") }
        appendMessage(
            HudMessage(
                id = "stop-${System.currentTimeMillis()}",
                isUser = false,
                text = "[${state.selectedModel.name} · ID: ${state.selectedModel.id}] Response stopped immediately, $addr.",
                timestampLabel = nowLabel(),
                modelLabel = state.selectedModel.name
            )
        )
    }

    fun startNewChat() {
        activeGenerationJob?.cancel()
        activeGenerationJob = null
        voiceEngine.stopSpeaking()
        val state = _ui.value
        val addr = state.identity.addressAs.ifBlank { "Sir" }
        val activeSpec = state.selectedModel
        _ui.update {
            it.copy(
                coreState = CoreVisualState.IDLE,
                statusBanner = null,
                messages = listOf(
                    HudMessage(
                        id = "welcome-${System.currentTimeMillis()}",
                        isUser = false,
                        text = "[${activeSpec.name} · ID: ${activeSpec.id}] Fresh conversation started, $addr. Answering strictly from ${activeSpec.name}.",
                        timestampLabel = nowLabel(),
                        modelLabel = activeSpec.name
                    )
                )
            )
        }
    }

    fun sendMessage(rawText: String) {
        val text = rawText.trim()
        if (text.isEmpty()) return
        val state = _ui.value
        val addr = state.identity.addressAs.ifBlank { "Sir" }
        val activeSpec = state.selectedModel

        appendMessage(
            HudMessage(
                id = "u-${System.currentTimeMillis()}",
                isUser = true,
                text = text,
                timestampLabel = nowLabel()
            )
        )

        val isModelQuery = Regex("\\b(which\\s+(?:ai\\s+)?model|what\\s+(?:ai\\s+)?model|model\\s+am\\s+i\\s+using|active\\s+model|current\\s+model)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)
        if (isModelQuery) {
            val reply = "[${activeSpec.name} · ID: ${activeSpec.id}] You are currently running on ${activeSpec.name} (Model ID: ${activeSpec.id}), $addr. All responses are generated strictly from ${activeSpec.name}."
            appendMessage(
                HudMessage(
                    id = "a-${System.currentTimeMillis()}",
                    isUser = false,
                    text = reply,
                    timestampLabel = nowLabel(),
                    modelLabel = activeSpec.name
                )
            )
            if (_ui.value.voiceReplyEnabled) voiceEngine.speak(reply)
            return
        }

        // 1. Check immediate local device/memory/diagnostics intents
        val local = IntentEngine.matchLocalIntent(
            input = text,
            addressAs = addr,
            controls = state.controls,
            tasks = state.tasks,
            routine = state.routine,
            syllabus = state.syllabus
        )
        if (local.handled) {
            if (local.createdTaskTitle != null) {
                addTask(local.createdTaskTitle, highPriority = false)
            }
            val action = local.proposedAction
            if (action != null) {
                stageOrExecuteAction(action, local.replyText ?: "Ready, $addr.")
            } else {
                val reply = "[${activeSpec.name} · ID: ${activeSpec.id}] ${local.replyText ?: "Done, $addr."}"
                appendMessage(
                    HudMessage(
                        id = "a-${System.currentTimeMillis()}",
                        isUser = false,
                        text = reply,
                        timestampLabel = nowLabel(),
                        modelLabel = activeSpec.name
                    )
                )
                if (_ui.value.voiceReplyEnabled) voiceEngine.speak(local.replyText ?: "Done, $addr.")
            }
            return
        }

        // 2. If user selected DeepSeek 2B Built-In Offline Core (without Ensemble) and no forced search
        val intent = IntentEngine.detectConversationalIntent(text)
        val shouldSearch = IntentEngine.shouldTriggerLiveSearch(text, state.useResearch)

        if (activeSpec.isBuiltInOffline && !state.ensembleEnabled && !shouldSearch) {
            val (offlineReply, tip) = IntentEngine.generateOfflineCompanionReply(
                text, addr, state.routine, state.syllabus, activeSpec.id, activeSpec.name
            )
            appendMessage(
                HudMessage(
                    id = "a-${System.currentTimeMillis()}",
                    isUser = false,
                    text = offlineReply,
                    timestampLabel = nowLabel(),
                    modelLabel = activeSpec.name,
                    coachingTip = tip,
                    showBreathingGuide = intent == ConversationalIntent.MENTAL_SUPPORT
                )
            )
            if (state.voiceReplyEnabled) voiceEngine.speak(offlineReply)
            return
        }

        // 3. Paired Server Backend -> Local Termux/Ollama -> Direct Free Cloud Open-Weight + Live Google Search -> Active Model Companion
        _ui.update { it.copy(coreState = CoreVisualState.THINKING) }
        activeGenerationJob?.cancel()
        activeGenerationJob = viewModelScope.launch {
            var replyText = ""
            var links = emptyList<GroundingLink>()
            var usedModel = if (state.ensembleEnabled) "Ensemble" else activeSpec.name

            // Optional paired S.H.A.M.I.A. backend server
            if (state.serverBaseUrl.isNotBlank()) {
                val serverRes = OpenSourceAiRepository.queryShamiaServerBackend(
                    serverBaseUrl = state.serverBaseUrl,
                    message = text,
                    modelSpec = activeSpec,
                    addressAs = addr,
                    useResearch = shouldSearch,
                    ensembleEnabled = state.ensembleEnabled,
                    ensembleIds = state.ensembleModelIds,
                    routine = state.routine,
                    syllabus = state.syllabus
                )
                if (serverRes != null) {
                    replyText = serverRes.first
                    links = serverRes.second
                    if (state.ensembleEnabled) {
                        val names = state.ensembleModelIds.mapNotNull { id -> state.allModels.find { it.id == id }?.name?.substringBefore(" (")?.trim() }
                        usedModel = "Ensemble (${names.joinToString(" + ")})"
                    }
                }
            }

            // Local Termux/Ollama + Free Cloud Open-Weight + Real-Time Google Search
            if (replyText.isEmpty()) {
                if (state.ensembleEnabled) {
                    val (merged, searchLinks, label) = OpenSourceAiRepository.runEnsembleLocalAndWeb(
                        prompt = text,
                        addressAs = addr,
                        ollamaEndpoint = state.ollamaEndpoint,
                        allModels = state.allModels,
                        ensembleModelIds = state.ensembleModelIds,
                        useResearch = shouldSearch,
                        routine = state.routine,
                        syllabus = state.syllabus
                    )
                    replyText = merged
                    links = searchLinks
                    usedModel = label
                } else {
                    val (webSummary, searchLinks) = if (shouldSearch) {
                        OpenSourceAiRepository.searchGoogleAndOpenWeb(text)
                    } else {
                        "" to emptyList()
                    }
                    links = searchLinks

                    val ollamaTag = activeSpec.ollamaTag
                    val localModelOut = if (ollamaTag != null) {
                        OpenSourceAiRepository.queryLocalOllamaOrTermux(
                            endpoint = state.ollamaEndpoint,
                            modelTag = ollamaTag,
                            prompt = text,
                            addressAs = addr,
                            routine = state.routine,
                            syllabus = state.syllabus,
                            webContext = webSummary
                        )
                    } else null

                    if (!localModelOut.isNullOrBlank()) {
                        replyText = "[${activeSpec.name} · ID: ${activeSpec.id}] $localModelOut"
                    } else {
                        val cloudOut = OpenSourceAiRepository.queryFreeCloudOpenWeight(
                            modelSpec = activeSpec,
                            prompt = text,
                            addressAs = addr,
                            routine = state.routine,
                            syllabus = state.syllabus,
                            webContext = webSummary
                        )
                        if (!cloudOut.isNullOrBlank()) {
                            replyText = "[${activeSpec.name} · ID: ${activeSpec.id}] ${cloudOut.replace(Regex("^\\[[^\\]]+\\]\\s*"), "")}"
                            usedModel = activeSpec.name
                        } else if (webSummary.isNotBlank()) {
                            replyText = "[${activeSpec.name} · ID: ${activeSpec.id}] Clear summary for your query, $addr: $webSummary"
                            usedModel = activeSpec.name
                        } else {
                            val (offlineFallback, _) = IntentEngine.generateOfflineCompanionReply(
                                text, addr, state.routine, state.syllabus, activeSpec.id, activeSpec.name
                            )
                            replyText = offlineFallback
                            usedModel = activeSpec.name
                        }
                    }
                }
            }

            val (cleanText, extractedTip) = IntentEngine.extractCoachingTip(replyText)
            val fallbackTip = extractedTip ?: if (intent == ConversationalIntent.ENGLISH_TUTOR) {
                IntentEngine.generateOfflineCompanionReply(text, addr, state.routine, state.syllabus, activeSpec.id, activeSpec.name).second
            } else null

            _ui.update { it.copy(coreState = CoreVisualState.IDLE) }
            appendMessage(
                HudMessage(
                    id = "a-${System.currentTimeMillis()}",
                    isUser = false,
                    text = cleanText,
                    timestampLabel = nowLabel(),
                    modelLabel = usedModel,
                    coachingTip = fallbackTip,
                    showBreathingGuide = intent == ConversationalIntent.MENTAL_SUPPORT,
                    groundingLinks = links
                )
            )
            if (_ui.value.voiceReplyEnabled) voiceEngine.speak(cleanText.replace(Regex("^\\[[^\\]]+\\]\\s*"), ""))
        }
    }

    fun stageOrExecuteAction(action: PendingAction, promptText: String) {
        val policy = IntentEngine.evaluatePermission(_ui.value.permissions, action.capability)
        val addr = _ui.value.identity.addressAs.ifBlank { "Sir" }

        when (policy) {
            PermissionPolicy.DENY -> {
                appendMessage(
                    HudMessage(
                        id = "a-${System.currentTimeMillis()}",
                        isUser = false,
                        text = "Blocked by your Permission Vault (${action.capability.label} is set to Deny), $addr.",
                        timestampLabel = nowLabel(),
                        pendingAction = action.copy(status = ActionStatus.BLOCKED)
                    )
                )
            }
            PermissionPolicy.ALWAYS -> {
                val execMsg = runApprovedAction(action)
                appendMessage(
                    HudMessage(
                        id = "a-${System.currentTimeMillis()}",
                        isUser = false,
                        text = execMsg,
                        timestampLabel = nowLabel(),
                        pendingAction = action.copy(status = ActionStatus.APPROVED)
                    )
                )
                if (_ui.value.voiceReplyEnabled) voiceEngine.speak(execMsg)
            }
            PermissionPolicy.ASK -> {
                _ui.update { it.copy(coreState = CoreVisualState.AWAITING_PERMISSION) }
                appendMessage(
                    HudMessage(
                        id = "a-${System.currentTimeMillis()}",
                        isUser = false,
                        text = promptText,
                        timestampLabel = nowLabel(),
                        pendingAction = action.copy(status = ActionStatus.PENDING)
                    )
                )
            }
        }
    }

    private fun runApprovedAction(action: PendingAction): String {
        if (action.type == DeviceActionType.PLAY_MUSIC) {
            val track = OpenSourceAiRepository.AMBIENT_TRACKS.first()
            playAmbientTrack(track.id)
        }
        if (action.type == DeviceActionType.SET_ALARM) {
            scheduleCountdownAlarm(action.numericValue.coerceAtLeast(1), action.title)
        }
        return DeviceExecutor.execute(
            context = getApplication(),
            action = action,
            currentControls = _ui.value.controls,
            onControlsUpdated = { updated -> _ui.update { it.copy(controls = updated) } }
        )
    }

    fun approveAction(messageId: String) {
        val msg = _ui.value.messages.find { it.id == messageId } ?: return
        val action = msg.pendingAction ?: return
        val execMsg = runApprovedAction(action)
        _ui.update { state ->
            state.copy(
                coreState = CoreVisualState.IDLE,
                statusBanner = execMsg,
                messages = state.messages.map {
                    if (it.id == messageId) it.copy(pendingAction = action.copy(status = ActionStatus.APPROVED)) else it
                }
            )
        }
        if (_ui.value.voiceReplyEnabled) voiceEngine.speak(execMsg)
    }

    fun denyAction(messageId: String) {
        val msg = _ui.value.messages.find { it.id == messageId } ?: return
        val action = msg.pendingAction ?: return
        val addr = _ui.value.identity.addressAs.ifBlank { "Sir" }
        _ui.update { state ->
            state.copy(
                coreState = CoreVisualState.IDLE,
                statusBanner = "Action cancelled cleanly, $addr.",
                messages = state.messages.map {
                    if (it.id == messageId) it.copy(pendingAction = action.copy(status = ActionStatus.DENIED)) else it
                }
            )
        }
    }

    fun scheduleCountdownAlarm(minutes: Int, label: String = "S.H.A.M.I.A. Focus Timer") {
        val id = "alm-${System.currentTimeMillis()}"
        val triggerAt = System.currentTimeMillis() + minutes * 60_000L
        val alarm = AlarmItem(id, label, minutes, triggerAt, active = true)
        _ui.update { it.copy(alarms = listOf(alarm) + it.alarms, statusBanner = "Alarm set for $minutes minute(s).") }

        viewModelScope.launch {
            delay(minutes * 60_000L)
            val current = _ui.value.alarms.find { it.id == id }
            if (current != null && current.active) {
                voiceEngine.playAlarmChime()
                val addr = _ui.value.identity.addressAs.ifBlank { "Sir" }
                appendMessage(
                    HudMessage(
                        id = "alm-fire-${System.currentTimeMillis()}",
                        isUser = false,
                        text = "Alarm chime complete ($label), $addr.",
                        timestampLabel = nowLabel()
                    )
                )
                _ui.update { state ->
                    state.copy(alarms = state.alarms.map { if (it.id == id) it.copy(active = false) else it })
                }
            }
        }
    }

    fun dismissAlarm(id: String) {
        _ui.update { state -> state.copy(alarms = state.alarms.filterNot { it.id == id }) }
    }

    fun playAmbientTrack(trackId: String) {
        if (_ui.value.activeTrackId == trackId) {
            voiceEngine.stopAmbientTone()
            _ui.update { it.copy(activeTrackId = null) }
        } else {
            val track = OpenSourceAiRepository.AMBIENT_TRACKS.find { it.id == trackId } ?: return
            voiceEngine.startAmbientTone(track.baseFreqHz)
            _ui.update { it.copy(activeTrackId = track.id, statusBanner = "Playing ${track.title}") }
        }
    }

    fun toggleVoiceListening(onNeedRuntimeMicPermission: () -> Unit = {}) {
        val micPolicy = IntentEngine.evaluatePermission(_ui.value.permissions, PermissionCapability.MICROPHONE)
        if (micPolicy == PermissionPolicy.DENY) {
            _ui.update { it.copy(statusBanner = "Microphone blocked in Permission Vault. Switch it to Ask or Allow.") }
            return
        }
        if (!voiceEngine.hasMicPermission()) {
            onNeedRuntimeMicPermission()
            return
        }
        if (_ui.value.coreState == CoreVisualState.LISTENING) {
            voiceEngine.stopListening()
            _ui.update { it.copy(coreState = CoreVisualState.IDLE, liveTranscript = "") }
            return
        }
        val preferOfflineWhisper = _ui.value.installedVoiceIds.any { it.startsWith("whisper-") }
        _ui.update { it.copy(coreState = CoreVisualState.LISTENING, liveTranscript = "Listening...") }
        voiceEngine.startListening(
            preferOffline = preferOfflineWhisper,
            onPartial = { partial -> _ui.update { it.copy(liveTranscript = partial) } },
            onFinal = { finalText ->
                _ui.update { it.copy(coreState = CoreVisualState.IDLE, liveTranscript = "") }
                sendMessage(finalText)
            },
            onError = { err ->
                _ui.update { it.copy(coreState = CoreVisualState.IDLE, liveTranscript = "", statusBanner = err) }
            }
        )
    }

    fun toggleVoiceReply() {
        _ui.update { it.copy(voiceReplyEnabled = !it.voiceReplyEnabled) }
    }

    fun toggleWebResearch() {
        val next = !_ui.value.useResearch
        store.saveUseResearch(next)
        _ui.update { it.copy(useResearch = next) }
    }

    fun selectModel(modelId: String) {
        activeGenerationJob?.cancel()
        activeGenerationJob = null
        voiceEngine.stopSpeaking()
        store.saveSelectedModelId(modelId)
        store.saveEnsembleEnabled(false)
        val spec = _ui.value.allModels.find { it.id == modelId }
        val addr = _ui.value.identity.addressAs.ifBlank { "Sir" }
        _ui.update {
            it.copy(
                selectedModelId = modelId,
                ensembleEnabled = false,
                coreState = CoreVisualState.IDLE,
                statusBanner = if (spec != null) "Active Model: ${spec.name} (${spec.id})" else null,
                messages = if (spec != null) {
                    it.messages + HudMessage(
                        id = "switch-${System.currentTimeMillis()}",
                        isUser = false,
                        text = "[${spec.name} · ID: ${spec.id}] Active model switched to ${spec.name}, $addr. All responses now come strictly from this model.",
                        timestampLabel = nowLabel(),
                        modelLabel = spec.name
                    )
                } else it.messages
            )
        }
    }

    fun installOrRemoveModel(modelId: String) {
        if (modelId == "offline-core") return
        val currentInstalled = _ui.value.installedModelIds
        if (currentInstalled.contains(modelId)) {
            val next = currentInstalled - modelId
            store.saveInstalledModelIds(next)
            _ui.update { it.copy(installedModelIds = next, statusBanner = "Removed local cache for $modelId.") }
            return
        }

        val spec = _ui.value.allModels.find { it.id == modelId } ?: return
        val deviceRam = _ui.value.hardware.ramGb
        if (spec.minRamGb > deviceRam) {
            _ui.update {
                it.copy(
                    statusBanner = "OOM Safety Guard: ${spec.name} requires ${spec.minRamGb}GB+ RAM for local install (detected ${deviceRam}GB). Use Cloud mode instead."
                )
            }
            return
        }

        viewModelScope.launch {
            _ui.update { it.copy(loadingProgress = it.loadingProgress + (modelId to 5)) }
            OpenSourceAiRepository.downloadAndPrepareModel(
                context = getApplication(),
                modelId = modelId,
                hfRepo = spec.hfRepo,
                ollamaTag = spec.ollamaTag,
                ollamaEndpoint = _ui.value.ollamaEndpoint,
                onProgress = { pct ->
                    _ui.update { it.copy(loadingProgress = it.loadingProgress + (modelId to pct)) }
                }
            )
            val next = _ui.value.installedModelIds + modelId
            store.saveInstalledModelIds(next)
            store.saveSelectedModelId(modelId)
            _ui.update {
                it.copy(
                    installedModelIds = next,
                    selectedModelId = modelId,
                    loadingProgress = it.loadingProgress - modelId,
                    statusBanner = "${spec.name} loaded & ready."
                )
            }
        }
    }

    fun installOrRemoveVoiceModel(voiceId: String) {
        val currentInstalled = _ui.value.installedVoiceIds
        if (currentInstalled.contains(voiceId)) {
            val next = currentInstalled - voiceId
            store.saveInstalledVoiceIds(next)
            _ui.update { it.copy(installedVoiceIds = next) }
            return
        }

        val vmSpec = OpenSourceAiRepository.VOICE_MODELS.find { it.id == voiceId } ?: return
        val deviceRam = _ui.value.hardware.ramGb
        if (vmSpec.minRamGb > deviceRam) {
            _ui.update {
                it.copy(
                    statusBanner = "OOM Safety Guard: ${vmSpec.name} requires ${vmSpec.minRamGb}GB+ RAM (detected ${deviceRam}GB)."
                )
            }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loadingProgress = it.loadingProgress + (voiceId to 10)) }
            OpenSourceAiRepository.downloadAndPrepareModel(
                context = getApplication(),
                modelId = voiceId,
                hfRepo = vmSpec.hfRepo,
                ollamaTag = null,
                ollamaEndpoint = "",
                onProgress = { pct ->
                    _ui.update { it.copy(loadingProgress = it.loadingProgress + (voiceId to pct)) }
                }
            )
            val next = _ui.value.installedVoiceIds + voiceId
            store.saveInstalledVoiceIds(next)
            _ui.update {
                it.copy(
                    installedVoiceIds = next,
                    loadingProgress = it.loadingProgress - voiceId,
                    statusBanner = "${vmSpec.name} installed for offline voice."
                )
            }
        }
    }

    fun addCustomModel(name: String, hfOrOllama: String, minRamGb: Int) {
        val cleanName = name.trim()
        val cleanRepo = hfOrOllama.trim()
        if (cleanName.isEmpty() || cleanRepo.isEmpty()) return
        val spec = OpenSourceModelSpec(
            id = "custom-${System.currentTimeMillis()}",
            name = cleanName,
            provider = "Custom Open Source Model",
            params = "Custom",
            sizeLabel = "User Installed",
            minRamGb = minRamGb.coerceIn(1, 32),
            chipsetNote = "Custom HF / Ollama",
            runtimeLabel = "Custom Local / Ollama",
            hfRepo = if (cleanRepo.contains("/")) cleanRepo else null,
            ollamaTag = if (!cleanRepo.contains("/")) cleanRepo else null,
            summary = "Loaded dynamically by user ($cleanRepo).",
            isCustom = true
        )
        val updated = _ui.value.customModels + spec
        store.saveCustomModels(updated)
        _ui.update { it.copy(customModels = updated) }
        installOrRemoveModel(spec.id)
    }

    fun toggleEnsembleEnabled() {
        val next = !_ui.value.ensembleEnabled
        store.saveEnsembleEnabled(next)
        _ui.update { it.copy(ensembleEnabled = next) }
    }

    fun toggleEnsembleMember(modelId: String) {
        val cur = _ui.value.ensembleModelIds.toMutableList()
        if (cur.contains(modelId)) {
            if (cur.size > 1) cur.remove(modelId)
        } else {
            if (cur.size < 3) cur.add(modelId) else {
                cur.removeAt(0)
                cur.add(modelId)
            }
        }
        store.saveEnsembleIds(cur)
        _ui.update { it.copy(ensembleModelIds = cur) }
    }

    fun updateEndpoints(ollamaUrl: String, serverUrl: String) {
        store.saveOllamaEndpoint(ollamaUrl.trim())
        store.saveServerBaseUrl(serverUrl.trim())
        _ui.update { it.copy(ollamaEndpoint = ollamaUrl.trim(), serverBaseUrl = serverUrl.trim()) }
    }

    fun testOllamaConnection() {
        val url = _ui.value.ollamaEndpoint
        _ui.update { it.copy(ollamaTestStatus = "Testing $url...") }
        viewModelScope.launch {
            val tags = OpenSourceAiRepository.testLocalEndpoint(url)
            val msg = if (tags.isNotEmpty()) {
                "Connected! Found models: ${tags.take(5).joinToString(", ")}"
            } else {
                "No local Ollama server at $url (Cloud open-weight inference remains active automatically)."
            }
            _ui.update { it.copy(ollamaTestStatus = msg) }
        }
    }

    fun updateIdentity(fullName: String, addressAs: String) {
        val updated = UserIdentityProfile(
            fullName = fullName.trim().ifEmpty { "Md Shabbir Mia" },
            addressAs = addressAs.trim().ifEmpty { "Sir" }
        )
        store.saveIdentity(updated)
        _ui.update { it.copy(identity = updated) }
    }

    fun setPermissionPolicy(cap: PermissionCapability, policy: PermissionPolicy) {
        store.savePermission(cap, policy)
        _ui.update { it.copy(permissions = it.permissions + (cap to policy)) }
    }

    // Tasks CRUD
    fun addTask(title: String, highPriority: Boolean = false) {
        if (title.isBlank()) return
        val next = listOf(TaskItem("t-${System.currentTimeMillis()}", title.trim(), highPriority)) + _ui.value.tasks
        store.saveTasks(next)
        _ui.update { it.copy(tasks = next) }
    }

    fun toggleTask(id: String) {
        val next = _ui.value.tasks.map { if (it.id == id) it.copy(completed = !it.completed) else it }
        store.saveTasks(next)
        _ui.update { it.copy(tasks = next) }
    }

    fun deleteTask(id: String) {
        val next = _ui.value.tasks.filterNot { it.id == id }
        store.saveTasks(next)
        _ui.update { it.copy(tasks = next) }
    }

    // Notes CRUD
    fun addNote(content: String) {
        if (content.isBlank()) return
        val next = listOf(NoteItem("n-${System.currentTimeMillis()}", content.trim())) + _ui.value.notes
        store.saveNotes(next)
        _ui.update { it.copy(notes = next) }
    }

    fun deleteNote(id: String) {
        val next = _ui.value.notes.filterNot { it.id == id }
        store.saveNotes(next)
        _ui.update { it.copy(notes = next) }
    }

    // Routine CRUD
    fun addRoutine(timeLabel: String, title: String) {
        if (title.isBlank()) return
        val next = _ui.value.routine + RoutineItem("r-${System.currentTimeMillis()}", timeLabel.ifBlank { "Anytime" }, title.trim())
        store.saveRoutine(next)
        _ui.update { it.copy(routine = next) }
    }

    fun toggleRoutine(id: String) {
        val next = _ui.value.routine.map { if (it.id == id) it.copy(completed = !it.completed) else it }
        store.saveRoutine(next)
        _ui.update { it.copy(routine = next) }
    }

    fun deleteRoutine(id: String) {
        val next = _ui.value.routine.filterNot { it.id == id }
        store.saveRoutine(next)
        _ui.update { it.copy(routine = next) }
    }

    // University Syllabus CRUD
    fun addSyllabus(courseCode: String, courseTitle: String, topic: String) {
        if (topic.isBlank()) return
        val next = _ui.value.syllabus + SyllabusItem(
            id = "s-${System.currentTimeMillis()}",
            courseCode = courseCode.trim().ifBlank { "COURSE" },
            courseTitle = courseTitle.trim().ifBlank { "University Subject" },
            topic = topic.trim()
        )
        store.saveSyllabus(next)
        _ui.update { it.copy(syllabus = next) }
    }

    fun toggleSyllabus(id: String) {
        val next = _ui.value.syllabus.map { if (it.id == id) it.copy(completed = !it.completed) else it }
        store.saveSyllabus(next)
        _ui.update { it.copy(syllabus = next) }
    }

    fun deleteSyllabus(id: String) {
        val next = _ui.value.syllabus.filterNot { it.id == id }
        store.saveSyllabus(next)
        _ui.update { it.copy(syllabus = next) }
    }

    fun requestStudyPlanFromRoutineAndSyllabus() {
        val activeR = _ui.value.routine.filter { !it.completed }
        val activeS = _ui.value.syllabus.filter { !it.completed }
        val rStr = activeR.joinToString("; ") { "${it.timeLabel} (${it.title})" }.ifBlank { "General Study Blocks" }
        val sStr = activeS.joinToString("; ") { "${it.courseCode} ${it.courseTitle}: ${it.topic}" }.ifBlank { "Core Subjects" }
        sendMessage("Build a practical step-by-step study plan based on my daily routine [$rStr] and my university syllabus [$sStr].")
    }

    override fun onCleared() {
        voiceEngine.release()
        super.onCleared()
    }
}
