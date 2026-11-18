import type {
  AlarmItem,
  DeviceControlState,
  MusicTrack,
  NoteItem,
  OpenSourceModelSpec,
  PermissionCapability,
  PermissionPolicy,
  PermissionRule,
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
    id: 'gemma-3-free',
    name: 'Gemma 3 · Open Weights',
    provider: 'Google Open Source · Free Online & Local',
    params: '1B – 4B',
    sizeLabel: 'Free Cloud / ~1.4 GB Q4',
    minRamGb: 2,
    runtime: 'cloud',
    family: 'gemma',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/gemma-3-1b-it-ONNX',
    ollamaTag: 'gemma3:1b',
    summary:
      'Runs free immediately online with live web search, or load locally via browser WebGPU / Ollama.',
    smartphoneReady: true,
  },
  {
    id: 'llama-32-free',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta Open Source · Free Online & Local',
    params: '1.2B',
    sizeLabel: 'Free Cloud / ~780 MB Q4',
    minRamGb: 2,
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
    provider: 'Alibaba Apache 2.0 · Free Online & Local',
    params: '1.5B',
    sizeLabel: 'Free Cloud / ~980 MB Q4',
    minRamGb: 3,
    runtime: 'cloud',
    family: 'qwen',
    freeOnlineAvailable: true,
    hfRepo: 'onnx-community/Qwen2.5-0.5B-Instruct',
    ollamaTag: 'qwen2.5:1.5b',
    summary:
      'Balanced 1.5B open-source model strong at English fluency coaching and structured replies.',
    smartphoneReady: true,
  },
  {
    id: 'smollm2-1.7b-edge',
    name: 'SmolLM2 1.7B Instruct',
    provider: 'Hugging Face Apache 2.0 · Free Online & Local',
    params: '1.7B',
    sizeLabel: 'Free Cloud / ~1.0 GB',
    minRamGb: 3,
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
    runtime: 'webgpu',
    family: 'qwen',
    hfRepo: 'onnx-community/Qwen2.5-0.5B-Instruct',
    summary:
      'Download once into browser IndexedDB cache and run offline inside mobile Chrome/Safari.',
    smartphoneReady: true,
  },
  {
    id: 'offline-core',
    name: 'S.H.A.M.I.A. Offline Core',
    provider: 'Built-In Local Engine',
    params: '0 MB · Instant',
    sizeLabel: 'Zero Download',
    minRamGb: 1,
    runtime: 'built-in',
    family: 'offline',
    summary:
      'Instant 0 MB offline engine for phone controls, alarms, tasks, English grammar tips, and breathing.',
    smartphoneReady: true,
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
