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

  // 1. Explicit question asking which AI model is currently being used
  if (
    /\b(which\s+(?:ai\s+)?model|what\s+(?:ai\s+)?model|model\s+am\s+i\s+using|model\s+are\s+you|active\s+model|current\s+model|which\s+model\s+is\s+this|running\s+on\s+right\s+now)\b/i.test(
      lower
    )
  ) {
    const archNote = profile?.architectureNote
      ? ` (${profile.architectureNote})`
      : '';
    return {
      intent: 'general',
      text: `You are currently using **${resolvedLabel}** (Model ID: \`${activeModelId}\`)${archNote}, ${addr}. I am S.H.A.M.I.A., created by and for ${fullName}, and I am generating responses strictly from ${resolvedLabel}.`,
    };
  }

  // 1B. General S.H.A.M.I.A. Identity / Name question (without mentioning model unless asked)
  if (/\b(your name|who are you|what is shamia|meaning of shamia)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `I am **S.H.A.M.I.A.** (*Smart Human-aligned Assistant & Mindful Interactive Aid*), created exclusively by and for ${fullName}, ${addr}. I am your personal voice companion, real-time English speaking coach, daily routine & university syllabus planner, and permission-guarded device assistant.`,
    };
  }

  // 2. Processor / 4nm vs 6nm Smartphone Architecture Query
  if (/\b(4\s*nm|6\s*nm|3\s*nm|processor|chipset|snapdragon|dimensity)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `Here is a detailed comparison of 4nm and 6nm smartphone processors, ${addr}:\n• **4nm Flagship & Upper-Midrange Phones** (higher transistor density, superior battery efficiency, and stronger NPU throughput for under-10B open-weight AI models): Samsung Galaxy S24/S23 series (Snapdragon 8 Gen 3 / Gen 2), Xiaomi 14 / OnePlus 12, Google Pixel 8 / 9 (Tensor G3/G4), Redmi Note 13 Pro 5G (Snapdragon 7s Gen 2), and Poco X6 Pro (Dimensity 8300-Ultra).\n• **6nm Balanced Efficiency Phones** (reliable thermal stability for everyday multitasking and lightweight 0.5B–4B open-weight AI models): Samsung Galaxy A34 / Realme 11 Pro (Dimensity 1080 / 7050), Moto G84 / Poco X5 5G (Snapdragon 695), and Redmi Note 13 5G (Dimensity 6080).`,
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
        text: `Take a slow moment with me, ${addr}. You do not have to solve everything in the next five minutes—let us drop your shoulders, run a quick 4-4-6 breath together below, and tackle just one small step afterward.`,
      };
    }
    return {
      intent: 'mental-support',
      showBreathingTool: true,
      text: `I hear you, ${addr}, and you do not have to carry that weight silently. Tell me what is weighing heaviest on you right now—we can untangle it step by step, or simply take a quiet pause.`,
    };
  }

  // 4. English Speaking & Grammar Coach (only when genuinely requesting English coaching or matching a grammar rule)
  if (
    intent === 'english-tutor' ||
    /\b(grammar|idiom|interview|english\s+(?:practice|speaking|tutor|coach)|correct\s+my\s+(?:english|sentence|grammar)|fix\s+my\s+(?:english|sentence|grammar))\b/i.test(
      lower
    )
  ) {
    for (const rule of ENGLISH_CORRECTIONS) {
      if (rule.pattern.test(trimmed)) {
        return {
          intent: 'english-tutor',
          coachingTip: {
            naturalPhrase: rule.naturalPhrase,
            tip: rule.tip,
          },
          text: `Good effort, ${addr}—your meaning is completely clear. A smoother, more natural way to phrase that is "${rule.naturalPhrase}" (${rule.tip}). How did the rest of your conversation go?`,
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
        text: `Here is a practical everyday phrase, ${addr}: "hit the ground running." For example: "After reviewing our project notes, we hit the ground running this morning." Try using it in a sentence of your own!`,
      };
    }

    if (/\binterview\b/i.test(lower)) {
      return {
        intent: 'english-tutor',
        coachingTip: {
          naturalPhrase: 'Structure answers with Context -> Action -> Result',
          tip: 'Keep sentences under 20 words and pause briefly between ideas for confident pacing.',
        },
        text: `Let us practice, ${addr}: "Tell me about a challenging technical problem you solved recently, and how you approached it." Speak or type your answer naturally and I will refine it with you in detail.`,
      };
    }

    const prompt = ENGLISH_DRILL_PROMPTS[drillCursor % ENGLISH_DRILL_PROMPTS.length];
    drillCursor += 1;
    return {
      intent: 'english-tutor',
      coachingTip: {
        tip: 'Tip: Speak at a steady, unhurried pace and connect ideas with "firstly", "in addition", or "as a result".',
      },
      text: `Ready to practice spoken English with you, ${addr}. ${prompt}`,
    };
  }

  // 5. Offline Academic, CS & Syllabus Knowledge Responder
  if (/\bbinary\s+search\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `At your service, ${addr}. Binary search is an efficient divide-and-conquer search algorithm that finds a target value within a **sorted array** by repeatedly comparing the target with the middle element and eliminating half of the remaining search space at every step.\n• **Time & Space Complexity**: It runs in logarithmic $O(\\log n)$ time and $O(1)$ iterative space, making it dramatically faster than $O(n)$ linear search for large datasets.\n• **Core Requirement**: The collection must be sorted prior to searching so that comparing the midpoint deterministically tells you whether the target lies in the left or right half.`,
    };
  }

  if (/\b(study\s+plan|study\s+schedule|routine|syllabus)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `Here is a structured study plan tailored to your schedule, ${addr}:\n1. **Deep-Work Sprint 1 (45 mins)**: Tackle your highest-priority university syllabus topic during your morning routine block with zero distractions.\n2. **Active Recall & Summary (10 mins)**: Close your notes and write down the three most important concepts or formulas from memory.\n3. **Spoken English Reinforcement (5 mins)**: Explain the topic aloud to me in your own words to lock in both academic retention and spoken fluency.`,
    };
  }

  // 6. Constructive Web Search Synthesis if clean search context was gathered
  const cleanedSearch = cleanHtmlArtifacts(webSearchContext);
  if (cleanedSearch && cleanedSearch.length > 25) {
    return {
      intent: 'general',
      text: `Here is a complete, synthesized overview for your query, ${addr}:\n\n${cleanedSearch}`,
    };
  }

  // 7. Normal Everyday Conversation (Greetings, Gratitude, Capabilities)
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how's it going|what's up)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: /how are you|how's it going|what's up/i.test(lower)
        ? `All systems are running smoothly, ${addr}—thank you for asking. What would you like to explore, study, or build today?`
        : `At your service, ${addr}. How can I assist you with your studies, spoken English practice, research, or device controls right now?`,
    };
  }

  if (/\b(thank you|thanks|appreciate it|good job|well done)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `You are very welcome, ${addr}. Let me know whenever you need detailed assistance with another topic.`,
    };
  }

  if (/\b(what can you do|help me|capabilities|features)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `At your service, ${addr}. I can provide detailed answers across computer science and university courses, coach your spoken English in real time, search Google and the live web constructively, organize your Daily Routine & University Syllabus, and manage phone hardware controls safely behind your Permission Vault.`,
    };
  }

  if (/\b(good night|bye|see you|take care|going to sleep)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `Have a restful evening, ${addr}. I will be right here whenever you return.`,
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
        text: `Got it, ${addr}. Quick fluency polish: try saying "${rule.naturalPhrase}" (${rule.tip}). What would you like to focus on next?`,
      };
    }
  }

  // 8. Unclear / gibberish / unrecognized offline prompt — ask honestly instead of fabricating a template
  const looksUnclearOrGibberish =
    trimmed.length <= 2 ||
    /(.)\1{2,}/.test(lower) ||
    (!/\s/.test(trimmed) && !/[aeiouy]/i.test(trimmed));

  if (looksUnclearOrGibberish) {
    return {
      intent: 'general',
      text: `I did not quite understand "${trimmed}", ${addr}. It looks like a typo or random letters—could you retype your question or tell me what topic you would like help with?`,
    };
  }

  return {
    intent: 'general',
    text: `I could not reach the live inference engine for "${trimmed}" right now, ${addr}. Please resend your question in a moment, or enable a locally installed offline model in the Models tab for full offline reasoning.`,
  };
}
