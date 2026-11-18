package com.shamia.assistant.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shamia.assistant.engine.IntentEngine
import com.shamia.assistant.engine.OpenSourceAiRepository
import com.shamia.assistant.model.*
import com.shamia.assistant.ui.theme.*
import kotlinx.coroutines.delay

private enum class HudTab(val label: String) {
    CHAT("HUD"),
    PLANNER("Routine & Syllabus"),
    MODELS("Models"),
    PHONE("Phone & Vault")
}

@Composable
fun ShamiaHudScreen(vm: ShamiaViewModel) {
    val state by vm.ui.collectAsState()
    var activeTab by remember { mutableStateOf(HudTab.CHAT) }
    var inputText by remember { mutableStateOf("") }
    var showIdentityDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = ObsidianVoid,
        topBar = {
            ShamiaTopBar(
                state = state,
                onEditIdentity = { showIdentityDialog = true },
                onToggleVoice = { vm.toggleVoiceReply() },
                onToggleSearch = { vm.toggleWebResearch() },
                onOpenModels = { activeTab = HudTab.MODELS }
            )
        },
        bottomBar = {
            Column(modifier = Modifier.background(GraphiteSurface)) {
                if (activeTab == HudTab.CHAT) {
                    ComposerBar(
                        text = inputText,
                        onTextChange = { inputText = it },
                        coreState = state.coreState,
                        liveTranscript = state.liveTranscript,
                        onToggleMic = { vm.toggleVoiceListening() },
                        onSend = {
                            val msg = inputText
                            inputText = ""
                            vm.sendMessage(msg)
                        }
                    )
                }
                NavigationBar(
                    containerColor = GraphiteSurface,
                    tonalElevation = 0.dp
                ) {
                    HudTab.entries.forEach { tab ->
                        val icon = when (tab) {
                            HudTab.CHAT -> Icons.Default.AutoAwesome
                            HudTab.PLANNER -> Icons.Default.EventNote
                            HudTab.MODELS -> Icons.Default.Memory
                            HudTab.PHONE -> Icons.Default.PhoneAndroid
                        }
                        NavigationBarItem(
                            selected = activeTab == tab,
                            onClick = { activeTab = tab },
                            icon = { Icon(icon, contentDescription = tab.label) },
                            label = {
                                Text(
                                    tab.label,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    fontSize = 10.sp
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = SapphirePulse,
                                selectedTextColor = SapphirePulse,
                                indicatorColor = SapphirePulse.copy(alpha = 0.14f),
                                unselectedIconColor = TextSecondary,
                                unselectedTextColor = TextSecondary
                            )
                        )
                    }
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(ObsidianVoid)
        ) {
            when (activeTab) {
                HudTab.CHAT -> ChatHudContent(
                    state = state,
                    onQuickPrompt = { prompt -> vm.sendMessage(prompt) },
                    onSpeakMessage = { text -> vm.voiceEngine.speak(text) },
                    onApproveAction = { id -> vm.approveAction(id) },
                    onDenyAction = { id -> vm.denyAction(id) }
                )
                HudTab.PLANNER -> RoutineSyllabusTab(
                    state = state,
                    vm = vm,
                    onJumpToChat = { activeTab = HudTab.CHAT }
                )
                HudTab.MODELS -> ModelsHubTab(state = state, vm = vm)
                HudTab.PHONE -> PhoneAndVaultTab(state = state, vm = vm)
            }

            state.statusBanner?.let { banner ->
                Surface(
                    color = CardSlate,
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, SapphirePulse.copy(alpha = 0.4f)),
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clickable { vm.clearBanner() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(banner, color = TextPrimary, fontSize = 12.sp, modifier = Modifier.weight(1f))
                        Spacer(Modifier.width(8.dp))
                        Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = TextSecondary, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }

    if (showIdentityDialog) {
        IdentityDialog(
            current = state.identity,
            onDismiss = { showIdentityDialog = false },
            onSave = { full, addr ->
                vm.updateIdentity(full, addr)
                showIdentityDialog = false
            }
        )
    }
}

@Composable
private fun ShamiaTopBar(
    state: ShamiaUiState,
    onEditIdentity: () -> Unit,
    onToggleVoice: () -> Unit,
    onToggleSearch: () -> Unit,
    onOpenModels: () -> Unit
) {
    Surface(color = GraphiteSurface, border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.08f))) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onEditIdentity() }
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "S.H.A.M.I.A.",
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        letterSpacing = 1.5.sp
                    )
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        color = SapphirePulse.copy(alpha = 0.14f),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.clickable { onOpenModels() }
                    ) {
                        Text(
                            text = if (state.ensembleEnabled) "Ensemble x${state.ensembleModelIds.size}" else state.selectedModel.name.substringBefore(" (").substringBefore(" ·"),
                            color = SapphireBright,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }
                Text(
                    "${state.identity.fullName} · Addressed as ${state.identity.addressAs}",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            IconButton(onClick = onToggleSearch) {
                Icon(
                    Icons.Default.TravelExplore,
                    contentDescription = "Google Live Search",
                    tint = if (state.useResearch) SapphirePulse else TextSecondary
                )
            }
            IconButton(onClick = onToggleVoice) {
                Icon(
                    if (state.voiceReplyEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                    contentDescription = "Voice Output",
                    tint = if (state.voiceReplyEnabled) SapphirePulse else TextSecondary
                )
            }
        }
    }
}

@Composable
private fun QuantumCoreOrb(coreState: CoreVisualState) {
    val infinite = rememberInfiniteTransition(label = "orb")
    val pulse by infinite.animateFloat(
        initialValue = 0.88f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = if (coreState == CoreVisualState.IDLE) 2400 else 950, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    val orbColor = when (coreState) {
        CoreVisualState.IDLE -> SapphirePulse
        CoreVisualState.LISTENING -> EmeraldOk
        CoreVisualState.THINKING -> SapphireBright
        CoreVisualState.SPEAKING -> SapphirePulse
        CoreVisualState.AWAITING_PERMISSION -> AmberWarn
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Canvas(modifier = Modifier.size(54.dp)) {
            val radius = size.minDimension / 2f
            drawCircle(
                brush = Brush.radialGradient(
                    listOf(orbColor.copy(alpha = 0.55f), Color.Transparent)
                ),
                radius = radius * pulse
            )
            drawCircle(
                color = orbColor.copy(alpha = 0.3f),
                radius = radius * 0.72f,
                style = Stroke(width = 2.dp.toPx())
            )
            drawCircle(
                color = orbColor,
                radius = radius * 0.36f * pulse
            )
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(
                text = when (coreState) {
                    CoreVisualState.IDLE -> "Core Standby · Ready"
                    CoreVisualState.LISTENING -> "Listening to Voice..."
                    CoreVisualState.THINKING -> "Synthesizing Answer..."
                    CoreVisualState.SPEAKING -> "Speaking Response..."
                    CoreVisualState.AWAITING_PERMISSION -> "Awaiting Permission Gate"
                },
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp
            )
            Text(
                "Zero-telemetry local-first Android HUD",
                color = TextSecondary,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun ChatHudContent(
    state: ShamiaUiState,
    onQuickPrompt: (String) -> Unit,
    onSpeakMessage: (String) -> Unit,
    onApproveAction: (String) -> Unit,
    onDenyAction: (String) -> Unit
) {
    val listState = rememberLazyListState()
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.lastIndex)
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        QuantumCoreOrb(state.coreState)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 14.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                "Which phones have a 4nm processor or 6nm processor?",
                "Plan my study routine from syllabus",
                "Practice spoken English with me",
                "I feel stressed, help me breathe",
                "Set alarm for 5 minutes"
            ).forEach { prompt ->
                val shortLabel = when {
                    prompt.contains("4nm") -> "4nm vs 6nm Phones"
                    prompt.contains("syllabus") -> "Study Plan"
                    prompt.contains("English") -> "English Coach"
                    prompt.contains("stressed") -> "4-4-6 Calm"
                    else -> "5m Alarm"
                }
                OutlinedButton(
                    onClick = { onQuickPrompt(prompt) },
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, SapphirePulse.copy(alpha = 0.3f)),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(shortLabel, color = SapphireBright, fontSize = 11.sp)
                }
            }
        }

        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            contentPadding = PaddingValues(vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(state.messages, key = { it.id }) { msg ->
                MessageCard(
                    msg = msg,
                    onSpeak = { onSpeakMessage(msg.text) },
                    onApprove = { onApproveAction(msg.id) },
                    onDeny = { onDenyAction(msg.id) }
                )
            }
        }
    }
}

@Composable
private fun MessageCard(
    msg: HudMessage,
    onSpeak: () -> Unit,
    onApprove: () -> Unit,
    onDeny: () -> Unit
) {
    val uriHandler = LocalUriHandler.current
    val bgColor = if (msg.isUser) SapphirePulse.copy(alpha = 0.14f) else CardSlate
    val borderColor = if (msg.isUser) SapphirePulse.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.08f)

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, borderColor),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (msg.isUser) "YOU" else (msg.modelLabel ?: "S.H.A.M.I.A."),
                    color = if (msg.isUser) SapphireBright else SapphirePulse,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(msg.timestampLabel, color = TextSecondary, fontSize = 10.sp)
                    if (!msg.isUser) {
                        Spacer(Modifier.width(8.dp))
                        Icon(
                            Icons.Default.VolumeUp,
                            contentDescription = "Speak reply",
                            tint = SapphirePulse,
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { onSpeak() }
                        )
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(msg.text, color = TextPrimary, fontSize = 14.sp, lineHeight = 20.sp)

            msg.coachingTip?.let { tip ->
                Spacer(Modifier.height(8.dp))
                Surface(
                    color = SapphirePulse.copy(alpha = 0.09f),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, SapphirePulse.copy(alpha = 0.25f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text("NATURAL ENGLISH TIP", color = SapphireBright, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(2.dp))
                        Text("\"${tip.naturalPhrase}\"", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(tip.tip, color = TextSecondary, fontSize = 11.sp)
                    }
                }
            }

            if (msg.showBreathingGuide) {
                Spacer(Modifier.height(8.dp))
                InlineBreathingCard()
            }

            msg.pendingAction?.let { act ->
                Spacer(Modifier.height(8.dp))
                Surface(
                    color = ObsidianVoid,
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, AmberWarn.copy(alpha = 0.35f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text("${act.title} · ${act.status.name}", color = AmberWarn, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(act.detail, color = TextSecondary, fontSize = 11.sp)
                        if (act.status == ActionStatus.PENDING) {
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = onApprove,
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldOk, contentColor = ObsidianVoid),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text("Authorize", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                OutlinedButton(
                                    onClick = onDeny,
                                    border = BorderStroke(1.dp, RoseDeny.copy(alpha = 0.6f)),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text("Deny", color = RoseDeny, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            if (msg.groundingLinks.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text("REAL-TIME SOURCES", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                msg.groundingLinks.forEach { link ->
                    Text(
                        text = "↗ ${link.title}",
                        color = SapphireBright,
                        fontSize = 12.sp,
                        textDecoration = TextDecoration.Underline,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .padding(vertical = 2.dp)
                            .clickable { runCatching { uriHandler.openUri(link.uri) } }
                    )
                }
            }
        }
    }
}

@Composable
private fun InlineBreathingCard() {
    var running by remember { mutableStateOf(false) }
    var phase by remember { mutableStateOf("Ready for 4-4-6 Reset") }
    var secondsLeft by remember { mutableIntStateOf(4) }

    LaunchedEffect(running) {
        if (!running) return@LaunchedEffect
        val stages = listOf("Inhale slowly..." to 4, "Hold gently..." to 4, "Exhale softly..." to 6)
        while (running) {
            for ((label, duration) in stages) {
                phase = label
                for (s in duration downTo 1) {
                    if (!running) break
                    secondsLeft = s
                    delay(1000)
                }
            }
        }
    }

    Surface(
        color = EmeraldOk.copy(alpha = 0.09f),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, EmeraldOk.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("4-4-6 MINDFUL BREATHING", color = EmeraldOk, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Text(if (running) "$phase (${secondsLeft}s)" else phase, color = TextPrimary, fontSize = 12.sp)
            }
            OutlinedButton(
                onClick = { running = !running },
                shape = RoundedCornerShape(8.dp),
                border = BorderStroke(1.dp, EmeraldOk.copy(alpha = 0.6f))
            ) {
                Text(if (running) "Stop" else "Start", color = EmeraldOk, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun ComposerBar(
    text: String,
    onTextChange: (String) -> Unit,
    coreState: CoreVisualState,
    liveTranscript: String,
    onToggleMic: () -> Unit,
    onSend: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp)) {
        if (liveTranscript.isNotBlank()) {
            Text(
                "Heard: $liveTranscript",
                color = EmeraldOk,
                fontSize = 11.sp,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(
                onClick = onToggleMic,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(if (coreState == CoreVisualState.LISTENING) EmeraldOk.copy(alpha = 0.25f) else CardSlate)
            ) {
                Icon(
                    if (coreState == CoreVisualState.LISTENING) Icons.Default.Stop else Icons.Default.Mic,
                    contentDescription = "Voice Mic",
                    tint = if (coreState == CoreVisualState.LISTENING) EmeraldOk else SapphirePulse
                )
            }
            Spacer(Modifier.width(8.dp))
            OutlinedTextField(
                value = text,
                onValueChange = onTextChange,
                placeholder = { Text("Ask S.H.A.M.I.A., phone control, or syllabus...", color = TextSecondary, fontSize = 13.sp) },
                singleLine = true,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SapphirePulse,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.14f),
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = CardSlate,
                    unfocusedContainerColor = CardSlate
                )
            )
            Spacer(Modifier.width(8.dp))
            IconButton(
                onClick = onSend,
                enabled = text.isNotBlank(),
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(SapphirePulse.copy(alpha = if (text.isNotBlank()) 0.9f else 0.25f))
            ) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = ObsidianVoid)
            }
        }
    }
}

@Composable
private fun RoutineSyllabusTab(
    state: ShamiaUiState,
    vm: ShamiaViewModel,
    onJumpToChat: () -> Unit
) {
    var subMode by remember { mutableStateOf(0) } // 0 = Routine & Syllabus, 1 = Tasks & Notes
    var routineTime by remember { mutableStateOf("") }
    var routineTitle by remember { mutableStateOf("") }
    var courseCode by remember { mutableStateOf("") }
    var courseTitle by remember { mutableStateOf("") }
    var syllabusTopic by remember { mutableStateOf("") }
    var newTaskText by remember { mutableStateOf("") }
    var newNoteText by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Routine & Syllabus", "Tasks & Notes").forEachIndexed { idx, title ->
                val selected = subMode == idx
                Surface(
                    color = if (selected) SapphirePulse.copy(alpha = 0.2f) else CardSlate,
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, if (selected) SapphirePulse else Color.White.copy(alpha = 0.1f)),
                    modifier = Modifier.weight(1f).clickable { subMode = idx }
                ) {
                    Text(
                        title,
                        color = if (selected) SapphireBright else TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }
        }

        if (subMode == 0) {
            Button(
                onClick = {
                    vm.requestStudyPlanFromRoutineAndSyllabus()
                    onJumpToChat()
                },
                colors = ButtonDefaults.buttonColors(containerColor = SapphirePulse, contentColor = ObsidianVoid),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Build Study Plan from Routine & Syllabus", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }

            SectionCard("Daily Routine (${state.routine.count { !it.completed }} active)") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = routineTime,
                        onValueChange = { routineTime = it },
                        placeholder = { Text("08:00 AM", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.width(96.dp),
                        colors = darkFieldColors()
                    )
                    OutlinedTextField(
                        value = routineTitle,
                        onValueChange = { routineTitle = it },
                        placeholder = { Text("Routine block...", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = darkFieldColors()
                    )
                    IconButton(onClick = {
                        vm.addRoutine(routineTime, routineTitle)
                        routineTime = ""
                        routineTitle = ""
                    }) {
                        Icon(Icons.Default.AddCircle, contentDescription = "Add Routine", tint = SapphirePulse)
                    }
                }
                Spacer(Modifier.height(6.dp))
                state.routine.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(checked = item.completed, onCheckedChange = { vm.toggleRoutine(item.id) })
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.timeLabel, color = SapphireBright, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text(
                                item.title,
                                color = if (item.completed) TextSecondary else TextPrimary,
                                fontSize = 13.sp,
                                textDecoration = if (item.completed) TextDecoration.LineThrough else TextDecoration.None
                            )
                        }
                        IconButton(onClick = { vm.deleteRoutine(item.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }

            SectionCard("University Syllabus (${state.syllabus.count { !it.completed }} remaining)") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = courseCode,
                        onValueChange = { courseCode = it },
                        placeholder = { Text("CS-305", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.width(90.dp),
                        colors = darkFieldColors()
                    )
                    OutlinedTextField(
                        value = courseTitle,
                        onValueChange = { courseTitle = it },
                        placeholder = { Text("Course Name", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = darkFieldColors()
                    )
                }
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = syllabusTopic,
                        onValueChange = { syllabusTopic = it },
                        placeholder = { Text("Syllabus chapters / topics...", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = darkFieldColors()
                    )
                    IconButton(onClick = {
                        vm.addSyllabus(courseCode, courseTitle, syllabusTopic)
                        courseCode = ""
                        courseTitle = ""
                        syllabusTopic = ""
                    }) {
                        Icon(Icons.Default.AddCircle, contentDescription = "Add Syllabus", tint = SapphirePulse)
                    }
                }
                Spacer(Modifier.height(6.dp))
                state.syllabus.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(checked = item.completed, onCheckedChange = { vm.toggleSyllabus(item.id) })
                        Column(modifier = Modifier.weight(1f)) {
                            Text("${item.courseCode} · ${item.courseTitle}", color = SapphireBright, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text(
                                item.topic,
                                color = if (item.completed) TextSecondary else TextPrimary,
                                fontSize = 13.sp,
                                textDecoration = if (item.completed) TextDecoration.LineThrough else TextDecoration.None
                            )
                        }
                        IconButton(onClick = { vm.deleteSyllabus(item.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        } else {
            SectionCard("Priority Tasks (${state.tasks.count { !it.completed }} pending)") {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = newTaskText,
                        onValueChange = { newTaskText = it },
                        placeholder = { Text("Add priority task...", fontSize = 12.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = darkFieldColors()
                    )
                    IconButton(onClick = {
                        vm.addTask(newTaskText, highPriority = false)
                        newTaskText = ""
                    }) {
                        Icon(Icons.Default.AddCircle, contentDescription = "Add Task", tint = SapphirePulse)
                    }
                }
                state.tasks.forEach { task ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Checkbox(checked = task.completed, onCheckedChange = { vm.toggleTask(task.id) })
                        Text(
                            task.title,
                            color = if (task.completed) TextSecondary else TextPrimary,
                            fontSize = 13.sp,
                            modifier = Modifier.weight(1f),
                            textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None
                        )
                        IconButton(onClick = { vm.deleteTask(task.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }

            SectionCard("Private Notes (${state.notes.size})") {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = newNoteText,
                        onValueChange = { newNoteText = it },
                        placeholder = { Text("Save private note locally...", fontSize = 12.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = darkFieldColors()
                    )
                    IconButton(onClick = {
                        vm.addNote(newNoteText)
                        newNoteText = ""
                    }) {
                        Icon(Icons.Default.AddCircle, contentDescription = "Add Note", tint = SapphirePulse)
                    }
                }
                state.notes.forEach { note ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    ) {
                        Text("• ${note.content}", color = TextPrimary, fontSize = 12.sp, modifier = Modifier.weight(1f))
                        IconButton(onClick = { vm.deleteNote(note.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ModelsHubTab(state: ShamiaUiState, vm: ShamiaViewModel) {
    var customName by remember { mutableStateOf("") }
    var customRepo by remember { mutableStateOf("") }
    var customRam by remember { mutableStateOf("4") }
    var ollamaInput by remember(state.ollamaEndpoint) { mutableStateOf(state.ollamaEndpoint) }
    var serverInput by remember(state.serverBaseUrl) { mutableStateOf(state.serverBaseUrl) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Hardware compatibility card
        SectionCard("Device Compatibility Profiler") {
            Text(state.hardware.deviceLabel, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            Text(
                "Detected RAM: ${state.hardware.ramGb} GB · CPU Cores: ${state.hardware.cpuCores} · Under-10B & Chinese Open-Weight Ready",
                color = EmeraldOk,
                fontSize = 11.sp
            )
        }

        // Multi-Model Ensemble Synthesis Switch
        SectionCard("Multi-Model Ensemble Synthesis (Up to 3 Models)") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        if (state.ensembleEnabled) "Ensemble Active (${state.ensembleModelIds.size} models blended)" else "Combine 2–3 open models for higher accuracy",
                        color = if (state.ensembleEnabled) SapphireBright else TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Switch(
                    checked = state.ensembleEnabled,
                    onCheckedChange = { vm.toggleEnsembleEnabled() },
                    colors = SwitchDefaults.colors(checkedTrackColor = SapphirePulse)
                )
            }
        }

        // All Open-Weight Models (14 + Custom)
        Text("OPEN-WEIGHT MODELS (0 MB – 20B · UNDER-10B PHONE FLAGS)", color = SapphirePulse, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        state.allModels.forEach { spec ->
            val selected = state.selectedModelId == spec.id
            val inMix = state.ensembleModelIds.contains(spec.id)
            val compatible = state.hardware.ramGb >= spec.minRamGb || spec.runtimeLabel.contains("Cloud") || spec.isBuiltInOffline
            val installed = state.installedModelIds.contains(spec.id)

            Surface(
                color = CardSlate,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, if (selected) SapphirePulse else Color.White.copy(alpha = 0.08f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(spec.name, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Text("${spec.provider} · ${spec.params} · ${spec.sizeLabel}", color = TextSecondary, fontSize = 11.sp)
                        }
                        Surface(
                            color = if (compatible) EmeraldOk.copy(alpha = 0.14f) else AmberWarn.copy(alpha = 0.14f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                if (compatible) "Compatible" else "Cloud / Low RAM",
                                color = if (compatible) EmeraldOk else AmberWarn,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text("${spec.chipsetNote} — ${spec.summary}", color = TextSecondary, fontSize = 11.sp)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(
                            onClick = { vm.selectModel(spec.id) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) SapphirePulse else ObsidianVoid,
                                contentColor = if (selected) ObsidianVoid else SapphireBright
                            ),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text(if (selected) "Active" else "Use", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(
                            onClick = { vm.toggleEnsembleMember(spec.id) },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, if (inMix) SapphirePulse else Color.White.copy(alpha = 0.2f)),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(if (inMix) "In Mix" else "+ Mix", color = if (inMix) SapphireBright else TextSecondary, fontSize = 11.sp)
                        }
                        if (!spec.isBuiltInOffline) {
                            OutlinedButton(
                                onClick = { vm.toggleInstallModel(spec.id) },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, if (installed) EmeraldOk else Color.White.copy(alpha = 0.2f)),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(if (installed) "Cached" else "Install Local", color = if (installed) EmeraldOk else TextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }

        // Offline Voice Assistant Models (STT & TTS)
        Text("OFFLINE VOICE ASSISTANT MODELS (STT & TTS)", color = SapphirePulse, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        OpenSourceAiRepository.VOICE_MODELS.forEach { vmSpec ->
            val installed = state.installedVoiceIds.contains(vmSpec.id)
            Surface(
                color = CardSlate,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${vmSpec.name} · ${vmSpec.kind.name}", color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Text("${vmSpec.provider} · ${vmSpec.sizeLabel}", color = TextSecondary, fontSize = 11.sp)
                        Text(vmSpec.summary, color = TextSecondary, fontSize = 11.sp)
                    }
                    Spacer(Modifier.width(8.dp))
                    OutlinedButton(
                        onClick = { vm.toggleInstallVoiceModel(vmSpec.id) },
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, if (installed) EmeraldOk else SapphirePulse)
                    ) {
                        Text(if (installed) "Installed" else "Install", color = if (installed) EmeraldOk else SapphireBright, fontSize = 11.sp)
                    }
                }
            }
        }

        // Load Custom Open-Source Model
        SectionCard("Load Custom Open-Source HF / Ollama Model") {
            OutlinedTextField(
                value = customName,
                onValueChange = { customName = it },
                placeholder = { Text("Display Name (e.g. Qwen 2.5 3B)", fontSize = 12.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = darkFieldColors()
            )
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedTextField(
                    value = customRepo,
                    onValueChange = { customRepo = it },
                    placeholder = { Text("HF Repo or Ollama tag (e.g. qwen3:1.7b)", fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    colors = darkFieldColors()
                )
                OutlinedTextField(
                    value = customRam,
                    onValueChange = { customRam = it.filter { c -> c.isDigit() } },
                    placeholder = { Text("RAM GB", fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.width(78.dp),
                    colors = darkFieldColors()
                )
            }
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    vm.addCustomModel(customName, customRepo, customRam.toIntOrNull() ?: 4)
                    customName = ""
                    customRepo = ""
                },
                colors = ButtonDefaults.buttonColors(containerColor = SapphirePulse, contentColor = ObsidianVoid),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Add & Activate Custom Model", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Termux / Ollama & Optional Paired Web Server Endpoint
        SectionCard("Termux Ollama & Paired Server Endpoint") {
            OutlinedTextField(
                value = ollamaInput,
                onValueChange = { ollamaInput = it },
                label = { Text("Local Termux/LAN Ollama URL", fontSize = 11.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = darkFieldColors()
            )
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = serverInput,
                onValueChange = { serverInput = it },
                label = { Text("Optional Paired S.H.A.M.I.A. Server URL (e.g. http://192.168.1.10:3000)", fontSize = 11.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = darkFieldColors()
            )
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        vm.updateEndpoints(ollamaInput, serverInput)
                        vm.testOllamaConnection()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SapphirePulse, contentColor = ObsidianVoid),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Save & Test Ollama", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            if (state.ollamaTestStatus.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(state.ollamaTestStatus, color = SapphireBright, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun PhoneAndVaultTab(state: ShamiaUiState, vm: ShamiaViewModel) {
    var dialNumber by remember { mutableStateOf("") }
    var alarmMinutes by remember { mutableStateOf("5") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SectionCard("Phone Hardware Controls (Permission-Gated)") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                ControlButton("Wi-Fi", state.controls.wifi, Modifier.weight(1f)) {
                    vm.stageOrExecuteAction(
                        PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.TOGGLE_WIFI, PermissionCapability.DEVICE_CONTROL, "Toggle Wi-Fi", "Open Android Wi-Fi panel.", toggleState = !state.controls.wifi),
                        "Toggle Wi-Fi?"
                    )
                }
                ControlButton("Bluetooth", state.controls.bluetooth, Modifier.weight(1f)) {
                    vm.stageOrExecuteAction(
                        PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.TOGGLE_BLUETOOTH, PermissionCapability.DEVICE_CONTROL, "Toggle Bluetooth", "Open Bluetooth settings.", toggleState = !state.controls.bluetooth),
                        "Toggle Bluetooth?"
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                ControlButton("DND", state.controls.dnd, Modifier.weight(1f)) {
                    vm.stageOrExecuteAction(
                        PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.TOGGLE_DND, PermissionCapability.DEVICE_CONTROL, "Toggle Do Not Disturb", "Update DND silence state.", toggleState = !state.controls.dnd),
                        "Toggle DND?"
                    )
                }
                ControlButton("Torch", state.controls.flashlight, Modifier.weight(1f)) {
                    vm.stageOrExecuteAction(
                        PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.TOGGLE_FLASHLIGHT, PermissionCapability.DEVICE_CONTROL, "Toggle Flashlight", "Switch camera LED torch.", toggleState = !state.controls.flashlight),
                        "Toggle Flashlight?"
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Text("Display Brightness (${state.controls.brightnessPct}%)", color = TextSecondary, fontSize = 11.sp)
            Slider(
                value = state.controls.brightnessPct.toFloat(),
                onValueChange = {},
                onValueChangeFinished = {},
                valueRange = 20f..100f,
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(40, 70, 100).forEach { pct ->
                    OutlinedButton(
                        onClick = {
                            vm.stageOrExecuteAction(
                                PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.SET_BRIGHTNESS, PermissionCapability.DEVICE_CONTROL, "Brightness $pct%", "Adjust brightness level.", numericValue = pct),
                                "Set brightness to $pct%?"
                            )
                        },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("$pct%", color = SapphireBright, fontSize = 11.sp)
                    }
                }
            }
        }

        SectionCard("Quick Dialer & Verified App Launcher") {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedTextField(
                    value = dialNumber,
                    onValueChange = { dialNumber = it },
                    placeholder = { Text("Enter phone digits...", fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    colors = darkFieldColors()
                )
                Button(
                    onClick = {
                        val valid = IntentEngine.validatePhoneNumber(dialNumber)
                        if (valid != null) {
                            vm.stageOrExecuteAction(
                                PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.DIAL_CONTACT, PermissionCapability.DIAL_CONTACT, "Dial $valid", "Open Android phone dialer.", targetValue = valid),
                                "Open dialer for $valid?"
                            )
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SapphirePulse, contentColor = ObsidianVoid),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Dial", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Spotify", "YouTube Music", "Maps", "Calendar", "Gmail").forEach { appName ->
                    val resolved = IntentEngine.resolveSupportedApp(appName)
                    OutlinedButton(
                        onClick = {
                            if (resolved != null) {
                                vm.stageOrExecuteAction(
                                    PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.OPEN_APP, PermissionCapability.OPEN_APP, "Open ${resolved.first}", "Launch ${resolved.second}", targetValue = resolved.second),
                                    "Open ${resolved.first}?"
                                )
                            }
                        },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(appName, color = SapphireBright, fontSize = 11.sp)
                    }
                }
            }
        }

        SectionCard("Offline Focus Synth & Countdown Alarms") {
            OpenSourceAiRepository.AMBIENT_TRACKS.forEach { track ->
                val playing = state.activeTrackId == track.id
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(track.title, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        Text("${track.mood} · Offline Web/AudioTrack Synth", color = TextSecondary, fontSize = 10.sp)
                    }
                    OutlinedButton(onClick = { vm.playAmbientTrack(track.id) }, shape = RoundedCornerShape(8.dp)) {
                        Text(if (playing) "Stop" else "Play", color = if (playing) EmeraldOk else SapphireBright, fontSize = 11.sp)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedTextField(
                    value = alarmMinutes,
                    onValueChange = { alarmMinutes = it.filter { c -> c.isDigit() } },
                    placeholder = { Text("Min", fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.width(80.dp),
                    colors = darkFieldColors()
                )
                Button(
                    onClick = {
                        val mins = alarmMinutes.toIntOrNull()?.coerceAtLeast(1) ?: 5
                        vm.stageOrExecuteAction(
                            PendingAction("act-${System.currentTimeMillis()}", DeviceActionType.SET_ALARM, PermissionCapability.SET_ALARM, "Set $mins min Alarm", "Play chime after $mins min.", numericValue = mins),
                            "Arm countdown alarm for $mins minute(s)?"
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SapphirePulse, contentColor = ObsidianVoid),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Set Alarm", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            state.alarms.forEach { alm ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("${alm.label} (${if (alm.active) "Armed" else "Done"})", color = TextPrimary, fontSize = 12.sp)
                    TextButton(onClick = { vm.dismissAlarm(alm.id) }) {
                        Text("Dismiss", color = TextSecondary, fontSize = 11.sp)
                    }
                }
            }
        }

        SectionCard("Permission Vault (Ask / Allow / Deny)") {
            PermissionCapability.entries.forEach { cap ->
                val cur = state.permissions[cap] ?: PermissionPolicy.ASK
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                    Text(cap.label, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(cap.description, color = TextSecondary, fontSize = 11.sp)
                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            PermissionPolicy.ASK to "Ask",
                            PermissionPolicy.ALWAYS to "Allow",
                            PermissionPolicy.DENY to "Deny"
                        ).forEach { (pol, label) ->
                            val active = cur == pol
                            val color = when (pol) {
                                PermissionPolicy.ASK -> AmberWarn
                                PermissionPolicy.ALWAYS -> EmeraldOk
                                PermissionPolicy.DENY -> RoseDeny
                            }
                            OutlinedButton(
                                onClick = { vm.setPermissionPolicy(cap, pol) },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, if (active) color else Color.White.copy(alpha = 0.14f)),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = if (active) color.copy(alpha = 0.15f) else Color.Transparent
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp)
                            ) {
                                Text(label, color = if (active) color else TextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ControlButton(label: String, active: Boolean, modifier: Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, if (active) EmeraldOk else Color.White.copy(alpha = 0.16f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (active) EmeraldOk.copy(alpha = 0.14f) else ObsidianVoid
        )
    ) {
        Text(
            "$label: ${if (active) "ON" else "OFF"}",
            color = if (active) EmeraldOk else TextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        color = CardSlate,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, color = SapphirePulse, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun IdentityDialog(
    current: UserIdentityProfile,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var fullName by remember { mutableStateOf(current.fullName) }
    var addressAs by remember { mutableStateOf(current.addressAs) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CardSlate,
        title = { Text("S.H.A.M.I.A. Owner Identity", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Owner Full Name") },
                    singleLine = true,
                    colors = darkFieldColors()
                )
                OutlinedTextField(
                    value = addressAs,
                    onValueChange = { addressAs = it },
                    label = { Text("Preferred Address (e.g. Sir)") },
                    singleLine = true,
                    colors = darkFieldColors()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(fullName, addressAs) },
                colors = ButtonDefaults.buttonColors(containerColor = SapphirePulse, contentColor = ObsidianVoid)
            ) {
                Text("Save", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        }
    )
}

@Composable
private fun darkFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = SapphirePulse,
    unfocusedBorderColor = Color.White.copy(alpha = 0.16f),
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedLabelColor = SapphireBright,
    unfocusedLabelColor = TextSecondary
)
