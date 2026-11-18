export type ConversationalIntent = 'general' | 'english-tutor' | 'mental-support' | 'device-action';

export type AIEngineTier = 'offline-core' | 'webgpu-local' | 'ollama-local' | 'cloud-free';

export type PermissionCapability =
  | 'dial_contact'
  | 'open_app'
  | 'play_music'
  | 'set_alarm'
  | 'device_control'
  | 'manage_memory'
  | 'microphone';

export type PermissionPolicy = 'ask' | 'always' | 'deny';

export type DeviceActionType =
  | 'dial_contact'
  | 'open_app'
  | 'play_music'
  | 'set_alarm'
  | 'toggle_wifi'
  | 'toggle_bluetooth'
  | 'toggle_dnd'
  | 'toggle_flashlight'
  | 'set_brightness'
  | 'add_task'
  | 'complete_task'
  | 'clear_completed_tasks'
  | 'add_note';

export interface UserIdentityProfile {
  fullName: string;
  addressAs: string;
}

export interface DeviceControlState {
  wifi: boolean;
  bluetooth: boolean;
  dnd: boolean;
  flashlight: boolean;
  brightness: number; // 25 to 100
}

export interface OpenSourceModelSpec {
  id: string;
  name: string;
  provider: string;
  params: string;
  sizeLabel: string;
  minRamGb: number;
  runtime: 'built-in' | 'webgpu' | 'ollama' | 'cloud';
  hfRepo?: string;
  ollamaTag?: string;
  summary: string;
  smartphoneReady: boolean;
}

export interface PermissionRule {
  capability: PermissionCapability;
  label: string;
  description: string;
  policy: PermissionPolicy;
}

export interface PendingAction {
  id: string;
  type: DeviceActionType;
  capability: PermissionCapability;
  title: string;
  detail: string;
  payload: Record<string, string | number | boolean>;
  status: 'pending' | 'approved' | 'denied' | 'blocked';
  createdAt: string;
}

export interface CoachingTip {
  correction?: string;
  naturalPhrase?: string;
  tip?: string;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface HudMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: ConversationalIntent;
  source?:
    | 'offline-core'
    | 'webgpu-local'
    | 'ollama-local'
    | 'cloud-gemini'
    | 'cloud-research'
    | 'permission-gate';
  pendingAction?: PendingAction;
  coachingTip?: CoachingTip;
  showBreathingTool?: boolean;
  groundingLinks?: GroundingLink[];
}

export interface TaskItem {
  id: string;
  title: string;
  priority: 'high' | 'normal';
  completed: boolean;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
}

export interface AlarmItem {
  id: string;
  label: string;
  triggerAt: number;
  triggered: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: 'focus' | 'energize' | 'calm';
  bpm: number;
  baseFreq: number;
  chord: number[];
}

export type CoreVisualState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'awaiting-permission';
