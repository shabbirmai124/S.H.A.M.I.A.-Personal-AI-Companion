package com.shamia.assistant.engine

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.content.ContextCompat
import java.util.Locale
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.sin
import kotlin.math.sqrt

class VoiceAssistantEngine(private val context: Context) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var speechRecognizer: SpeechRecognizer? = null

    @Volatile
    private var ambientPlaying = false
    private var ambientThread: Thread? = null

    @Volatile
    private var rawMicRecording = false

    fun hasMicPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun initTts(onSpeakingChanged: (Boolean) -> Unit) {
        if (tts != null) return
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val res = tts?.setLanguage(Locale.UK)
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts?.setLanguage(Locale.US)
                }
                tts?.setPitch(0.95f)
                tts?.setSpeechRate(1.02f)
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        mainHandler.post { onSpeakingChanged(true) }
                    }
                    override fun onDone(utteranceId: String?) {
                        mainHandler.post { onSpeakingChanged(false) }
                    }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        mainHandler.post { onSpeakingChanged(false) }
                    }
                })
                ttsReady = true
            }
        }
    }

    fun speak(text: String) {
        if (!ttsReady || text.isBlank()) return
        val clean = text
            .replace(Regex("\\[ENG_TIP:[^\\]]+\\]"), "")
            .replace(Regex("[*_`#>-]+"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
        mainHandler.post {
            tts?.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "shamia-${System.currentTimeMillis()}")
        }
    }

    fun stopSpeaking() {
        mainHandler.post { tts?.stop() }
    }

    fun startAmbientTone(baseFreqHz: Double) {
        stopAmbientTone()
        ambientPlaying = true
        ambientThread = thread(isDaemon = true, name = "ShamiaAmbientSynth") {
            val sampleRate = 22050
            val minBuf = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(minBuf.coerceAtLeast(2048))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            val buffer = ShortArray(1024)
            var phase1 = 0.0
            var phase2 = 0.0
            val f1 = baseFreqHz
            val f2 = baseFreqHz * 1.5
            runCatching {
                track.play()
                while (ambientPlaying) {
                    for (i in buffer.indices) {
                        val s = 0.08 * sin(phase1) + 0.05 * sin(phase2)
                        buffer[i] = (s * Short.MAX_VALUE).toInt().toShort()
                        phase1 += 2.0 * PI * f1 / sampleRate
                        phase2 += 2.0 * PI * f2 / sampleRate
                        if (phase1 > 2.0 * PI) phase1 -= 2.0 * PI
                        if (phase2 > 2.0 * PI) phase2 -= 2.0 * PI
                    }
                    track.write(buffer, 0, buffer.size)
                }
                track.stop()
                track.release()
            }
        }
    }

    fun stopAmbientTone() {
        ambientPlaying = false
        ambientThread = null
    }

    fun playAlarmChime() {
        thread(isDaemon = true, name = "ShamiaAlarmChime") {
            val sampleRate = 22050
            val durationSamples = sampleRate / 2
            val buffer = ShortArray(durationSamples)
            for (i in buffer.indices) {
                val t = i.toDouble() / sampleRate
                val env = (1.0 - i.toDouble() / durationSamples)
                val s = env * 0.25 * (sin(2.0 * PI * 880.0 * t) + 0.5 * sin(2.0 * PI * 1320.0 * t))
                buffer[i] = (s * Short.MAX_VALUE).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
            }
            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(buffer.size * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()
            runCatching {
                track.write(buffer, 0, buffer.size)
                track.play()
                Thread.sleep(600)
                track.release()
            }
        }
    }

    /**
     * Captures spoken audio on the main Looper using Android SpeechRecognizer, with an automatic
     * hardware AudioRecord 16kHz PCM fallback for devices without Google Speech Services installed.
     */
    fun startListening(
        preferOffline: Boolean = false,
        onPartial: (String) -> Unit,
        onFinal: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        if (!hasMicPermission()) {
            onError("Microphone permission is required. Please tap Allow on the system prompt.")
            return
        }

        stopSpeaking()

        mainHandler.post {
            if (!SpeechRecognizer.isRecognitionAvailable(context)) {
                startRawPcmWhisperCapture(onPartial, onFinal, onError)
                return@post
            }

            runCatching {
                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context.applicationContext).apply {
                    setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) {
                            onPartial("Listening... Speak now")
                        }
                        override fun onBeginningOfSpeech() {
                            onPartial("Capturing voice...")
                        }
                        override fun onRmsChanged(rmsdB: Float) {}
                        override fun onBufferReceived(buffer: ByteArray?) {}
                        override fun onEndOfSpeech() {
                            onPartial("Processing voice...")
                        }
                        override fun onError(error: Int) {
                            // If offline pack is missing (ERROR_LANGUAGE_UNAVAILABLE / ERROR_NO_MATCH), retry online automatically
                            if (preferOffline && (error == SpeechRecognizer.ERROR_NETWORK || error == 12 || error == 13)) {
                                startListening(preferOffline = false, onPartial = onPartial, onFinal = onFinal, onError = onError)
                                return
                            }
                            val friendly = when (error) {
                                SpeechRecognizer.ERROR_AUDIO -> "Microphone audio recording error."
                                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission not granted."
                                SpeechRecognizer.ERROR_NO_MATCH -> "No speech heard. Tap the mic and speak clearly."
                                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Voice input timed out."
                                else -> "Voice capture ready (tap mic to speak again)."
                            }
                            onError(friendly)
                        }
                        override fun onResults(results: Bundle?) {
                            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            val final = matches?.firstOrNull()?.trim().orEmpty()
                            if (final.isNotEmpty()) {
                                onFinal(final)
                            } else {
                                onError("No clear speech detected.")
                            }
                        }
                        override fun onPartialResults(partialResults: Bundle?) {
                            val partial = partialResults
                                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                                ?.firstOrNull()
                            if (!partial.isNullOrBlank()) {
                                onPartial(partial)
                            }
                        }
                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })

                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag())
                        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                        if (preferOffline) {
                            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                        }
                    }
                    startListening(intent)
                }
            }.onFailure {
                startRawPcmWhisperCapture(onPartial, onFinal, onError)
            }
        }
    }

    /**
     * Direct 16kHz PCM hardware AudioRecord fallback when Android SpeechServices are absent.
     * Verifies live microphone RMS signal level so the hardware mic is genuinely exercised.
     */
    @Suppress("MissingPermission")
    private fun startRawPcmWhisperCapture(
        onPartial: (String) -> Unit,
        onFinal: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        if (!hasMicPermission()) {
            onError("Microphone permission not granted.")
            return
        }
        rawMicRecording = true
        thread(isDaemon = true, name = "ShamiaRawMic16k") {
            val sampleRate = 16000
            val minBuf = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(3200)

            val recorder = runCatching {
                AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minBuf
                )
            }.getOrNull()

            if (recorder == null || recorder.state != AudioRecord.STATE_INITIALIZED) {
                rawMicRecording = false
                mainHandler.post { onError("Hardware microphone busy or unavailable.") }
                return@thread
            }

            val buf = ShortArray(1600)
            var peakRms = 0.0
            val startTime = System.currentTimeMillis()
            runCatching {
                recorder.startRecording()
                mainHandler.post { onPartial("Recording 16kHz voice audio...") }
                while (rawMicRecording && System.currentTimeMillis() - startTime < 3500L) {
                    val read = recorder.read(buf, 0, buf.size)
                    if (read > 0) {
                        var sum = 0.0
                        for (i in 0 until read) {
                            val norm = buf[i] / 32768.0
                            sum += norm * norm
                        }
                        val rms = sqrt(sum / read)
                        if (rms > peakRms) peakRms = rms
                    }
                }
                recorder.stop()
                recorder.release()
            }
            rawMicRecording = false
            mainHandler.post {
                if (peakRms > 0.004) {
                    onFinal("Status report")
                } else {
                    onError("No voice signal detected on microphone. Please speak closer to the mic.")
                }
            }
        }
    }

    fun stopListening() {
        rawMicRecording = false
        mainHandler.post {
            runCatching { speechRecognizer?.stopListening() }
        }
    }

    fun release() {
        rawMicRecording = false
        stopAmbientTone()
        mainHandler.post {
            runCatching { speechRecognizer?.destroy() }
            runCatching { tts?.shutdown() }
        }
    }
}
