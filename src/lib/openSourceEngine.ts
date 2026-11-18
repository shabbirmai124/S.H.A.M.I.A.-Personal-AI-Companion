import type { GroundingLink, OpenSourceModelSpec, UserIdentityProfile } from '../types/shamia';

export interface DeviceHardwareReport {
  webGpuAvailable: boolean;
  deviceMemoryGb: number | null;
  cpuCores: number | null;
  recommendedTier: string;
}

export function detectDeviceHardware(): DeviceHardwareReport {
  if (typeof navigator === 'undefined') {
    return {
      webGpuAvailable: false,
      deviceMemoryGb: null,
      cpuCores: null,
      recommendedTier: 'Offline Core (Universal)',
    };
  }

  const nav = navigator as Navigator & {
    gpu?: unknown;
    deviceMemory?: number;
  };
  const webGpuAvailable = Boolean(nav.gpu);
  const deviceMemoryGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const cpuCores =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;

  let recommendedTier = 'Offline Core + Cloud Search';
  if (webGpuAvailable && (deviceMemoryGb === null || deviceMemoryGb >= 4)) {
    recommendedTier = 'WebGPU + 2B Quantized Ready';
  } else if (deviceMemoryGb !== null && deviceMemoryGb >= 3) {
    recommendedTier = '1B–1.5B Quantized Ready';
  }

  return {
    webGpuAvailable,
    deviceMemoryGb,
    cpuCores,
    recommendedTier,
  };
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

// Dynamic In-Browser WebGPU/WASM Pipeline Loader (Transformers.js)
interface TextGenerationPipeline {
  (
    messages: Array<{ role: string; content: string }>,
    options?: Record<string, unknown>
  ): Promise<Array<{ generated_text?: Array<{ role: string; content: string }> | string }>>;
}

class BrowserOpenSourceLoader {
  private loadedModelId: string | null = null;
  private generator: TextGenerationPipeline | null = null;

  public getLoadedModelId(): string | null {
    return this.loadedModelId;
  }

  public async loadModel(
    spec: OpenSourceModelSpec,
    onProgress: (pct: number, statusText: string) => void
  ): Promise<void> {
    if (!spec.hfRepo) {
      throw new Error('This model runs via local Ollama or built-in engine, not browser WebGPU.');
    }

    if (this.loadedModelId === spec.id && this.generator) {
      onProgress(100, 'Ready in browser memory');
      return;
    }

    onProgress(8, `Initializing ${spec.name} runtime...`);

    const modUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm';
    const transformers = (await import(/* @vite-ignore */ modUrl)) as {
      pipeline: (
        task: string,
        model: string,
        opts?: Record<string, unknown>
      ) => Promise<TextGenerationPipeline>;
    };

    const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

    const pipe = await transformers.pipeline('text-generation', spec.hfRepo, {
      device: hasWebGpu ? 'webgpu' : 'wasm',
      dtype: 'q4',
      progress_callback: (info: { status?: string; progress?: number; file?: string }) => {
        if (typeof info.progress === 'number') {
          onProgress(
            Math.max(10, Math.min(99, Math.round(info.progress))),
            `Downloading ${info.file || spec.name}...`
          );
        } else if (info.status) {
          onProgress(15, `${info.status}...`);
        }
      },
    });

    this.generator = pipe;
    this.loadedModelId = spec.id;
    onProgress(100, `${spec.name} cached & ready offline`);
  }

  public async generate(
    prompt: string,
    identity: UserIdentityProfile,
    webContext?: string
  ): Promise<string> {
    if (!this.generator) {
      throw new Error('Browser open-source model is not loaded yet.');
    }

    const addr = identity.addressAs.trim() || 'Sir';
    const sys = [
      `You are S.H.A.M.I.A., a loyal, human-like personal assistant for ${identity.fullName}. Always address the user strictly as "${addr}". Keep responses concise and natural (2-3 sentences).`,
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

export const browserModelRunner = new BrowserOpenSourceLoader();
