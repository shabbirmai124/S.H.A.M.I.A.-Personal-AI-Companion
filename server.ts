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
  ThinkingLevel,
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
import type {
  ConversationalIntent,
  GroundingLink,
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

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
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
  let summary = '';

  // 1. Live Google Search Index RSS (real-time Google articles & hardware/news coverage, zero API key)
  try {
    const googleRes = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SHAMIA/1.0)' },
        signal: AbortSignal.timeout(4500),
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
        const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google Search';
        const title = decodeXmlEntities(rawTitle);
        const url = decodeXmlEntities(rawLink);
        const source = decodeXmlEntities(rawSource);
        if (title && url) {
          results.push({
            title: `${title} (${source})`,
            snippet: `${title} — ${source}`,
            url,
          });
          count += 1;
        }
      }
    }
  } catch {
    // Continue to DuckDuckGo + Wikipedia
  }

  // 2. DuckDuckGo Instant Answer API (free, no key)
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (ddgRes.ok) {
      const ddg = (await ddgRes.json()) as {
        Heading?: string;
        AbstractText?: string;
        AbstractURL?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };
      if (ddg.AbstractText) {
        summary = ddg.AbstractText;
        if (ddg.AbstractURL) {
          results.push({
            title: ddg.Heading || cleanQuery,
            snippet: ddg.AbstractText,
            url: ddg.AbstractURL,
          });
        }
      }
      for (const topic of (ddg.RelatedTopics || []).slice(0, 2)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0].slice(0, 72),
            snippet: topic.Text,
            url: topic.FirstURL,
          });
        }
      }
    }
  } catch {
    // Continue to Wikipedia fallback
  }

  // 3. Wikipedia Open REST Search API (free, real-time, no key)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQuery
      )}&format=json&srlimit=3&origin=*`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (wikiRes.ok) {
      const wiki = (await wikiRes.json()) as {
        query?: {
          search?: Array<{ title: string; snippet: string; pageid: number }>;
        };
      };
      for (const item of wiki.query?.search || []) {
        const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').trim();
        const url = `https://en.wikipedia.org/?curid=${item.pageid}`;
        results.push({
          title: item.title,
          snippet: cleanSnippet,
          url,
        });
        if (!summary && cleanSnippet) {
          summary = cleanSnippet;
        }
      }
    }
  } catch {
    // Ignore search fallback error
  }

  if (!summary && results.length > 0) {
    summary = results
      .slice(0, 3)
      .map((r) => r.snippet)
      .join(' | ');
  }

  return {
    summary: summary || `Live search returned ${results.length} matching references.`,
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
  ensembleEnabled?: boolean;
  ensembleModelIds?: string[];
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({ ok: true, aiConfigured: hasKey, freeSearchAvailable: true });
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

    const useResearch =
      body.useResearch === false
        ? false
        : Boolean(body.useResearch) || shouldTriggerLiveSearch(message);

    const detectedIntent: ConversationalIntent = body.detectedIntent || 'general';
    const requestedModelId = (body.modelId || 'gemma-4-free').trim();

    const MODEL_LABELS: Record<string, string> = {
      'gemma-4-free': 'Gemma 4 · Real-Time Search',
      'qwen3-8b-chinese': 'Qwen 3 8B',
      'qwen3-4b-edge': 'Qwen 3 4B',
      'minicpm-o-26': 'MiniCPM-o 2.6 8B',
      'glm-4-9b': 'GLM-4 9B',
      'gpt-oss-20b-free': 'GPT-OSS 20B',
      'gemma-3-free': 'Gemma 3',
      'llama-32-free': 'Llama 3.2 1B',
      'qwen25-1.5b-edge': 'Qwen 2.5 1.5B',
      'deepseek-r1-1.5b': 'DeepSeek-R1 1.5B',
      'phi35-mini-free': 'Phi-3.5 Mini',
      'smollm2-1.7b-edge': 'SmolLM2 1.7B',
      'qwen25-0.5b-webgpu': 'Qwen 2.5 0.5B',
      'smollm2-360m-webgpu': 'SmolLM2 360M',
      'offline-core': 'DeepSeek 2B · Offline Core',
    };
    const modelProfile = MODEL_DISTINCT_PROFILES[requestedModelId];
    const modelLabel =
      MODEL_LABELS[requestedModelId] ||
      modelProfile?.displayName ||
      body.modelLabel?.trim() ||
      requestedModelId;

    console.log(
      `[S.H.A.M.I.A. Router] Executing active modelId="${requestedModelId}" (${modelLabel}) | research=${useResearch} | ensemble=${Boolean(body.ensembleEnabled)}`
    );

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

    const ai = getGeminiClient();
    const ensembleIds = Array.isArray(body.ensembleModelIds)
      ? body.ensembleModelIds.filter((id) => typeof id === 'string' && id.trim()).slice(0, 4)
      : [];
    const useEnsemble = Boolean(body.ensembleEnabled) && ensembleIds.length >= 2;

    if (useEnsemble) {
      let ensembleSearchSummary = '';
      let ensembleSearchLinks: GroundingLink[] = [];
      if (useResearch) {
        const liveSearch = await executeFreeOpenWebSearch(message);
        ensembleSearchSummary = liveSearch.summary;
        ensembleSearchLinks = liveSearch.results.map((r) => ({ title: r.title, uri: r.url }));
      }

      const sharedMessages = [
        {
          role: 'system',
          content: `${systemInstruction}${ensembleSearchSummary ? `\n\nReal-time Google & Web search context:\n${ensembleSearchSummary}` : ''}`,
        },
        ...(body.history || []).slice(-4).map((t) => ({
          role: t.role === 'user' ? 'user' : 'assistant',
          content: t.text,
        })),
        { role: 'user', content: message },
      ];

      const runCandidate = async (mId: string): Promise<{ name: string; text: string } | null> => {
        const label = MODEL_LABELS[mId] || mId;
        try {
          if (mId === 'gpt-oss-20b-free') {
            if (process.env.HF_TOKEN && process.env.HF_TOKEN !== 'MY_HUGGINGFACE_TOKEN') {
              const r = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.HF_TOKEN.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: sharedMessages, max_tokens: 260 }),
                signal: AbortSignal.timeout(4000),
              });
              if (r.ok) {
                const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
                const t = j.choices?.[0]?.message?.content?.trim();
                if (t) return { name: label, text: t };
              }
            }
            const pr = await fetch('https://text.pollinations.ai/openai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'openai-fast', messages: sharedMessages }),
              signal: AbortSignal.timeout(3500),
            });
            if (pr.ok) {
              const pj = (await pr.json()) as { choices?: Array<{ message?: { content?: string } }> };
              const t = pj.choices?.[0]?.message?.content?.trim();
              if (t) return { name: label, text: t };
            }
          }

          if (ai && (mId === 'gemma-4-free' || mId === 'gemma-3-free')) {
            const gemmaRes = await ai.models.generateContent({
              model: 'gemma-3-4b-it',
              contents: [
                { role: 'user', parts: [{ text: `${sharedMessages[0].content}\n\nQuestion: ${message}` }] },
              ],
            });
            const t = gemmaRes.text?.trim();
            if (t) return { name: label, text: t };
          }

          if (ai) {
            const flashRes = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: [{ role: 'user', parts: [{ text: message }] }],
              config: {
                systemInstruction: `${systemInstruction}\nAnswer concisely from the perspective of ${label}.${
                  ensembleSearchSummary ? `\n\nReal-time Google context:\n${ensembleSearchSummary}` : ''
                }`,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            });
            const t = flashRes.text?.trim();
            if (t) return { name: label, text: t };
          }
        } catch {
          return null;
        }
        return null;
      };

      const settled = await Promise.allSettled(ensembleIds.slice(0, 3).map((id) => runCandidate(id)));
      const drafts = settled
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((d): d is { name: string; text: string } => Boolean(d && d.text));

      const activeNames = (drafts.length > 0 ? drafts.map((d) => d.name) : ensembleIds.map((id) => MODEL_LABELS[id] || id))
        .slice(0, 3)
        .join(' + ');

      if (ai) {
        try {
          const synthTools: Array<Record<string, unknown>> = useResearch ? [{ googleSearch: {} }] : [];
          const draftBlock =
            drafts.length > 0
              ? `\n\nOpen-model candidate answers to cross-check and synthesize:\n${drafts
                  .map((d) => `[${d.name}]: ${d.text}`)
                  .join('\n')}`
              : '';
          const synthResponse = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: [{ role: 'user', parts: [{ text: `${message}${draftBlock}` }] }],
            config: {
              systemInstruction: `${systemInstruction}\nCross-verify all open-model candidate responses and any real-time Google Search facts to produce ONE clear, accurate, concise answer addressed to ${addr}.`,
              tools: synthTools.length > 0 ? synthTools : undefined,
              toolConfig: useResearch ? { includeServerSideToolInvocations: true } : undefined,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const rawText = synthResponse.text?.trim() || drafts[0]?.text || '';
          const { cleanText, coachingTip } = extractCoachingTip(rawText);
          const groundingChunks = synthResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const groundingLinks: GroundingLink[] = [];
          for (const chunk of groundingChunks) {
            const web = (chunk as { web?: { uri?: string; title?: string } }).web;
            if (web?.uri && web?.title) groundingLinks.push({ title: web.title, uri: web.uri });
          }
          if (useResearch && groundingLinks.length === 0) {
            groundingLinks.push(...ensembleSearchLinks);
          }
          if (cleanText || rawText) {
            res.json({
              replyText: cleanText || rawText,
              coachingTip,
              showBreathingTool: detectedIntent === 'mental-support',
              groundingLinks: groundingLinks.slice(0, 5),
              source: useResearch ? 'cloud-research' : 'cloud-gemini',
              modelLabel: `Ensemble (${activeNames})`,
            });
            return;
          }
        } catch {
          // Fall through cleanly if synthesis fails
        }
      }

      if (drafts.length > 0) {
        const { cleanText, coachingTip } = extractCoachingTip(drafts[0].text);
        res.json({
          replyText: cleanText || drafts[0].text,
          coachingTip,
          showBreathingTool: detectedIntent === 'mental-support',
          groundingLinks: ensembleSearchLinks.slice(0, 5),
          source: useResearch ? 'cloud-research' : 'cloud-gemini',
          modelLabel: `Ensemble (${activeNames})`,
        });
        return;
      }
    }

    const shouldTryOpenRouter =
      !ai ||
      requestedModelId === 'qwen3-8b-chinese' ||
      requestedModelId === 'qwen3-4b-edge' ||
      requestedModelId === 'minicpm-o-26' ||
      requestedModelId === 'glm-4-9b' ||
      requestedModelId === 'gpt-oss-20b-free' ||
      requestedModelId === 'llama-32-free' ||
      requestedModelId === 'qwen25-1.5b-edge' ||
      requestedModelId === 'deepseek-r1-1.5b' ||
      requestedModelId === 'phi35-mini-free' ||
      requestedModelId === 'smollm2-1.7b-edge';

    let preFetchedSearchLinks: GroundingLink[] = [];
    let preFetchedSearchSummary = '';

    if (shouldTryOpenRouter) {
      if (useResearch) {
        const freeSearch = await executeFreeOpenWebSearch(message);
        preFetchedSearchSummary = freeSearch.summary;
        preFetchedSearchLinks = freeSearch.results.map((r) => ({ title: r.title, uri: r.url }));
      }

      const openMessages = [
        {
          role: 'system',
          content: `${systemInstruction}${preFetchedSearchSummary ? `\n\nReal-time Google & Web search context:\n${preFetchedSearchSummary}` : ''}`,
        },
        ...(body.history || []).slice(-6).map((t) => ({
          role: t.role === 'user' ? 'user' : 'assistant',
          content: t.text,
        })),
        { role: 'user', content: message },
      ];

      // 1) Optional HF_TOKEN router
      if (process.env.HF_TOKEN && process.env.HF_TOKEN !== 'MY_HUGGINGFACE_TOKEN') {
        try {
          const hfModel =
            requestedModelId === 'qwen3-8b-chinese'
              ? 'Qwen/Qwen3-8B'
              : requestedModelId === 'qwen3-4b-edge'
                ? 'Qwen/Qwen3-4B'
                : requestedModelId === 'minicpm-o-26'
                  ? 'openbmb/MiniCPM-o-2_6'
                  : requestedModelId === 'glm-4-9b'
                    ? 'THUDM/glm-4-9b-chat'
                    : requestedModelId === 'gpt-oss-20b-free'
                      ? 'openai/gpt-oss-20b'
                      : requestedModelId === 'llama-32-free'
                        ? 'meta-llama/Llama-3.2-3B-Instruct'
                        : requestedModelId === 'deepseek-r1-1.5b'
                          ? 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B'
                          : requestedModelId === 'phi35-mini-free'
                            ? 'microsoft/Phi-3.5-mini-instruct'
                            : requestedModelId === 'smollm2-1.7b-edge'
                              ? 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
                              : requestedModelId === 'gemma-3-free' || requestedModelId === 'gemma-4-free'
                                ? 'google/gemma-2-2b-it'
                                : 'Qwen/Qwen2.5-1.5B-Instruct';
          const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.HF_TOKEN.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: hfModel, messages: openMessages, max_tokens: 320 }),
            signal: AbortSignal.timeout(7000),
          });
          if (hfRes.ok) {
            const hfJson = (await hfRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const rawReply = hfJson.choices?.[0]?.message?.content?.trim();
            if (rawReply) {
              const { cleanText, coachingTip } = extractCoachingTip(rawReply);
              res.json({
                replyText: cleanText || rawReply,
                coachingTip,
                showBreathingTool: detectedIntent === 'mental-support',
                groundingLinks: preFetchedSearchLinks.slice(0, 4),
                source: useResearch ? 'cloud-research' : 'cloud-gemini',
                modelLabel,
              });
              return;
            }
          }
        } catch {
          // Fall through
        }
      }

      // 2) Free keyless GPT-OSS 20B anonymous open endpoint (when !ai or explicitly chosen gpt-oss-20b-free with quick timeout)
      if (!ai || requestedModelId === 'gpt-oss-20b-free') {
        try {
          const freeRes = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai-fast',
              messages: openMessages,
            }),
            signal: AbortSignal.timeout(ai ? 2500 : 5000),
          });
          if (freeRes.ok) {
            const freeJson = (await freeRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const rawReply = freeJson.choices?.[0]?.message?.content?.trim();
            if (rawReply) {
              const { cleanText, coachingTip } = extractCoachingTip(rawReply);
              res.json({
                replyText: cleanText || rawReply,
                coachingTip,
                showBreathingTool: detectedIntent === 'mental-support',
                groundingLinks: preFetchedSearchLinks.slice(0, 4),
                source: useResearch ? 'cloud-research' : 'cloud-gemini',
                modelLabel,
              });
              return;
            }
          }
        } catch {
          // Fall through cleanly to Google / Offline fallback
        }
      }
    }

    // Free open web search fallback when server key isn't set
    if (!ai) {
      if (useResearch) {
        const links =
          preFetchedSearchLinks.length > 0
            ? preFetchedSearchLinks
            : (await executeFreeOpenWebSearch(message)).results.map((r) => ({
                title: r.title,
                uri: r.url,
              }));
        const replyText = preFetchedSearchSummary
          ? `Here is what real-time Google & open web search found, ${addr}: ${preFetchedSearchSummary}`
          : `I ran a live Google web search, ${addr}. See the source links below.`;
        res.json({
          replyText,
          groundingLinks: links.slice(0, 4),
          source: 'cloud-research',
          modelLabel,
        });
        return;
      }

      res.status(503).json({
        error: `Online endpoint unreachable, ${addr}. Using local engine.`,
      });
      return;
    }

    const conversationHistory = (body.history || []).slice(-10).map((turn) => ({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    }));

    const contents = [
      ...conversationHistory,
      { role: 'user', parts: [{ text: message }] },
    ];

    // Prefer open-weight gemma-3-4b-it for standard Gemma 3 / Gemma 4 chat when Google Search isn't needed
    if (
      (requestedModelId === 'gemma-3-free' || requestedModelId === 'gemma-4-free') &&
      !useResearch &&
      detectedIntent === 'general'
    ) {
      try {
        const gemmaContents = [
          { role: 'user', parts: [{ text: `[System Instructions]\n${systemInstruction}` }] },
          { role: 'model', parts: [{ text: `Understood, ${addr}.` }] },
          ...contents,
        ];
        const gemmaRes = await ai.models.generateContent({
          model: 'gemma-3-4b-it',
          contents: gemmaContents,
          config: {
            temperature: modelProfile?.temperature ?? 0.45,
          },
        });
        const rawGemma = gemmaRes.text?.trim();
        if (rawGemma) {
          const { cleanText, coachingTip } = extractCoachingTip(rawGemma);
          res.json({
            replyText: cleanText || rawGemma,
            coachingTip,
            showBreathingTool: false,
            groundingLinks: [],
            source: 'cloud-gemini',
            modelLabel,
            activeModelId: requestedModelId,
          });
          return;
        }
      } catch {
        // Seamlessly fall back to Flash-Lite / Hydrogen below
      }
    }

    const isHeavyReasoningModel =
      requestedModelId === 'gpt-oss-20b-free' ||
      requestedModelId === 'qwen3-8b-chinese' ||
      requestedModelId === 'glm-4-9b' ||
      requestedModelId === 'gemma-4-free' ||
      requestedModelId === 'offline-core';

    const model =
      useResearch || detectedIntent !== 'general' || isHeavyReasoningModel
        ? 'gemini-4-hydrogen'
        : 'gemini-3.1-flash-lite';

    try {
      const tools: Array<Record<string, unknown>> = [
        { functionDeclarations: SHAMIA_FUNCTION_DECLARATIONS },
      ];
      if (useResearch) {
        tools.unshift({ googleSearch: {} });
      }

      const config: Record<string, unknown> = {
        systemInstruction,
        tools,
        temperature: modelProfile?.temperature ?? 0.4,
      };

      if (useResearch) {
        config.toolConfig = { includeServerSideToolInvocations: true };
      }

      if (model === 'gemini-4-hydrogen') {
        config.thinkingConfig = {
          thinkingLevel:
            useResearch || requestedModelId === 'gpt-oss-20b-free'
              ? ThinkingLevel.HIGH
              : ThinkingLevel.LOW,
        };
      } else {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.MINIMAL,
        };
      }

      const response = await ai.models.generateContent({
        model,
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
        if (preFetchedSearchLinks.length > 0) {
          groundingLinks.push(...preFetchedSearchLinks);
        } else {
          const backupSearch = await executeFreeOpenWebSearch(message);
          for (const item of backupSearch.results) {
            groundingLinks.push({ title: item.title, uri: item.url });
          }
        }
      }

      const firstCall = response.functionCalls?.[0];
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
                  type: 'toggle_wifi' | 'toggle_bluetooth' | 'toggle_dnd' | 'toggle_flashlight';
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
                if (!replyText) replyText = `Recorded to your priority ledger, ${addr}: "${title}".`;
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
              if (!replyText) replyText = `Completed items cleared from your ledger, ${addr}.`;
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
                if (!replyText) replyText = `Noted and archived locally, ${addr}.`;
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

      if (!replyText) {
        replyText = `At your service, ${addr}. How may I help you next?`;
      }

      res.json({
        replyText,
        proposedAction,
        directMemoryMutation,
        coachingTip,
        showBreathingTool: detectedIntent === 'mental-support',
        groundingLinks: groundingLinks.slice(0, 4),
        source: useResearch ? 'cloud-research' : 'cloud-gemini',
        modelLabel,
        activeModelId: requestedModelId,
      });
    } catch (err: unknown) {
      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 500;
      const safeMessage =
        status === 403 || status === 400
          ? `Cloud API authentication error, ${addr}. Switch to Offline Core or a local 2B open-source model in Models, or verify Secrets.`
          : `Unable to reach cloud intelligence right now, ${addr}. Offline Core and local models remain active.`;
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: safeMessage });
    }
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
