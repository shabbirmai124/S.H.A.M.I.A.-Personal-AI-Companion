import type {
  ModelExecutionProvenance,
  ModelExecutionProvider,
} from '../types/shamia';

export interface CanonicalModelWeightSpec {
  id: string;
  displayName: string;
  /** Exact Google Generative Language API open-weight Gemma models (ONLY for genuine Gemma catalog entries). */
  googleGemmaModels?: string[];
  /** Exact NVIDIA NIM API model slug (https://integrate.api.nvidia.com/v1/chat/completions). */
  nvidiaModel?: string;
  /** Exact HuggingFace Inference Router model repo (https://router.huggingface.co/v1/chat/completions). */
  hfModel?: string;
  /** Exact OpenRouter model slug (https://openrouter.ai/api/v1/chat/completions). */
  openRouterModel?: string;
  /** Exact local Ollama model tag (http://127.0.0.1:11434/api/chat). */
  ollamaTag?: string;
  /** Real browser-compatible ONNX repo loadable by @huggingface/transformers (WebGPU/WASM). */
  onnxBrowserRepo?: string;
  /** True only for the built-in local offline core. */
  isBuiltInOfflineCore?: boolean;
}

export const MODEL_WEIGHT_REGISTRY: Record<string, CanonicalModelWeightSpec> = {
  'gemma-4-free': {
    id: 'gemma-4-free',
    displayName: 'Gemma 4 · Real-Time Search',
    googleGemmaModels: [
      'gemma-4-31b-it',
      'gemma-4-27b-it',
      'gemma-4-26b-a4b-it',
      'gemma-4-e4b-it',
      'gemma-4-e2b-it',
      'gemma-3-27b-it',
      'gemma-3-12b-it',
    ],
    nvidiaModel: 'google/gemma-3-27b-it',
    hfModel: 'google/gemma-3-27b-it',
    openRouterModel: 'google/gemma-3-27b-it',
    ollamaTag: 'gemma3:4b',
    onnxBrowserRepo: 'onnx-community/gemma-3-1b-it-ONNX',
  },
  'qwen3-8b-chinese': {
    id: 'qwen3-8b-chinese',
    displayName: 'Qwen 3 8B (Chinese Open Weight)',
    nvidiaModel: 'qwen/qwen3-8b',
    hfModel: 'Qwen/Qwen3-8B',
    openRouterModel: 'qwen/qwen3-8b',
    ollamaTag: 'qwen3:8b',
  },
  'qwen3-4b-edge': {
    id: 'qwen3-4b-edge',
    displayName: 'Qwen 3 4B (Phone Efficiency King)',
    hfModel: 'Qwen/Qwen3-4B',
    openRouterModel: 'qwen/qwen3-4b',
    ollamaTag: 'qwen3:4b',
    onnxBrowserRepo: 'onnx-community/Qwen3-4B-ONNX',
  },
  'minicpm-o-26': {
    id: 'minicpm-o-26',
    displayName: 'MiniCPM-o 2.6 8B (Chinese Voice AI)',
    hfModel: 'openbmb/MiniCPM-o-2_6',
    ollamaTag: 'minicpm-o2.6',
  },
  'glm-4-9b': {
    id: 'glm-4-9b',
    displayName: 'GLM-4 9B Chat (Zhipu Chinese Open)',
    hfModel: 'THUDM/glm-4-9b-chat',
    openRouterModel: 'thudm/glm-4-9b',
    ollamaTag: 'glm4:9b',
  },
  'nemotron-nano-8b': {
    id: 'nemotron-nano-8b',
    displayName: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    nvidiaModel: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    hfModel: 'nvidia/Llama-3.1-Nemotron-Nano-8B-v1',
    openRouterModel: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    ollamaTag: 'nemotron-mini',
  },
  'nemotron-mini-4b': {
    id: 'nemotron-mini-4b',
    displayName: 'NVIDIA Nemotron Mini 4B (Mobile Edge)',
    nvidiaModel: 'nvidia/nemotron-mini-4b-instruct',
    hfModel: 'nvidia/Nemotron-Mini-4B-Instruct',
    openRouterModel: 'nvidia/nemotron-mini-4b-instruct',
    ollamaTag: 'nemotron-mini:4b',
  },
  'gpt-oss-20b-free': {
    id: 'gpt-oss-20b-free',
    displayName: 'GPT-OSS 20B (Open Weights)',
    nvidiaModel: 'openai/gpt-oss-20b',
    hfModel: 'openai/gpt-oss-20b',
    openRouterModel: 'openai/gpt-oss-20b',
    ollamaTag: 'gpt-oss:20b',
  },
  'gemma-3-free': {
    id: 'gemma-3-free',
    displayName: 'Gemma 3 · Open Weights',
    googleGemmaModels: [
      'gemma-3-27b-it',
      'gemma-3-12b-it',
      'gemma-3-4b-it',
      'gemma-3-1b-it',
      'gemma-3n-e4b-it',
      'gemma-3n-e2b-it',
    ],
    nvidiaModel: 'google/gemma-3-12b-it',
    hfModel: 'google/gemma-3-4b-it',
    openRouterModel: 'google/gemma-3-12b-it',
    ollamaTag: 'gemma3:1b',
    onnxBrowserRepo: 'onnx-community/gemma-3-1b-it-ONNX',
  },
  'llama-32-free': {
    id: 'llama-32-free',
    displayName: 'Llama 3.2 1B Instruct',
    nvidiaModel: 'meta/llama-3.2-1b-instruct',
    hfModel: 'meta-llama/Llama-3.2-1B-Instruct',
    openRouterModel: 'meta-llama/llama-3.2-1b-instruct',
    ollamaTag: 'llama3.2:1b',
    onnxBrowserRepo: 'onnx-community/Llama-3.2-1B-Instruct-q4f16',
  },
  'qwen25-1.5b-edge': {
    id: 'qwen25-1.5b-edge',
    displayName: 'Qwen 2.5 1.5B Instruct',
    hfModel: 'Qwen/Qwen2.5-1.5B-Instruct',
    ollamaTag: 'qwen2.5:1.5b',
    onnxBrowserRepo: 'onnx-community/Qwen2.5-1.5B-Instruct',
  },
  'phi35-mini-free': {
    id: 'phi35-mini-free',
    displayName: 'Phi-3.5 Mini Instruct',
    nvidiaModel: 'microsoft/phi-3.5-mini-instruct',
    hfModel: 'microsoft/Phi-3.5-mini-instruct',
    openRouterModel: 'microsoft/phi-3.5-mini-instruct',
    ollamaTag: 'phi3.5',
    onnxBrowserRepo: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
  },
  'smollm2-1.7b-edge': {
    id: 'smollm2-1.7b-edge',
    displayName: 'SmolLM2 1.7B Instruct',
    hfModel: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
    ollamaTag: 'smollm2:1.7b',
    onnxBrowserRepo: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
  },
  'qwen25-0.5b-webgpu': {
    id: 'qwen25-0.5b-webgpu',
    displayName: 'Qwen 2.5 0.5B (Offline Cache)',
    hfModel: 'Qwen/Qwen2.5-0.5B-Instruct',
    ollamaTag: 'qwen2.5:0.5b',
    onnxBrowserRepo: 'onnx-community/Qwen2.5-0.5B-Instruct',
  },
  'smollm2-360m-webgpu': {
    id: 'smollm2-360m-webgpu',
    displayName: 'SmolLM2 360M (Ultra-Light)',
    hfModel: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    ollamaTag: 'smollm2:360m',
    onnxBrowserRepo: 'HuggingFaceTB/SmolLM2-360M-Instruct',
  },
  'offline-core': {
    id: 'offline-core',
    displayName: 'DeepSeek 2B · S.H.A.M.I.A. Offline Core',
    hfModel: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B',
    ollamaTag: 'deepseek-r1:1.5b',
    onnxBrowserRepo: 'onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX',
    isBuiltInOfflineCore: true,
  },
};

export function normalizeModelIdentifier(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^models\//, '')
    .replace(/:latest$/, '')
    .replace(/:free$/, '')
    .replace(/@.*$/, '');
}

/**
 * Strictly verifies that an upstream provider's returned model identifier
 * matches the exact model slug we requested (never allowing silent substitution
 * to a different family or parameter size).
 */
export function doesBackendModelMatch(expected: string, actual?: string | null): boolean {
  const exp = normalizeModelIdentifier(expected);
  const act = normalizeModelIdentifier(actual || '');
  if (!exp || !act) return false;
  if (exp === act) return true;

  // Allow org-stripped match ONLY when the full model slug after '/' is identical
  // e.g. expected "nvidia/nemotron-mini-4b-instruct" vs actual "nemotron-mini-4b-instruct"
  const expLeaf = exp.includes('/') ? exp.split('/').pop() || exp : exp;
  const actLeaf = act.includes('/') ? act.split('/').pop() || act : act;
  if (expLeaf === actLeaf) return true;

  // Allow provider suffix after ":" ONLY when expected has no explicit size tag
  // e.g. expected "phi3.5" vs actual "phi3.5:3.8b" (but NEVER "qwen3:8b" vs "qwen3:4b")
  if (!exp.includes(':') && act.startsWith(`${exp}:`)) return true;

  return false;
}

export function createVerifiedProvenance(params: {
  requestedModelId: string;
  requestedModelLabel: string;
  executedProvider: ModelExecutionProvider;
  executedModelId: string;
  strictMode: boolean;
  exactWeightsVerified: boolean;
  blockedByStrictMode?: boolean;
}): ModelExecutionProvenance {
  const providerHuman: Record<ModelExecutionProvider, string> = {
    'webgpu-onnx': 'On-Device Browser ONNX (WebGPU/WASM)',
    'ollama-local': 'Local Ollama Engine',
    'nvidia-nim': 'NVIDIA NIM Official Open-Weight API',
    'huggingface-router': 'HuggingFace Inference Router',
    openrouter: 'OpenRouter Exact Open-Weight API',
    'google-gemma-api': 'Google Open-Weight Gemma API',
    'google-gemini-fallback': 'Compatible Cloud Fallback Engine',
    'offline-core': 'S.H.A.M.I.A. Built-In Offline Core',
  };

  let verificationNote: string;
  if (params.blockedByStrictMode) {
    verificationNote = `Strict Verification blocked silent model substitution for ${params.requestedModelLabel}.`;
  } else if (params.exactWeightsVerified) {
    verificationNote = `Strictly verified: response generated directly by ${params.executedModelId} via ${providerHuman[params.executedProvider]}.`;
  } else if (params.strictMode) {
    verificationNote = `Strict Verification ON: exact weights for ${params.requestedModelLabel} are not currently connected.`;
  } else {
    verificationNote = `Strict Mode is off — routed via ${providerHuman[params.executedProvider]} (${params.executedModelId}) because exact weights for ${params.requestedModelLabel} are not connected.`;
  }

  return {
    requestedModelId: params.requestedModelId,
    requestedModelLabel: params.requestedModelLabel,
    executedProvider: params.executedProvider,
    executedModelId: params.executedModelId,
    exactWeightsVerified: params.exactWeightsVerified,
    strictMode: params.strictMode,
    blockedByStrictMode: params.blockedByStrictMode,
    verificationNote,
  };
}

export function buildStrictMismatchGuidance(params: {
  modelId: string;
  modelLabel: string;
  addr: string;
  liveGemmaModels?: string[];
}): string {
  const spec = MODEL_WEIGHT_REGISTRY[params.modelId];
  const steps: string[] = [];

  if (spec?.nvidiaModel) {
    steps.push(
      `- **NVIDIA NIM API**: Add \`NVIDIA_API_KEY\` on the server to run exact \`${spec.nvidiaModel}\` weights.`
    );
  }
  if (spec?.hfModel) {
    steps.push(
      `- **HuggingFace Router**: Add \`HF_TOKEN\` on the server to run exact \`${spec.hfModel}\` weights.`
    );
  }
  if (spec?.openRouterModel) {
    steps.push(
      `- **OpenRouter API**: Add \`OPENROUTER_API_KEY\` on the server to run exact \`${spec.openRouterModel}\` weights.`
    );
  }
  if (spec?.ollamaTag) {
    steps.push(
      `- **Local Ollama (100% Offline)**: Run \`ollama run ${spec.ollamaTag}\` on your device and connect the Local Ollama Endpoint in the Models tab.`
    );
  }
  if (spec?.onnxBrowserRepo) {
    steps.push(
      `- **Browser Offline ONNX**: Click **Install Offline** on this model card in the Models tab to download exact \`${spec.onnxBrowserRepo}\` weights locally.`
    );
  }

  const liveModels = params.liveGemmaModels || [];
  const liveReadyLabels: string[] = [];
  const liveGemma4 = liveModels.find((m) => m.startsWith('gemma-4'));
  const liveGemma3 = liveModels.find((m) => m.startsWith('gemma-3'));
  if (liveGemma4) {
    liveReadyLabels.push(`**Gemma 4 · Real-Time Search** (\`${liveGemma4}\`)`);
  }
  if (liveGemma3) {
    liveReadyLabels.push(`**Gemma 3 · Open Weights** (\`${liveGemma3}\`)`);
  }
  liveReadyLabels.push('**DeepSeek 2B · S.H.A.M.I.A. Offline Core**');

  const liveReadyHint = `\n\nModels verified live with exact weights right now: ${liveReadyLabels.join(', ')}.`;

  return [
    `Strict Model Verification blocked silent substitution, ${params.addr}.`,
    '',
    `Exact open weights for **${params.modelLabel}** (\`${params.modelId}\`) are not currently connected on this server or device, so S.H.A.M.I.A. refused to fake a reply from a different model.`,
    '',
    'To get strictly verified responses from this exact model, connect one of these:',
    ...steps,
    liveReadyHint,
    '',
    'If you prefer an immediate reply via compatible cloud routing while keeping transparent provenance, switch **Strict Exact-Weights Mode** off in the Models tab.',
  ].join('\n');
}

export function formatModelIdentityAnswer(params: {
  modelId: string;
  modelLabel: string;
  addr: string;
  creatorName: string;
  architectureNote: string;
  exactProvider?: ModelExecutionProvider;
  exactBackendModelId?: string;
  exactWeightsAvailable: boolean;
  strictMode: boolean;
}): string {
  if (params.exactWeightsAvailable && params.exactProvider && params.exactBackendModelId) {
    return `You are currently using **${params.modelLabel}** (Model ID: \`${params.modelId}\` · Verified Backend Weights: \`${params.exactBackendModelId}\` via \`${params.exactProvider}\` · Architecture: ${params.architectureNote}), ${params.addr}. Strict verification is ${params.strictMode ? 'ON' : 'OFF'} and responses come directly from these exact model weights.`;
  }

  if (params.strictMode) {
    return `Your selected model is **${params.modelLabel}** (Model ID: \`${params.modelId}\`), ${params.addr}. Strict Exact-Weights Mode is **ON**, and exact weights for this model are not connected yet — S.H.A.M.I.A. will not silently substitute another model until you connect its exact weights (NVIDIA NIM, HuggingFace Router, OpenRouter, Local Ollama, or Browser ONNX) or switch to a live verified model.`;
  }

  return `Your selected model profile is **${params.modelLabel}** (Model ID: \`${params.modelId}\`), ${params.addr}. Strict Exact-Weights Mode is currently **OFF** — exact weights for this model are not connected on this server yet, so replies are currently routed through the compatible cloud fallback engine until you connect \`NVIDIA_API_KEY\`, \`HF_TOKEN\`, \`OPENROUTER_API_KEY\`, Local Ollama, or Browser ONNX weights.`;
}
