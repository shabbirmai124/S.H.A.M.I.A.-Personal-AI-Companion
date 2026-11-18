import type {
  GroundingLink,
  OfflineVoiceModelSpec,
  OpenSourceModelSpec,
  UserIdentityProfile,
} from '../types/shamia';

export interface DeviceHardwareReport {
  webGpuAvailable: boolean;
  deviceMemoryGb: number | null;
  effectiveRamGb: number;
  cpuCores: number | null;
  recommendedTier: string;
  recommendedModelId: string;
}

export function detectDeviceHardware(): DeviceHardwareReport {
  if (typeof navigator === 'undefined') {
    return {
      webGpuAvailable: false,
      deviceMemoryGb: null,
      effectiveRamGb: 4,
      cpuCores: null,
      recommendedTier: 'Safe Mode (4GB Profile)',
      recommendedModelId: 'gemma-4-free',
    };
  }

  const nav = navigator as Navigator & {
    gpu?: unknown;
    deviceMemory?: number;
  };
  const webGpuAvailable = Boolean(nav.gpu);
  const deviceMemoryGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const effectiveRamGb = deviceMemoryGb ?? 4;
  const cpuCores =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;

  let recommendedTier = 'Cloud + Safe Local (<2GB)';
  let recommendedModelId = 'gemma-4-free';
  if (effectiveRamGb >= 8 && webGpuAvailable) {
    recommendedTier = `${effectiveRamGb}GB RAM · Under-10B Ready`;
    recommendedModelId = 'qwen3-4b-edge';
  } else if (effectiveRamGb >= 4) {
    recommendedTier = `${effectiveRamGb}GB RAM · 1B–4B Safe`;
    recommendedModelId = 'qwen3-4b-edge';
  } else {
    recommendedTier = `${effectiveRamGb}GB RAM · 0.5B–2B Safe`;
    recommendedModelId = 'offline-core';
  }

  return {
    webGpuAvailable,
    deviceMemoryGb,
    effectiveRamGb,
    cpuCores,
    recommendedTier,
    recommendedModelId,
  };
}

export function isModelSafeForLocalInstall(
  spec: OpenSourceModelSpec,
  hardware: DeviceHardwareReport
): boolean {
  return hardware.effectiveRamGb >= spec.minRamGb;
}

export interface WebSearchItem {
  title: string;
  snippet: string;
  url: string;
}

export async function runFreeWebSearch(query: string): Promise<{
  summary: string;
  links: GroundingLink[];
}> {
  const res = await fetch('/api/web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error('Live web search is currently unreachable.');
  }

  const data = (await res.json()) as {
    summary?: string;
    results?: WebSearchItem[];
  };

  const links: GroundingLink[] = (data.results || [])
    .filter((r) => r.url && r.title)
    .map((r) => ({ title: r.title, uri: r.url }));

  return {
    summary: data.summary || 'No live snippets returned for this query.',
    links,
  };
}

export async function queryLocalOllama(params: {
  endpoint: string;
  modelTag: string;
  prompt: string;
  systemInstruction: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}): Promise<string> {
  const cleanBase = params.endpoint.replace(/\/+$/, '');
  const messages = [
    { role: 'system', content: params.systemInstruction },
    ...params.history.slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: params.prompt },
  ];

  const response = await fetch(`${cleanBase}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.modelTag,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Local Ollama endpoint (${cleanBase}) returned HTTP ${response.status}. Verify Ollama is running with CORS enabled.`
    );
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error('Local Ollama returned an empty response.');
  }
  return content;
}

const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm';
const INSTALLED_MODELS_KEY = 'shamia.installedModels.v1';
const INSTALLED_VOICE_KEY = 'shamia.installedVoiceModels.v1';
const CUSTOM_MODELS_KEY = 'shamia.customModels.v1';

function readInstalledIds(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveInstalledId(key: string, id: string) {
  if (typeof window === 'undefined') return;
  const list = readInstalledIds(key);
  if (!list.includes(id)) {
    window.localStorage.setItem(key, JSON.stringify([...list, id]));
  }
}

export function loadCustomOpenSourceModels(): OpenSourceModelSpec[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_MODELS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as OpenSourceModelSpec[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomOpenSourceModel(hfRepo: string): OpenSourceModelSpec {
  const cleanRepo = hfRepo.trim().replace(/^https?:\/\/huggingface\.co\//i, '').replace(/\/+$/, '');
  const shortName = cleanRepo.split('/').pop() || cleanRepo;
  const spec: OpenSourceModelSpec = {
    id: `custom-${cleanRepo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: shortName,
    provider: 'Custom Hugging Face ONNX',
    params: 'Custom Q4',
    sizeLabel: 'Browser Cache',
    minRamGb: 3,
    chipsetNote: '6nm+ / 4nm Custom',
    runtime: 'webgpu',
    family: 'custom',
    hfRepo: cleanRepo,
    summary: `Custom open-source repository (${cleanRepo}) cached offline in browser IndexedDB.`,
    smartphoneReady: true,
  };
  if (typeof window !== 'undefined') {
    const existing = loadCustomOpenSourceModels().filter((m) => m.id !== spec.id);
    window.localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify([spec, ...existing]));
  }
  return spec;
}

interface TextGenerationPipeline {
  (
    messages: Array<{ role: string; content: string }>,
    options?: Record<string, unknown>
  ): Promise<Array<{ generated_text?: Array<{ role: string; content: string }> | string }>>;
}

interface TransformersModule {
  pipeline: (
    task: string,
    model: string,
    opts?: Record<string, unknown>
  ) => Promise<unknown>;
}

async function importTransformers(): Promise<TransformersModule> {
  return (await import(/* @vite-ignore */ TRANSFORMERS_CDN)) as TransformersModule;
}

class BrowserOpenSourceLoader {
  private loadedModelId: string | null = null;
  private generator: TextGenerationPipeline | null = null;

  public getLoadedModelId(): string | null {
    return this.loadedModelId;
  }

  public getInstalledModelIds(): string[] {
    return readInstalledIds(INSTALLED_MODELS_KEY);
  }

  public async loadModel(
    spec: OpenSourceModelSpec,
    onProgress: (pct: number, statusText: string) => void
  ): Promise<void> {
    if (!spec.hfRepo) {
      throw new Error('This model runs via built-in engine or local Ollama.');
    }

    const hw = detectDeviceHardware();
    const safeRamGb = hw.deviceMemoryGb ?? 4;
    if (spec.minRamGb > safeRamGb) {
      throw new Error(
        `Safety Guard: ${spec.name} requires ${spec.minRamGb}GB+ RAM for local install (detected ${safeRamGb}GB). Use Cloud mode or a ${safeRamGb}GB-compatible model.`
      );
    }

    if (this.loadedModelId === spec.id && this.generator) {
      onProgress(100, `${spec.name} active offline in memory`);
      return;
    }

    onProgress(8, `Initializing ${spec.name} runtime...`);

    const transformers = await importTransformers();
    const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

    const pipe = (await transformers.pipeline('text-generation', spec.hfRepo, {
      device: hasWebGpu ? 'webgpu' : 'wasm',
      dtype: 'q4',
      progress_callback: (info: { status?: string; progress?: number; file?: string }) => {
        if (typeof info.progress === 'number') {
          onProgress(
            Math.max(10, Math.min(99, Math.round(info.progress))),
            `Caching ${info.file || spec.name}...`
          );
        } else if (info.status) {
          onProgress(15, `${info.status}...`);
        }
      },
    })) as TextGenerationPipeline;

    this.generator = pipe;
    this.loadedModelId = spec.id;
    saveInstalledId(INSTALLED_MODELS_KEY, spec.id);
    onProgress(100, `${spec.name} installed & ready offline`);
  }

  public async generate(
    prompt: string,
    identity: UserIdentityProfile,
    webContext?: string
  ): Promise<string> {
    if (!this.generator) {
      throw new Error('Browser open-source model is not initialized yet.');
    }

    const addr = identity.addressAs.trim() || 'Sir';
    const sys = [
      `You are S.H.A.M.I.A., a calm, capable personal assistant for ${identity.fullName}. Address the user respectfully as "${addr}". Keep responses concise and natural (2-3 sentences).`,
      webContext ? `Real-time web context:\n${webContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const output = await this.generator(
      [
        { role: 'system', content: sys },
        { role: 'user', content: prompt },
      ],
      { max_new_tokens: 180, do_sample: true, temperature: 0.7 }
    );

    const first = output?.[0]?.generated_text;
    if (Array.isArray(first)) {
      const last = first[first.length - 1];
      if (last?.content) return last.content.trim();
    } else if (typeof first === 'string') {
      return first.trim();
    }
    return `At your service, ${addr}.`;
  }
}

type SttPipeline = (audio: Float32Array) => Promise<{ text?: string }>;
type TtsPipeline = (
  text: string,
  options?: Record<string, unknown>
) => Promise<{ audio?: Float32Array; sampling_rate?: number }>;

class OfflineVoiceAssistantRunner {
  private sttModelId: string | null = null;
  private sttPipe: SttPipeline | null = null;
  private ttsModelId: string | null = null;
  private ttsPipe: TtsPipeline | null = null;

  public getInstalledVoiceIds(): string[] {
    return readInstalledIds(INSTALLED_VOICE_KEY);
  }

  public isSttReady(): boolean {
    return Boolean(this.sttPipe);
  }

  public isTtsReady(): boolean {
    return Boolean(this.ttsPipe);
  }

  public getActiveSttId(): string | null {
    return this.sttModelId;
  }

  public getActiveTtsId(): string | null {
    return this.ttsModelId;
  }

  public async installVoiceModel(
    spec: OfflineVoiceModelSpec,
    onProgress: (pct: number, statusText: string) => void
  ): Promise<void> {
    const hw = detectDeviceHardware();
    const safeRamGb = hw.deviceMemoryGb ?? 4;
    if (spec.minRamGb > safeRamGb) {
      throw new Error(
        `Safety Guard: ${spec.name} requires ${spec.minRamGb}GB+ RAM (detected ${safeRamGb}GB).`
      );
    }

    onProgress(8, `Preparing ${spec.name}...`);
    const transformers = await importTransformers();

    const task = spec.kind === 'stt' ? 'automatic-speech-recognition' : 'text-to-speech';
    const pipe = await transformers.pipeline(task, spec.hfRepo, {
      device: 'wasm',
      dtype: spec.kind === 'stt' ? 'q8' : 'q8',
      progress_callback: (info: { status?: string; progress?: number; file?: string }) => {
        if (typeof info.progress === 'number') {
          onProgress(
            Math.max(10, Math.min(99, Math.round(info.progress))),
            `Installing ${info.file || spec.name}...`
          );
        } else if (info.status) {
          onProgress(15, `${info.status}...`);
        }
      },
    });

    if (spec.kind === 'stt') {
      this.sttPipe = pipe as SttPipeline;
      this.sttModelId = spec.id;
    } else {
      this.ttsPipe = pipe as TtsPipeline;
      this.ttsModelId = spec.id;
    }

    saveInstalledId(INSTALLED_VOICE_KEY, spec.id);
    onProgress(100, `${spec.name} installed & active offline`);
  }

  public async transcribeAudio(pcm16k: Float32Array): Promise<string> {
    if (!this.sttPipe) {
      throw new Error('Offline Whisper voice model is not loaded yet.');
    }
    const res = await this.sttPipe(pcm16k);
    return (res?.text || '').trim();
  }

  public async synthesizeSpeech(
    text: string,
    persona: 'female' | 'male' = 'female'
  ): Promise<{ audio: Float32Array; sampleRate: number } | null> {
    if (!this.ttsPipe) return null;
    try {
      const voiceId = persona === 'male' ? 'am_adam' : 'af_heart';
      const out = await this.ttsPipe(text, { voice: voiceId });
      if (out?.audio && out.audio.length > 0) {
        return {
          audio: out.audio,
          sampleRate: out.sampling_rate || 24000,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const browserModelRunner = new BrowserOpenSourceLoader();
export const offlineVoiceRunner = new OfflineVoiceAssistantRunner();
