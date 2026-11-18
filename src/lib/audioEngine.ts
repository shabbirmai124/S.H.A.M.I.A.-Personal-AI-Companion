import type { MusicTrack } from '../types/shamia';
import { offlineVoiceRunner } from './openSourceEngine';

// Polyphonic Web Audio ambient synth player + alarm chime + British TTS + Speech Recognition wrapper

class ShamiaAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;
  private masterGain: GainNode | null = null;
  private step = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public startTrack(track: MusicTrack, volume = 0.28): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    this.stopTrack();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(Math.max(0.02, Math.min(0.6, volume)), ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    this.isPlaying = true;
    this.step = 0;

    const triggerNote = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const freq = track.chord[this.step % track.chord.length];
      this.step += 1;

      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc.type = track.mood === 'calm' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq * 0.5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(track.mood === 'energize' ? 1200 : 720, now);

      env.gain.setValueAtTime(0.001, now);
      env.gain.exponentialRampToValueAtTime(0.22, now + 0.14);
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(env);
      env.connect(this.masterGain);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + 1.4);
      subOsc.stop(now + 1.4);
    };

    triggerNote();
    const beatMs = Math.round((60 / track.bpm) * 1000);
    this.intervalId = window.setInterval(triggerNote, beatMs);
    return true;
  }

  public setVolume(volume: number) {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0.01, Math.min(0.6, volume)),
        this.ctx.currentTime
      );
    }
  }

  public stopTrack() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
  }

  public playChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }
}

export const shamiaAudio = new ShamiaAudioEngine();

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeOfflineSource: AudioBufferSourceNode | null = null;

function cleanSpeechText(raw: string): string {
  return raw
    .replace(/[*_`#>-]+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speakShamia(
  text: string,
  options: {
    enabled: boolean;
    persona?: 'female' | 'male';
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  if (typeof window === 'undefined' || !options.enabled) {
    options.onEnd?.();
    return;
  }

  const spoken = cleanSpeechText(text);
  if (!spoken) {
    options.onEnd?.();
    return;
  }

  const persona = options.persona || 'female';

  // Prefer installed offline open-source neural voice (Kokoro 82M) if loaded
  if (offlineVoiceRunner.isTtsReady()) {
    options.onStart?.();
    void (async () => {
      try {
        const res = await offlineVoiceRunner.synthesizeSpeech(spoken, persona);
        if (res && res.audio.length > 0) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') await ctx.resume();
            const buf = ctx.createBuffer(1, res.audio.length, res.sampleRate);
            buf.copyToChannel(new Float32Array(res.audio), 0);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            activeOfflineSource?.stop();
            activeOfflineSource = src;
            src.onended = () => {
              activeOfflineSource = null;
              void ctx.close().catch(() => {});
              options.onEnd?.();
            };
            src.start();
            return;
          }
        }
      } catch {
        // Fallback smoothly to browser speech synthesis below
      }
      speakWithBrowserSpeech(spoken, { ...options, persona });
    })();
    return;
  }

  speakWithBrowserSpeech(spoken, { ...options, persona });
}

function selectClearNaturalVoice(
  voices: SpeechSynthesisVoice[],
  persona: 'female' | 'male'
): SpeechSynthesisVoice | undefined {
  const enVoices = voices.filter((v) => /^en[-_]/i.test(v.lang) || /^en$/i.test(v.lang));
  const pool = enVoices.length > 0 ? enVoices : voices;

  const femalePattern =
    /natural|neural|aria|jenny|sonia|samantha|ava|allison|serena|martha|karen|libby|hazel|susan|zira|victoria|google uk english female|google us english/i;
  const malePattern =
    /natural|neural|guy|ryan|andrew|brian|christopher|eric|daniel|ARTHUR|oliver|george|alex|david|mark|google uk english male/i;
  const explicitFemaleNames =
    /aria|jenny|sonia|samantha|ava|allison|serena|martha|karen|libby|hazel|susan|zira|victoria|female/i;
  const explicitMaleNames =
    /guy|ryan|andrew|brian|christopher|eric|daniel|arthur|oliver|george|alex|david|mark|\bmale\b/i;

  if (persona === 'female') {
    return (
      pool.find((v) => /natural|neural|google/i.test(v.name) && explicitFemaleNames.test(v.name)) ||
      pool.find((v) => explicitFemaleNames.test(v.name)) ||
      pool.find((v) => femalePattern.test(v.name) && !explicitMaleNames.test(v.name)) ||
      pool[0]
    );
  }

  return (
    pool.find((v) => /natural|neural|google/i.test(v.name) && explicitMaleNames.test(v.name)) ||
    pool.find((v) => explicitMaleNames.test(v.name)) ||
    pool.find((v) => malePattern.test(v.name) && !explicitFemaleNames.test(v.name)) ||
    pool[0]
  );
}

function speakWithBrowserSpeech(
  spoken: string,
  options: {
    persona?: 'female' | 'male';
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  if (!('speechSynthesis' in window)) {
    options.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(spoken);
    activeUtterance = utterance;

    const persona = options.persona || 'female';
    const voices = window.speechSynthesis.getVoices();
    const chosenVoice = selectClearNaturalVoice(voices, persona);

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }
    utterance.lang = chosenVoice?.lang || 'en-US';
    // Clear, unhurried articulation (0.94x speed) so non-native and native listeners understand every word effortlessly
    utterance.rate = 0.94;
    utterance.pitch = persona === 'female' ? 1.03 : 0.96;

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => {
      activeUtterance = null;
      options.onEnd?.();
    };
    utterance.onerror = () => {
      activeUtterance = null;
      options.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    activeUtterance = null;
    options.onEnd?.();
  }
}

export function stopSpeakingShamia() {
  if (activeOfflineSource) {
    try {
      activeOfflineSource.stop();
    } catch {
      // ignore
    }
    activeOfflineSource = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export interface VoiceRecognitionHandle {
  supported: boolean;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionResultEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

export function createVoiceRecognizer(callbacks: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (reason: string) => void;
  onEnd: () => void;
}): VoiceRecognitionHandle {
  if (typeof window === 'undefined') {
    return { supported: false, start: () => {}, stop: () => {} };
  }

  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  const RecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!RecCtor) {
    return { supported: false, start: () => {}, stop: () => {} };
  }

  const recognition = new RecCtor();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let interim = '';
    let finalText = '';
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }
    if (interim.trim()) {
      callbacks.onInterim(interim.trim());
    }
    if (finalText.trim()) {
      callbacks.onFinal(finalText.trim());
    }
  };

  recognition.onerror = (event) => {
    callbacks.onError(event.error || 'Voice capture interrupted');
  };

  recognition.onend = () => {
    callbacks.onEnd();
  };

  return {
    supported: true,
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}

export function createOfflineWhisperRecognizer(callbacks: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (reason: string) => void;
  onEnd: () => void;
}): VoiceRecognitionHandle {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { supported: false, start: () => {}, stop: () => {} };
  }

  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: Blob[] = [];

  return {
    supported: true,
    start: () => {
      void (async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          recorder.onstop = () => {
            void (async () => {
              try {
                callbacks.onInterim('Transcribing offline via Whisper...');
                const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
                const buf = await blob.arrayBuffer();
                const ctx = new AudioContext({ sampleRate: 16000 });
                const decoded = await ctx.decodeAudioData(buf);
                const channel = decoded.getChannelData(0);
                const text = await offlineVoiceRunner.transcribeAudio(channel);
                await ctx.close().catch(() => {});
                if (text) callbacks.onFinal(text);
                else callbacks.onError('No clear speech detected.');
              } catch {
                callbacks.onError('Offline voice transcription interrupted.');
              } finally {
                stream?.getTracks().forEach((t) => t.stop());
                callbacks.onEnd();
              }
            })();
          };
          recorder.start();
          callbacks.onInterim('Recording offline audio... Tap mic to finish');
        } catch {
          callbacks.onError('not-allowed');
          callbacks.onEnd();
        }
      })();
    },
    stop: () => {
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
      } else {
        stream?.getTracks().forEach((t) => t.stop());
        callbacks.onEnd();
      }
    },
  };
}
