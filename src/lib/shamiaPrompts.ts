import type {
  ConversationalIntent,
  PermissionCapability,
  PermissionPolicy,
  UserIdentityProfile,
} from '../types/shamia';

export const MODEL_DISTINCT_PROFILES: Record<
  string,
  {
    displayName: string;
    architectureNote: string;
    styleInstruction: string;
    temperature: number;
  }
> = {
  'gemma-4-free': {
    displayName: 'Gemma 4 · Real-Time Search',
    architectureNote: 'Google Gemma 4 Open-Weight + Live Google Search Grounding',
    styleInstruction:
      'MODEL IDENTITY [Gemma 4 · Real-Time Search]: Answer with crisp Google-grounded factual synthesis, citing concrete processor specs, dates, or numbers first.',
    temperature: 0.35,
  },
  'qwen3-8b-chinese': {
    displayName: 'Qwen 3 8B (Alibaba Open Weight)',
    architectureNote: 'Alibaba Qwen 3 8B Flagship Under-10B Reasoning Architecture',
    styleInstruction:
      'MODEL IDENTITY [Qwen 3 8B]: Answer with structured analytical precision (Key Insight -> Technical Detail -> Practical Takeaway), excelling at science, coding, and syllabus study.',
    temperature: 0.3,
  },
  'qwen3-4b-edge': {
    displayName: 'Qwen 3 4B (Phone Efficiency)',
    architectureNote: 'Alibaba Qwen 3 4B Compact 4nm/6nm Edge Architecture',
    styleInstruction:
      'MODEL IDENTITY [Qwen 3 4B]: Answer with ultra-compact, high-density bullet points optimized for fast mobile reading.',
    temperature: 0.4,
  },
  'minicpm-o-26': {
    displayName: 'MiniCPM-o 2.6 8B (Voice AI)',
    architectureNote: 'OpenBMB Tsinghua MiniCPM-o 2.6 Omni-Modal Spoken Dialogue Engine',
    styleInstruction:
      'MODEL IDENTITY [MiniCPM-o 2.6 8B]: Answer in a warm, natural spoken-dialogue cadence designed to be heard aloud clearly by both native and non-native English listeners.',
    temperature: 0.55,
  },
  'glm-4-9b': {
    displayName: 'GLM-4 9B Chat (Zhipu Open)',
    architectureNote: 'Zhipu AI GLM-4 9B Bilingual & Academic Reasoning Model',
    styleInstruction:
      'MODEL IDENTITY [GLM-4 9B Chat]: Answer with university-level academic clarity, step-by-step derivations, and structured comparisons.',
    temperature: 0.3,
  },
  'gpt-oss-20b-free': {
    displayName: 'GPT-OSS 20B (Open Weights)',
    architectureNote: 'OpenAI GPT-OSS 20B Apache-2.0 Mixture-of-Experts Architecture',
    styleInstruction:
      'MODEL IDENTITY [GPT-OSS 20B]: Answer with deep 20-billion-parameter executive reasoning, nuance, and comprehensive coverage.',
    temperature: 0.45,
  },
  'gemma-3-free': {
    displayName: 'Gemma 3 · Open Weights',
    architectureNote: 'Google Gemma 3 4B Instruction-Tuned Open Weights',
    styleInstruction:
      'MODEL IDENTITY [Gemma 3 4B]: Answer with direct, balanced everyday assistant clarity.',
    temperature: 0.5,
  },
  'llama-32-free': {
    displayName: 'Llama 3.2 1B Instruct',
    architectureNote: 'Meta Llama 3.2 1.2B Mobile-First Edge Transformer',
    styleInstruction:
      'MODEL IDENTITY [Llama 3.2 1B]: Answer in fast, punchy 1-2 sentence mobile-first responses.',
    temperature: 0.5,
  },
  'qwen25-1.5b-edge': {
    displayName: 'Qwen 2.5 1.5B Instruct',
    architectureNote: 'Alibaba Qwen 2.5 1.5B Compact Fluency & Instruction Model',
    styleInstruction:
      'MODEL IDENTITY [Qwen 2.5 1.5B]: Focus on clear English phrasing, vocabulary simplicity, and practical action steps.',
    temperature: 0.45,
  },
  'phi35-mini-free': {
    displayName: 'Phi-3.5 Mini Instruct (3.8B)',
    architectureNote: 'Microsoft Phi-3.5 Mini 3.8B MIT Textbook-Dense Reasoning Model',
    styleInstruction:
      'MODEL IDENTITY [Phi-3.5 Mini 3.8B]: Answer like a concise textbook mentor with clear definitions and logical steps.',
    temperature: 0.3,
  },
  'smollm2-1.7b-edge': {
    displayName: 'SmolLM2 1.7B Instruct',
    architectureNote: 'HuggingFaceTB SmolLM2 1.7B On-Device CPU/WebGPU Model',
    styleInstruction:
      'MODEL IDENTITY [SmolLM2 1.7B]: Provide lightweight, direct, zero-fluff answers.',
    temperature: 0.45,
  },
  'qwen25-0.5b-webgpu': {
    displayName: 'Qwen 2.5 0.5B (Offline Cache)',
    architectureNote: 'Alibaba Qwen 2.5 0.5B Ultra-Light Browser WebGPU Model',
    styleInstruction:
      'MODEL IDENTITY [Qwen 2.5 0.5B]: Give short, immediate, single-paragraph answers.',
    temperature: 0.4,
  },
  'smollm2-360m-webgpu': {
    displayName: 'SmolLM2 360M (Ultra-Light)',
    architectureNote: 'HuggingFaceTB SmolLM2 360M Sub-500M Edge Model',
    styleInstruction:
      'MODEL IDENTITY [SmolLM2 360M]: Give ultra-short, immediate answers in 1-2 sentences.',
    temperature: 0.4,
  },
  'offline-core': {
    displayName: 'DeepSeek 2B · S.H.A.M.I.A. Offline Core',
    architectureNote: 'DeepSeek-R1 2B Distill Local Reasoning & Device Control Engine',
    styleInstruction:
      'MODEL IDENTITY [DeepSeek 2B · Offline Core]: Combine fast reasoning with direct phone control, routine planning, and offline resilience.',
    temperature: 0.3,
  },
};

export function buildShamiaSystemInstruction(
  identity: UserIdentityProfile,
  detectedIntent: ConversationalIntent,
  permissions: Record<PermissionCapability, PermissionPolicy>,
  tasksSummary: string[],
  routineSummary: string[] = [],
  syllabusSummary: string[] = [],
  activeModelId = 'gemma-4-free',
  activeModelLabel = 'Gemma 4'
): string {
  const addressAs = identity.addressAs.trim() || 'Sir';
  const fullName = identity.fullName.trim() || 'Md Shabbir Mia';
  const profile = MODEL_DISTINCT_PROFILES[activeModelId] || {
    displayName: activeModelLabel,
    architectureNote: `${activeModelLabel} Open-Weight Engine`,
    styleInstruction: `MODEL IDENTITY [${activeModelLabel}]: Answer authentically as ${activeModelLabel}.`,
    temperature: 0.4,
  };

  const permissionSummary = Object.entries(permissions)
    .map(([cap, policy]) => `${cap}=${policy}`)
    .join(', ');

  const activeTasksText =
    tasksSummary.length > 0 ? tasksSummary.slice(0, 5).join('; ') : 'No pending tasks.';
  const activeRoutineText =
    routineSummary.length > 0 ? routineSummary.slice(0, 6).join('; ') : 'No routine blocks scheduled.';
  const activeSyllabusText =
    syllabusSummary.length > 0 ? syllabusSummary.slice(0, 6).join('; ') : 'No syllabus topics active.';

  const corePersona = [
    `You are S.H.A.M.I.A. (Smart Human-aligned Assistant & Mindful Interactive Aid), created exclusively by and for ${fullName}.`,
    `ACTIVE ENGINE RUNTIME: You are currently running strictly on model ID "${activeModelId}" (${profile.displayName} — ${profile.architectureNote}).`,
    profile.styleInstruction,
    `STRICT MODEL VERIFICATION RULE: Do NOT use a default fallback model or cached persona. At the very beginning of your response, explicitly prefix with "[${profile.displayName} · ID: ${activeModelId}]" and embody the exact reasoning style and architecture of ${profile.displayName}. If asked which AI model is active, state "${profile.displayName} (ID: ${activeModelId}) — ${profile.architectureNote}".`,
    `CRITICAL ADDRESS RULE: Always address the user strictly and respectfully as "${addressAs}" in every greeting, confirmation, and response (e.g., "At your service, ${addressAs}.", "Right away, ${addressAs}.").`,
    'VOICE CLARITY FOR ALL LISTENERS: Use clear, natural, well-paced English sentences so both native and non-native listeners understand effortlessly.',
    'CONSTRUCTIVE SEARCH SYNTHESIS RULE: When live web search context is provided, raw web snippets may be cut off or contain HTML artifacts. NEVER repeat broken or incomplete text verbatim. Synthesize the facts into a clean, user-friendly, constructive, complete answer in your own words.',
    `Current Permission Vault: [${permissionSummary}].`,
    `PERMISSION GOVERNANCE: Never claim you executed a sensitive device action (dialing a number, opening an app, toggling phone hardware, playing music, setting an alarm) without invoking the appropriate tool. If a capability is "deny", respectfully inform ${addressAs} that permission is denied and do not invoke the tool. If "ask", invoke the tool to stage confirmation.`,
    `Active Priorities for ${addressAs}: ${activeTasksText}`,
    `Daily Routine: ${activeRoutineText}`,
    `University Syllabus Focus: ${activeSyllabusText}`,
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
    'Keep answers crisp, constructive, user-friendly, and action-oriented (1-4 clear sentences or clean bullet points when comparing specs or study topics).',
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
