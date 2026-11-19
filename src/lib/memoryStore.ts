import type {
  AlarmItem,
  DeviceControlState,
  MusicTrack,
  NoteItem,
  OfflineVoiceModelSpec,
  OpenSourceModelSpec,
  PermissionCapability,
  PermissionPolicy,
  PermissionRule,
  RoutineItem,
  SyllabusItem,
  TaskItem,
  UserIdentityProfile,
} from '../types/shamia';

export const SYSTEM_NAME = 'S.H.A.M.I.A.';
export const SYSTEM_MEANING = 'Smart Human-aligned Assistant & Mindful Interactive Aid';
export const AUTHOR_NAME = 'Md Shabbir Mia';
export const AUTHOR_EMAIL = 'shabbirmia520@gmail.com';

export const DEFAULT_USER_IDENTITY: UserIdentityProfile = {
  fullName: 'Md Shabbir Mia',
  addressAs: 'Sir',
};

export const DEFAULT_DEVICE_CONTROLS: DeviceControlState = {
  wifi: true,
  bluetooth: true,
  dnd: false,
  flashlight: false,
  brightness: 100,
};

export const OPEN_SOURCE_MODEL_CATALOG: OpenSourceModelSpec[] = [
  {
    id: 'gemma-4-free',
    name: 'Gemma 4 · Real-Time Search',
    provider: 'Google · Live Google Search',
    params: '4B – 27B Cloud',
    sizeLabel: 'Free Cloud + Google Search',
    minRamGb: 4,
    chipsetNote: '4nm / 6nm Ready',
    runtime: 'cloud',
    family: 'gemma',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/gemma-3-1b-it-ONNX',
    ollamaTag: 'gemma3:4b',
    summary:
      'Gemma 4 assistant tier paired directly with real-time Google Search grounding and live device actions.',
    smartphoneReady: true,
  },
  {
    id: 'qwen3-8b-chinese',
    name: 'Qwen 3 8B (Chinese Open Weight)',
    provider: 'Alibaba Apache 2.0',
    params: '8B',
    sizeLabel: 'Free Cloud / ~4.8 GB Q4',
    minRamGb: 8,
    chipsetNote: '4nm Flagship Phone Ready',
    runtime: 'cloud',
    family: 'qwen',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/Qwen3-4B-ONNX',
    ollamaTag: 'qwen3:8b',
    summary:
      'Flagship under-10B Chinese open-weight reasoning model delivering top accuracy for study, science, and chat.',
    smartphoneReady: true,
  },
  {
    id: 'qwen3-4b-edge',
    name: 'Qwen 3 4B (Phone Efficiency King)',
    provider: 'Alibaba Apache 2.0',
    params: '4B',
    sizeLabel: 'Free Cloud / ~2.4 GB Q4',
    minRamGb: 4,
    chipsetNote: '4nm / 6nm Phone Ready',
    runtime: 'cloud',
    family: 'qwen',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/Qwen3-4B-ONNX',
    ollamaTag: 'qwen3:4b',
    summary:
      'Efficient 4B Chinese open-weight model rivaling 8B–14B models while fitting smoothly on 4nm/6nm phones.',
    smartphoneReady: true,
  },
  {
    id: 'minicpm-o-26',
    name: 'MiniCPM-o 2.6 8B (Chinese Voice AI)',
    provider: 'OpenBMB Tsinghua Open Source',
    params: '8B',
    sizeLabel: 'Free Cloud / ~4.9 GB Q4',
    minRamGb: 8,
    chipsetNote: '4nm Flagship Voice & AI',
    runtime: 'cloud',
    family: 'minicpm',
    freeOnlineAvailable: true,
    ollamaTag: 'minicpm-o2.6',
    summary:
      'Tsinghua OpenBMB under-10B open model optimized for accurate spoken voice assistant conversation.',
    smartphoneReady: true,
  },
  {
    id: 'glm-4-9b',
    name: 'GLM-4 9B Chat (Zhipu Chinese Open)',
    provider: 'Zhipu AI Apache 2.0',
    params: '9B',
    sizeLabel: 'Free Cloud / ~5.3 GB Q4',
    minRamGb: 8,
    chipsetNote: '4nm Flagship Ready',
    runtime: 'cloud',
    family: 'glm',
    freeOnlineAvailable: true,
    ollamaTag: 'glm4:9b',
    summary:
      'Popular Zhipu AI 9B Chinese open-weight model built for high-precision reasoning, coding, and syllabus study.',
    smartphoneReady: true,
  },
  {
    id: 'nemotron-nano-8b',
    name: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    provider: 'NVIDIA Open Model License',
    params: '8B',
    sizeLabel: 'NVIDIA NIM / HF / ~4.7 GB Ollama',
    minRamGb: 8,
    chipsetNote: '4nm Flagship Phone Ready',
    runtime: 'cloud',
    family: 'nemotron',
    freeOnlineAvailable: true,
    ollamaTag: 'nemotron-mini',
    summary:
      'NVIDIA open-weight 8B reasoning & instruction model via NVIDIA NIM, HuggingFace Router, OpenRouter, or local Ollama.',
    smartphoneReady: true,
  },
  {
    id: 'nemotron-mini-4b',
    name: 'NVIDIA Nemotron Mini 4B (Mobile Edge)',
    provider: 'NVIDIA Open Model License',
    params: '4B',
    sizeLabel: 'NVIDIA NIM / HF / ~2.3 GB Ollama',
    minRamGb: 4,
    chipsetNote: '4nm / 6nm Phone Ready',
    runtime: 'cloud',
    family: 'nemotron',
    freeOnlineAvailable: true,
    ollamaTag: 'nemotron-mini:4b',
    summary:
      'NVIDIA compact 4B open-weight model pruned and distilled for fast mobile reasoning via NVIDIA NIM, HuggingFace, or local Ollama.',
    smartphoneReady: true,
  },
  {
    id: 'gpt-oss-20b-free',
    name: 'GPT-OSS 20B (Open Weights)',
    provider: 'OpenAI Apache 2.0',
    params: '20B MoE',
    sizeLabel: 'Free Cloud / ~13 GB Ollama',
    minRamGb: 16,
    chipsetNote: 'Free Cloud / 16GB+ Local',
    runtime: 'cloud',
    family: 'gpt-oss',
    freeOnlineAvailable: true,
    ollamaTag: 'gpt-oss:20b',
    summary:
      '20-billion parameter Apache 2.0 open-weight reasoning model for deep answers online or locally via Ollama.',
    smartphoneReady: true,
  },
  {
    id: 'gemma-3-free',
    name: 'Gemma 3 · Open Weights',
    provider: 'Google Open Source',
    params: '1B – 4B',
    sizeLabel: 'Free Cloud / ~1.4 GB Q4',
    minRamGb: 2,
    chipsetNote: '6nm+ / 4nm Ready',
    runtime: 'cloud',
    family: 'gemma',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/gemma-3-1b-it-ONNX',
    ollamaTag: 'gemma3:1b',
    summary:
      'Runs free immediately online with live Google Search, or install offline via browser WebGPU / Ollama.',
    smartphoneReady: true,
  },
  {
    id: 'llama-32-free',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta Open Source',
    params: '1.2B',
    sizeLabel: 'Free Cloud / ~780 MB Q4',
    minRamGb: 2,
    chipsetNote: '6nm+ / 4nm Ready',
    runtime: 'cloud',
    family: 'llama',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/Llama-3.2-1B-Instruct-q4f16',
    ollamaTag: 'llama3.2:1b',
    summary:
      'Meta mobile-optimized 1B open model. Instant free chat online, or cache locally for offline use.',
    smartphoneReady: true,
  },
  {
    id: 'qwen25-1.5b-edge',
    name: 'Qwen 2.5 1.5B Instruct',
    provider: 'Alibaba Apache 2.0',
    params: '1.5B',
    sizeLabel: 'Free Cloud / ~980 MB Q4',
    minRamGb: 3,
    chipsetNote: '6nm+ / 4nm Ready',
    runtime: 'cloud',
    family: 'qwen',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/Qwen2.5-1.5B-Instruct',
    ollamaTag: 'qwen2.5:1.5b',
    summary:
      'Balanced 1.5B open-source model strong at English fluency coaching and structured replies.',
    smartphoneReady: true,
  },
  {
    id: 'phi35-mini-free',
    name: 'Phi-3.5 Mini Instruct',
    provider: 'Microsoft MIT Open Source',
    params: '3.8B Q4',
    sizeLabel: 'Free Cloud / ~2.1 GB Q4',
    minRamGb: 6,
    chipsetNote: '4nm Flagship Ready',
    runtime: 'cloud',
    family: 'phi',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
    ollamaTag: 'phi3.5',
    summary:
      'High-accuracy 4nm flagship smartphone & desktop model with MIT open-source licensing.',
    smartphoneReady: true,
  },
  {
    id: 'smollm2-1.7b-edge',
    name: 'SmolLM2 1.7B Instruct',
    provider: 'Hugging Face Apache 2.0',
    params: '1.7B',
    sizeLabel: 'Free Cloud / ~1.0 GB',
    minRamGb: 3,
    chipsetNote: '6nm+ Ready',
    runtime: 'cloud',
    family: 'smollm',
    freeOnlineAvailable: true,
    hfRepo: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
    ollamaTag: 'smollm2:1.7b',
    summary:
      'Compact ~2B open model engineered for low-power mobile CPUs and local Ollama servers.',
    smartphoneReady: true,
  },
  {
    id: 'qwen25-0.5b-webgpu',
    name: 'Qwen 2.5 0.5B (Offline Cache)',
    provider: 'Browser WebGPU / WASM',
    params: '0.5B',
    sizeLabel: '~390 MB Cache',
    minRamGb: 2,
    chipsetNote: 'Any 6nm+ Phone',
    runtime: 'webgpu',
    family: 'qwen',
    hfRepo: 'onnx-community/Qwen2.5-0.5B-Instruct',
    summary:
      'Download once into browser IndexedDB cache and run offline inside mobile Chrome/Safari.',
    smartphoneReady: true,
  },
  {
    id: 'smollm2-360m-webgpu',
    name: 'SmolLM2 360M (Ultra-Light)',
    provider: 'Browser WebGPU / WASM',
    params: '0.36B',
    sizeLabel: '~260 MB Cache',
    minRamGb: 2,
    chipsetNote: 'Any Phone',
    runtime: 'webgpu',
    family: 'smollm',
    hfRepo: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    summary:
      'Ultra-compact open model built to run smoothly offline even on entry-level 6nm/8nm phones.',
    smartphoneReady: true,
  },
  {
    id: 'offline-core',
    name: 'DeepSeek 2B · S.H.A.M.I.A. Offline Core',
    provider: 'DeepSeek-R1 2B Engine / Built-In',
    params: '2B Distill / 0 MB Instant',
    sizeLabel: '0 MB Instant · Optional ~1.0 GB Q4',
    minRamGb: 1,
    chipsetNote: 'Any Device (6nm+ / 4nm Ready)',
    runtime: 'built-in',
    family: 'deepseek',
    hfRepo: 'onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX',
    ollamaTag: 'deepseek-r1:1.5b',
    summary:
      'DeepSeek 2B-class offline edition: instant 0 MB engine for phone controls, alarms, tasks, English tips & breathing, plus one-tap DeepSeek Q4 offline browser cache.',
    smartphoneReady: true,
  },
];

export const OPEN_SOURCE_VOICE_MODELS: OfflineVoiceModelSpec[] = [
  {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny.en (Offline Mic)',
    kind: 'stt',
    provider: 'OpenAI MIT · In-Browser ONNX',
    sizeLabel: '~45 MB Cache',
    minRamGb: 1,
    hfRepo: 'onnx-community/whisper-tiny.en',
    summary: 'Transcribes your spoken voice locally 100% offline inside the browser.',
  },
  {
    id: 'whisper-base-en',
    name: 'Whisper Base.en (HD Mic)',
    kind: 'stt',
    provider: 'OpenAI MIT · In-Browser ONNX',
    sizeLabel: '~85 MB Cache',
    minRamGb: 2,
    hfRepo: 'onnx-community/whisper-base.en',
    summary: 'Higher-accuracy offline English speech recognition for diverse accents.',
  },
  {
    id: 'whisper-small-en',
    name: 'Whisper Small.en (Pro Accuracy)',
    kind: 'stt',
    provider: 'OpenAI MIT · In-Browser ONNX',
    sizeLabel: '~240 MB Cache',
    minRamGb: 4,
    hfRepo: 'onnx-community/whisper-small.en',
    summary: 'Flagship phone offline voice recognition accuracy for lectures, terms, and conversation.',
  },
  {
    id: 'kokoro-82m-tts',
    name: 'Kokoro 82M (Offline Voice)',
    kind: 'tts',
    provider: 'Apache 2.0 · In-Browser ONNX',
    sizeLabel: '~85 MB Cache',
    minRamGb: 2,
    hfRepo: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    summary: 'Natural human-sounding neural voice output cached and synthesized completely offline.',
  },
];

export const DEFAULT_PERMISSION_RULES: PermissionRule[] = [
  {
    capability: 'dial_contact',
    label: 'Phone Dialer',
    description: 'Place calls or open tel: links when you ask to dial a number.',
    policy: 'ask',
  },
  {
    capability: 'open_app',
    label: 'App Launcher',
    description: 'Open external apps and web destinations (Spotify, Maps, Calendar, Gmail).',
    policy: 'ask',
  },
  {
    capability: 'device_control',
    label: 'Phone Hardware Controls',
    description: 'Toggle Wi-Fi, Bluetooth, Do Not Disturb, Flashlight, and Screen Brightness.',
    policy: 'ask',
  },
  {
    capability: 'play_music',
    label: 'Music & Media',
    description: 'Start ambient audio playback and control the active track queue.',
    policy: 'ask',
  },
  {
    capability: 'set_alarm',
    label: 'Alarms & Timers',
    description: 'Arm countdown alarms and play audible chime alerts.',
    policy: 'ask',
  },
  {
    capability: 'manage_memory',
    label: 'Tasks & Notes Memory',
    description: 'Save priorities, notes, and clear completed items in local storage.',
    policy: 'always',
  },
  {
    capability: 'microphone',
    label: 'Voice Microphone',
    description: 'Capture spoken commands via browser Speech Recognition.',
    policy: 'ask',
  },
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Review daily schedule and focus priorities',
    priority: 'high',
    completed: false,
    createdAt: '2026-11-17T08:30:00.000Z',
  },
  {
    id: 'task-2',
    title: 'Practice 5 minutes of spoken English conversation',
    priority: 'normal',
    completed: false,
    createdAt: '2026-11-17T08:45:00.000Z',
  },
];

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    content: 'All phone actions remain strictly gated behind your Permission Vault.',
    createdAt: '2026-11-17T08:30:00.000Z',
  },
];

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-obsidian-focus',
    title: 'Obsidian Atelier Resonance',
    artist: 'S.H.A.M.I.A. Synth Core',
    mood: 'focus',
    bpm: 92,
    baseFreq: 146.83,
    chord: [146.83, 220.0, 261.63, 329.63],
  },
  {
    id: 'track-midnight-drive',
    title: 'Midnight Telemetry Pulse',
    artist: 'S.H.A.M.I.A. Synth Core',
    mood: 'energize',
    bpm: 112,
    baseFreq: 130.81,
    chord: [130.81, 196.0, 246.94, 293.66],
  },
  {
    id: 'track-calm-horizon',
    title: 'Calm Horizon Breathing',
    artist: 'S.H.A.M.I.A. Synth Core',
    mood: 'calm',
    bpm: 64,
    baseFreq: 110.0,
    chord: [110.0, 164.81, 220.0, 246.94],
  },
];

export function policiesRecordFromRules(
  rules: PermissionRule[]
): Record<PermissionCapability, PermissionPolicy> {
  return rules.reduce(
    (acc, rule) => {
      acc[rule.capability] = rule.policy;
      return acc;
    },
    {} as Record<PermissionCapability, PermissionPolicy>
  );
}

export function addTaskItem(
  tasks: TaskItem[],
  title: string,
  priority: 'high' | 'normal' = 'normal',
  id: string = `task-${Date.now()}`,
  createdAt: string = new Date().toISOString()
): TaskItem[] {
  const clean = title.trim();
  if (!clean) return tasks;
  return [{ id, title: clean, priority, completed: false, createdAt }, ...tasks];
}

export function toggleTaskItem(tasks: TaskItem[], id: string): TaskItem[] {
  return tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
}

export function clearCompletedTaskItems(tasks: TaskItem[]): TaskItem[] {
  return tasks.filter((t) => !t.completed);
}

export function addNoteItem(
  notes: NoteItem[],
  content: string,
  id: string = `note-${Date.now()}`,
  createdAt: string = new Date().toISOString()
): NoteItem[] {
  const clean = content.trim();
  if (!clean) return notes;
  return [{ id, content: clean, createdAt }, ...notes];
}

export function deleteNoteItem(notes: NoteItem[], id: string): NoteItem[] {
  return notes.filter((n) => n.id !== id);
}

export function addAlarmItem(
  alarms: AlarmItem[],
  label: string,
  triggerAt: number,
  id: string = `alarm-${Date.now()}`
): AlarmItem[] {
  return [...alarms, { id, label, triggerAt, triggered: false }];
}

export function dismissAlarmItem(alarms: AlarmItem[], id: string): AlarmItem[] {
  return alarms.filter((a) => a.id !== id);
}

export function formatCountdown(triggerAt: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((triggerAt - nowMs) / 1000));
  if (diffSec === 0) return '00:00';
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export const INITIAL_ROUTINE: RoutineItem[] = [
  {
    id: 'routine-1',
    timeLabel: '07:30 AM',
    title: 'Morning Warmup & 10-Min English Speaking Practice',
    category: 'routine',
    completed: false,
  },
  {
    id: 'routine-2',
    timeLabel: '09:30 AM',
    title: 'University Lectures & Core Concept Notes',
    category: 'class',
    completed: false,
  },
  {
    id: 'routine-3',
    timeLabel: '07:30 PM',
    title: 'Deep Syllabus Revision & Past Questions',
    category: 'study',
    completed: false,
  },
];

export const INITIAL_SYLLABUS: SyllabusItem[] = [
  {
    id: 'syl-1',
    courseCode: 'CS-301',
    courseTitle: 'Algorithms & Data Structures',
    topic: 'Dynamic Programming, Graph Traversal & Complexity',
    examNote: 'Unit 3 · Midterm Focus',
    completed: false,
  },
  {
    id: 'syl-2',
    courseCode: 'CS-304',
    courseTitle: 'Operating Systems & Architecture',
    topic: 'Process Scheduling, Virtual Memory & 4nm/6nm SoC Basics',
    examNote: 'Unit 2 · Lab Next Week',
    completed: false,
  },
];

export function addRoutineItem(
  items: RoutineItem[],
  timeLabel: string,
  title: string,
  category: RoutineItem['category'] = 'study',
  id: string = `routine-${Date.now()}`
): RoutineItem[] {
  const cleanTitle = title.trim();
  if (!cleanTitle) return items;
  return [
    ...items,
    {
      id,
      timeLabel: timeLabel.trim() || '08:00 AM',
      title: cleanTitle,
      category,
      completed: false,
    },
  ];
}

export function toggleRoutineItem(items: RoutineItem[], id: string): RoutineItem[] {
  return items.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
}

export function deleteRoutineItem(items: RoutineItem[], id: string): RoutineItem[] {
  return items.filter((r) => r.id !== id);
}

export function addSyllabusItem(
  items: SyllabusItem[],
  courseCode: string,
  courseTitle: string,
  topic: string,
  examNote?: string,
  id: string = `syl-${Date.now()}`
): SyllabusItem[] {
  const cleanCourse = courseTitle.trim();
  const cleanTopic = topic.trim();
  if (!cleanCourse && !cleanTopic) return items;
  return [
    {
      id,
      courseCode: courseCode.trim().toUpperCase() || 'COURSE',
      courseTitle: cleanCourse || cleanTopic,
      topic: cleanTopic || cleanCourse,
      examNote: examNote?.trim() || undefined,
      completed: false,
    },
    ...items,
  ];
}

export function toggleSyllabusItem(items: SyllabusItem[], id: string): SyllabusItem[] {
  return items.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
}

export function deleteSyllabusItem(items: SyllabusItem[], id: string): SyllabusItem[] {
  return items.filter((s) => s.id !== id);
}
