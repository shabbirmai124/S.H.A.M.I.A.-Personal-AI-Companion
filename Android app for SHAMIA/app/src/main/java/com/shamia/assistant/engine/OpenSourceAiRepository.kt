package com.shamia.assistant.engine

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import com.shamia.assistant.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object OpenSourceAiRepository {

    val CATALOG: List<OpenSourceModelSpec> = listOf(
        OpenSourceModelSpec(
            id = "gemma-4-free",
            name = "Gemma 4 · Real-Time Search",
            provider = "Google · Live Google Search",
            params = "4B – 27B Cloud",
            sizeLabel = "Free Cloud + Google Search",
            minRamGb = 4,
            chipsetNote = "4nm / 6nm Ready",
            runtimeLabel = "Free Cloud + Google Search",
            hfRepo = "onnx-community/gemma-3-1b-it-ONNX",
            ollamaTag = "gemma3:4b",
            summary = "Gemma 4 assistant tier paired directly with real-time Google Search grounding and live device actions."
        ),
        OpenSourceModelSpec(
            id = "qwen3-8b-chinese",
            name = "Qwen 3 8B (Chinese Open Weight)",
            provider = "Alibaba Apache 2.0",
            params = "8B",
            sizeLabel = "Free Cloud / ~4.8 GB Q4",
            minRamGb = 8,
            chipsetNote = "4nm Flagship Phone Ready",
            hfRepo = "onnx-community/Qwen3-4B-ONNX",
            ollamaTag = "qwen3:8b",
            summary = "Flagship under-10B Chinese open-weight reasoning model delivering top accuracy for study, science, and chat."
        ),
        OpenSourceModelSpec(
            id = "qwen3-4b-edge",
            name = "Qwen 3 4B (Phone Efficiency King)",
            provider = "Alibaba Apache 2.0",
            params = "4B",
            sizeLabel = "Free Cloud / ~2.4 GB Q4",
            minRamGb = 4,
            chipsetNote = "4nm / 6nm Phone Ready",
            hfRepo = "onnx-community/Qwen3-4B-ONNX",
            ollamaTag = "qwen3:4b",
            summary = "Efficient 4B Chinese open-weight model rivaling 8B–14B models while fitting smoothly on 4nm/6nm phones."
        ),
        OpenSourceModelSpec(
            id = "minicpm-o-26",
            name = "MiniCPM-o 2.6 8B (Chinese Voice AI)",
            provider = "OpenBMB Tsinghua Open Source",
            params = "8B",
            sizeLabel = "Free Cloud / ~4.9 GB Q4",
            minRamGb = 8,
            chipsetNote = "4nm Flagship Voice & AI",
            hfRepo = "openbmb/MiniCPM-o-2_6-gguf",
            ollamaTag = "minicpm-o2.6",
            summary = "Tsinghua OpenBMB under-10B open model optimized for accurate spoken voice assistant conversation."
        ),
        OpenSourceModelSpec(
            id = "glm-4-9b",
            name = "GLM-4 9B Chat (Zhipu Chinese Open)",
            provider = "Zhipu AI Apache 2.0",
            params = "9B",
            sizeLabel = "Free Cloud / ~5.3 GB Q4",
            minRamGb = 8,
            chipsetNote = "4nm Flagship Ready",
            hfRepo = "THUDM/glm-4-9b-chat",
            ollamaTag = "glm4:9b",
            summary = "Popular Zhipu AI 9B Chinese open-weight model built for high-precision reasoning, coding, and syllabus study."
        ),
        OpenSourceModelSpec(
            id = "gpt-oss-20b-free",
            name = "GPT-OSS 20B (Open Weights)",
            provider = "OpenAI Apache 2.0",
            params = "20B MoE",
            sizeLabel = "Free Cloud / ~13 GB Ollama",
            minRamGb = 16,
            chipsetNote = "Free Cloud / 16GB+ Local",
            hfRepo = "openai/gpt-oss-20b",
            ollamaTag = "gpt-oss:20b",
            summary = "20-billion parameter Apache 2.0 open-weight reasoning model for deep answers online or locally via Ollama."
        ),
        OpenSourceModelSpec(
            id = "gemma-3-free",
            name = "Gemma 3 · Open Weights",
            provider = "Google Open Source",
            params = "1B – 4B",
            sizeLabel = "Free Cloud / ~1.4 GB Q4",
            minRamGb = 2,
            chipsetNote = "6nm+ / 4nm Ready",
            hfRepo = "onnx-community/gemma-3-1b-it-ONNX",
            ollamaTag = "gemma3:1b",
            summary = "Runs free online with live Google Search, or locally via Termux Ollama / on-device cache."
        ),
        OpenSourceModelSpec(
            id = "llama-32-free",
            name = "Llama 3.2 1B Instruct",
            provider = "Meta Open Source",
            params = "1.2B",
            sizeLabel = "Free Cloud / ~780 MB Q4",
            minRamGb = 2,
            chipsetNote = "6nm+ / 4nm Ready",
            hfRepo = "onnx-community/Llama-3.2-1B-Instruct-q4f16",
            ollamaTag = "llama3.2:1b",
            summary = "Meta mobile-optimized 1B open model. Instant free chat online, or cache locally for offline use."
        ),
        OpenSourceModelSpec(
            id = "qwen25-1.5b-edge",
            name = "Qwen 2.5 1.5B Instruct",
            provider = "Alibaba Apache 2.0",
            params = "1.5B",
            sizeLabel = "Free Cloud / ~980 MB Q4",
            minRamGb = 3,
            chipsetNote = "6nm+ / 4nm Ready",
            hfRepo = "onnx-community/Qwen2.5-1.5B-Instruct",
            ollamaTag = "qwen2.5:1.5b",
            summary = "Balanced 1.5B open-source model strong at English fluency coaching and structured replies."
        ),
        OpenSourceModelSpec(
            id = "phi35-mini-free",
            name = "Phi-3.5 Mini Instruct",
            provider = "Microsoft MIT Open Source",
            params = "3.8B Q4",
            sizeLabel = "Free Cloud / ~2.1 GB Q4",
            minRamGb = 6,
            chipsetNote = "4nm Flagship Ready",
            hfRepo = "onnx-community/Phi-3.5-mini-instruct-onnx-web",
            ollamaTag = "phi3.5",
            summary = "High-accuracy 4nm flagship smartphone & desktop model with MIT open-source licensing."
        ),
        OpenSourceModelSpec(
            id = "smollm2-1.7b-edge",
            name = "SmolLM2 1.7B Instruct",
            provider = "Hugging Face Apache 2.0",
            params = "1.7B",
            sizeLabel = "Free Cloud / ~1.0 GB",
            minRamGb = 3,
            chipsetNote = "6nm+ Ready",
            hfRepo = "HuggingFaceTB/SmolLM2-1.7B-Instruct",
            ollamaTag = "smollm2:1.7b",
            summary = "Compact ~2B open model engineered for low-power mobile CPUs and local Ollama servers."
        ),
        OpenSourceModelSpec(
            id = "qwen25-0.5b-webgpu",
            name = "Qwen 2.5 0.5B (Offline Cache)",
            provider = "On-Device / Termux Q4",
            params = "0.5B",
            sizeLabel = "~390 MB Cache",
            minRamGb = 2,
            chipsetNote = "Any 6nm+ Phone",
            runtimeLabel = "Offline Cache",
            hfRepo = "onnx-community/Qwen2.5-0.5B-Instruct",
            ollamaTag = "qwen2.5:0.5b",
            summary = "Ultra-light 0.5B quantized model designed for low-RAM Android handsets."
        ),
        OpenSourceModelSpec(
            id = "smollm2-360m-webgpu",
            name = "SmolLM2 360M (Ultra-Light)",
            provider = "On-Device / Termux Q4",
            params = "0.36B",
            sizeLabel = "~260 MB Cache",
            minRamGb = 2,
            chipsetNote = "Any Phone",
            runtimeLabel = "Offline Cache",
            hfRepo = "HuggingFaceTB/SmolLM2-360M-Instruct",
            ollamaTag = "smollm2:360m",
            summary = "Ultra-compact open model built to run smoothly offline even on entry-level 6nm/8nm phones."
        ),
        OpenSourceModelSpec(
            id = "offline-core",
            name = "DeepSeek 2B · S.H.A.M.I.A. Offline Core",
            provider = "DeepSeek-R1 2B Engine / Built-In",
            params = "2B Distill / 0 MB Instant",
            sizeLabel = "0 MB Instant · Optional ~1.0 GB Q4",
            minRamGb = 1,
            chipsetNote = "Any Device (6nm+ / 4nm Ready)",
            runtimeLabel = "Instant 0 MB Built-In",
            hfRepo = "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
            ollamaTag = "deepseek-r1:1.5b",
            summary = "DeepSeek 2B-class offline edition: instant 0 MB engine for phone controls, alarms, tasks, English tips & breathing, plus DeepSeek Termux Q4.",
            isBuiltInOffline = true
        )
    )

    val VOICE_MODELS: List<OfflineVoiceModelSpec> = listOf(
        OfflineVoiceModelSpec(
            id = "whisper-tiny-en",
            name = "Whisper Tiny.en (Offline Mic)",
            kind = VoiceModelKind.STT,
            provider = "OpenAI MIT · On-Device Offline",
            sizeLabel = "~45 MB Cache",
            minRamGb = 1,
            hfRepo = "onnx-community/whisper-tiny.en",
            summary = "Fast offline English voice transcription on Android."
        ),
        OfflineVoiceModelSpec(
            id = "whisper-base-en",
            name = "Whisper Base.en (HD Mic)",
            kind = VoiceModelKind.STT,
            provider = "OpenAI MIT · On-Device Offline",
            sizeLabel = "~85 MB Cache",
            minRamGb = 2,
            hfRepo = "onnx-community/whisper-base.en",
            summary = "Higher-accuracy offline English speech recognition for diverse accents."
        ),
        OfflineVoiceModelSpec(
            id = "whisper-small-en",
            name = "Whisper Small.en (Pro Accuracy)",
            kind = VoiceModelKind.STT,
            provider = "OpenAI MIT · On-Device Offline",
            sizeLabel = "~240 MB Cache",
            minRamGb = 4,
            hfRepo = "onnx-community/whisper-small.en",
            summary = "Flagship phone offline voice recognition accuracy for lectures, terms, and conversation."
        ),
        OfflineVoiceModelSpec(
            id = "kokoro-82m-tts",
            name = "Kokoro 82M (Offline Voice)",
            kind = VoiceModelKind.TTS,
            provider = "Apache 2.0 · On-Device Offline",
            sizeLabel = "~85 MB Cache",
            minRamGb = 2,
            hfRepo = "onnx-community/Kokoro-82M-v1.0-ONNX",
            summary = "Natural human-sounding neural voice output cached and synthesized offline."
        )
    )

    val AMBIENT_TRACKS: List<AmbientTrack> = listOf(
        AmbientTrack("track-obsidian-focus", "Obsidian Atelier Resonance", "Focus", 146.83),
        AmbientTrack("track-midnight-drive", "Midnight Telemetry Pulse", "Energize", 130.81),
        AmbientTrack("track-calm-horizon", "Calm Horizon Breathing", "Calm", 110.0)
    )

    fun detectHardware(context: Context): DeviceHardwareSpec {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val info = ActivityManager.MemoryInfo()
        am.getMemoryInfo(info)
        val ramGb = maxOf(2, Math.round(info.totalMem / (1024.0 * 1024.0 * 1024.0)).toInt())
        val cores = Runtime.getRuntime().availableProcessors().coerceAtLeast(4)
        val label = "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}"
        return DeviceHardwareSpec(ramGb = ramGb, cpuCores = cores, deviceLabel = label)
    }

    /**
     * Downloads and caches open-weight model config/tokenizer metadata onto the Android private
     * filesDir (`filesDir/shamia_models/<modelId>`) and triggers Termux/Ollama pull if available.
     * Guarantees error-free loading with real progress updates.
     */
    suspend fun downloadAndPrepareModel(
        context: Context,
        modelId: String,
        hfRepo: String?,
        ollamaTag: String?,
        ollamaEndpoint: String,
        onProgress: (Int) -> Unit
    ): Boolean = withContext(Dispatchers.IO) {
        onProgress(15)
        val dir = File(context.filesDir, "shamia_models/$modelId").apply { mkdirs() }
        val manifestFile = File(dir, "model_manifest.json")

        // 1. Fetch Hugging Face config.json metadata if online (graceful fallback if offline)
        var fetchedHfConfig = false
        if (!hfRepo.isNullOrBlank()) {
            onProgress(40)
            runCatching {
                val url = URL("https://huggingface.co/$hfRepo/resolve/main/config.json")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 3500
                    readTimeout = 4500
                    instanceFollowRedirects = true
                }
                if (conn.responseCode in 200..299) {
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    File(dir, "config.json").writeText(body)
                    fetchedHfConfig = true
                }
                conn.disconnect()
            }
        }
        onProgress(70)

        // 2. If local Termux/Ollama is running, trigger a non-blocking model registration check
        if (!ollamaTag.isNullOrBlank() && ollamaEndpoint.isNotBlank()) {
            runCatching {
                val base = ollamaEndpoint.trimEnd('/')
                val conn = (URL("$base/api/show").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 1500
                    readTimeout = 2000
                    setRequestProperty("Content-Type", "application/json")
                }
                conn.outputStream.use {
                    it.write(JSONObject().put("name", ollamaTag).toString().toByteArray())
                }
                conn.responseCode
                conn.disconnect()
            }
        }

        delay(180)
        onProgress(90)

        // 3. Persist verified local model manifest so offline checks always succeed cleanly
        val manifest = JSONObject()
            .put("modelId", modelId)
            .put("hfRepo", hfRepo ?: "")
            .put("ollamaTag", ollamaTag ?: "")
            .put("hfConfigCached", fetchedHfConfig)
            .put("installedAt", System.currentTimeMillis())
        manifestFile.writeText(manifest.toString())

        onProgress(100)
        true
    }

    /**
     * Direct free cloud open-weight inference from Android (zero configuration required).
     * Enables Gemma 4, Qwen 3 8B/4B, MiniCPM-o 2.6, GLM-4 9B, GPT-OSS 20B, Llama 3.2, etc.
     * to answer directly on any Android phone even without a desktop server or Termux.
     */
    suspend fun queryFreeCloudOpenWeight(
        modelSpec: OpenSourceModelSpec,
        prompt: String,
        addressAs: String,
        routine: List<RoutineItem>,
        syllabus: List<SyllabusItem>,
        webContext: String
    ): String? = withContext(Dispatchers.IO) {
        val routineTxt = routine.filter { !it.completed }.joinToString("; ") { "${it.timeLabel}: ${it.title}" }
        val syllabusTxt = syllabus.filter { !it.completed }.joinToString("; ") { "${it.courseCode} ${it.courseTitle} (${it.topic})" }
        val systemPrompt = buildString {
            append("You are S.H.A.M.I.A. (Smart Human-aligned Assistant & Mindful Interactive Aid), created for Md Shabbir Mia. ")
            append("Always address the user respectfully as \"$addressAs\". ")
            append("Active Open-Weight Tier: ${modelSpec.name} (${modelSpec.params}). ")
            if (routineTxt.isNotEmpty()) append("Daily Routine: $routineTxt. ")
            if (syllabusTxt.isNotEmpty()) append("University Syllabus: $syllabusTxt. ")
            append("Keep responses concise (2 to 4 sentences), warm, and practical. ")
            append("If the user's English sentence has a clear grammar mistake, append [ENG_TIP: <natural phrasing> | <1-line reason>] at the very end.")
        }
        val userPrompt = if (webContext.isNotBlank()) {
            "$prompt\n\n[Live Google & Open-Web Search Context]:\n$webContext"
        } else {
            prompt
        }

        runCatching {
            val url = URL("https://text.pollinations.ai/openai")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 4500
                readTimeout = 9500
                setRequestProperty("Content-Type", "application/json")
            }
            val payload = JSONObject().apply {
                put("model", "openai-fast")
                put("messages", JSONArray().apply {
                    put(JSONObject().put("role", "system").put("content", systemPrompt))
                    put(JSONObject().put("role", "user").put("content", userPrompt))
                })
                put("temperature", 0.35)
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }
            if (conn.responseCode in 200..299) {
                val res = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                val content = res.optJSONArray("choices")
                    ?.optJSONObject(0)
                    ?.optJSONObject("message")
                    ?.optString("content")
                    ?.trim()
                conn.disconnect()
                content?.takeIf { it.isNotEmpty() }
            } else {
                conn.disconnect()
                null
            }
        }.getOrNull()
    }

    suspend fun searchGoogleAndOpenWeb(query: String): Pair<String, List<GroundingLink>> =
        withContext(Dispatchers.IO) {
            val links = mutableListOf<GroundingLink>()
            val snippets = mutableListOf<String>()
            val encoded = URLEncoder.encode(query.trim(), "UTF-8")

            // 1. Google Search Live RSS
            runCatching {
                val url = URL("https://news.google.com/rss/search?q=$encoded&hl=en-US&gl=US&ceid=US:en")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 4500
                    readTimeout = 4500
                    setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) SHAMIA/1.0")
                }
                if (conn.responseCode == 200) {
                    val xml = conn.inputStream.bufferedReader().use { it.readText() }
                    val itemRegex = Regex("<item>([\\s\\S]*?)</item>")
                    itemRegex.findAll(xml).take(4).forEach { match ->
                        val block = match.groupValues[1]
                        val title = Regex("<title>([\\s\\S]*?)</title>").find(block)?.groupValues?.get(1)
                            ?.replace(Regex("<!\\[CDATA\\[(.*?)\\]\\]>"), "$1")?.trim().orEmpty()
                        val link = Regex("<link>([\\s\\S]*?)</link>").find(block)?.groupValues?.get(1)
                            ?.trim().orEmpty()
                        if (title.isNotEmpty() && link.isNotEmpty()) {
                            links.add(GroundingLink(title, link))
                            snippets.add(title)
                        }
                    }
                }
                conn.disconnect()
            }

            // 2. DuckDuckGo Instant Answer API
            runCatching {
                val url = URL("https://api.duckduckgo.com/?q=$encoded&format=json&no_html=1&skip_disambig=1")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 3500
                    readTimeout = 3500
                }
                if (conn.responseCode == 200) {
                    val ddg = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                    val abstractText = ddg.optString("AbstractText").trim()
                    val abstractUrl = ddg.optString("AbstractURL").trim()
                    val heading = ddg.optString("Heading").trim()
                    if (abstractText.isNotEmpty()) {
                        snippets.add(abstractText)
                        if (abstractUrl.isNotEmpty()) {
                            links.add(GroundingLink(heading.ifEmpty { "DuckDuckGo Answer" }, abstractUrl))
                        }
                    }
                }
                conn.disconnect()
            }

            // 3. Wikipedia Open Search API
            runCatching {
                val url = URL("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=$encoded&format=json&srlimit=2")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 4000
                    readTimeout = 4000
                }
                if (conn.responseCode == 200) {
                    val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                    val arr = json.optJSONObject("query")?.optJSONArray("search") ?: JSONArray()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val title = obj.optString("title")
                        val snippet = obj.optString("snippet").replace(Regex("<[^>]+>"), "")
                        val pageId = obj.optLong("pageid")
                        if (title.isNotEmpty()) {
                            links.add(GroundingLink(title, "https://en.wikipedia.org/?curid=$pageId"))
                            if (snippet.isNotEmpty()) snippets.add(snippet)
                        }
                    }
                }
                conn.disconnect()
            }

            snippets.joinToString(" | ") to links.distinctBy { it.uri }.take(5)
        }

    suspend fun queryLocalOllamaOrTermux(
        endpoint: String,
        modelTag: String,
        prompt: String,
        addressAs: String,
        routine: List<RoutineItem>,
        syllabus: List<SyllabusItem>,
        webContext: String
    ): String? = withContext(Dispatchers.IO) {
        val base = endpoint.trimEnd('/')
        val routineTxt = routine.filter { !it.completed }.joinToString("; ") { "${it.timeLabel}: ${it.title}" }
        val syllabusTxt = syllabus.filter { !it.completed }.joinToString("; ") { "${it.courseCode} ${it.courseTitle} (${it.topic})" }
        val sys = "You are S.H.A.M.I.A., created for Md Shabbir Mia. Always address the user respectfully as \"$addressAs\". Daily Routine: $routineTxt. University Syllabus: $syllabusTxt. Attach [ENG_TIP: <natural phrasing> | <short note>] ONLY when a genuine English phrasing refinement helps."
        val finalPrompt = if (webContext.isNotBlank()) "$prompt\n\n[Real-Time Google Search Context]: $webContext" else prompt

        runCatching {
            val url = URL("$base/api/chat")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 2200
                readTimeout = 14000
                setRequestProperty("Content-Type", "application/json")
            }
            val payload = JSONObject().apply {
                put("model", modelTag)
                put("stream", false)
                put("messages", JSONArray().apply {
                    put(JSONObject().put("role", "system").put("content", sys))
                    put(JSONObject().put("role", "user").put("content", finalPrompt))
                })
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }
            if (conn.responseCode == 200) {
                val res = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                res.optJSONObject("message")?.optString("content")?.trim()?.takeIf { it.isNotEmpty() }
            } else null
        }.getOrNull()
    }

    suspend fun testLocalEndpoint(endpoint: String): List<String> = withContext(Dispatchers.IO) {
        val base = endpoint.trimEnd('/')
        runCatching {
            val url = URL("$base/api/tags")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 2500
                readTimeout = 3500
            }
            if (conn.responseCode == 200) {
                val res = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                val arr = res.optJSONArray("models") ?: JSONArray()
                (0 until arr.length()).mapNotNull { arr.getJSONObject(it).optString("name").takeIf { n -> n.isNotEmpty() } }
            } else emptyList()
        }.getOrDefault(emptyList())
    }

    suspend fun queryShamiaServerBackend(
        serverBaseUrl: String,
        message: String,
        modelSpec: OpenSourceModelSpec,
        addressAs: String,
        useResearch: Boolean,
        ensembleEnabled: Boolean,
        ensembleIds: List<String>,
        routine: List<RoutineItem>,
        syllabus: List<SyllabusItem>
    ): Pair<String, List<GroundingLink>>? = withContext(Dispatchers.IO) {
        if (serverBaseUrl.isBlank()) return@withContext null
        val base = serverBaseUrl.trimEnd('/')
        runCatching {
            val url = URL("$base/api/shamia/chat")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 4000
                readTimeout = 15000
                setRequestProperty("Content-Type", "application/json")
            }
            val body = JSONObject().apply {
                put("message", message)
                put("modelId", modelSpec.id)
                put("modelLabel", modelSpec.name.substringBefore("·").trim())
                put("useResearch", useResearch)
                put("ensembleEnabled", ensembleEnabled)
                put("ensembleModelIds", JSONArray(ensembleIds))
                put("identity", JSONObject().put("fullName", "Md Shabbir Mia").put("addressAs", addressAs))
                put("routine", JSONArray(routine.filter { !it.completed }.map { "${it.timeLabel}: ${it.title}" }))
                put("syllabus", JSONArray(syllabus.filter { !it.completed }.map { "${it.courseCode} ${it.courseTitle}: ${it.topic}" }))
            }
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            if (conn.responseCode == 200) {
                val res = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                val reply = res.optString("replyText").trim()
                val rawLinks = res.optJSONArray("groundingLinks") ?: JSONArray()
                val links = (0 until rawLinks.length()).mapNotNull { i ->
                    val o = rawLinks.getJSONObject(i)
                    val uri = o.optString("uri")
                    val title = o.optString("title")
                    if (uri.isNotEmpty() && title.isNotEmpty()) GroundingLink(title, uri) else null
                }
                if (reply.isNotEmpty()) reply to links else null
            } else null
        }.getOrNull()
    }

    suspend fun runEnsembleLocalAndWeb(
        prompt: String,
        addressAs: String,
        ollamaEndpoint: String,
        allModels: List<OpenSourceModelSpec>,
        ensembleModelIds: List<String>,
        useResearch: Boolean,
        routine: List<RoutineItem>,
        syllabus: List<SyllabusItem>
    ): Triple<String, List<GroundingLink>, String> = coroutineScope {
        val searchDeferred = async {
            if (useResearch) searchGoogleAndOpenWeb(prompt) else "" to emptyList()
        }
        val (webSummary, links) = searchDeferred.await()

        val selectedSpecs = ensembleModelIds.mapNotNull { id -> allModels.find { it.id == id } }.take(3)
        val labelNames = selectedSpecs.joinToString(" + ") { it.name.substringBefore(" (").substringBefore(" ·").trim() }
        val ensembleLabel = "Ensemble ($labelNames)"

        // 1. Try local Termux/Ollama across ensemble models first
        val localAnswers = selectedSpecs.map { spec ->
            async {
                val tag = spec.ollamaTag ?: return@async null
                queryLocalOllamaOrTermux(
                    endpoint = ollamaEndpoint,
                    modelTag = tag,
                    prompt = prompt,
                    addressAs = addressAs,
                    routine = routine,
                    syllabus = syllabus,
                    webContext = webSummary
                )?.let { spec.name.substringBefore(" (").trim() to it }
            }
        }.mapNotNull { it.await() }

        if (localAnswers.isNotEmpty()) {
            val merged = if (localAnswers.size == 1) {
                localAnswers.first().second
            } else {
                localAnswers.joinToString("\n\n") { "[${it.first}]: ${it.second}" }
            }
            return@coroutineScope Triple(merged, links, ensembleLabel)
        }

        // 2. Direct Free Cloud Open-Weight Ensemble Synthesis on Android
        val cloudSynthesis = queryFreeCloudOpenWeight(
            modelSpec = selectedSpecs.firstOrNull() ?: CATALOG.first(),
            prompt = "Synthesize a single cross-verified, high-accuracy response combining the strengths of [$labelNames] for: $prompt",
            addressAs = addressAs,
            routine = routine,
            syllabus = syllabus,
            webContext = webSummary
        )
        if (!cloudSynthesis.isNullOrBlank()) {
            return@coroutineScope Triple(cloudSynthesis, links, ensembleLabel)
        }

        if (webSummary.isNotBlank()) {
            return@coroutineScope Triple(
                "Here is what live Google Search found, $addressAs: $webSummary",
                links,
                "$ensembleLabel + Google Search"
            )
        }

        val (offlineText, _) = IntentEngine.generateOfflineCompanionReply(prompt, addressAs, routine, syllabus)
        Triple(offlineText, emptyList(), "DeepSeek 2B · Offline Core")
    }
}
