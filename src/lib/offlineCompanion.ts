import type { CoachingTip, ConversationalIntent } from '../types/shamia';
import { detectConversationalIntent } from './intentEngine';
import { MODEL_DISTINCT_PROFILES } from './shamiaPrompts';

export interface OfflineCompanionReply {
  text: string;
  intent: ConversationalIntent;
  coachingTip?: CoachingTip;
  showBreathingTool?: boolean;
}

export function cleanHtmlArtifacts(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&#x0*27;/gi, "'")
    .replace(/&#0*34;|&#x0*22;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&#(\d+);/g, (_m, code) => {
      const num = Number(code);
      return Number.isFinite(num) ? String.fromCharCode(num) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const num = parseInt(hex, 16);
      return Number.isFinite(num) ? String.fromCharCode(num) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

const ENGLISH_CORRECTIONS: Array<{
  pattern: RegExp;
  naturalPhrase: string;
  tip: string;
}> = [
  {
    pattern: /\byesterday\s+i\s+am\s+going\b/i,
    naturalPhrase: 'Yesterday I went to...',
    tip: 'Use simple past ("went") instead of present continuous ("am going") for completed yesterday actions.',
  },
  {
    pattern: /\bi\s+am\s+go(?:ing)?\s+to\s+office\b/i,
    naturalPhrase: 'I went to the office',
    tip: 'Include "the" before "office" and match the past tense if describing earlier today or yesterday.',
  },
  {
    pattern: /\bdiscuss\s+about\b/i,
    naturalPhrase: 'discuss the plan',
    tip: '"Discuss" already means "talk about", so drop "about" right after it.',
  },
  {
    pattern: /\bmore\s+better\b/i,
    naturalPhrase: 'much better',
    tip: '"Better" is already comparative—pair it with "much" or "far" instead of "more".',
  },
  {
    pattern: /\bi\s+didn['’]?t\s+went\b/i,
    naturalPhrase: "I didn't go",
    tip: 'After "didn’t", always use the base verb ("go") rather than the past form ("went").',
  },
  {
    pattern: /\breturn\s+back\b/i,
    naturalPhrase: 'return / come back',
    tip: '"Return" already means "go back", so avoid pairing it with "back".',
  },
  {
    pattern: /\bi\s+am\s+agree\b/i,
    naturalPhrase: 'I agree',
    tip: '"Agree" is an action verb in English—no "am" needed.',
  },
];

const ENGLISH_DRILL_PROMPTS = [
  'Tell me about one goal you are excited to finish this week, and try using at least two descriptive adjectives.',
  'Imagine you are introducing your work to a new colleague—how would you describe what you do in two clear sentences?',
  'What is one decision you made recently that turned out well? Walk me through your reasoning.',
];

let drillCursor = 0;

export function generateOfflineCompanionReply(
  input: string,
  addressAs: string,
  fullName: string,
  activeModelId = 'gemma-4-free',
  activeModelLabel = 'Gemma 4 · Real-Time Search',
  webSearchContext = ''
): OfflineCompanionReply {
  const addr = addressAs.trim() || 'Sir';
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const intent = detectConversationalIntent(trimmed);
  const profile = MODEL_DISTINCT_PROFILES[activeModelId];
  const resolvedLabel = activeModelLabel || profile?.displayName || activeModelId;
  const tag = `[${resolvedLabel} · ID: ${activeModelId}]`;

  // 1. Identity / Name / Active Model question
  if (
    /\b(your name|who are you|what is shamia|meaning of shamia|which\s+(?:ai\s+)?model|what\s+(?:ai\s+)?model|model\s+am\s+i\s+using|model\s+are\s+you|active\s+model|current\s+model|running\s+on\s+right\s+now)\b/i.test(
      lower
    )
  ) {
    const archNote = profile?.architectureNote
      ? ` (${profile.architectureNote})`
      : '';
    return {
      intent: 'general',
      text: `${tag} You are currently running on **${resolvedLabel}** (Model ID: \`${activeModelId}\`)${archNote}, ${addr}. I am S.H.A.M.I.A., created by and for ${fullName}, and I am generating responses strictly from ${resolvedLabel}.`,
    };
  }

  // 2. Processor / 4nm vs 6nm Smartphone Architecture Query
  if (/\b(4\s*nm|6\s*nm|3\s*nm|processor|chipset|snapdragon|dimensity)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `${tag} Here is a clear comparison of 4nm and 6nm smartphone processors, ${addr}:\n• **4nm Flagship & Upper-Midrange Phones** (higher transistor density, better battery efficiency, and stronger NPU for under-10B AI models): Samsung Galaxy S24/S23 series (Snapdragon 8 Gen 3 / Gen 2), Xiaomi 14 / OnePlus 12, Google Pixel 8 / 9 (Tensor G3/G4), Redmi Note 13 Pro 5G (Snapdragon 7s Gen 2), and Poco X6 Pro (Dimensity 8300-Ultra).\n• **6nm Balanced Efficiency Phones** (smooth everyday multitasking and lightweight 0.5B–2B AI models): Samsung Galaxy A34 / Realme 11 Pro (Dimensity 1080 / 7050), Moto G84 / Poco X5 5G (Snapdragon 695), and Redmi Note 13 5G (Dimensity 6080).`,
    };
  }

  // 3. Mental Support / Emotional Check-in
  if (intent === 'mental-support') {
    const isPanicOrOverwhelmed =
      /\b(overwhelmed|panic|anxious|anxiety|breathe|stressed|burnt out|burnout)\b/.test(lower);
    if (isPanicOrOverwhelmed) {
      return {
        intent: 'mental-support',
        showBreathingTool: true,
        text: `${tag} Take a slow moment with me, ${addr}. You do not have to solve everything in the next five minutes—let us drop your shoulders, run a quick 4-4-6 breath together below, and tackle just one small step afterward.`,
      };
    }
    return {
      intent: 'mental-support',
      showBreathingTool: true,
      text: `${tag} I hear you, ${addr}, and you do not have to carry that weight silently. Tell me what is weighing heaviest on you right now—we can untangle it step by step, or simply take a quiet pause.`,
    };
  }

  // 4. English Speaking & Grammar Coach
  if (intent === 'english-tutor' || /\b(correct|grammar|sentence|english|idiom|interview)\b/i.test(lower)) {
    for (const rule of ENGLISH_CORRECTIONS) {
      if (rule.pattern.test(trimmed)) {
        return {
          intent: 'english-tutor',
          coachingTip: {
            naturalPhrase: rule.naturalPhrase,
            tip: rule.tip,
          },
          text: `${tag} Good effort, ${addr}—your meaning is completely clear. A smoother way to phrase that is "${rule.naturalPhrase}". How did the rest of your conversation go?`,
        };
      }
    }

    if (/\bidiom\b/i.test(lower)) {
      return {
        intent: 'english-tutor',
        coachingTip: {
          naturalPhrase: 'Hit the ground running',
          tip: 'Means starting a new project or day with immediate energy and readiness.',
        },
        text: `${tag} Here is a practical everyday phrase, ${addr}: "hit the ground running." For example: "After reviewing our notes, we hit the ground running this morning." Try using it in a sentence of your own!`,
      };
    }

    if (/\binterview\b/i.test(lower)) {
      return {
        intent: 'english-tutor',
        coachingTip: {
          naturalPhrase: 'Structure answers with Context -> Action -> Result',
          tip: 'Keep sentences under 20 words and pause briefly between ideas for confident pacing.',
        },
        text: `${tag} Let us practice, ${addr}: "Tell me about a challenging technical problem you solved recently, and how you approached it." Speak or type your answer naturally and I will refine it with you.`,
      };
    }

    const prompt = ENGLISH_DRILL_PROMPTS[drillCursor % ENGLISH_DRILL_PROMPTS.length];
    drillCursor += 1;
    return {
      intent: 'english-tutor',
      coachingTip: {
        tip: 'Tip: Speak at a steady, unhurried pace and connect ideas with "firstly", "in addition", or "as a result".',
      },
      text: `${tag} Ready to practice spoken English with you, ${addr}. ${prompt}`,
    };
  }

  // 5. Constructive Web Search Synthesis if clean search context was gathered
  const cleanedSearch = cleanHtmlArtifacts(webSearchContext);
  if (cleanedSearch && cleanedSearch.length > 25) {
    return {
      intent: 'general',
      text: `${tag} Here is a clear summary for your query, ${addr}: ${cleanedSearch}`,
    };
  }

  // 6. Normal Everyday Conversation (Greetings, Gratitude, Capabilities)
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: /how are you|how's it going|what's up/i.test(lower)
        ? `${tag} Running smoothly on ${resolvedLabel}, ${addr}—thank you for asking. What would you like to work on today?`
        : `${tag} Hello, ${addr}. I am active on ${resolvedLabel}. How can I assist you right now?`,
    };
  }

  if (/\b(thank you|thanks|appreciate it|good job|well done)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `${tag} You are very welcome, ${addr}. Let me know whenever you need anything else.`,
    };
  }

  if (/\b(what can you do|help me|capabilities|features)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `${tag} Running on **${resolvedLabel}**, I can answer questions, coach your spoken English in real time, search Google live, build study schedules from your Routine & University Syllabus, and manage phone controls behind your Permission Vault, ${addr}.`,
    };
  }

  if (/\b(good night|bye|see you|take care|going to sleep)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `${tag} Have a restful evening, ${addr}. I will be right here whenever you return.`,
    };
  }

  for (const rule of ENGLISH_CORRECTIONS) {
    if (rule.pattern.test(trimmed)) {
      return {
        intent: 'english-tutor',
        coachingTip: {
          naturalPhrase: rule.naturalPhrase,
          tip: rule.tip,
        },
        text: `${tag} Got it, ${addr}. Quick fluency polish: try saying "${rule.naturalPhrase}". What would you like to focus on next?`,
      };
    }
  }

  return {
    intent: 'general',
    text: `${tag} Active on **${resolvedLabel}**, ${addr}. Share your question, study topic, or device command and I will process it directly with ${resolvedLabel}.`,
  };
}
