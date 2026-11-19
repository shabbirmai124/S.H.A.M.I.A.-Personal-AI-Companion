import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_WEIGHT_REGISTRY,
  buildStrictMismatchGuidance,
  createVerifiedProvenance,
  doesBackendModelMatch,
  formatModelIdentityAnswer,
  normalizeModelIdentifier,
} from './modelVerification';
import { OPEN_SOURCE_MODEL_CATALOG } from './memoryStore';

test('MODEL_WEIGHT_REGISTRY covers every model in OPEN_SOURCE_MODEL_CATALOG', () => {
  for (const spec of OPEN_SOURCE_MODEL_CATALOG) {
    const entry = MODEL_WEIGHT_REGISTRY[spec.id];
    assert.ok(entry, `Missing MODEL_WEIGHT_REGISTRY entry for ${spec.id}`);
    assert.equal(entry.id, spec.id);
  }
});

test('doesBackendModelMatch strictly verifies exact weights and rejects cross-family or cross-size substitutions', () => {
  // Exact and canonical matches
  assert.equal(
    doesBackendModelMatch(
      'nvidia/Llama-3.1-Nemotron-Nano-8B-v1',
      'nvidia/llama-3.1-nemotron-nano-8b-v1'
    ),
    true
  );
  assert.equal(
    doesBackendModelMatch('google/gemma-3-27b-it', 'models/gemma-3-27b-it'),
    true
  );
  assert.equal(doesBackendModelMatch('qwen3:8b', 'qwen3:8b'), true);
  assert.equal(doesBackendModelMatch('phi3.5', 'phi3.5:latest'), true);
  assert.equal(doesBackendModelMatch('openai/gpt-oss-20b', 'openai/gpt-oss-20b:free'), true);

  // Strict rejections (wrong family, wrong size, proxy model)
  assert.equal(
    doesBackendModelMatch('nvidia/Llama-3.1-Nemotron-Nano-8B-v1', 'gemini-4-hydrogen'),
    false
  );
  assert.equal(
    doesBackendModelMatch('nvidia/Llama-3.1-Nemotron-Nano-8B-v1', 'openai-fast'),
    false
  );
  assert.equal(doesBackendModelMatch('qwen3:8b', 'qwen3:4b'), false);
  assert.equal(doesBackendModelMatch('gemma-3-27b-it', 'gemma-3-4b-it'), false);
  assert.equal(doesBackendModelMatch('nvidia/Nemotron-Mini-4B-Instruct', ''), false);
});

test('normalizeModelIdentifier cleans provider prefixes and free/latest tags', () => {
  assert.equal(normalizeModelIdentifier('models/gemma-3-27b-it'), 'gemma-3-27b-it');
  assert.equal(normalizeModelIdentifier('qwen3:latest'), 'qwen3');
  assert.equal(
    normalizeModelIdentifier('nvidia/llama-3.1-nemotron-nano-8b-v1:free'),
    'nvidia/llama-3.1-nemotron-nano-8b-v1'
  );
});

test('createVerifiedProvenance distinguishes exact verified weights from strict blocks and fallbacks', () => {
  const verified = createVerifiedProvenance({
    requestedModelId: 'nemotron-nano-8b',
    requestedModelLabel: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    executedProvider: 'nvidia-nim',
    executedModelId: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    strictMode: true,
    exactWeightsVerified: true,
  });
  assert.equal(verified.exactWeightsVerified, true);
  assert.equal(verified.executedProvider, 'nvidia-nim');
  assert.match(verified.verificationNote, /Strictly verified/i);

  const blocked = createVerifiedProvenance({
    requestedModelId: 'nemotron-nano-8b',
    requestedModelLabel: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    executedProvider: 'offline-core',
    executedModelId: 'none',
    strictMode: true,
    exactWeightsVerified: false,
    blockedByStrictMode: true,
  });
  assert.equal(blocked.exactWeightsVerified, false);
  assert.equal(blocked.blockedByStrictMode, true);
  assert.match(blocked.verificationNote, /blocked silent model substitution/i);
});

test('buildStrictMismatchGuidance gives actionable NVIDIA/HF/Ollama instructions for Nemotron', () => {
  const guidance = buildStrictMismatchGuidance({
    modelId: 'nemotron-nano-8b',
    modelLabel: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    addr: 'Sir',
    liveGemmaModels: ['gemma-3-27b-it'],
  });
  assert.match(guidance, /NVIDIA_API_KEY/);
  assert.match(guidance, /HF_TOKEN/);
  assert.match(guidance, /ollama run nemotron-mini/);
  assert.match(guidance, /gemma-3-27b-it/);
});

test('formatModelIdentityAnswer never falsely claims exact weights when unavailable', () => {
  const strictUnavailable = formatModelIdentityAnswer({
    modelId: 'nemotron-nano-8b',
    modelLabel: 'NVIDIA Nemotron Nano 8B (Open Weights)',
    addr: 'Sir',
    creatorName: 'Md Shabbir Mia',
    architectureNote: 'NVIDIA Llama-3.1-Nemotron-Nano-8B-v1',
    exactWeightsAvailable: false,
    strictMode: true,
  });
  assert.match(strictUnavailable, /not connected yet/i);
  assert.match(strictUnavailable, /will not silently substitute/i);

  const exactLive = formatModelIdentityAnswer({
    modelId: 'gemma-3-free',
    modelLabel: 'Gemma 3 · Open Weights',
    addr: 'Sir',
    creatorName: 'Md Shabbir Mia',
    architectureNote: 'Google Gemma 3',
    exactProvider: 'google-gemma-api',
    exactBackendModelId: 'gemma-3-27b-it',
    exactWeightsAvailable: true,
    strictMode: true,
  });
  assert.match(exactLive, /gemma-3-27b-it/);
  assert.match(exactLive, /google-gemma-api/);
  assert.match(exactLive, /exact model weights/i);
});
