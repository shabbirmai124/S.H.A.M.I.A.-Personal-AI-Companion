package com.shamia.assistant.engine

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.sin

class VoiceAssistantEngine(private val context: Context) {
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var speechRecognizer: SpeechRecognizer? = null

    @Volatile
    private var ambientPlaying = false
    private var ambientThread: Thread? = null

    fun initTts(onSpeakingChanged: (Boolean) -> Unit) {
        if (tts != null) return
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.UK
                tts?.setPitch(0.95f)
                tts?.setSpeechRate(1.02f)
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) = onSpeakingChanged(true)
                    override fun onDone(utteranceId: String?) = onSpeakingChanged(false)
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) = onSpeakingChanged(false)
                })
                ttsReady = true
            }
        }
    }

    fun speak(text: String) {
        if (!ttsReady || text.isBlank()) return
        val clean = text.replace(Regex("[*_`#>-]+"), " ").replace(Regex("\\s+"), " ").trim()
        tts?.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "shamia-${System.currentTimeMillis()}")
    }

    fun stopSpeaking() {
        tts?.stop()
    }

    fun startAmbientTone(baseFreqHz: Double) {
        stopAmbientTone()
        ambientPlaying = true
        ambientThread = thread(isDaemon = true) {
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
        thread(isDaemon = true) {
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

    fun startListening(
        onPartial: (String) -> Unit,
        onFinal: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onError("Android Speech Recognition unavailable on this device.")
            return
        }
        speechRecognizer?.destroy()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) = onPartial("Listening...")
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onError(error: Int) {
                    onError("Voice capture ended (code $error).")
                }
                override fun onResults(results: Bundle?) {
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val final = matches?.firstOrNull()?.trim().orEmpty()
                    if (final.isNotEmpty()) onFinal(final) else onError("No clear speech detected.")
                }
                override fun onPartialResults(partialResults: Bundle?) {
                    val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if (!partial.isNullOrBlank()) onPartial(partial)
                }
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            }
            startListening(intent)
        }
    }

    fun stopListening() {
        speechRecognizer?.stopListening()
    }

    fun release() {
        stopAmbientTone()
        speechRecognizer?.destroy()
        tts?.shutdown()
    }
}
