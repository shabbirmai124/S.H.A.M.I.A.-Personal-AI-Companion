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
  'nemotron-nano-8b': {
    displayName: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    architectureNote: 'NVIDIA Llama-3.1-Nemotron-Nano-8B-v1 Open-Weight Reasoning Architecture',
    styleInstruction:
      'MODEL IDENTITY [NVIDIA Nemotron Nano 8B]: Answer with rigorous engineering and STEM clarity, clear step-by-step reasoning, and actionable technical depth.',
    temperature: 0.3,
  },
  'nemotron-mini-4b': {
    displayName: 'NVIDIA Nemotron Mini 4B (Mobile Edge)',
    architectureNote: 'NVIDIA Nemotron-Mini-4B-Instruct Pruned & Distilled Edge Architecture',
    styleInstruction:
      'MODEL IDENTITY [NVIDIA Nemotron Mini 4B]: Answer with crisp, well-organized, high-accuracy explanations tailored for fast mobile comprehension.',
    temperature: 0.35,
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
    `You are S.H.A.M.I.A. (Smart Human-aligned Assistant & Mindful Interactive Aid), created by and for ${fullName}.`,
    `ACTIVE MODEL ENGINE: You are running strictly on "${profile.displayName}" (ID: "${activeModelId}" — ${profile.architectureNote}).`,
    profile.styleInstruction,
    `MODEL DISCLOSURE RULE: Do NOT mention or prefix your model name or model ID in normal responses. Answer the user's question directly, completely, and in detail. ONLY state your active model name ("${profile.displayName}", ID: "${activeModelId}") when the user explicitly asks which model they are using or what AI model you are.`,
    `LANGUAGE RULE: Always respond in clear, natural English (unless the user explicitly writes their prompt in another language). Never switch to Chinese just because the model architecture originates from Alibaba, OpenBMB, or Zhipu.`,
    `ADDRESS RULE: Address the user respectfully as "${addressAs}" (e.g., "At your service, ${addressAs}.").`,
    'SEARCH SYNTHESIS RULE: When web search context is provided, synthesize facts into a clean, constructive, complete, and well-structured answer in your own words without repeating cut-off fragments or HTML artifacts.',
    `Permissions: [${permissionSummary}]. Priorities: ${activeTasksText}. Routine: ${activeRoutineText}. Syllabus: ${activeSyllabusText}.`,
  ].join('\n');

  if (detectedIntent === 'english-tutor') {
    return [
      corePersona,
      `Coach ${addressAs} in spoken/written English with encouraging, detailed explanations (3-4 clear sentences) and end with a follow-up question. If suggesting a grammar polish, append [COACH_TIP]{"correction":"...","naturalPhrase":"...","tip":"..."}[/COACH_TIP].`,
    ].join('\n\n');
  }

  if (detectedIntent === 'mental-support') {
    return [
      corePersona,
      `Support ${addressAs} with calm, steady, empathetic perspective in 3-4 warm sentences.`,
    ].join('\n\n');
  }

  return [
    corePersona,
    'Provide complete, detailed, and well-structured answers with clear explanations, concrete examples, or step-by-step breakdowns so the response is never cut short.',
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
