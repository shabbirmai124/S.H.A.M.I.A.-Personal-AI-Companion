import type { CoachingTip, ConversationalIntent } from '../types/shamia';
import { detectConversationalIntent } from './intentEngine';

export interface OfflineCompanionReply {
  text: string;
  intent: ConversationalIntent;
  coachingTip?: CoachingTip;
  showBreathingTool?: boolean;
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
  'Imagine you are introducing your work to a new client over coffee—how would you describe what you build in two sentences?',
  'What is one decision you made recently that turned out well? Walk me through your reasoning.',
];

let drillCursor = 0;

export function generateOfflineCompanionReply(
  input: string,
  addressAs: string,
  fullName: string
): OfflineCompanionReply {
  const addr = addressAs.trim() || 'Sir';
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const intent = detectConversationalIntent(trimmed);

  // 1. Identity / Name meaning question
  if (/\b(your name|who are you|what is shamia|meaning of shamia|shamia)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `I am S.H.A.M.I.A.—Smart Human-aligned Assistant & Mindful Interactive Aid—named in honor of ${fullName}, ${addr}. I am here to manage your device with strict permission control, practice spoken English with you, and support you through busy or quiet days.`,
    };
  }

  // 2. Mental Support / Emotional Check-in (Offline Empathetic Companion)
  if (intent === 'mental-support') {
    const isPanicOrOverwhelmed =
      /\b(overwhelmed|panic|anxious|anxiety|breathe|stressed|burnt out|burnout)\b/.test(lower);
    if (isPanicOrOverwhelmed) {
      return {
        intent: 'mental-support',
        showBreathingTool: true,
        text: `Take a slow moment with me, ${addr}. You do not have to solve everything in the next five minutes—let us drop your shoulders, run a quick 4-4-6 breath together below, and tackle just one small thing afterward.`,
      };
    }
    return {
      intent: 'mental-support',
      showBreathingTool: true,
      text: `I hear you, ${addr}, and you do not have to carry that weight silently. Tell me what is weighing heaviest on you right now—we can untangle it step by step, or simply take a quiet pause.`,
    };
  }

  // 3. English Speaking & Grammar Coach (100% Offline Real-Time Tutor)
  if (intent === 'english-tutor' || /\b(correct|grammar|sentence|english|idiom|interview)\b/i.test(lower)) {
    for (const rule of ENGLISH_CORRECTIONS) {
      if (rule.pattern.test(trimmed)) {
        return {
          intent: 'english-tutor',
          coachingTip: {
            naturalPhrase: rule.naturalPhrase,
            tip: rule.tip,
          },
          text: `Good effort, ${addr}—your meaning is completely clear. A slightly smoother way to say that is "${rule.naturalPhrase}". How did the rest of your conversation go?`,
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
        text: `Here is a sharp everyday phrase, ${addr}: "hit the ground running." For example, "After reviewing the notes, we hit the ground running this morning." Would you like to try using it in a sentence of your own?`,
      };
    }

    if (/\binterview\b/i.test(lower)) {
      return {
        intent: 'english-tutor',
        coachingTip: {
          naturalPhrase: 'Structure answers with Context -> Action -> Result',
          tip: 'Keep sentences under 20 words and pause briefly between ideas for confident pacing.',
        },
        text: `Let us practice, ${addr}. "Tell me about a tough technical problem you solved recently, and how you approached it." Speak or type your answer naturally and I will polish it with you.`,
      };
    }

    const prompt = ENGLISH_DRILL_PROMPTS[drillCursor % ENGLISH_DRILL_PROMPTS.length];
    drillCursor += 1;
    return {
      intent: 'english-tutor',
      coachingTip: {
        tip: 'Tip: Speak at a calm pace and connect ideas with "firstly", "on top of that", or "as a result".',
      },
      text: `I am ready to practice with you offline, ${addr}. ${prompt}`,
    };
  }

  // 4. Greeting / Companion Rapport
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|how are you)\b/i.test(lower)) {
    return {
      intent: 'general',
      text: `Right here and ready, ${addr}. Whether you need phone controls, English speaking practice, or just a quiet sounding board, let me know what comes first.`,
    };
  }

  // 5. Fallback Offline Conversational Response (Check if sentence has English grammar polish opportunity!)
  for (const rule of ENGLISH_CORRECTIONS) {
    if (rule.pattern.test(trimmed)) {
      return {
        intent: 'english-tutor',
        coachingTip: {
          naturalPhrase: rule.naturalPhrase,
          tip: rule.tip,
        },
        text: `Got it, ${addr}. Also, a quick fluency polish if you are practicing: try saying "${rule.naturalPhrase}". What would you like to focus on next?`,
      };
    }
  }

  return {
    intent: 'general',
    text: `Understood, ${addr}. I am currently running on the Offline Core engine—I can run phone controls, alarms, tasks, music, English speaking drills, and calm check-ins instantly without internet, or you can load an on-device Open-Source model in the Engine tab for open-ended chat.`,
  };
}
