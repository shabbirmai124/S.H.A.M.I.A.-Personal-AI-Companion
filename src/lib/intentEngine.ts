import type {
  AlarmItem,
  ConversationalIntent,
  DeviceActionType,
  DeviceControlState,
  PendingAction,
  PermissionCapability,
  PermissionPolicy,
  TaskItem,
} from '../types/shamia';

export interface LocalIntentContext {
  now: Date;
  addressAs: string;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  tasks: TaskItem[];
  alarms: AlarmItem[];
  deviceControls: DeviceControlState;
}

export interface LocalIntentMatch {
  handled: boolean;
  intent: ConversationalIntent;
  replyText?: string;
  proposedAction?: Omit<PendingAction, 'id' | 'status' | 'createdAt'>;
  directMemoryMutation?:
    | { kind: 'add_task'; title: string; priority: 'high' | 'normal' }
    | { kind: 'clear_completed' }
    | { kind: 'add_note'; content: string };
}

export const ACTION_TO_CAPABILITY: Record<DeviceActionType, PermissionCapability> = {
  dial_contact: 'dial_contact',
  open_app: 'open_app',
  play_music: 'play_music',
  set_alarm: 'set_alarm',
  toggle_wifi: 'device_control',
  toggle_bluetooth: 'device_control',
  toggle_dnd: 'device_control',
  toggle_flashlight: 'device_control',
  set_brightness: 'device_control',
  add_task: 'manage_memory',
  complete_task: 'manage_memory',
  clear_completed_tasks: 'manage_memory',
  add_note: 'manage_memory',
};

export function evaluatePermission(
  policies: Record<PermissionCapability, PermissionPolicy>,
  capability: PermissionCapability
): 'allow' | 'ask' | 'deny' {
  const policy = policies[capability] ?? 'ask';
  if (policy === 'always') return 'allow';
  if (policy === 'deny') return 'deny';
  return 'ask';
}

export function validatePhoneNumber(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 3 || digitsOnly.length > 15) {
    return null;
  }
  return cleaned;
}

export interface SupportedAppTarget {
  name: string;
  url: string;
  schemeNote: string;
}

const SUPPORTED_APPS: Array<{ keywords: string[]; target: SupportedAppTarget }> = [
  {
    keywords: ['spotify'],
    target: { name: 'Spotify', url: 'https://open.spotify.com', schemeNote: 'Spotify Web & App' },
  },
  {
    keywords: ['youtube music', 'yt music'],
    target: { name: 'YouTube Music', url: 'https://music.youtube.com', schemeNote: 'YouTube Music' },
  },
  {
    keywords: ['youtube'],
    target: { name: 'YouTube', url: 'https://www.youtube.com', schemeNote: 'YouTube' },
  },
  {
    keywords: ['maps', 'google maps', 'navigation'],
    target: { name: 'Google Maps', url: 'https://maps.google.com', schemeNote: 'Google Maps' },
  },
  {
    keywords: ['calendar', 'schedule'],
    target: { name: 'Google Calendar', url: 'https://calendar.google.com', schemeNote: 'Google Calendar' },
  },
  {
    keywords: ['gmail', 'mail', 'email'],
    target: { name: 'Gmail', url: 'https://mail.google.com', schemeNote: 'Gmail' },
  },
  {
    keywords: ['whatsapp'],
    target: { name: 'WhatsApp', url: 'https://web.whatsapp.com', schemeNote: 'WhatsApp' },
  },
  {
    keywords: ['github'],
    target: { name: 'GitHub', url: 'https://github.com', schemeNote: 'GitHub' },
  },
];

export function resolveSupportedApp(appName: string): SupportedAppTarget | null {
  const normalized = appName.trim().toLowerCase();
  if (!normalized) return null;
  for (const entry of SUPPORTED_APPS) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.target;
    }
  }
  return null;
}

export function detectConversationalIntent(input: string): ConversationalIntent {
  const lower = input.toLowerCase();

  if (
    /\b(practice english|speak english|english tutor|english coach|grammar|pronunciation|fluency|correct my sentence|correct my english|idiom|interview practice|english speaking)\b/.test(
      lower
    )
  ) {
    return 'english-tutor';
  }

  if (
    /\b(stressed|overwhelmed|anxious|anxiety|depressed|lonely|sad|tired of|burnt out|burnout|mental health|mental support|panic|worried|heartbroken|scared|talk to me|feeling down|breathe|calm me)\b/.test(
      lower
    )
  ) {
    return 'mental-support';
  }

  if (
    /^(?:call|dial|phone|ring|open|launch|go to|play|put on|set (?:an? )?alarm|wake me|turn (?:on|off)|enable|disable|toggle|set brightness|dim screen|brighten)\b/.test(
      lower
    )
  ) {
    return 'device-action';
  }

  return 'general';
}

export function shouldTriggerLiveSearch(input: string, forceWebSearch?: boolean): boolean {
  if (forceWebSearch) return true;
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/\b(binary\s+search|depth[-\s]first\s+search|breadth[-\s]first\s+search|linear\s+search|tree\s+search|graph\s+search|a\*\s+search)\b/i.test(trimmed)) {
    return false;
  }
  return /\b(search\s+(?:for|the\s+web|online|google|about)|web\s+search|google|look\s+up|latest\s+news|breaking\s+news|who\s+won|what\s+happened\s+today|current\s+price|weather|real-?time|4\s*nm|6\s*nm|3\s*nm|processor|chipset|snapdragon|dimensity|exynos|tensor|bionic|which\s+phones?|what\s+phones?|2025|2026)\b/i.test(
    trimmed
  );
}

export function parseAlarmRequest(
  input: string,
  now: Date
): { label: string; triggerAt: number; formattedTime: string } {
  const lower = input.toLowerCase();

  const relMatch = lower.match(
    /\bin\s+(\d+)\s*(sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours)\b/
  );
  if (relMatch) {
    const amount = Math.max(1, parseInt(relMatch[1], 10));
    const unit = relMatch[2];
    let ms = amount * 60 * 1000;
    if (unit.startsWith('sec')) ms = amount * 1000;
    else if (unit.startsWith('hr') || unit.startsWith('hour')) ms = amount * 3600 * 1000;
    const triggerAt = now.getTime() + ms;
    const targetDate = new Date(triggerAt);
    return {
      label: `Timer (${amount} ${unit})`,
      triggerAt,
      formattedTime: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  const timeMatch = lower.match(/\b(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3];
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return {
        label: `Alarm (${target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        triggerAt: target.getTime(),
        formattedTime: target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }
  }

  const fallbackAt = now.getTime() + 5 * 60 * 1000;
  return {
    label: 'Quick 5-Minute Alarm',
    triggerAt: fallbackAt,
    formattedTime: new Date(fallbackAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function matchLocalIntent(input: string, ctx: LocalIntentContext): LocalIntentMatch {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const addr = ctx.addressAs.trim() || 'Sir';
  const detectedIntent = detectConversationalIntent(trimmed);

  if (!trimmed) {
    return { handled: false, intent: 'general' };
  }

  // 1. Time query
  if (
    /^(what('s| is) the time|tell me the time|current time|time please)\b/.test(lower) ||
    lower === 'time'
  ) {
    const timeStr = ctx.now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = ctx.now.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    return {
      handled: true,
      intent: 'general',
      replyText: `It is currently ${timeStr} on ${dateStr}, ${addr}.`,
    };
  }

  // 2. Battery query
  if (/\b(battery|power level|charge level)\b/.test(lower) && lower.length < 45) {
    if (ctx.batteryLevel !== null) {
      const status = ctx.batteryCharging ? 'charging' : 'discharging';
      return {
        handled: true,
        intent: 'general',
        replyText: `Power reserves are at ${ctx.batteryLevel}% and currently ${status}, ${addr}.`,
      };
    }
    return {
      handled: true,
      intent: 'general',
      replyText: `Direct battery telemetry is restricted by this browser, ${addr}, though all core systems are running smoothly.`,
    };
  }

  // 3. Status Report
  if (/^(status report|system status|diagnostics|phone status)\b/.test(lower)) {
    const pendingTasks = ctx.tasks.filter((t) => !t.completed).length;
    const activeAlarms = ctx.alarms.filter((a) => !a.triggered).length;
    const powerPart =
      ctx.batteryLevel !== null
        ? `power at ${ctx.batteryLevel}%${ctx.batteryCharging ? ' (charging)' : ''}`
        : 'primary power steady';
    return {
      handled: true,
      intent: 'general',
      replyText: `All subsystems are nominal, ${addr}: ${powerPart}, Wi-Fi ${
        ctx.deviceControls.wifi ? 'on' : 'off'
      }, Bluetooth ${ctx.deviceControls.bluetooth ? 'on' : 'off'}, ${pendingTasks} pending ${
        pendingTasks === 1 ? 'priority' : 'priorities'
      }, and ${activeAlarms} active ${activeAlarms === 1 ? 'alarm' : 'alarms'}.`,
    };
  }

  // 4. Phone Hardware Control Toggles (Permission-Gated)
  const wifiMatch = lower.match(/\b(turn on|enable|turn off|disable|toggle)\s+(?:the\s+)?wi-?fi\b/);
  if (wifiMatch) {
    const verb = wifiMatch[1];
    const nextState =
      verb.includes('on') || verb === 'enable'
        ? true
        : verb.includes('off') || verb === 'disable'
          ? false
          : !ctx.deviceControls.wifi;
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Wi-Fi ${nextState ? 'activation' : 'deactivation'} staged, ${addr}. Please authorize.`,
      proposedAction: {
        type: 'toggle_wifi',
        capability: 'device_control',
        title: `${nextState ? 'Enable' : 'Disable'} Wi-Fi`,
        detail: `Switch device wireless radio ${nextState ? 'on' : 'off'}.`,
        payload: { enabled: nextState },
      },
    };
  }

  const btMatch = lower.match(/\b(turn on|enable|turn off|disable|toggle)\s+(?:the\s+)?bluetooth\b/);
  if (btMatch) {
    const verb = btMatch[1];
    const nextState =
      verb.includes('on') || verb === 'enable'
        ? true
        : verb.includes('off') || verb === 'disable'
          ? false
          : !ctx.deviceControls.bluetooth;
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Bluetooth ${nextState ? 'activation' : 'deactivation'} staged, ${addr}. Please authorize.`,
      proposedAction: {
        type: 'toggle_bluetooth',
        capability: 'device_control',
        title: `${nextState ? 'Enable' : 'Disable'} Bluetooth`,
        detail: `Switch Bluetooth transceiver ${nextState ? 'on' : 'off'}.`,
        payload: { enabled: nextState },
      },
    };
  }

  const dndMatch = lower.match(
    /\b(turn on|enable|turn off|disable|toggle)\s+(?:the\s+)?(?:do not disturb|dnd|silent mode)\b/
  );
  if (dndMatch) {
    const verb = dndMatch[1];
    const nextState =
      verb.includes('on') || verb === 'enable'
        ? true
        : verb.includes('off') || verb === 'disable'
          ? false
          : !ctx.deviceControls.dnd;
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Do Not Disturb ${nextState ? 'activation' : 'deactivation'} staged, ${addr}. Please authorize.`,
      proposedAction: {
        type: 'toggle_dnd',
        capability: 'device_control',
        title: `${nextState ? 'Enable' : 'Disable'} Do Not Disturb`,
        detail: `Silence non-urgent notifications on your HUD.`,
        payload: { enabled: nextState },
      },
    };
  }

  const torchMatch = lower.match(
    /\b(turn on|enable|turn off|disable|toggle)\s+(?:the\s+)?(?:flashlight|torch)\b/
  );
  if (torchMatch) {
    const verb = torchMatch[1];
    const nextState =
      verb.includes('on') || verb === 'enable'
        ? true
        : verb.includes('off') || verb === 'disable'
          ? false
          : !ctx.deviceControls.flashlight;
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Flashlight ${nextState ? 'beam' : 'shutdown'} staged, ${addr}. Please confirm.`,
      proposedAction: {
        type: 'toggle_flashlight',
        capability: 'device_control',
        title: `${nextState ? 'Enable' : 'Disable'} Flashlight`,
        detail: `Toggle high-lumen screen torch illumination.`,
        payload: { enabled: nextState },
      },
    };
  }

  const brightMatch = lower.match(/\b(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})\s*%?/);
  if (brightMatch) {
    const level = Math.max(25, Math.min(100, parseInt(brightMatch[1], 10)));
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Display brightness staged for ${level}%, ${addr}. Please authorize.`,
      proposedAction: {
        type: 'set_brightness',
        capability: 'device_control',
        title: `Set Brightness to ${level}%`,
        detail: `Adjust display luminance to ${level}%.`,
        payload: { level },
      },
    };
  }

  // 5. Clear completed tasks
  if (/\b(clear|remove|delete)\s+(completed|done)\s*(tasks|items|priorities)?\b/.test(lower)) {
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Completed items have been cleared from your priority ledger, ${addr}.`,
      directMemoryMutation: { kind: 'clear_completed' },
    };
  }

  // 6. Remember / Add task
  const addTaskMatch = trimmed.match(
    /^(?:remember(?:\s+to)?|add\s+task|set\s+task|new\s+priority)\s*:?\s+(.+)$/i
  );
  if (addTaskMatch) {
    const title = addTaskMatch[1].trim();
    if (title.length > 0) {
      return {
        handled: true,
        intent: 'device-action',
        replyText: `Recorded to your priority ledger, ${addr}: "${title}".`,
        directMemoryMutation: {
          kind: 'add_task',
          title,
          priority: lower.includes('urgent') || lower.includes('high') ? 'high' : 'normal',
        },
      };
    }
  }

  // 7. Add note
  const addNoteMatch = trimmed.match(/^(?:take\s+a\s+note|add\s+note|note\s+this)\s*:?\s+(.+)$/i);
  if (addNoteMatch) {
    const content = addNoteMatch[1].trim();
    if (content.length > 0) {
      return {
        handled: true,
        intent: 'device-action',
        replyText: `Noted and archived locally, ${addr}.`,
        directMemoryMutation: { kind: 'add_note', content },
      };
    }
  }

  // 8. Dial / Call number or contact (Permission-gated!)
  const callMatch = trimmed.match(/^(?:call|dial|phone|ring)\s+(.+)$/i);
  if (callMatch) {
    const targetRaw = callMatch[1].trim();
    const validPhone = validatePhoneNumber(targetRaw);
    const displayTarget = validPhone || targetRaw;
    return {
      handled: true,
      intent: 'device-action',
      replyText: `I have prepared a call to ${displayTarget}, ${addr}. Please confirm permission to proceed.`,
      proposedAction: {
        type: 'dial_contact',
        capability: 'dial_contact',
        title: `Dial ${displayTarget}`,
        detail: validPhone
          ? `Initiate a phone call to ${validPhone} via your device dialer.`
          : `Confirm phone digits for "${targetRaw}" before placing the call.`,
        payload: {
          target: displayTarget,
          phoneNumber: validPhone ?? '',
        },
      },
    };
  }

  // 9. Open App (Permission-gated!)
  const openAppMatch = trimmed.match(
    /^(?:open|launch|go\s+to|start)\s+(?:the\s+)?(.+?)(?:\s+app)?$/i
  );
  if (openAppMatch) {
    const requested = openAppMatch[1].trim();
    const app = resolveSupportedApp(requested);
    if (app) {
      return {
        handled: true,
        intent: 'device-action',
        replyText: `Standing by to open ${app.name}, ${addr}. Awaiting your authorization.`,
        proposedAction: {
          type: 'open_app',
          capability: 'open_app',
          title: `Open ${app.name}`,
          detail: `Launch ${app.schemeNote} in a new browser tab.`,
          payload: {
            appName: app.name,
            url: app.url,
          },
        },
      };
    }
  }

  // 10. Play Music (Permission-gated!)
  const musicMatch = trimmed.match(
    /^(?:play|put\s+on)\s+(?:some\s+)?(?:music|song|tracks?|audio)(?:\s+(.+))?$/i
  );
  if (musicMatch || /^(play\s+music|music\s+please)$/i.test(lower)) {
    const query = musicMatch?.[1]?.trim() || 'focus';
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Music queue primed for "${query}", ${addr}. Shall I begin playback?`,
      proposedAction: {
        type: 'play_music',
        capability: 'play_music',
        title: 'Play Audio Track',
        detail: `Activate the built-in ambient audio engine (${query}).`,
        payload: {
          query,
        },
      },
    };
  }

  // 11. Set Alarm (Permission-gated!)
  if (/^(?:set\s+(?:an?\s+)?alarm|wake\s+me|set\s+(?:a\s+)?timer)\b/i.test(lower)) {
    const parsed = parseAlarmRequest(trimmed, ctx.now);
    return {
      handled: true,
      intent: 'device-action',
      replyText: `Alarm staged for ${parsed.formattedTime}, ${addr}. Please authorize to arm it.`,
      proposedAction: {
        type: 'set_alarm',
        capability: 'set_alarm',
        title: `Set ${parsed.label}`,
        detail: `Schedule an audible alarm for ${parsed.formattedTime}.`,
        payload: {
          label: parsed.label,
          triggerAt: parsed.triggerAt,
          formattedTime: parsed.formattedTime,
        },
      },
    };
  }

  return { handled: false, intent: detectedIntent };
}
