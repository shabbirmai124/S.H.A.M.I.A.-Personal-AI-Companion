# S.H.A.M.I.A. — Android Mobile Edition (Kotlin + Jetpack Compose)

**Smart Human-aligned Assistant & Mindful Interactive Aid**  
**Exclusive Author & Owner:** Md Shabbir Mia · `shabbirmia520@gmail.com`

---

## Included Android Kotlin Architecture (`/Android app for SHAMIA`)

This standalone Android Studio project mirrors the full **S.H.A.M.I.A.** web assistant natively in **Kotlin + Jetpack Compose**:

- `MainActivity.kt` — Runtime microphone permission launcher + Obsidian Material 3 HUD
- `ui/ShamiaHudScreen.kt` — Quantum Core orb Canvas, conversation cards, Natural English Tip cards, 4-4-6 Mindful Breathing reset, Permission Gate (`Authorize` / `Deny`), Real-Time Google Search links, Routine & Syllabus planner, Open-Source Model Hub, Phone Controls, and Permission Vault
- `ui/ShamiaViewModel.kt` — `StateFlow` architecture coordinating offline intents, Google Search, local Termux/Ollama, paired server sync, and ensemble blending
- `engine/IntentEngine.kt` — Local phone commands (`Wi-Fi`, `Bluetooth`, `DND`, `Flashlight`, `Brightness`, `Quick Dialer`, `App Launcher`, `Alarms`, `Focus Synth`), English coaching extraction, and `4nm`/`6nm` offline guidance
- `engine/OpenSourceAiRepository.kt` — Hardware RAM/CPU profiler, **Google Search Live RSS + DuckDuckGo + Wikipedia**, Termux/Ollama `/api/chat`, Multi-Model Ensemble synthesis, and full 14-model + 4-voice catalog
- `engine/VoiceAssistantEngine.kt` — Offline Android `TextToSpeech` (UK executive cadence), Android `SpeechRecognizer` (`EXTRA_PREFER_OFFLINE`), and `AudioTrack` polyphonic ambient synthesizer & alarm chimes
- `engine/RoutineSyllabusStore.kt` — Private on-device `SharedPreferences` Vault persistence for Daily Routine, University Syllabus, Tasks, Notes, Custom Models, and Permissions
- `engine/DeviceExecutor.kt` — Safe Android hardware intents (`ACTION_DIAL`, `CameraManager.setTorchMode`, `Settings.Panel.ACTION_WIFI`, `ACTION_BLUETOOTH_SETTINGS`, allowlisted URLs)

---

## Supported Open-Weight & Voice Models (1:1 Parity)

- **Cloud + Real-Time Search**: Gemma 4 · Real-Time Search, GPT-OSS 20B (Open Weights)
- **Under-10B & Chinese Open-Weight Flagships (4nm / 6nm Ready)**: Qwen 3 8B, Qwen 3 4B, MiniCPM-o 2.6 8B (Chinese Voice AI), GLM-4 9B Chat
- **Lightweight Mobile Models**: Gemma 3, Llama 3.2 1B, Qwen 2.5 1.5B, Phi-3.5 Mini, SmolLM2 1.7B, Qwen 2.5 0.5B, SmolLM2 360M
- **Instant 0 MB / DeepSeek 2B Core**: DeepSeek 2B · S.H.A.M.I.A. Offline Core (`deepseek-r1:1.5b`)
- **Offline Voice Models**: Whisper Tiny.en, Whisper Base.en, Whisper Small.en (STT), Kokoro 82M (TTS)
- **Custom Model Loader** & **Multi-Model Ensemble Synthesis** (combine up to 3 models)

---

## Running Locally on Android Phone (Android Studio + Optional Termux Ollama)

1. Open the **`Android app for SHAMIA`** folder in **Android Studio (Ladybug / Meerkat or newer)**.
2. Sync Gradle (`compileSdk = 35`, `minSdk = 26`, Kotlin 2.0 + Compose) and run on your Android phone (`4nm` or `6nm` SoC).
3. *(Optional)* To run quantized GGUF open-weight models offline on-phone via **Termux** + Ollama:
   ```bash
   pkg update && pkg install ollama
   OLLAMA_ORIGINS="*" ollama serve &
   ollama pull qwen3:4b
   ollama pull deepseek-r1:1.5b
   ```
4. Open the **Models** tab inside the Android app, confirm `http://127.0.0.1:11434`, and tap **Save & Test Ollama**.
