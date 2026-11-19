# S.H.A.M.I.A. — Smart Human-aligned Assistant & Mindful Interactive Aid

**Created & Owned Exclusively by Md Shabbir Mia** (`shabbirmia520@gmail.com`)

---

## 🎯 Core Goal & Project Vision: Run Open-Source AI Models Offline on Mobile

Our primary goal in building **S.H.A.M.I.A.** is to make **open-source AI models run reliably offline on mobile devices** (Android smartphones with 4nm and 6nm processors as well as mobile browsers), while also providing zero-key online open-weight inference and constructive real-time Google & Web search when connected.

### What We Wanted to Build & Achieved
1. **True Offline Open-Source AI on Mobile Devices (0.36B – 9B & 20B Tiers)**
   - Run compact quantized open-weight models (`Qwen 2.5 0.5B`, `SmolLM2 360M`, `Llama 3.2 1B`, `Qwen 2.5 1.5B`, `SmolLM2 1.7B`, `Gemma 3 1B–4B`, `Qwen 3 4B`, `DeepSeek-R1 1.5B / 2B Distill`) directly on mobile devices offline via in-browser WebGPU/WASM IndexedDB cache, local Android storage, or local Termux/Ollama (`http://127.0.0.1:11434`).
   - Run offline neural Speech-to-Text (**Whisper Tiny.en 45MB**, **Whisper Base.en 85MB**, **Whisper Small.en 240MB**) and offline neural Text-to-Speech (**Kokoro 82M ONNX**) so voice capture and spoken answers work even with zero internet connection.
2. **Hardware Safety & Out-Of-Memory (OOM) Device Protection**
   - Automatically detects device RAM and CPU cores (`detectDeviceHardware()`) on both Web and Android (`ActivityManager.MemoryInfo`).
   - Filters and prioritizes models that are safe for the user's phone RAM (`Safe Only` vs `Show All`).
   - Blocks local installation of models whose RAM requirement (`minRamGb`) exceeds the phone's detected memory so the phone never freezes, overheats, or crashes.
3. **Strict Active Model Synchronization (No Silent Fallback to Default)**
   - Whichever model you select in the UI (`Gemma 4 · Real-Time Search`, `NVIDIA Nemotron Nano 8B`, `NVIDIA Nemotron Mini 4B`, `Qwen 3 8B`, `Qwen 3 4B`, `MiniCPM-o 2.6 8B`, `GLM-4 9B`, `GPT-OSS 20B`, `Llama 3.2 1B`, `Phi-3.5 Mini`, `DeepSeek 2B Offline Core`, etc.) is dynamically passed to the inference router (`modelId` + `modelLabel`).
   - Normal responses stay clean and natural without repeating the model name; when you ask *"Which AI model am I using?"*, S.H.A.M.I.A. reports the exact active model name, ID, and architecture.
   - Switching models or tapping **New Chat** immediately aborts any in-flight request, clears prior model history contamination, and locks the session to your chosen model.
4. **Anti-Freeze "Stop" Control & Instant "New Chat"**
   - **Stop Button**: Whenever a model is generating a response or speaking (`isThinking` / `isSpeaking`), a prominent **Stop** button appears in the header, thinking bar, and composer bar (plus `Escape` key shortcut) to cancel inference immediately via `AbortController`.
   - **New Chat Button**: Start a fresh conversation with the currently active model (or switch to a different model) in one tap.
5. **Constructive Live Web Search Synthesis (Clean, HTML-Free Answers)**
   - When real-time web search is triggered, raw search snippets from Google News RSS, DuckDuckGo Instant Answer, and Wikipedia are sanitized of all HTML tags and entities (`&quot;`, `&#039;`, `&amp;`) and paired with a synthesis system prompt so the active model produces a clean, constructive, user-friendly answer in its own words instead of repeating broken fragments.
6. **Clear Natural Human Voice (Female & Male Personas — Non-Native Friendly)**
   - Choose between **Female (Clear)** and **Male (Clear)** natural voice personas tuned to a clear, unhurried speaking cadence (`0.94x` rate) so both native and non-native English listeners can follow every word effortlessly.
7. **Unified Daily Assistant Capabilities**
   - **Real-Time Spoken English Fluency Coach**: Inline grammar & phrasing tips during natural conversation.
   - **Empathetic Mental Support & 4-4-6 Breathing Guide**: Calm check-ins and interactive breathing when stress is detected.
   - **Daily Routine & University Syllabus Planner**: Track daily schedule blocks and university courses (`CS-301`, `CS-305`, `MATH-204`, etc.) and generate tailored study plans.
   - **Permission-Governed Phone Controls**: Dialer, App Launcher, Wi-Fi, Bluetooth, DND, Flashlight, Brightness, Alarms, and Ambient Focus Music governed by the **Permission Vault** (`Always Allow`, `Ask Every Time`, `Never Allow`).

---

## 📦 Supported Open-Source Model Catalog (16 Text Models + 4 Offline Voice Models)

| Model Name | Model ID | Scale | Min RAM | Mobile / Offline & Cloud Capability |
| :--- | :--- | :--- | :--- | :--- |
| **Gemma 4 · Real-Time Search** | `gemma-4-free` | 4B – 27B | 4 GB | Live Google Search + ONNX / Ollama local support |
| **NVIDIA Nemotron Nano 8B (Open Weights)** | `nemotron-nano-8b` | 8B | 8 GB | NVIDIA STEM/coding reasoning via Ollama & Free Cloud |
| **NVIDIA Nemotron Mini 4B (Mobile Edge)** | `nemotron-mini-4b` | 4B | 4 GB | NVIDIA pruned 4B open model for 4nm / 6nm phones & Cloud |
| **Qwen 3 8B (Chinese Open Weight)** | `qwen3-8b-chinese` | 8B | 8 GB | 4nm flagship phone local Ollama / Free Cloud |
| **Qwen 3 4B (Phone Efficiency King)** | `qwen3-4b-edge` | 4B | 4 GB | 4nm / 6nm phone WebGPU ONNX, Ollama & Free Cloud |
| **MiniCPM-o 2.6 8B (Chinese Voice AI)** | `minicpm-o-26` | 8B | 8 GB | Spoken dialogue open model via Ollama & Free Cloud |
| **GLM-4 9B Chat (Zhipu Chinese Open)** | `glm-4-9b` | 9B | 8 GB | Academic & syllabus reasoning via Ollama & Free Cloud |
| **GPT-OSS 20B (Open Weights)** | `gpt-oss-20b-free` | 20B MoE | 16 GB | Apache 2.0 20B reasoning online or 16GB+ local Ollama |
| **Gemma 3 · Open Weights** | `gemma-3-free` | 1B – 4B | 2 GB | Browser WebGPU ONNX cache, Ollama & Free Cloud |
| **Llama 3.2 1B Instruct** | `llama-32-free` | 1.2B | 2 GB | Mobile-optimized ~780MB Q4 offline cache & Free Cloud |
| **Qwen 2.5 1.5B Instruct** | `qwen25-1.5b-edge` | 1.5B | 3 GB | ~980MB Q4 offline cache, English coaching & Free Cloud |
| **Phi-3.5 Mini Instruct** | `phi35-mini-free` | 3.8B | 6 GB | Microsoft MIT 3.8B Q4 offline WebGPU/Ollama & Cloud |
| **SmolLM2 1.7B Instruct** | `smollm2-1.7b-edge` | 1.7B | 3 GB | Compact ~1.0GB mobile CPU/WebGPU & Ollama model |
| **Qwen 2.5 0.5B (Offline Cache)** | `qwen25-0.5b-webgpu` | 0.5B | 2 GB | ~390MB browser IndexedDB / mobile offline cache |
| **SmolLM2 360M (Ultra-Light)** | `smollm2-360m-webgpu` | 0.36B | 2 GB | ~260MB ultra-light offline model for any 6nm/8nm phone |
| **DeepSeek 2B · S.H.A.M.I.A. Offline Core** | `offline-core` | 2B Distill | 1 GB | Instant 0MB built-in offline engine + optional ~1GB Q4 |

### Offline Voice Models
- **Whisper Tiny.en** (`whisper-tiny-en`, ~45 MB, 1GB+ RAM) — 100% offline microphone speech-to-text.
- **Whisper Base.en** (`whisper-base-en`, ~85 MB, 2GB+ RAM) — HD offline accent-resilient speech recognition.
- **Whisper Small.en** (`whisper-small-en`, ~240 MB, 4GB+ RAM) — Flagship offline speech recognition for technical & academic terms.
- **Kokoro 82M Neural Voice** (`kokoro-82m-tts`, ~85 MB, 2GB+ RAM) — Natural offline neural speech synthesis with **Female (`af_heart`)** and **Male (`am_adam`)** voice personas.

---

## 📱 Native Kotlin Android App (`/Android app for SHAMIA/`)

A complete, standalone **Kotlin + Jetpack Compose** native Android application is included in `/Android app for SHAMIA/` with 1:1 feature parity:
- Native Android `SpeechRecognizer` (on MainLooper with Android 11+ `<queries>` manifest visibility) + 16kHz PCM `AudioRecord` fallback for offline Whisper.
- Native Android `TextToSpeech` with **Female (Clear)** and **Male (Clear)** voice personas at `0.94f` speaking rate.
- Hardware RAM & CPU core detector (`ActivityManager.MemoryInfo`) with OOM installation guard.
- Real Android hardware executors (Phone Dialer, Flashlight Camera2 Torch, Wi-Fi Settings panel, Bluetooth, DND, Window Brightness, System Alarm Clock, and App Launcher).

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your desktop or mobile browser.

### Running Unit Tests
```bash
npx tsx --test src/lib/intentEngine.test.ts src/lib/memoryStore.test.ts
```

---

## 👤 Author & Ownership

- **Creator & Owner**: **Md Shabbir Mia**
- **Contact**: `shabbirmia520@gmail.com`
