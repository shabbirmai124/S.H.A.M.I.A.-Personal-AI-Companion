import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Battery,
  BatteryCharging,
  Globe,
  Mic,
  MicOff,
  PanelRight,
  Send,
  User,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { AccountIdentityModal } from './components/AccountIdentityModal';
import { HudMessageCard } from './components/HudMessageCard';
import { MediaBar } from './components/MediaBar';
import { MemoryAndPermissionsPanel } from './components/MemoryAndPermissionsPanel';
import { QuantumCore } from './components/QuantumCore';
import {
  createVoiceRecognizer,
  jarvisAudio,
  speakJarvis,
  stopSpeakingJarvis,
  type VoiceRecognitionHandle,
} from './lib/audioEngine';
import {
  ACTION_TO_CAPABILITY,
  detectConversationalIntent,
  evaluatePermission,
  matchLocalIntent,
  resolveSupportedApp,
  validatePhoneNumber,
} from './lib/intentEngine';
import { buildShamiaSystemInstruction } from './lib/jarvisPrompts';
import {
  addAlarmItem,
  addNoteItem,
  addTaskItem,
  clearCompletedTaskItems,
  DEFAULT_DEVICE_CONTROLS,
  DEFAULT_PERMISSION_RULES,
  DEFAULT_USER_IDENTITY,
  deleteNoteItem,
  dismissAlarmItem,
  INITIAL_NOTES,
  INITIAL_TASKS,
  MUSIC_TRACKS,
  OPEN_SOURCE_MODEL_CATALOG,
  policiesRecordFromRules,
  SYSTEM_MEANING,
  SYSTEM_NAME,
  toggleTaskItem,
} from './lib/memoryStore';
import { generateOfflineCompanionReply } from './lib/offlineCompanion';
import {
  browserModelRunner,
  queryLocalOllama,
  runFreeWebSearch,
} from './lib/openSourceEngine';
import type {
  AlarmItem,
  CoreVisualState,
  DeviceControlState,
  GroundingLink,
  HudMessage,
  NoteItem,
  OpenSourceModelSpec,
  PendingAction,
  PermissionCapability,
  PermissionPolicy,
  PermissionRule,
  TaskItem,
  UserIdentityProfile,
} from './types/jarvis';

const STORAGE_KEYS = {
  tasks: 'shamia.tasks.v1',
  notes: 'shamia.notes.v1',
  permissions: 'shamia.permissions.v1',
  alarms: 'shamia.alarms.v1',
  identity: 'shamia.identity.v1',
  controls: 'shamia.controls.v1',
  modelId: 'shamia.model.v1',
  ollamaUrl: 'shamia.ollama.v1',
};

function loadStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const QUICK_SUGGESTIONS: Array<{ label: string; prompt: string; search?: boolean }> = [
  { label: 'Status Report', prompt: 'Status Report' },
  { label: 'Practice English', prompt: 'Let us practice spoken English together.' },
  { label: 'I Feel Stressed', prompt: 'I am feeling overwhelmed today and need a calm check-in.' },
  { label: 'Web Search', prompt: 'Search latest breakthroughs in solid-state smartphone batteries', search: true },
  { label: 'Set Alarm', prompt: 'Set alarm in 5 minutes' },
  { label: 'Play Music', prompt: 'Play focus music' },
];

export default function App() {
  const [identity, setIdentity] = useState<UserIdentityProfile>(() =>
    loadStoredJson(STORAGE_KEYS.identity, DEFAULT_USER_IDENTITY)
  );
  const [tasks, setTasks] = useState<TaskItem[]>(() =>
    loadStoredJson(STORAGE_KEYS.tasks, INITIAL_TASKS)
  );
  const [notes, setNotes] = useState<NoteItem[]>(() =>
    loadStoredJson(STORAGE_KEYS.notes, INITIAL_NOTES)
  );
  const [alarms, setAlarms] = useState<AlarmItem[]>(() =>
    loadStoredJson(STORAGE_KEYS.alarms, [])
  );
  const [permissions, setPermissions] = useState<PermissionRule[]>(() =>
    loadStoredJson(STORAGE_KEYS.permissions, DEFAULT_PERMISSION_RULES)
  );
  const [deviceControls, setDeviceControls] = useState<DeviceControlState>(() =>
    loadStoredJson(STORAGE_KEYS.controls, DEFAULT_DEVICE_CONTROLS)
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(() =>
    loadStoredJson(STORAGE_KEYS.modelId, 'offline-core')
  );
  const [ollamaUrl, setOllamaUrl] = useState<string>(() =>
    loadStoredJson(STORAGE_KEYS.ollamaUrl, 'http://127.0.0.1:11434')
  );
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(true);

  const [messages, setMessages] = useState<HudMessage[]>(() => [
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: `At your service, ${
        loadStoredJson(STORAGE_KEYS.identity, DEFAULT_USER_IDENTITY).addressAs || 'Sir'
      }. Offline core, phone controls, and live web search are calibrated. Ask me anything—from daily tasks and device actions to English speaking practice or quiet support.`,
      timestamp: new Date().toISOString(),
      source: 'offline-core',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [interimVoice, setInterimVoice] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Music Player State
  const [musicActive, setMusicActive] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.25);

  // Live Telemetry
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState<boolean | null>(null);

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<VoiceRecognitionHandle | null>(null);

  const permissionMap = useMemo(() => policiesRecordFromRules(permissions), [permissions]);
  const selectedModel: OpenSourceModelSpec = useMemo(
    () =>
      OPEN_SOURCE_MODEL_CATALOG.find((m) => m.id === selectedModelId) ||
      OPEN_SOURCE_MODEL_CATALOG[0],
    [selectedModelId]
  );

  const hasPendingApproval = useMemo(
    () => messages.some((m) => m.pendingAction?.status === 'pending'),
    [messages]
  );

  const coreState: CoreVisualState = isListening
    ? 'listening'
    : isThinking
      ? 'thinking'
      : isSpeaking
        ? 'speaking'
        : hasPendingApproval
          ? 'awaiting-permission'
          : 'idle';

  const addr = identity.addressAs.trim() || 'Sir';

  // Local persistence
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.identity, JSON.stringify(identity));
  }, [identity]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.alarms, JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.permissions, JSON.stringify(permissions));
  }, [permissions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.controls, JSON.stringify(deviceControls));
  }, [deviceControls]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.modelId, JSON.stringify(selectedModelId));
  }, [selectedModelId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.ollamaUrl, JSON.stringify(ollamaUrl));
  }, [ollamaUrl]);

  // Live Clock + Alarm Monitor
  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      setAlarms((prev) => {
        let fired: AlarmItem | null = null;
        const next = prev.map((alarm) => {
          if (!alarm.triggered && alarm.triggerAt <= current) {
            fired = alarm;
            return { ...alarm, triggered: true };
          }
          return alarm;
        });
        if (fired) {
          const alarmRef: AlarmItem = fired;
          jarvisAudio.playChime();
          const notice = `Excuse the interruption, ${addr}. Your alarm "${alarmRef.label}" is ringing now.`;
          setMessages((msgs) => [
            ...msgs,
            {
              id: `msg-alarm-${Date.now()}`,
              role: 'assistant',
              text: notice,
              timestamp: new Date().toISOString(),
              source: 'offline-core',
            },
          ]);
          speakJarvis(notice, {
            enabled: voiceOutputEnabled,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          });
        }
        return fired ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [addr, voiceOutputEnabled]);

  // Online/offline + Battery API listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (ev: string, fn: () => void) => void;
        removeEventListener: (ev: string, fn: () => void) => void;
      }>;
    };

    let batteryObj: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | null = null;
    const syncBattery = () => {
      if (!batteryObj) return;
      setBatteryLevel(Math.round(batteryObj.level * 100));
      setBatteryCharging(batteryObj.charging);
    };

    if (typeof nav.getBattery === 'function') {
      nav
        .getBattery()
        .then((bat) => {
          batteryObj = bat;
          syncBattery();
          bat.addEventListener('levelchange', syncBattery);
          bat.addEventListener('chargingchange', syncBattery);
        })
        .catch(() => {
          // Restricted
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', syncBattery);
        batteryObj.removeEventListener('chargingchange', syncBattery);
      }
      jarvisAudio.stopTrack();
      stopSpeakingJarvis();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const speakReply = useCallback(
    (text: string) => {
      speakJarvis(text, {
        enabled: voiceOutputEnabled,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    },
    [voiceOutputEnabled]
  );

  const updatePermissionPolicy = useCallback(
    (capability: PermissionCapability, policy: PermissionPolicy) => {
      setPermissions((prev) =>
        prev.map((rule) => (rule.capability === capability ? { ...rule, policy } : rule))
      );
    },
    []
  );

  const executeAuthorizedAction = useCallback(
    (action: PendingAction, overridePhone?: string): string => {
      switch (action.type) {
        case 'dial_contact': {
          const rawPhone =
            overridePhone || String(action.payload.phoneNumber || action.payload.target || '');
          const cleanPhone = validatePhoneNumber(rawPhone);
          if (!cleanPhone) {
            return `I need at least 3 valid digits to dial that number, ${addr}.`;
          }
          action.payload.phoneNumber = cleanPhone;
          return `Dialer ready for ${cleanPhone}, ${addr}. Select the dial link below to place the call.`;
        }
        case 'open_app': {
          const appName = String(action.payload.appName || 'Application');
          return `${appName} launch authorized, ${addr}. Select the launch link below to open it.`;
        }
        case 'toggle_wifi': {
          const enabled = Boolean(action.payload.enabled);
          setDeviceControls((prev) => ({ ...prev, wifi: enabled }));
          return `Wi-Fi has been switched ${enabled ? 'on' : 'off'}, ${addr}.`;
        }
        case 'toggle_bluetooth': {
          const enabled = Boolean(action.payload.enabled);
          setDeviceControls((prev) => ({ ...prev, bluetooth: enabled }));
          return `Bluetooth has been switched ${enabled ? 'on' : 'off'}, ${addr}.`;
        }
        case 'toggle_dnd': {
          const enabled = Boolean(action.payload.enabled);
          setDeviceControls((prev) => ({ ...prev, dnd: enabled }));
          return `Do Not Disturb is now ${enabled ? 'enabled' : 'disabled'}, ${addr}.`;
        }
        case 'toggle_flashlight': {
          const enabled = Boolean(action.payload.enabled);
          setDeviceControls((prev) => ({ ...prev, flashlight: enabled }));
          return `Flashlight beam is now ${enabled ? 'on' : 'off'}, ${addr}.`;
        }
        case 'set_brightness': {
          const level = Math.max(35, Math.min(100, Number(action.payload.level || 100)));
          setDeviceControls((prev) => ({ ...prev, brightness: level }));
          return `Display brightness adjusted to ${level}%, ${addr}.`;
        }
        case 'play_music': {
          const query = String(action.payload.query || '').toLowerCase();
          const matchedIndex = MUSIC_TRACKS.findIndex((t) => query.includes(t.mood));
          const idx = matchedIndex >= 0 ? matchedIndex : trackIndex;
          const track = MUSIC_TRACKS[idx];
          setTrackIndex(idx);
          const started = jarvisAudio.startTrack(track, musicVolume);
          setMusicActive(true);
          setMusicPlaying(started);
          return `Now playing "${track.title}", ${addr}.`;
        }
        case 'set_alarm': {
          const label = String(action.payload.label || 'Alarm');
          const triggerAt = Number(action.payload.triggerAt || Date.now() + 5 * 60 * 1000);
          const formattedTime = String(
            action.payload.formattedTime ||
              new Date(triggerAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );
          setAlarms((prev) => addAlarmItem(prev, label, triggerAt));
          return `Alarm "${label}" is armed for ${formattedTime}, ${addr}.`;
        }
        case 'add_task': {
          const title = String(action.payload.title || '');
          const priority = action.payload.priority === 'high' ? 'high' : 'normal';
          setTasks((prev) => addTaskItem(prev, title, priority));
          return `Priority "${title}" saved to your ledger, ${addr}.`;
        }
        case 'clear_completed_tasks': {
          setTasks((prev) => clearCompletedTaskItems(prev));
          return `Completed tasks have been cleared, ${addr}.`;
        }
        case 'add_note': {
          const content = String(action.payload.content || '');
          setNotes((prev) => addNoteItem(prev, content));
          return `Note archived locally, ${addr}.`;
        }
        default:
          return `Action completed, ${addr}.`;
      }
    },
    [addr, musicVolume, trackIndex]
  );

  const stageOrExecuteAction = useCallback(
    (
      proposed: Omit<PendingAction, 'id' | 'status' | 'createdAt'>,
      pendingPromptText?: string
    ) => {
      const cap = ACTION_TO_CAPABILITY[proposed.type];
      const verdict = evaluatePermission(permissionMap, cap);

      if (verdict === 'deny') {
        const blocked: PendingAction = {
          ...proposed,
          id: `act-${Date.now()}`,
          status: 'blocked',
          createdAt: new Date().toISOString(),
        };
        const text = `Permission for "${proposed.title}" is set to Deny in your Vault, ${addr}. I will not proceed.`;
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-gate-${Date.now()}`,
            role: 'assistant',
            text,
            timestamp: new Date().toISOString(),
            source: 'permission-gate',
            pendingAction: blocked,
          },
        ]);
        speakReply(text);
        return;
      }

      if (verdict === 'allow') {
        const approved: PendingAction = {
          ...proposed,
          id: `act-${Date.now()}`,
          status: 'approved',
          createdAt: new Date().toISOString(),
        };
        const text = executeAuthorizedAction(approved);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-exec-${Date.now()}`,
            role: 'assistant',
            text,
            timestamp: new Date().toISOString(),
            source: 'offline-core',
            pendingAction: approved,
          },
        ]);
        speakReply(text);
        return;
      }

      const pending: PendingAction = {
        ...proposed,
        id: `act-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const text = pendingPromptText || `Awaiting your authorization for "${proposed.title}", ${addr}.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ask-${Date.now()}`,
          role: 'assistant',
          text,
          timestamp: new Date().toISOString(),
          source: 'permission-gate',
          pendingAction: pending,
        },
      ]);
      speakReply(text);
    },
    [addr, executeAuthorizedAction, permissionMap, speakReply]
  );

  const handleResolvePendingAction = useCallback(
    (
      messageId: string,
      action: PendingAction,
      decision: 'authorize-once' | 'always-allow' | 'deny',
      overridePhone?: string
    ) => {
      if (decision === 'deny') {
        const denyText = `Understood, ${addr}. I have declined "${action.title}" and respected your permission.`;
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === messageId && m.pendingAction
              ? { ...m, pendingAction: { ...m.pendingAction, status: 'denied' as const } }
              : m
          ),
          {
            id: `msg-deny-${Date.now()}`,
            role: 'assistant',
            text: denyText,
            timestamp: new Date().toISOString(),
            source: 'permission-gate',
          },
        ]);
        speakReply(denyText);
        return;
      }

      if (decision === 'always-allow') {
        updatePermissionPolicy(action.capability, 'always');
      }

      const clonedAction: PendingAction = {
        ...action,
        payload: { ...action.payload },
        status: 'approved',
      };
      const outcomeText = executeAuthorizedAction(clonedAction, overridePhone);

      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === messageId && m.pendingAction ? { ...m, pendingAction: clonedAction } : m
        ),
        {
          id: `msg-exec-${Date.now()}`,
          role: 'assistant',
          text: outcomeText,
          timestamp: new Date().toISOString(),
          source: 'permission-gate',
        },
      ]);
      speakReply(outcomeText);
    },
    [addr, executeAuthorizedAction, speakReply, updatePermissionPolicy]
  );

  const applyDirectMemoryMutation = useCallback(
    (
      mutation:
        | { kind: 'add_task'; title: string; priority: 'high' | 'normal' }
        | { kind: 'clear_completed' }
        | { kind: 'add_note'; content: string }
    ) => {
      if (mutation.kind === 'add_task') {
        setTasks((prev) => addTaskItem(prev, mutation.title, mutation.priority));
      } else if (mutation.kind === 'clear_completed') {
        setTasks((prev) => clearCompletedTaskItems(prev));
      } else if (mutation.kind === 'add_note') {
        setNotes((prev) => addNoteItem(prev, mutation.content));
      }
    },
    []
  );

  const sendCommand = useCallback(
    async (rawText: string, options?: { forceWebSearch?: boolean }) => {
      const trimmed = rawText.trim();
      if (!trimmed || isThinking) return;

      setErrorBanner(null);
      setInputText('');

      const detectedIntent = detectConversationalIntent(trimmed);

      const userMsg: HudMessage = {
        id: `msg-user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: new Date().toISOString(),
        intent: detectedIntent,
      };
      setMessages((prev) => [...prev, userMsg]);

      // 1. Check instant offline device & action intent engine first
      const wantsSearch =
        Boolean(options?.forceWebSearch) ||
        /\b(search|research|look up|latest|news|who won|what happened|current price|weather)\b/i.test(
          trimmed
        );

      if (!wantsSearch) {
        const local = matchLocalIntent(trimmed, {
          now: new Date(),
          addressAs: addr,
          batteryLevel,
          batteryCharging,
          tasks,
          alarms,
          deviceControls,
        });

        if (local.handled) {
          if (local.directMemoryMutation) {
            const memVerdict = evaluatePermission(permissionMap, 'manage_memory');
            if (memVerdict === 'deny') {
              const refusal = `Memory storage is set to Deny in your Permission Vault, ${addr}.`;
              setMessages((prev) => [
                ...prev,
                {
                  id: `msg-j-${Date.now()}`,
                  role: 'assistant',
                  text: refusal,
                  timestamp: new Date().toISOString(),
                  source: 'permission-gate',
                },
              ]);
              speakReply(refusal);
              return;
            }
            if (memVerdict === 'allow') {
              applyDirectMemoryMutation(local.directMemoryMutation);
            }
          }

          if (local.proposedAction) {
            stageOrExecuteAction(local.proposedAction, local.replyText);
            return;
          }

          if (local.replyText) {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-j-${Date.now()}`,
                role: 'assistant',
                text: local.replyText!,
                timestamp: new Date().toISOString(),
                source: 'offline-core',
              },
            ]);
            speakReply(local.replyText);
            return;
          }
        }
      }

      // 2. Route conversational / web search / open-source 2B model queries
      setIsThinking(true);
      try {
        let groundingLinks: GroundingLink[] = [];
        let webSummary = '';

        if (wantsSearch && webSearchEnabled && isOnline) {
          try {
            const searchRes = await runFreeWebSearch(trimmed);
            groundingLinks = searchRes.links;
            webSummary = searchRes.summary;
          } catch {
            // Continue gracefully without live search if unreachable
          }
        }

        // Engine A: In-Browser WebGPU Open-Source Model (if loaded)
        if (
          selectedModel.runtime === 'webgpu' &&
          browserModelRunner.getLoadedModelId() === selectedModel.id
        ) {
          const reply = await browserModelRunner.generate(trimmed, identity, webSummary);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-j-${Date.now()}`,
              role: 'assistant',
              text: reply,
              timestamp: new Date().toISOString(),
              intent: detectedIntent,
              source: 'webgpu-local',
              groundingLinks,
              showBreathingTool: detectedIntent === 'mental-support',
            },
          ]);
          speakReply(reply);
          return;
        }

        // Engine B: Local Ollama 2B Phone/Edge Model
        if (selectedModel.runtime === 'ollama' && selectedModel.ollamaTag) {
          const sys = buildShamiaSystemInstruction(
            identity,
            detectedIntent,
            permissionMap,
            tasks.filter((t) => !t.completed).map((t) => t.title)
          );
          const promptWithWeb = webSummary
            ? `${trimmed}\n\n[Live Open Web Context]: ${webSummary}`
            : trimmed;
          const reply = await queryLocalOllama({
            endpoint: ollamaUrl,
            modelTag: selectedModel.ollamaTag,
            prompt: promptWithWeb,
            systemInstruction: sys,
            history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-j-${Date.now()}`,
              role: 'assistant',
              text: reply,
              timestamp: new Date().toISOString(),
              intent: detectedIntent,
              source: 'ollama-local',
              groundingLinks,
              showBreathingTool: detectedIntent === 'mental-support',
            },
          ]);
          speakReply(reply);
          return;
        }

        // Engine C: Cloud Free Open Web + Server AI
        if (selectedModel.runtime === 'cloud') {
          const res = await fetch('/api/jarvis/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: trimmed,
              history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
              identity,
              detectedIntent,
              permissions: permissionMap,
              tasks: tasks.map((t) => ({ title: t.title, completed: t.completed })),
              useResearch: wantsSearch && webSearchEnabled,
            }),
          });

          const data = (await res.json()) as {
            error?: string;
            replyText?: string;
            proposedAction?: Omit<PendingAction, 'id' | 'status' | 'createdAt'>;
            directMemoryMutation?:
              | { kind: 'add_task'; title: string; priority: 'high' | 'normal' }
              | { kind: 'clear_completed' }
              | { kind: 'add_note'; content: string };
            coachingTip?: HudMessage['coachingTip'];
            showBreathingTool?: boolean;
            groundingLinks?: GroundingLink[];
            source?: HudMessage['source'];
          };

          if (!res.ok) {
            throw new Error(data.error || 'Server intelligence request failed.');
          }

          if (data.directMemoryMutation && evaluatePermission(permissionMap, 'manage_memory') === 'allow') {
            applyDirectMemoryMutation(data.directMemoryMutation);
          }

          if (data.proposedAction) {
            stageOrExecuteAction(data.proposedAction, data.replyText);
            return;
          }

          const finalReply = data.replyText || `At your service, ${addr}.`;
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-j-${Date.now()}`,
              role: 'assistant',
              text: finalReply,
              timestamp: new Date().toISOString(),
              intent: detectedIntent,
              source: data.source || 'cloud-gemini',
              coachingTip: data.coachingTip,
              showBreathingTool: data.showBreathingTool,
              groundingLinks:
                data.groundingLinks && data.groundingLinks.length > 0
                  ? data.groundingLinks
                  : groundingLinks,
            },
          ]);
          speakReply(finalReply);
          return;
        }

        // Engine D: Built-In Offline Core (or WebGPU fallback before download) + Live Web Search
        if (wantsSearch && webSummary) {
          const searchReply = `Here is what live open web search found, ${addr}: ${webSummary}`;
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-j-${Date.now()}`,
              role: 'assistant',
              text: searchReply,
              timestamp: new Date().toISOString(),
              intent: 'general',
              source: 'cloud-research',
              groundingLinks,
            },
          ]);
          speakReply(searchReply);
          return;
        }

        const offlineReply = generateOfflineCompanionReply(trimmed, addr, identity.fullName);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-j-${Date.now()}`,
            role: 'assistant',
            text: offlineReply.text,
            timestamp: new Date().toISOString(),
            intent: offlineReply.intent,
            source: 'offline-core',
            coachingTip: offlineReply.coachingTip,
            showBreathingTool: offlineReply.showBreathingTool,
            groundingLinks,
          },
        ]);
        speakReply(offlineReply.text);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : `Unable to reach the selected model, ${addr}. Built-in Offline Core remains active.`;
        setErrorBanner(msg);
      } finally {
        setIsThinking(false);
      }
    },
    [
      addr,
      alarms,
      applyDirectMemoryMutation,
      batteryCharging,
      batteryLevel,
      deviceControls,
      identity,
      isOnline,
      isThinking,
      messages,
      ollamaUrl,
      permissionMap,
      selectedModel,
      speakReply,
      stageOrExecuteAction,
      tasks,
      webSearchEnabled,
    ]
  );

  const handleToggleListen = useCallback(() => {
    if (isSpeaking) {
      stopSpeakingJarvis();
      setIsSpeaking(false);
    }

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimVoice('');
      return;
    }

    const micPolicy = evaluatePermission(permissionMap, 'microphone');
    if (micPolicy === 'deny') {
      setErrorBanner(
        `Microphone access is set to Deny in your Permission Vault, ${addr}. Enable it there anytime.`
      );
      return;
    }

    if (micPolicy === 'ask') {
      updatePermissionPolicy('microphone', 'always');
    }

    const recognizer = createVoiceRecognizer({
      onInterim: (text) => setInterimVoice(text),
      onFinal: (finalText) => {
        setInterimVoice('');
        setIsListening(false);
        void sendCommand(finalText);
      },
      onError: (reason) => {
        setIsListening(false);
        setInterimVoice('');
        setErrorBanner(
          reason === 'not-allowed'
            ? `Browser microphone permission was declined, ${addr}.`
            : `Voice capture unavailable (${reason}). Text input remains ready.`
        );
      },
      onEnd: () => setIsListening(false),
    });

    if (!recognizer.supported) {
      setErrorBanner(
        `Speech recognition is not supported in this browser, ${addr}. Text input remains fully active.`
      );
      return;
    }

    recognizerRef.current = recognizer;
    setErrorBanner(null);
    setIsListening(true);
    try {
      recognizer.start();
    } catch {
      setIsListening(false);
    }
  }, [addr, isListening, isSpeaking, permissionMap, sendCommand, updatePermissionPolicy]);

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    void sendCommand(inputText);
  };

  const activeTrack = MUSIC_TRACKS[trackIndex] || MUSIC_TRACKS[0];

  const handleToggleMusic = () => {
    if (musicPlaying) {
      jarvisAudio.stopTrack();
      setMusicPlaying(false);
    } else {
      const ok = jarvisAudio.startTrack(activeTrack, musicVolume);
      setMusicPlaying(ok);
    }
  };

  const handleNextTrack = () => {
    const nextIdx = (trackIndex + 1) % MUSIC_TRACKS.length;
    setTrackIndex(nextIdx);
    if (musicPlaying) {
      jarvisAudio.startTrack(MUSIC_TRACKS[nextIdx], musicVolume);
    }
  };

  const handleStopMusic = () => {
    jarvisAudio.stopTrack();
    setMusicPlaying(false);
    setMusicActive(false);
  };

  const handleVolumeChange = (val: number) => {
    setMusicVolume(val);
    jarvisAudio.setVolume(val);
  };

  const currentClock = new Date(nowMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="relative min-h-screen h-screen flex flex-col bg-[#06080C] text-[#E8EEF3] overflow-hidden transition-[filter] duration-300"
      style={{ filter: `brightness(${deviceControls.brightness}%)` }}
    >
      {/* Realistic Brushed Anodized Titanium Ambient Backdrop */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
        <img
          src="/src/assets/images/obsidian_cockpit_backdrop_1794989912303.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080C]/85 via-[#06080C]/65 to-[#06080C]/95" />
      </div>

      {/* Flashlight / Torch Simulation Glow when enabled */}
      {deviceControls.flashlight && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-30 bg-radial from-amber-100/20 via-transparent to-transparent"
        />
      )}

      {/* Top Navigation Bar — Clean 3-Zone Contract */}
      <header className="relative z-10 shrink-0 h-14 px-4 sm:px-6 border-b border-white/[0.08] bg-[#070A0F]/85 backdrop-blur-xl flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <span
          title={`${SYSTEM_NAME} — ${SYSTEM_MEANING}`}
          className="font-display text-lg font-semibold tracking-wider text-[#E8EEF3] whitespace-nowrap shrink-0"
        >
          {SYSTEM_NAME}
        </span>

        {/* Zone 2: Quiet Active Engine + Web Search Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#94A3B8] truncate">
          <span className="truncate">{selectedModel.name}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">
            {webSearchEnabled ? 'Live Web Search Ready' : 'Offline Only'}
          </span>
        </div>

        {/* Zone 3: Telemetry, Profile & Audio Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-2.5 text-xs text-[#94A3B8]">
            <time className="font-mono-tabular text-[#E8EEF3]">{currentClock}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono-tabular">
              {batteryCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
              )}
              <span>{batteryLevel !== null ? `${batteryLevel}%` : 'AC'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              )}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            aria-label="Edit user name and preferred address"
            className="min-h-[38px] px-3 rounded-xl bg-[#0D1219] border border-white/10 text-xs font-medium text-[#E8EEF3] hover:border-[#38BDF8]/40 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <User className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span className="max-w-[130px] truncate">{identity.fullName}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (voiceOutputEnabled) stopSpeakingJarvis();
              setVoiceOutputEnabled((v) => !v);
            }}
            aria-label={voiceOutputEnabled ? 'Mute spoken voice' : 'Enable spoken voice'}
            className="min-h-[38px] min-w-[38px] px-2.5 rounded-xl bg-[#0D1219] border border-white/10 text-[#94A3B8] hover:text-[#E8EEF3] hover:border-[#38BDF8]/35 transition-colors flex items-center justify-center gap-1.5 text-xs"
          >
            {voiceOutputEnabled ? (
              <Volume2 className="w-4 h-4 text-[#38BDF8]" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">
              {voiceOutputEnabled ? 'Voice' : 'Muted'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Tasks, Phone Controls, Models, and Vault"
            className="lg:hidden min-h-[38px] min-w-[38px] rounded-xl bg-[#0D1219] border border-white/10 text-[#94A3B8] hover:text-[#E8EEF3] flex items-center justify-center"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3-Column Luxury Cockpit Layout */}
      <div className="relative z-10 flex-1 min-h-0 max-w-[1440px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_350px] gap-0 lg:gap-6 lg:px-6 lg:py-5">
        {/* Left Rail */}
        <aside className="hidden lg:flex flex-col gap-5 min-h-0 overflow-y-auto hud-scroll pr-1">
          <div className="rounded-2xl bg-[#0B0F15]/85 backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-5 flex flex-col items-center gap-4">
            <QuantumCore state={coreState} onToggleListen={handleToggleListen} />
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-[#E8EEF3]">
                {identity.fullName} · Addressed as &ldquo;{addr}&rdquo;
              </p>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">{SYSTEM_MEANING}</p>
            </div>
          </div>

          {musicActive && (
            <MediaBar
              track={activeTrack}
              isPlaying={musicPlaying}
              volume={musicVolume}
              onTogglePlay={handleToggleMusic}
              onNextTrack={handleNextTrack}
              onStop={handleStopMusic}
              onVolumeChange={handleVolumeChange}
            />
          )}

          <section aria-label="Quick suggestions" className="flex flex-col gap-2.5">
            <h2 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
              Quick Prompts
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_SUGGESTIONS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => void sendCommand(chip.prompt, { forceWebSearch: chip.search })}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0B0F15]/85 border border-white/[0.08] hover:border-[#38BDF8]/40 hover:text-[#E8EEF3] text-xs font-medium text-[#CBD5E1] text-left transition-colors truncate"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* Center Unified Conversation Stream */}
        <main className="flex flex-col min-h-0 bg-[#080B10]/80 backdrop-blur-xl lg:rounded-2xl lg:border lg:border-white/[0.08] lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
          {/* Mobile Compact Optical Core + Quick Strip */}
          <div className="lg:hidden shrink-0 px-4 pt-3 pb-2 border-b border-white/[0.07] flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <QuantumCore state={coreState} onToggleListen={handleToggleListen} compact />
                <span className="text-xs font-medium text-[#94A3B8]">
                  {coreState === 'awaiting-permission'
                    ? 'Authorization needed'
                    : coreState === 'listening'
                      ? 'Listening...'
                      : coreState === 'thinking'
                        ? 'Thinking...'
                        : 'Tap core to speak'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 text-xs text-[#94A3B8]">
                <time className="font-mono-tabular text-sm text-[#E8EEF3]">{currentClock}</time>
                <span className="font-mono-tabular">
                  Battery: {batteryLevel !== null ? `${batteryLevel}%` : 'AC'}
                </span>
                <span className="truncate max-w-[140px]">{selectedModel.name}</span>
              </div>
            </div>

            {musicActive && (
              <MediaBar
                track={activeTrack}
                isPlaying={musicPlaying}
                volume={musicVolume}
                onTogglePlay={handleToggleMusic}
                onNextTrack={handleNextTrack}
                onStop={handleStopMusic}
                onVolumeChange={handleVolumeChange}
              />
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-1 hud-scroll">
              {QUICK_SUGGESTIONS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => void sendCommand(chip.prompt, { forceWebSearch: chip.search })}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B0F15] border border-white/[0.08] text-xs font-medium text-[#CBD5E1] hover:border-[#38BDF8]/40 whitespace-nowrap shrink-0"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Log */}
          <div
            data-testid="hud-log"
            className="flex-1 min-h-0 overflow-y-auto hud-scroll px-4 sm:px-6 py-4"
          >
            {messages.map((msg) => (
              <HudMessageCard
                key={msg.id}
                message={msg}
                userLabel={addr}
                onResolveAction={handleResolvePendingAction}
              />
            ))}

            {isThinking && (
              <div className="py-4 text-xs text-[#7DD3FC] flex items-center gap-2">
                <span>
                  {SYSTEM_NAME} is thinking, {addr}...
                </span>
              </div>
            )}

            <div ref={logEndRef} />
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div
              role="alert"
              className="mx-4 sm:mx-6 mb-2 px-3.5 py-2.5 rounded-xl bg-rose-500/12 border border-rose-400/30 text-xs text-rose-200 flex items-center justify-between gap-2"
            >
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                aria-label="Dismiss alert"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Live Voice Interim Preview */}
          {isListening && (
            <div className="mx-4 sm:mx-6 mb-2 px-3.5 py-2 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/25 text-xs text-[#7DD3FC]">
              {interimVoice ? `"${interimVoice}"` : `Listening for your voice, ${addr}...`}
            </div>
          )}

          {/* Bottom Voice + Web Search + Text Command Bar */}
          <form
            onSubmit={handleSubmitForm}
            className="shrink-0 p-3 sm:p-4 border-t border-white/[0.08] bg-[#06080C]/90 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleListen}
              aria-label={isListening ? 'Stop voice capture' : 'Start voice capture'}
              className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                isListening
                  ? 'bg-[#38BDF8] text-[#06080C]'
                  : 'bg-[#0D1219] border border-white/10 text-[#38BDF8] hover:border-[#38BDF8]/40'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setWebSearchEnabled((v) => !v)}
              aria-pressed={webSearchEnabled}
              aria-label={
                webSearchEnabled ? 'Disable live web search' : 'Enable live web search'
              }
              title="Toggle Real-Time Web Search"
              className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors shrink-0 border ${
                webSearchEnabled
                  ? 'bg-[#38BDF8]/12 border-[#38BDF8]/35 text-[#38BDF8]'
                  : 'bg-[#0D1219] border-white/10 text-[#64748B] hover:text-[#CBD5E1]'
              }`}
            >
              <Globe className="w-4 h-4" />
            </button>

            <label className="sr-only" htmlFor="jarvis-command-input">
              Message {SYSTEM_NAME}
            </label>
            <input
              id="jarvis-command-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${SYSTEM_NAME}, ${addr}...`}
              className="flex-1 min-w-0 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0D1219] border border-white/10 text-sm text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              aria-label="Send command"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#38BDF8] text-[#06080C] font-semibold text-sm hover:bg-[#7DD3FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </main>

        {/* Right Rail (Tasks, Phone Controls, 2B Models, Permission Vault) */}
        <aside className="hidden lg:flex flex-col min-h-0 rounded-2xl bg-[#0B0F15]/85 backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-4 overflow-hidden">
          <MemoryAndPermissionsPanel
            tasks={tasks}
            notes={notes}
            alarms={alarms}
            nowMs={nowMs}
            permissions={permissions}
            deviceControls={deviceControls}
            selectedModelId={selectedModelId}
            ollamaUrl={ollamaUrl}
            webSearchEnabled={webSearchEnabled}
            onAddTask={(title, priority) => setTasks((prev) => addTaskItem(prev, title, priority))}
            onToggleTask={(id) => setTasks((prev) => toggleTaskItem(prev, id))}
            onClearCompleted={() => setTasks((prev) => clearCompletedTaskItems(prev))}
            onAddNote={(content) => setNotes((prev) => addNoteItem(prev, content))}
            onDeleteNote={(id) => setNotes((prev) => deleteNoteItem(prev, id))}
            onDismissAlarm={(id) => setAlarms((prev) => dismissAlarmItem(prev, id))}
            onUpdatePermission={updatePermissionPolicy}
            onRequestToggleControl={(setting, nextVal) => {
              const map = {
                wifi: { type: 'toggle_wifi' as const, label: 'Wi-Fi' },
                bluetooth: { type: 'toggle_bluetooth' as const, label: 'Bluetooth' },
                dnd: { type: 'toggle_dnd' as const, label: 'Do Not Disturb' },
                flashlight: { type: 'toggle_flashlight' as const, label: 'Flashlight' },
              };
              const target = map[setting];
              stageOrExecuteAction({
                type: target.type,
                capability: 'device_control',
                title: `${nextVal ? 'Enable' : 'Disable'} ${target.label}`,
                detail: `Update ${target.label} state on your phone controls.`,
                payload: { enabled: nextVal },
              });
            }}
            onRequestBrightness={(level) =>
              stageOrExecuteAction({
                type: 'set_brightness',
                capability: 'device_control',
                title: `Set Brightness to ${level}%`,
                detail: `Adjust display luminance to ${level}%.`,
                payload: { level },
              })
            }
            onRequestDial={(target) => {
              const clean = validatePhoneNumber(target);
              stageOrExecuteAction({
                type: 'dial_contact',
                capability: 'dial_contact',
                title: `Dial ${clean || target}`,
                detail: clean
                  ? `Place a phone call to ${clean}.`
                  : `Confirm phone digits for "${target}".`,
                payload: { target, phoneNumber: clean || '' },
              });
            }}
            onRequestOpenApp={(appName) => {
              const resolved = resolveSupportedApp(appName);
              if (!resolved) return;
              stageOrExecuteAction({
                type: 'open_app',
                capability: 'open_app',
                title: `Open ${resolved.name}`,
                detail: `Launch ${resolved.schemeNote} in a new browser tab.`,
                payload: { appName: resolved.name, url: resolved.url },
              });
            }}
            onSelectModel={(spec) => setSelectedModelId(spec.id)}
            onChangeOllamaUrl={setOllamaUrl}
            onToggleWebSearch={setWebSearchEnabled}
          />
        </aside>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tasks, Phone Controls, Open-Source Models, and Permission Vault"
          className="fixed inset-0 z-50 lg:hidden bg-black/75 backdrop-blur-sm flex justify-end"
        >
          <div className="w-full max-w-sm h-full bg-[#0B0F15] border-l border-white/10 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
              <span className="font-display text-base font-semibold text-[#E8EEF3]">
                Workspace &amp; Controls
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close panel"
                className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <MemoryAndPermissionsPanel
                tasks={tasks}
                notes={notes}
                alarms={alarms}
                nowMs={nowMs}
                permissions={permissions}
                deviceControls={deviceControls}
                selectedModelId={selectedModelId}
                ollamaUrl={ollamaUrl}
                webSearchEnabled={webSearchEnabled}
                onAddTask={(title, priority) =>
                  setTasks((prev) => addTaskItem(prev, title, priority))
                }
                onToggleTask={(id) => setTasks((prev) => toggleTaskItem(prev, id))}
                onClearCompleted={() => setTasks((prev) => clearCompletedTaskItems(prev))}
                onAddNote={(content) => setNotes((prev) => addNoteItem(prev, content))}
                onDeleteNote={(id) => setNotes((prev) => deleteNoteItem(prev, id))}
                onDismissAlarm={(id) => setAlarms((prev) => dismissAlarmItem(prev, id))}
                onUpdatePermission={updatePermissionPolicy}
                onRequestToggleControl={(setting, nextVal) => {
                  setMobileDrawerOpen(false);
                  const map = {
                    wifi: { type: 'toggle_wifi' as const, label: 'Wi-Fi' },
                    bluetooth: { type: 'toggle_bluetooth' as const, label: 'Bluetooth' },
                    dnd: { type: 'toggle_dnd' as const, label: 'Do Not Disturb' },
                    flashlight: { type: 'toggle_flashlight' as const, label: 'Flashlight' },
                  };
                  const target = map[setting];
                  stageOrExecuteAction({
                    type: target.type,
                    capability: 'device_control',
                    title: `${nextVal ? 'Enable' : 'Disable'} ${target.label}`,
                    detail: `Update ${target.label} state on your phone controls.`,
                    payload: { enabled: nextVal },
                  });
                }}
                onRequestBrightness={(level) => {
                  setMobileDrawerOpen(false);
                  stageOrExecuteAction({
                    type: 'set_brightness',
                    capability: 'device_control',
                    title: `Set Brightness to ${level}%`,
                    detail: `Adjust display luminance to ${level}%.`,
                    payload: { level },
                  });
                }}
                onRequestDial={(target) => {
                  setMobileDrawerOpen(false);
                  const clean = validatePhoneNumber(target);
                  stageOrExecuteAction({
                    type: 'dial_contact',
                    capability: 'dial_contact',
                    title: `Dial ${clean || target}`,
                    detail: clean
                      ? `Place a phone call to ${clean}.`
                      : `Confirm phone digits for "${target}".`,
                    payload: { target, phoneNumber: clean || '' },
                  });
                }}
                onRequestOpenApp={(appName) => {
                  setMobileDrawerOpen(false);
                  const resolved = resolveSupportedApp(appName);
                  if (!resolved) return;
                  stageOrExecuteAction({
                    type: 'open_app',
                    capability: 'open_app',
                    title: `Open ${resolved.name}`,
                    detail: `Launch ${resolved.schemeNote} in a new browser tab.`,
                    payload: { appName: resolved.name, url: resolved.url },
                  });
                }}
                onSelectModel={(spec) => setSelectedModelId(spec.id)}
                onChangeOllamaUrl={setOllamaUrl}
                onToggleWebSearch={setWebSearchEnabled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile / Account Name & Address Customization Modal */}
      {profileModalOpen && (
        <AccountIdentityModal
          identity={identity}
          onSave={(next) => {
            setIdentity(next);
            const confirmMsg = `Profile updated, ${next.addressAs}. I have registered your account name as ${next.fullName} and will address you as "${next.addressAs}".`;
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-profile-${Date.now()}`,
                role: 'assistant',
                text: confirmMsg,
                timestamp: new Date().toISOString(),
                source: 'offline-core',
              },
            ]);
            speakReply(confirmMsg);
          }}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
