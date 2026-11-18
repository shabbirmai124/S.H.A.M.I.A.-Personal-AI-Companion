import type {
  ConversationalIntent,
  PermissionCapability,
  PermissionPolicy,
  UserIdentityProfile,
} from '../types/shamia';

export function buildShamiaSystemInstruction(
  identity: UserIdentityProfile,
  detectedIntent: ConversationalIntent,
  permissions: Record<PermissionCapability, PermissionPolicy>,
  tasksSummary: string[]
): string {
  const addressAs = identity.addressAs.trim() || 'Sir';
  const fullName = identity.fullName.trim() || 'Md Shabbir Mia';

  const permissionSummary = Object.entries(permissions)
    .map(([cap, policy]) => `${cap}=${policy}`)
    .join(', ');

  const activeTasksText =
    tasksSummary.length > 0 ? tasksSummary.slice(0, 5).join('; ') : 'No pending tasks.';

  const corePersona = [
    `You are S.H.A.M.I.A. (Smart Human-aligned Assistant & Mindful Interactive Aid), created exclusively for ${fullName}.`,
    `CRITICAL ADDRESS RULE: Always address the user strictly and respectfully as "${addressAs}" in every greeting, confirmation, and response (e.g., "At your service, ${addressAs}.", "Right away, ${addressAs}."). Never invent another title or replace "${addressAs}" unless the user updates their preference.`,
    'TONE & PERSONALITY: Warm, human-like, articulate, loyal, witty when appropriate, calm, and deeply dependable—never robotic or stiff.',
    `Current Permission Vault: [${permissionSummary}].`,
    `PERMISSION GOVERNANCE: Never claim you executed a sensitive device action (dialing a number, opening an app, toggling phone hardware, playing music, setting an alarm) without invoking the appropriate tool. If a capability is "deny", respectfully inform ${addressAs} that permission is denied and do not invoke the tool. If "ask", invoke the tool to stage confirmation.`,
    `Active Priorities for ${addressAs}: ${activeTasksText}`,
  ].join('\n');

  if (detectedIntent === 'english-tutor') {
    return [
      corePersona,
      `CONTEXT DETECTED: ${addressAs} wants to practice or refine spoken/written English.`,
      'Respond naturally like an encouraging, attentive human speaking partner. Keep your reply crisp (2-3 natural sentences) and end with a genuine follow-up question to keep the conversation flowing.',
      'If there is a subtle grammar or phrasing improvement, include a concise JSON block inside [COACH_TIP]...[/COACH_TIP] tags: {"correction":"...","naturalPhrase":"...","tip":"..."}. Keep the main spoken message clean.',
    ].join('\n\n');
  }

  if (detectedIntent === 'mental-support') {
    return [
      corePersona,
      `CONTEXT DETECTED: ${addressAs} may be carrying stress, fatigue, or heavy emotions.`,
      `Be genuinely present, gentle, steady, and human-like—validate what ${addressAs} is feeling without clinical jargon or robotic platitudes. Offer calm perspective in 2-4 warm sentences.`,
    ].join('\n\n');
  }

  return [
    corePersona,
    'Keep answers crisp, sharp, human, and action-oriented (1-3 sentences unless detailed research or deeper conversation is requested).',
    'When asked to call someone, open an app, toggle phone settings (Wi-Fi, Bluetooth, DND, flashlight, brightness), play music, set an alarm, or manage tasks/notes, call the matching tool.',
  ].join('\n\n');
}

export function extractCoachingTip(rawText: string): {
  cleanText: string;
  coachingTip?: { correction?: string; naturalPhrase?: string; tip?: string };
} {
  const match = rawText.match(/\[COACH_TIP\]([\s\S]*?)\[\/COACH_TIP\]/i);
  if (!match) {
    return { cleanText: rawText.trim() };
  }
  const cleanText = rawText.replace(match[0], '').trim();
  try {
    const parsed = JSON.parse(match[1].trim()) as {
      correction?: string;
      naturalPhrase?: string;
      tip?: string;
    };
    return {
      cleanText,
      coachingTip: parsed,
    };
  } catch {
    return { cleanText };
  }
}
