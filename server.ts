import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  FunctionDeclaration,
  GoogleGenAI,
  ThinkingLevel,
  Type,
} from '@google/genai';
import { buildShamiaSystemInstruction, extractCoachingTip } from './src/lib/jarvisPrompts.ts';
import { resolveSupportedApp, validatePhoneNumber } from './src/lib/intentEngine.ts';
import type {
  ConversationalIntent,
  GroundingLink,
  PendingAction,
  PermissionCapability,
  PermissionPolicy,
  UserIdentityProfile,
} from './src/types/jarvis.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

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

async function executeFreeOpenWebSearch(query: string): Promise<{
  summary: string;
  results: Array<{ title: string; snippet: string; url: string }>;
}> {
  const cleanQuery = query
    .trim()
    .replace(
      /^(?:search(?:\s+for)?|research|look\s+up|find(?:\s+out)?|tell\s+me\s+about|latest\s+breakthroughs\s+in|latest\s+news\s+(?:on|about)?)\s+/i,
      ''
    )
    .trim();
  if (!cleanQuery) {
    return { summary: '', results: [] };
  }

  const results: Array<{ title: string; snippet: string; url: string }> = [];
  let summary = '';

  // 1. DuckDuckGo Instant Answer API (free, no key)
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(5000) }
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
      for (const topic of (ddg.RelatedTopics || []).slice(0, 3)) {
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

  // 2. Wikipedia Open REST Search API (free, real-time, no key)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQuery
      )}&format=json&srlimit=3&origin=*`,
      { signal: AbortSignal.timeout(5000) }
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
    summary = results[0].snippet;
  }

  return {
    summary: summary || `Live web index returned ${results.length} matching references.`,
    results: results.slice(0, 4),
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
  useResearch?: boolean;
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

  app.post('/api/jarvis/chat', async (req, res) => {
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
      Boolean(body.useResearch) ||
      /\b(research|search|look up|latest|news|who won|what happened|current price|weather)\b/i.test(
        message
      );

    const ai = getGeminiClient();

    // If cloud Gemini key isn't configured, still provide free real-time open web search when asked!
    if (!ai) {
      if (useResearch) {
        const freeSearch = await executeFreeOpenWebSearch(message);
        const links: GroundingLink[] = freeSearch.results.map((r) => ({
          title: r.title,
          uri: r.url,
        }));
        const replyText = freeSearch.summary
          ? `Here is what live open web search found, ${addr}: ${freeSearch.summary}`
          : `I ran a live open web search, ${addr}, though matching public summaries were limited. See the source links below.`;
        res.json({
          replyText,
          groundingLinks: links,
          source: 'cloud-research',
        });
        return;
      }

      res.status(503).json({
        error: `Cloud AI key is not configured on this server, ${addr}. Switch to S.H.A.M.I.A. Offline Core or a 2B local/WebGPU open-source model in the Models tab—or enable free live web search.`,
      });
      return;
    }

    const detectedIntent: ConversationalIntent = body.detectedIntent || 'general';

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
      pendingTasks
    );

    const conversationHistory = (body.history || []).slice(-10).map((turn) => ({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    }));

    const contents = [
      ...conversationHistory,
      { role: 'user', parts: [{ text: message }] },
    ];

    const model =
      useResearch || detectedIntent !== 'general'
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
      };

      if (useResearch) {
        config.toolConfig = { includeServerSideToolInvocations: true };
      }

      if (model === 'gemini-4-hydrogen') {
        config.thinkingConfig = {
          thinkingLevel: useResearch ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
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
      server: { middlewareMode: true },
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
