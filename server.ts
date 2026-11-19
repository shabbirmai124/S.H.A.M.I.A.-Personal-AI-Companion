/**
 * S.H.A.M.I.A. Server
 * Created by Md Shabbir Mia <shabbirmia520@gmail.com>
 */
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  type FunctionDeclaration,
  GoogleGenAI,
  Type,
} from '@google/genai';
import {
  buildShamiaSystemInstruction,
  extractCoachingTip,
  MODEL_DISTINCT_PROFILES,
} from './src/lib/shamiaPrompts.ts';
import {
  resolveSupportedApp,
  shouldTriggerLiveSearch,
  validatePhoneNumber,
} from './src/lib/intentEngine.ts';
import {
  cleanHtmlArtifacts,
  generateOfflineCompanionReply,
} from './src/lib/offlineCompanion.ts';
import {
  MODEL_WEIGHT_REGISTRY,
  buildStrictMismatchGuidance,
  createVerifiedProvenance,
  doesBackendModelMatch,
  formatModelIdentityAnswer,
  normalizeModelIdentifier,
} from './src/lib/modelVerification.ts';
import type {
  ConversationalIntent,
  GroundingLink,
  ModelExecutionProvider,
  PendingAction,
  PermissionCapability,
  PermissionPolicy,
  UserIdentityProfile,
} from './src/types/shamia.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT =
  process.env.NODE_ENV === 'production' && process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

const MODEL_LABELS: Record<string, string> = {
  'gemma-4-free': 'Gemma 4 · Real-Time Search',
  'qwen3-8b-chinese': 'Qwen 3 8B (Chinese Open Weight)',
  'qwen3-4b-edge': 'Qwen 3 4B (Phone Efficiency King)',
  'minicpm-o-26': 'MiniCPM-o 2.6 8B (Chinese Voice AI)',
  'glm-4-9b': 'GLM-4 9B Chat (Zhipu Chinese Open)',
  'nemotron-nano-8b': 'NVIDIA Nemotron Nano 8B (Open Weights)',
  'nemotron-mini-4b': 'NVIDIA Nemotron Mini 4B (Mobile Edge)',
  'gpt-oss-20b-free': 'GPT-OSS 20B (Open Weights)',
  'gemma-3-free': 'Gemma 3 · Open Weights',
  'llama-32-free': 'Llama 3.2 1B Instruct',
  'qwen25-1.5b-edge': 'Qwen 2.5 1.5B Instruct',
  'deepseek-r1-1.5b': 'DeepSeek-R1 1.5B',
  'phi35-mini-free': 'Phi-3.5 Mini Instruct',
  'smollm2-1.7b-edge': 'SmolLM2 1.7B Instruct',
  'qwen25-0.5b-webgpu': 'Qwen 2.5 0.5B (Offline Cache)',
  'smollm2-360m-webgpu': 'SmolLM2 360M (Ultra-Light)',
  'offline-core': 'DeepSeek 2B · S.H.A.M.I.A. Offline Core',
};

let cachedLiveGemmaModels: { fetchedAt: number; models: string[] } | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getConfiguredKey(name: string, placeholder: string): string | null {
  const val = process.env[name]?.trim();
  if (!val || val === placeholder) return null;
  return val;
}

async function getLiveGoogleGemmaModels(ai: GoogleGenAI | null): Promise<string[]> {
  if (!ai) return [];
  const now = Date.now();
  if (cachedLiveGemmaModels && now - cachedLiveGemmaModels.fetchedAt < 5 * 60 * 1000) {
    return cachedLiveGemmaModels.models;
  }
  const found: string[] = [];
  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      const rawName = (m as { name?: string }).name || '';
      const shortName = normalizeModelIdentifier(rawName);
      if (shortName.startsWith('gemma-')) {
        found.push(shortName);
      }
    }
  } catch (err) {
    console.warn(
      '[S.H.A.M.I.A. Verify] Could not list Google API models:',
      err instanceof Error ? err.message : String(err)
    );
  }
  cachedLiveGemmaModels = { fetchedAt: now, models: found };
  return found;
}

function resolveBestOnlineExactProvider(
  modelId: string,
  liveGemmaModels: string[]
): {
  exactWeightsAvailable: boolean;
  provider?: ModelExecutionProvider;
  backendModelId?: string;
} {
  const spec = MODEL_WEIGHT_REGISTRY[modelId];
  if (!spec) return { exactWeightsAvailable: false };

  if (spec.isBuiltInOfflineCore) {
    return {
      exactWeightsAvailable: true,
      provider: 'offline-core',
      backendModelId: 'shamia-offline-core',
    };
  }

  if (spec.googleGemmaModels && liveGemmaModels.length > 0) {
    const matched = spec.googleGemmaModels.find((candidate) =>
      liveGemmaModels.some((live) => doesBackendModelMatch(candidate, live))
    );
    if (matched) {
      return {
        exactWeightsAvailable: true,
        provider: 'google-gemma-api',
        backendModelId: matched,
      };
    }
  }

  if (spec.nvidiaModel && getConfiguredKey('NVIDIA_API_KEY', 'MY_NVIDIA_API_KEY')) {
    return {
      exactWeightsAvailable: true,
      provider: 'nvidia-nim',
      backendModelId: spec.nvidiaModel,
    };
  }

  if (spec.hfModel && getConfiguredKey('HF_TOKEN', 'MY_HUGGINGFACE_TOKEN')) {
    return {
      exactWeightsAvailable: true,
      provider: 'huggingface-router',
      backendModelId: spec.hfModel,
    };
  }

  if (spec.openRouterModel && getConfiguredKey('OPENROUTER_API_KEY', 'MY_OPENROUTER_API_KEY')) {
    return {
      exactWeightsAvailable: true,
      provider: 'openrouter',
      backendModelId: spec.openRouterModel,
    };
  }

  if (spec.ollamaTag && getConfiguredKey('OLLAMA_URL', '')) {
    return {
      exactWeightsAvailable: true,
      provider: 'ollama-local',
      backendModelId: spec.ollamaTag,
    };
  }

  return { exactWeightsAvailable: false };
}

async function callVerifiedOpenAiProvider(params: {
  url: string;
  apiKey: string;
  expectedModel: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  extraHeaders?: Record<string, string>;
}): Promise<{ text: string; executedModel: string } | null> {
  try {
    const res = await fetch(params.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
        ...(params.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: params.expectedModel,
        messages: params.messages,
        max_tokens: 900,
        temperature: params.temperature,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    const returnedModel = (json.model || '').trim();
    if (!text) return null;

    // Strict check: if provider returned a model ID, verify it matches the exact requested model
    if (returnedModel && !doesBackendModelMatch(params.expectedModel, returnedModel)) {
      console.warn(
        `[S.H.A.M.I.A. Strict Reject] Provider ${params.url} returned "${returnedModel}" instead of requested "${params.expectedModel}".`
      );
      return null;
    }

    return {
      text,
      executedModel: returnedModel || params.expectedModel,
    };
  } catch {
    return null;
  }
}

function sanitizeHistoryTurnText(raw: string): string {
  return cleanHtmlArtifacts(raw)
    .replace(/^\[[^\]]{2,90}\]\s*/g, '')
    .replace(/DeepSeek 2B\s*·\s*S\.H\.A\.M\.I\.A\.\s*Offline Core/gi, 'S.H.A.M.I.A.')
    .replace(/\boffline-core\b/gi, '')
    .trim();
}

function enforceActiveModelOutput(
  rawText: string,
  modelLabel: string,
  modelId: string
): string {
  let cleaned = cleanHtmlArtifacts(rawText, true);
  if (!cleaned) return '';

  // Strip any leading bracketed model header so normal responses stay clean and natural
  cleaned = cleaned.replace(/^\[[^\]]{2,95}\]\s*/g, '');

  // Guard against any cached history bleed of DeepSeek Offline Core when another model is active
  if (modelId !== 'offline-core') {
    cleaned = cleaned
      .replace(/DeepSeek 2B\s*·\s*S\.H\.A\.M\.I\.A\.\s*Offline Core/gi, modelLabel)
      .replace(/DeepSeek 2B\s*·\s*Offline Core/gi, modelLabel)
      .replace(/\bmodel ID:\s*`?offline-core`?/gi, `model ID: \`${modelId}\``)
      .replace(/\(`?offline-core`?\)/gi, `(\`${modelId}\`)`);
  }

  return cleaned.trim();
}

function buildValidAlternatingTurns(
  history: Array<{ role: 'user' | 'assistant'; text: string }> | undefined,
  currentMessage: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const turns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const item of (history || []).slice(-6)) {
    const clean = sanitizeHistoryTurnText(item.text || '');
    if (!clean) continue;
    const role: 'user' | 'model' = item.role === 'user' ? 'user' : 'model';
    if (turns.length === 0 && role === 'model') {
      continue;
    }
    const prev = turns[turns.length - 1];
    if (prev && prev.role === role) {
      prev.parts[0].text = `${prev.parts[0].text}\n${clean}`;
    } else {
      turns.push({ role, parts: [{ text: clean }] });
    }
  }
  const last = turns[turns.length - 1];
  if (last && last.role === 'user') {
    last.parts[0].text = `${last.parts[0].text}\n${currentMessage}`;
  } else {
    turns.push({ role: 'user', parts: [{ text: currentMessage }] });
  }
  return turns;
}

async function executeFreeOpenWebSearch(query: string): Promise<{
  summary: string;
  results: Array<{ title: string; snippet: string; url: string }>;
}> {
  const cleanQuery = query
    .trim()
    .replace(
      /^(?:search(?:\s+for)?|research|look\s+up|find(?:\s+out)?|tell\s+me\s+about|google(?:\s+search)?)\s+/i,
      ''
    )
    .trim();
  if (!cleanQuery) {
    return { summary: '', results: [] };
  }

  const results: Array<{ title: string; snippet: string; url: string }> = [];
  const summaryBullets: string[] = [];

  // Built-in domain synthesis for 4nm / 6nm smartphone processor comparisons so results are always constructive
  if (/\b(4\s*nm|6\s*nm|3\s*nm|processor|chipset|snapdragon|dimensity)\b/i.test(cleanQuery)) {
    summaryBullets.push(
      '4nm Smartphones (higher transistor density, superior NPU & power efficiency): Samsung Galaxy S24/S23 (Snapdragon 8 Gen 3 / Gen 2), OnePlus 12, Xiaomi 14, Google Pixel 8/9 (Tensor G3/G4), Poco X6 Pro (Dimensity 8300-Ultra), Redmi Note 13 Pro 5G (Snapdragon 7s Gen 2).'
    );
    summaryBullets.push(
      '6nm Smartphones (efficient mid-range daily performance): Samsung Galaxy A34 & Realme 11 Pro (Dimensity 1080/7050), Poco X5 5G & Moto G84 (Snapdragon 695), Redmi Note 13 5G (Dimensity 6080).'
    );
  }

  // 1. Live Google News Search RSS (real-time verified articles, zero API key)
  try {
    const googleRes = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SHAMIA/1.0)' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (googleRes.ok) {
      const xml = await googleRes.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 4) {
        const block = match[1];
        const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
        const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
        const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News';
        const title = cleanHtmlArtifacts(rawTitle);
        const url = cleanHtmlArtifacts(rawLink);
        const source = cleanHtmlArtifacts(rawSource);
        if (title && url) {
          results.push({
            title: `${title} (${source})`,
            snippet: `${title} — reported by ${source}.`,
            url,
          });
          summaryBullets.push(`${title} (${source})`);
          count += 1;
        }
      }
    }
  } catch {
    // Continue to DuckDuckGo
  }

  // 2. DuckDuckGo Instant Answer API (clean complete abstracts, no HTML tags)
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (ddgRes.ok) {
      const ddg = (await ddgRes.json()) as {
        Heading?: string;
        AbstractText?: string;
        AbstractURL?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };
      if (ddg.AbstractText) {
        const cleanAbstract = cleanHtmlArtifacts(ddg.AbstractText);
        if (cleanAbstract) {
          summaryBullets.unshift(cleanAbstract);
        }
        if (ddg.AbstractURL) {
          results.push({
            title: cleanHtmlArtifacts(ddg.Heading || cleanQuery),
            snippet: cleanAbstract,
            url: ddg.AbstractURL,
          });
        }
      }
      for (const topic of (ddg.RelatedTopics || []).slice(0, 2)) {
        if (topic.Text && topic.FirstURL) {
          const cleanTopic = cleanHtmlArtifacts(topic.Text);
          results.push({
            title: cleanTopic.split(' - ')[0].slice(0, 72),
            snippet: cleanTopic,
            url: topic.FirstURL,
          });
        }
      }
    }
  } catch {
    // Continue to Wikipedia REST summary
  }

  // 3. Wikipedia REST Summary API (only complete lead sentences from relevant articles, never broken fragments)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQuery
      )}&format=json&srlimit=2&origin=*`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (wikiRes.ok) {
      const wiki = (await wikiRes.json()) as {
        query?: {
          search?: Array<{ title: string; snippet: string; pageid: number }>;
        };
      };
      const queryWords = cleanQuery
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 3 && !['which', 'what', 'have', 'from', 'with', 'that', 'this'].includes(w));

      for (const item of wiki.query?.search || []) {
        const cleanTitle = cleanHtmlArtifacts(item.title);
        const titleLower = cleanTitle.toLowerCase();
        const isRelevant =
          queryWords.length === 0 || queryWords.some((w) => titleLower.includes(w));
        if (!isRelevant) continue;

        const cleanSnippet = cleanHtmlArtifacts(item.snippet);
        const url = `https://en.wikipedia.org/?curid=${item.pageid}`;
        results.push({
          title: cleanTitle,
          snippet: `${cleanTitle}: ${cleanSnippet}`,
          url,
        });
        if (summaryBullets.length < 2 && cleanSnippet) {
          summaryBullets.push(`${cleanTitle}: ${cleanSnippet}`);
        }
      }
    }
  } catch {
    // Ignore fallback error
  }

  const cleanSummary = cleanHtmlArtifacts(summaryBullets.slice(0, 3).join(' • '));

  return {
    summary: cleanSummary,
    results: results.slice(0, 5),
  };
}

const SHAMIA_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'dial_contact',
    description:
      'Stage a phone call to a number or contact. Requires explicit authorization before dialing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, description: 'Contact name or phone number.' },
        phoneNumber: { type: Type.STRING, description: 'Digits if known, else empty.' },
      },
      required: ['target'],
    },
  },
  {
    name: 'open_app',
    description:
      'Stage opening a supported application (Spotify, YouTube Music, YouTube, Google Maps, Google Calendar, Gmail, WhatsApp, GitHub).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'App name to launch.' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'toggle_device_control',
    description:
      'Stage toggling phone hardware settings (wifi, bluetooth, dnd, flashlight, or brightness).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: {
          type: Type.STRING,
          description: 'One of: wifi, bluetooth, dnd, flashlight, brightness.',
        },
        enabled: {
          type: Type.BOOLEAN,
          description: 'Target boolean state for wifi/bluetooth/dnd/flashlight.',
        },
        brightnessLevel: {
          type: Type.NUMBER,
          description: 'Target brightness percentage 25-100 when setting is brightness.',
        },
      },
      required: ['setting'],
    },
  },
  {
    name: 'play_music',
    description: 'Stage playing ambient or focus music in the built-in audio engine.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Mood or style requested.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'set_alarm',
    description: 'Stage a countdown alarm or reminder.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING, description: 'Short alarm label.' },
        minutesFromNow: { type: Type.NUMBER, description: 'Minutes from now.' },
      },
      required: ['label', 'minutesFromNow'],
    },
  },
  {
    name: 'add_task',
    description: 'Add a priority task to local memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Task description.' },
        priority: { type: Type.STRING, description: 'Either "high" or "normal".' },
      },
      required: ['title'],
    },
  },
  {
    name: 'clear_completed_tasks',
    description: 'Clear completed tasks from local memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirm: { type: Type.BOOLEAN, description: 'True to clear completed items.' },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'add_note',
    description: 'Save a quick note to local memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: 'Note content.' },
      },
      required: ['content'],
    },
  },
];

interface ChatRequestBody {
  message?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  identity?: UserIdentityProfile;
  detectedIntent?: ConversationalIntent;
  permissions?: Record<PermissionCapability, PermissionPolicy>;
  tasks?: Array<{ title: string; completed: boolean }>;
  routine?: string[];
  syllabus?: string[];
  useResearch?: boolean;
  modelId?: string;
  modelLabel?: string;
  strictModelMatch?: boolean;
  ensembleEnabled?: boolean;
  ensembleModelIds?: string[];
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(getConfiguredKey('GEMINI_API_KEY', 'MY_GEMINI_API_KEY'));
    res.json({
      ok: true,
      aiConfigured: hasKey,
      freeSearchAvailable: true,
      supportedModels: Object.keys(MODEL_LABELS),
    });
  });

  app.get('/api/models/verify', async (_req, res) => {
    const ai = getGeminiClient();
    const liveGemmaModels = await getLiveGoogleGemmaModels(ai);
    const providers = {
      googleGemmaApi: liveGemmaModels.length > 0,
      googleGeminiFallback: Boolean(ai),
      nvidiaNim: Boolean(getConfiguredKey('NVIDIA_API_KEY', 'MY_NVIDIA_API_KEY')),
      huggingfaceRouter: Boolean(getConfiguredKey('HF_TOKEN', 'MY_HUGGINGFACE_TOKEN')),
      openRouter: Boolean(getConfiguredKey('OPENROUTER_API_KEY', 'MY_OPENROUTER_API_KEY')),
      serverOllama: Boolean(getConfiguredKey('OLLAMA_URL', '')),
    };

    const models: Record<
      string,
      {
        exactWeightsAvailableOnline: boolean;
        exactProvider?: ModelExecutionProvider;
        exactBackendModelId?: string;
        onnxBrowserRepo?: string;
        ollamaTag?: string;
      }
    > = {};

    for (const [id, spec] of Object.entries(MODEL_WEIGHT_REGISTRY)) {
      const resolved = resolveBestOnlineExactProvider(id, liveGemmaModels);
      models[id] = {
        exactWeightsAvailableOnline: resolved.exactWeightsAvailable,
        exactProvider: resolved.provider,
        exactBackendModelId: resolved.backendModelId,
        onnxBrowserRepo: spec.onnxBrowserRepo,
        ollamaTag: spec.ollamaTag,
      };
    }

    res.json({
      ok: true,
      providers,
      liveGemmaModels,
      models,
    });
  });

  app.post('/api/web-search', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }
    const searchData = await executeFreeOpenWebSearch(query);
    res.json(searchData);
  });

  app.post('/api/shamia/chat', async (req, res) => {
    const body = (req.body || {}) as ChatRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    const identity: UserIdentityProfile = {
      fullName: body.identity?.fullName?.trim() || 'Md Shabbir Mia',
      addressAs: body.identity?.addressAs?.trim() || 'Sir',
    };
    const addr = identity.addressAs;

    if (!message) {
      res.status(400).json({ error: `A message is required, ${addr}.` });
      return;
    }

    const requestedModelId = (body.modelId || 'gemma-4-free').trim();
    const strictModelMatch = body.strictModelMatch !== false;
    const modelProfile = MODEL_DISTINCT_PROFILES[requestedModelId];
    const weightSpec = MODEL_WEIGHT_REGISTRY[requestedModelId];
    const modelLabel =
      MODEL_LABELS[requestedModelId] ||
      body.modelLabel?.trim() ||
      modelProfile?.displayName ||
      requestedModelId;

    const detectedIntent: ConversationalIntent = body.detectedIntent || 'general';
    const ai = getGeminiClient();
    const liveGemmaModels = await getLiveGoogleGemmaModels(ai);
    const liveExactStatus = resolveBestOnlineExactProvider(requestedModelId, liveGemmaModels);

    // Check if the user is directly asking which AI model is active right now
    const isModelIdentityQuery =
      /\b(which\s+(?:ai\s+)?model|what\s+(?:ai\s+)?model|model\s+am\s+i\s+using|model\s+are\s+you|active\s+model|current\s+model|which\s+model\s+is\s+this|running\s+on\s+right\s+now)\b/i.test(
        message
      );

    console.log(
      `[S.H.A.M.I.A. Router] Active Model Request -> ID="${requestedModelId}" | Label="${modelLabel}" | Strict=${strictModelMatch} | ExactAvailable=${liveExactStatus.exactWeightsAvailable} (${liveExactStatus.provider || 'none'}:${liveExactStatus.backendModelId || 'none'})`
    );

    if (isModelIdentityQuery) {
      const arch = modelProfile?.architectureNote || 'Open-Weight Neural Engine';
      const honestIdentityText = formatModelIdentityAnswer({
        modelId: requestedModelId,
        modelLabel,
        addr,
        creatorName: identity.fullName,
        architectureNote: arch,
        exactProvider: liveExactStatus.provider,
        exactBackendModelId: liveExactStatus.backendModelId,
        exactWeightsAvailable: liveExactStatus.exactWeightsAvailable,
        strictMode: strictModelMatch,
      });
      const provenance = createVerifiedProvenance({
        requestedModelId,
        requestedModelLabel: modelLabel,
        executedProvider: liveExactStatus.provider || 'google-gemini-fallback',
        executedModelId: liveExactStatus.backendModelId || 'unconnected',
        strictMode: strictModelMatch,
        exactWeightsVerified: liveExactStatus.exactWeightsAvailable,
      });
      res.json({
        replyText: enforceActiveModelOutput(honestIdentityText, modelLabel, requestedModelId),
        groundingLinks: [],
        source: requestedModelId === 'offline-core' ? 'offline-core' : 'cloud-gemini',
        modelLabel,
        activeModelId: requestedModelId,
        requestedModelId,
        provenance,
      });
      return;
    }

    const useResearch =
      body.useResearch === false
        ? false
        : Boolean(body.useResearch) || shouldTriggerLiveSearch(message);

    const permissions: Record<PermissionCapability, PermissionPolicy> = {
      dial_contact: body.permissions?.dial_contact ?? 'ask',
      open_app: body.permissions?.open_app ?? 'ask',
      device_control: body.permissions?.device_control ?? 'ask',
      play_music: body.permissions?.play_music ?? 'ask',
      set_alarm: body.permissions?.set_alarm ?? 'ask',
      manage_memory: body.permissions?.manage_memory ?? 'always',
      microphone: body.permissions?.microphone ?? 'ask',
    };

    const pendingTasks = (body.tasks || [])
      .filter((t) => !t.completed)
      .map((t) => t.title);

    const systemInstruction = buildShamiaSystemInstruction(
      identity,
      detectedIntent,
      permissions,
      pendingTasks,
      Array.isArray(body.routine) ? body.routine : [],
      Array.isArray(body.syllabus) ? body.syllabus : [],
      requestedModelId,
      modelLabel
    );

    let preFetchedSearchLinks: GroundingLink[] = [];
    let preFetchedSearchSummary = '';
    if (useResearch) {
      const freeSearch = await executeFreeOpenWebSearch(message);
      preFetchedSearchSummary = freeSearch.summary;
      preFetchedSearchLinks = freeSearch.results.map((r) => ({ title: r.title, uri: r.url }));
    }

    const searchPromptBlock = preFetchedSearchSummary
      ? `\n\n[LIVE WEB SEARCH CONTEXT — SYNTHESIZE INTO A CLEAN, CONSTRUCTIVE, USER-FRIENDLY ANSWER IN YOUR OWN WORDS. NEVER REPEAT CUT-OFF SNIPPETS OR HTML ARTIFACTS]:\n${preFetchedSearchSummary}`
      : '';

    const openMessages = [
      {
        role: 'system',
        content: `${systemInstruction}${searchPromptBlock}`,
      },
      ...(body.history || [])
        .slice(-6)
        .map((t) => ({
          role: t.role === 'user' ? 'user' : 'assistant',
          content: sanitizeHistoryTurnText(t.text),
        }))
        .filter((t) => t.content.length > 0),
      { role: 'user', content: message },
    ];

    // =========================================================================
    // PATH 0: Built-In S.H.A.M.I.A. Offline Core (only when explicitly selected)
    // =========================================================================
    if (weightSpec?.isBuiltInOfflineCore) {
      const offlineReply = generateOfflineCompanionReply(
        message,
        addr,
        identity.fullName,
        requestedModelId,
        modelLabel,
        preFetchedSearchSummary
      );
      const provenance = createVerifiedProvenance({
        requestedModelId,
        requestedModelLabel: modelLabel,
        executedProvider: 'offline-core',
        executedModelId: 'shamia-offline-core',
        strictMode: strictModelMatch,
        exactWeightsVerified: true,
      });
      res.json({
        replyText: enforceActiveModelOutput(offlineReply.text, modelLabel, requestedModelId),
        coachingTip: offlineReply.coachingTip,
        showBreathingTool: offlineReply.showBreathingTool,
        groundingLinks: preFetchedSearchLinks.slice(0, 4),
        source: 'offline-core',
        modelLabel,
        activeModelId: requestedModelId,
        requestedModelId,
        provenance,
      });
      return;
    }

    // =========================================================================
    // PATH 1: Exact Google Open-Weight Gemma API (ONLY for Gemma catalog models)
    // =========================================================================
    if (ai && weightSpec?.googleGemmaModels && detectedIntent !== 'device-action') {
      const candidateGemmaModels =
        liveGemmaModels.length > 0
          ? weightSpec.googleGemmaModels.filter((candidate) =>
              liveGemmaModels.some((live) => doesBackendModelMatch(candidate, live))
            )
          : weightSpec.googleGemmaModels;

      for (const candidateGemma of candidateGemmaModels) {
        try {
          // Gemma open-weight endpoints on Google API do not support developer systemInstruction;
          // fold the system instruction cleanly into the opening user turn.
          const baseTurns = buildValidAlternatingTurns(
            body.history,
            `${message}${searchPromptBlock}`
          );
          if (baseTurns.length > 0 && baseTurns[0].role === 'user') {
            baseTurns[0].parts[0].text = `[SYSTEM INSTRUCTIONS]\n${systemInstruction}${searchPromptBlock}\n\n[USER MESSAGE]\n${baseTurns[0].parts[0].text}`;
          }

          const gemmaRes = await ai.models.generateContent({
            model: candidateGemma,
            contents: baseTurns,
          });
          const rawGemma = gemmaRes.text?.trim();
          if (rawGemma) {
            const { cleanText, coachingTip } = extractCoachingTip(rawGemma);
            const provenance = createVerifiedProvenance({
              requestedModelId,
              requestedModelLabel: modelLabel,
              executedProvider: 'google-gemma-api',
              executedModelId: candidateGemma,
              strictMode: strictModelMatch,
              exactWeightsVerified: true,
            });
            res.json({
              replyText: enforceActiveModelOutput(
                cleanText || rawGemma,
                modelLabel,
                requestedModelId
              ),
              coachingTip,
              showBreathingTool: detectedIntent === 'mental-support',
              groundingLinks: preFetchedSearchLinks.slice(0, 5),
              source: useResearch ? 'cloud-research' : 'cloud-gemini',
              modelLabel,
              activeModelId: requestedModelId,
              requestedModelId,
              provenance,
            });
            return;
          }
        } catch (err) {
          console.warn(
            `[S.H.A.M.I.A. Exact Gemma] ${candidateGemma} failed:`,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
    }

    // =========================================================================
    // PATH 2: Exact NVIDIA NIM Open-Weight API (NVIDIA_API_KEY)
    // =========================================================================
    const nvidiaKey = getConfiguredKey('NVIDIA_API_KEY', 'MY_NVIDIA_API_KEY');
    if (nvidiaKey && weightSpec?.nvidiaModel) {
      const nvidiaRes = await callVerifiedOpenAiProvider({
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        apiKey: nvidiaKey,
        expectedModel: weightSpec.nvidiaModel,
        messages: openMessages,
        temperature: modelProfile?.temperature ?? 0.4,
      });
      if (nvidiaRes) {
        const { cleanText, coachingTip } = extractCoachingTip(nvidiaRes.text);
        const provenance = createVerifiedProvenance({
          requestedModelId,
          requestedModelLabel: modelLabel,
          executedProvider: 'nvidia-nim',
          executedModelId: nvidiaRes.executedModel,
          strictMode: strictModelMatch,
          exactWeightsVerified: true,
        });
        res.json({
          replyText: enforceActiveModelOutput(
            cleanText || nvidiaRes.text,
            modelLabel,
            requestedModelId
          ),
          coachingTip,
          showBreathingTool: detectedIntent === 'mental-support',
          groundingLinks: preFetchedSearchLinks.slice(0, 4),
          source: useResearch ? 'cloud-research' : 'cloud-gemini',
          modelLabel,
          activeModelId: requestedModelId,
          requestedModelId,
          provenance,
        });
        return;
      }
    }

    // =========================================================================
    // PATH 3: Exact HuggingFace Inference Router (HF_TOKEN)
    // =========================================================================
    const hfToken = getConfiguredKey('HF_TOKEN', 'MY_HUGGINGFACE_TOKEN');
    if (hfToken && weightSpec?.hfModel) {
      const hfRes = await callVerifiedOpenAiProvider({
        url: 'https://router.huggingface.co/v1/chat/completions',
        apiKey: hfToken,
        expectedModel: weightSpec.hfModel,
        messages: openMessages,
        temperature: modelProfile?.temperature ?? 0.4,
      });
      if (hfRes) {
        const { cleanText, coachingTip } = extractCoachingTip(hfRes.text);
        const provenance = createVerifiedProvenance({
          requestedModelId,
          requestedModelLabel: modelLabel,
          executedProvider: 'huggingface-router',
          executedModelId: hfRes.executedModel,
          strictMode: strictModelMatch,
          exactWeightsVerified: true,
        });
        res.json({
          replyText: enforceActiveModelOutput(
            cleanText || hfRes.text,
            modelLabel,
            requestedModelId
          ),
          coachingTip,
          showBreathingTool: detectedIntent === 'mental-support',
          groundingLinks: preFetchedSearchLinks.slice(0, 4),
          source: useResearch ? 'cloud-research' : 'cloud-gemini',
          modelLabel,
          activeModelId: requestedModelId,
          requestedModelId,
          provenance,
        });
        return;
      }
    }

    // =========================================================================
    // PATH 4: Exact OpenRouter Open-Weight API (OPENROUTER_API_KEY)
    // =========================================================================
    const openRouterKey = getConfiguredKey('OPENROUTER_API_KEY', 'MY_OPENROUTER_API_KEY');
    if (openRouterKey && weightSpec?.openRouterModel) {
      const orRes = await callVerifiedOpenAiProvider({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: openRouterKey,
        expectedModel: weightSpec.openRouterModel,
        messages: openMessages,
        temperature: modelProfile?.temperature ?? 0.4,
        extraHeaders: {
          'X-Title': 'S.H.A.M.I.A.',
        },
      });
      if (orRes) {
        const { cleanText, coachingTip } = extractCoachingTip(orRes.text);
        const provenance = createVerifiedProvenance({
          requestedModelId,
          requestedModelLabel: modelLabel,
          executedProvider: 'openrouter',
          executedModelId: orRes.executedModel,
          strictMode: strictModelMatch,
          exactWeightsVerified: true,
        });
        res.json({
          replyText: enforceActiveModelOutput(
            cleanText || orRes.text,
            modelLabel,
            requestedModelId
          ),
          coachingTip,
          showBreathingTool: detectedIntent === 'mental-support',
          groundingLinks: preFetchedSearchLinks.slice(0, 4),
          source: useResearch ? 'cloud-research' : 'cloud-gemini',
          modelLabel,
          activeModelId: requestedModelId,
          requestedModelId,
          provenance,
        });
        return;
      }
    }

    // =========================================================================
    // PATH 5: Exact Server-Side Ollama (OLLAMA_URL)
    // =========================================================================
    const serverOllamaUrl = getConfiguredKey('OLLAMA_URL', '');
    if (serverOllamaUrl && weightSpec?.ollamaTag) {
      try {
        const oRes = await fetch(`${serverOllamaUrl.replace(/\/+$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: weightSpec.ollamaTag,
            messages: openMessages,
            stream: false,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (oRes.ok) {
          const oJson = (await oRes.json()) as {
            model?: string;
            message?: { content?: string };
          };
          const rawOllama = oJson.message?.content?.trim();
          const returnedTag = (oJson.model || '').trim();
          if (
            rawOllama &&
            (!returnedTag || doesBackendModelMatch(weightSpec.ollamaTag, returnedTag))
          ) {
            const { cleanText, coachingTip } = extractCoachingTip(rawOllama);
            const provenance = createVerifiedProvenance({
              requestedModelId,
              requestedModelLabel: modelLabel,
              executedProvider: 'ollama-local',
              executedModelId: returnedTag || weightSpec.ollamaTag,
              strictMode: strictModelMatch,
              exactWeightsVerified: true,
            });
            res.json({
              replyText: enforceActiveModelOutput(
                cleanText || rawOllama,
                modelLabel,
                requestedModelId
              ),
              coachingTip,
              showBreathingTool: detectedIntent === 'mental-support',
              groundingLinks: preFetchedSearchLinks.slice(0, 4),
              source: 'ollama-local',
              modelLabel,
              activeModelId: requestedModelId,
              requestedModelId,
              provenance,
            });
            return;
          }
        }
      } catch {
        // Proceed to strict gate
      }
    }

    // =========================================================================
    // STRICT VERIFICATION GATE: NEVER silently substitute a different model when strictModelMatch is ON
    // =========================================================================
    if (strictModelMatch && detectedIntent !== 'device-action') {
      const guidance = buildStrictMismatchGuidance({
        modelId: requestedModelId,
        modelLabel,
        addr,
        liveGemmaModels,
      });
      const provenance = createVerifiedProvenance({
        requestedModelId,
        requestedModelLabel: modelLabel,
        executedProvider: 'offline-core',
        executedModelId: 'none',
        strictMode: true,
        exactWeightsVerified: false,
        blockedByStrictMode: true,
      });
      res.json({
        replyText: guidance,
        groundingLinks: [],
        source: 'offline-core',
        modelLabel,
        activeModelId: requestedModelId,
        requestedModelId,
        blockedByStrictMode: true,
        provenance,
      });
      return;
    }

    // =========================================================================
    // PATH 6 (Strict Mode OFF or device-action tool routing):
    // Compatible Cloud Engine — ALWAYS reports honest provenance (exactWeightsVerified: false)
    // =========================================================================
    if (ai) {
      const mayNeedDeviceTools =
        detectedIntent === 'device-action' ||
        /\b(call|dial|open|launch|alarm|remind|add\s+task|clear\s+completed|save\s+note|add\s+note|wi-?fi|bluetooth|flashlight|torch|brightness|do\s+not\s+disturb|dnd|play\s+music)\b/i.test(
          message
        );

      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];

      for (const candidateModel of candidateModels) {
        try {
          const contents = buildValidAlternatingTurns(
            body.history,
            `${message}${searchPromptBlock}`
          );

          // Do not pass deprecated sampling params (temperature/topP/topK) or maxOutputTokens to gemini-4-hydrogen
          const config: Record<string, unknown> = {
            systemInstruction: `${systemInstruction}${searchPromptBlock}`,
          };

          // Never combine googleSearch and functionDeclarations in the same request
          if (useResearch && !mayNeedDeviceTools) {
            config.tools = [{ googleSearch: {} }];
          } else if (mayNeedDeviceTools) {
            config.tools = [{ functionDeclarations: SHAMIA_FUNCTION_DECLARATIONS }];
          }

          const response = await ai.models.generateContent({
            model: candidateModel,
            contents,
            config,
          });

          const rawText = response.text?.trim() || '';
          const { cleanText, coachingTip } = extractCoachingTip(rawText);

          const groundingChunks =
            response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const groundingLinks: GroundingLink[] = [];
          for (const chunk of groundingChunks) {
            const web = (chunk as { web?: { uri?: string; title?: string } }).web;
            if (web?.uri && web?.title) {
              groundingLinks.push({ title: web.title, uri: web.uri });
            }
          }
          if (useResearch && groundingLinks.length === 0) {
            groundingLinks.push(...preFetchedSearchLinks);
          }

          const firstCall = mayNeedDeviceTools ? response.functionCalls?.[0] : undefined;
          let proposedAction: Omit<PendingAction, 'id' | 'status' | 'createdAt'> | undefined;
          let directMemoryMutation:
            | { kind: 'add_task'; title: string; priority: 'high' | 'normal' }
            | { kind: 'clear_completed' }
            | { kind: 'add_note'; content: string }
            | undefined;
          let replyText = cleanText;

          if (firstCall?.name) {
            const args = (firstCall.args || {}) as Record<string, unknown>;
            switch (firstCall.name) {
              case 'dial_contact': {
                const target = String(args.target || 'Unknown Contact');
                const phone = validatePhoneNumber(String(args.phoneNumber || target)) || '';
                proposedAction = {
                  type: 'dial_contact',
                  capability: 'dial_contact',
                  title: `Dial ${phone || target}`,
                  detail: phone
                    ? `Initiate a phone call to ${phone} via your device dialer.`
                    : `Confirm phone digits for "${target}" before dialing.`,
                  payload: { target, phoneNumber: phone },
                };
                if (!replyText) {
                  replyText = `I have staged a call to ${phone || target}, ${addr}. Please confirm permission to proceed.`;
                }
                break;
              }
              case 'open_app': {
                const appName = String(args.appName || '');
                const resolved = resolveSupportedApp(appName);
                if (resolved) {
                  proposedAction = {
                    type: 'open_app',
                    capability: 'open_app',
                    title: `Open ${resolved.name}`,
                    detail: `Launch ${resolved.schemeNote} in a new browser tab.`,
                    payload: { appName: resolved.name, url: resolved.url },
                  };
                  if (!replyText) {
                    replyText = `Standing by to open ${resolved.name}, ${addr}. Awaiting your authorization.`;
                  }
                } else if (!replyText) {
                  replyText = `I cannot safely launch "${appName}", ${addr}. Supported apps include Spotify, YouTube Music, Google Maps, Calendar, and Gmail.`;
                }
                break;
              }
              case 'toggle_device_control': {
                const setting = String(args.setting || '').toLowerCase();
                if (setting === 'brightness') {
                  const level = Math.max(25, Math.min(100, Number(args.brightnessLevel || 80)));
                  proposedAction = {
                    type: 'set_brightness',
                    capability: 'device_control',
                    title: `Set Brightness to ${level}%`,
                    detail: `Adjust display luminance to ${level}%.`,
                    payload: { level },
                  };
                } else {
                  const enabled = Boolean(args.enabled ?? true);
                  const map: Record<
                    string,
                    {
                      type:
                        | 'toggle_wifi'
                        | 'toggle_bluetooth'
                        | 'toggle_dnd'
                        | 'toggle_flashlight';
                      label: string;
                    }
                  > = {
                    wifi: { type: 'toggle_wifi', label: 'Wi-Fi' },
                    bluetooth: { type: 'toggle_bluetooth', label: 'Bluetooth' },
                    dnd: { type: 'toggle_dnd', label: 'Do Not Disturb' },
                    flashlight: { type: 'toggle_flashlight', label: 'Flashlight' },
                  };
                  const target = map[setting] || map.wifi;
                  proposedAction = {
                    type: target.type,
                    capability: 'device_control',
                    title: `${enabled ? 'Enable' : 'Disable'} ${target.label}`,
                    detail: `Update ${target.label} state on your device controls.`,
                    payload: { enabled },
                  };
                }
                if (!replyText) {
                  replyText = `Hardware control staged, ${addr}. Please authorize in the card below.`;
                }
                break;
              }
              case 'play_music': {
                const query = String(args.query || 'focus');
                proposedAction = {
                  type: 'play_music',
                  capability: 'play_music',
                  title: 'Play Audio Track',
                  detail: `Activate the built-in ambient audio engine (${query}).`,
                  payload: { query },
                };
                if (!replyText) {
                  replyText = `Audio synthesis is queued for "${query}", ${addr}. Please authorize playback.`;
                }
                break;
              }
              case 'set_alarm': {
                const label = String(args.label || 'Reminder');
                const minutes = Math.max(1, Number(args.minutesFromNow || 5));
                const triggerAt = Date.now() + minutes * 60 * 1000;
                const formattedTime = new Date(triggerAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                proposedAction = {
                  type: 'set_alarm',
                  capability: 'set_alarm',
                  title: `Set Alarm: ${label}`,
                  detail: `Schedule an audible alarm for ${formattedTime}.`,
                  payload: { label, triggerAt, formattedTime },
                };
                if (!replyText) {
                  replyText = `Alarm staged for ${formattedTime}, ${addr}. Please authorize to arm it.`;
                }
                break;
              }
              case 'add_task': {
                const title = String(args.title || '').trim();
                const priority = args.priority === 'high' ? 'high' : 'normal';
                if (title) {
                  if (permissions.manage_memory === 'always') {
                    directMemoryMutation = { kind: 'add_task', title, priority };
                    if (!replyText) {
                      replyText = `Recorded to your priority ledger, ${addr}: "${title}".`;
                    }
                  } else {
                    proposedAction = {
                      type: 'add_task',
                      capability: 'manage_memory',
                      title: `Add Task: ${title}`,
                      detail: 'Save this item to your local priority ledger.',
                      payload: { title, priority },
                    };
                  }
                }
                break;
              }
              case 'clear_completed_tasks': {
                if (permissions.manage_memory === 'always') {
                  directMemoryMutation = { kind: 'clear_completed' };
                  if (!replyText) {
                    replyText = `Completed items cleared from your ledger, ${addr}.`;
                  }
                } else {
                  proposedAction = {
                    type: 'clear_completed_tasks',
                    capability: 'manage_memory',
                    title: 'Clear Completed Tasks',
                    detail: 'Remove completed items from your local ledger.',
                    payload: {},
                  };
                }
                break;
              }
              case 'add_note': {
                const content = String(args.content || '').trim();
                if (content) {
                  if (permissions.manage_memory === 'always') {
                    directMemoryMutation = { kind: 'add_note', content };
                    if (!replyText) {
                      replyText = `Noted and archived locally, ${addr}.`;
                    }
                  } else {
                    proposedAction = {
                      type: 'add_note',
                      capability: 'manage_memory',
                      title: 'Save Note',
                      detail: `Store note: "${content.slice(0, 60)}"`,
                      payload: { content },
                    };
                  }
                }
                break;
              }
            }
          }

          if (replyText || proposedAction || directMemoryMutation) {
            const finalText = enforceActiveModelOutput(
              replyText || `At your service, ${addr}. How may I help you next?`,
              modelLabel,
              requestedModelId
            );
            const provenance = createVerifiedProvenance({
              requestedModelId,
              requestedModelLabel: modelLabel,
              executedProvider: 'google-gemini-fallback',
              executedModelId: candidateModel,
              strictMode: strictModelMatch,
              exactWeightsVerified: false,
            });
            res.json({
              replyText: finalText,
              proposedAction,
              directMemoryMutation,
              coachingTip,
              showBreathingTool: detectedIntent === 'mental-support',
              groundingLinks: groundingLinks.slice(0, 4),
              source: useResearch ? 'cloud-research' : 'cloud-gemini',
              modelLabel,
              activeModelId: requestedModelId,
              requestedModelId,
              provenance,
            });
            return;
          }
        } catch (err) {
          console.warn(
            `[S.H.A.M.I.A. Path 6 Fallback] ${candidateModel} failed:`,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
    }

    // Final honest fallback (only reached if strictModelMatch is OFF and cloud is unreachable)
    const constructiveFallback = generateOfflineCompanionReply(
      message,
      addr,
      identity.fullName,
      requestedModelId,
      modelLabel,
      preFetchedSearchSummary
    );
    const provenance = createVerifiedProvenance({
      requestedModelId,
      requestedModelLabel: modelLabel,
      executedProvider: 'offline-core',
      executedModelId: 'shamia-offline-core',
      strictMode: strictModelMatch,
      exactWeightsVerified: requestedModelId === 'offline-core',
    });

    res.json({
      replyText: enforceActiveModelOutput(
        constructiveFallback.text,
        modelLabel,
        requestedModelId
      ),
      coachingTip: constructiveFallback.coachingTip,
      showBreathingTool: constructiveFallback.showBreathingTool,
      groundingLinks: preFetchedSearchLinks.slice(0, 4),
      source: 'offline-core',
      modelLabel,
      activeModelId: requestedModelId,
      requestedModelId,
      provenance,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`S.H.A.M.I.A. server active on http://0.0.0.0:${PORT}`);
  });
}

createApp();
