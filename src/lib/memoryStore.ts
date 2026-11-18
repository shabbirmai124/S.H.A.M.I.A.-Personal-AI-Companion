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
    id: 'offline-core',
    name: 'S.H.A.M.I.A. Offline Core',
    provider: 'Built-In Local Engine',
    params: '0 MB · Instant',
    sizeLabel: 'Zero Download',
    minRamGb: 1,
    runtime: 'built-in',
    summary:
      'Works 100% offline with zero downloads: phone controls, English speaking coach & grammar tips, emotional support, alarms, and memory.',
    smartphoneReady: true,
  },
  {
    id: 'gemma-2b-edge',
    name: 'Gemma 2 2B / E2B (Q4)',
    provider: 'Google Open Weights (Ollama / Edge)',
    params: '2.0B',
    sizeLabel: '~1.4 GB Q4',
    minRamGb: 4,
    runtime: 'ollama',
    ollamaTag: 'gemma2:2b',
    summary:
      '2-billion parameter phone-optimized open model for fast local reasoning, function routing, and private offline chat.',
    smartphoneReady: true,
  },
  {
    id: 'qwen25-1.5b-edge',
    name: 'Qwen 2.5 1.5B Instruct',
    provider: 'Alibaba Apache 2.0 (Ollama / WebGPU)',
    params: '1.5B',
    sizeLabel: '~980 MB Q4',
    minRamGb: 3,
    runtime: 'ollama',
    ollamaTag: 'qwen2.5:1.5b',
    hfRepo: 'onnx-community/Qwen2.5-1.5B-Instruct',
    summary:
      'Ultra-capable 1.5B open-source model ideal for smartphones: excels at English fluency tutoring and structured device commands.',
    smartphoneReady: true,
  },
  {
    id: 'smollm2-1.7b-edge',
    name: 'SmolLM2 1.7B Instruct',
    provider: 'Hugging Face Apache 2.0',
    params: '1.7B',
    sizeLabel: '~1.0 GB',
    minRamGb: 3,
    runtime: 'ollama',
    ollamaTag: 'smollm2:1.7b',
    hfRepo: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
    summary:
      'Compact ~2B-class open model built specifically for mobile CPUs/NPUs with low battery consumption.',
    smartphoneReady: true,
  },
  {
    id: 'qwen25-0.5b-webgpu',
    name: 'Qwen 2.5 0.5B (In-Browser WebGPU)',
    provider: 'Alibaba · Runs Directly in Browser',
    params: '0.5B',
    sizeLabel: '~390 MB Cache',
    minRamGb: 2,
    runtime: 'webgpu',
    hfRepo: 'onnx-community/Qwen2.5-0.5B-Instruct',
    summary:
      'Download once into browser IndexedDB cache and run offline inside mobile Chrome/Safari with zero server required.',
    smartphoneReady: true,
  },
  {
    id: 'llama32-1b-edge',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta Open Weights (Ollama)',
    params: '1.2B',
    sizeLabel: '~780 MB Q4',
    minRamGb: 3,
    runtime: 'ollama',
    ollamaTag: 'llama3.2:1b',
    summary:
      'Meta mobile-first 1B quantized model optimized for Snapdragon, Tensor, and Apple Silicon smartphones.',
    smartphoneReady: true,
  },
  {
    id: 'cloud-free',
    name: 'Free Open Web + Server AI',
    provider: 'Live Web Search + Free Server Proxy',
    params: 'Cloud + Search',
    sizeLabel: 'Real-Time Web',
    minRamGb: 1,
    runtime: 'cloud',
    summary:
      'Combines real-time open web search (DuckDuckGo + Wikipedia) with secure server-side AI synthesis—zero keys exposed.',
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
