import { useMemo, useState, type FormEvent } from 'react';
import { Check, Cpu, Download, Globe, Layers, Loader2, Mic, Plus, Smartphone, Volume2 } from 'lucide-react';
import { OPEN_SOURCE_MODEL_CATALOG, OPEN_SOURCE_VOICE_MODELS } from '../lib/memoryStore';
import {
  browserModelRunner,
  detectDeviceHardware,
  loadCustomOpenSourceModels,
  offlineVoiceRunner,
  saveCustomOpenSourceModel,
} from '../lib/openSourceEngine';
import type { OfflineVoiceModelSpec, OpenSourceModelSpec } from '../types/shamia';

interface OpenSourceModelHubProps {
  selectedModelId: string;
  ollamaUrl: string;
  webSearchEnabled: boolean;
  ensembleEnabled: boolean;
  ensembleModelIds: string[];
  onSelectModel: (spec: OpenSourceModelSpec) => void;
  onChangeOllamaUrl: (url: string) => void;
  onToggleWebSearch: (enabled: boolean) => void;
  onToggleEnsemble: (enabled: boolean) => void;
  onToggleEnsembleModel: (modelId: string) => void;
}

export function OpenSourceModelHub({
  selectedModelId,
  ollamaUrl,
  webSearchEnabled,
  ensembleEnabled,
  ensembleModelIds,
  onSelectModel,
  onChangeOllamaUrl,
  onToggleWebSearch,
  onToggleEnsemble,
  onToggleEnsembleModel,
}: OpenSourceModelHubProps) {
  const hardware = useMemo(() => detectDeviceHardware(), []);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadedBrowserId, setLoadedBrowserId] = useState<string | null>(() =>
    browserModelRunner.getLoadedModelId()
  );
  const [installedIds, setInstalledIds] = useState<string[]>(() =>
    browserModelRunner.getInstalledModelIds()
  );
  const [installedVoiceIds, setInstalledVoiceIds] = useState<string[]>(() =>
    offlineVoiceRunner.getInstalledVoiceIds()
  );
  const [activeSttId, setActiveSttId] = useState<string | null>(() =>
    offlineVoiceRunner.getActiveSttId()
  );
  const [activeTtsId, setActiveTtsId] = useState<string | null>(() =>
    offlineVoiceRunner.getActiveTtsId()
  );
  const [customModels, setCustomModels] = useState<OpenSourceModelSpec[]>(() =>
    loadCustomOpenSourceModels()
  );
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [ollamaTestState, setOllamaTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const allModels = useMemo(
    () => [...customModels, ...OPEN_SOURCE_MODEL_CATALOG],
    [customModels]
  );

  const handleLoadWebGpuModel = async (spec: OpenSourceModelSpec) => {
    setDownloadProgress(5);
    setStatusMessage(`Preparing ${spec.name}...`);
    try {
      await browserModelRunner.loadModel(spec, (pct, msg) => {
        setDownloadProgress(pct);
        setStatusMessage(msg);
      });
      setLoadedBrowserId(spec.id);
      setInstalledIds(browserModelRunner.getInstalledModelIds());
      onSelectModel(spec);
      setDownloadProgress(null);
    } catch (err: unknown) {
      setDownloadProgress(null);
      setStatusMessage(
        err instanceof Error
          ? err.message
          : 'Browser WebGPU download interrupted. Built-in Offline Core remains ready.'
      );
    }
  };

  const handleInstallVoiceModel = async (voice: OfflineVoiceModelSpec) => {
    setDownloadProgress(5);
    setStatusMessage(`Installing ${voice.name} for offline voice...`);
    try {
      await offlineVoiceRunner.installVoiceModel(voice, (pct, msg) => {
        setDownloadProgress(pct);
        setStatusMessage(msg);
      });
      setInstalledVoiceIds(offlineVoiceRunner.getInstalledVoiceIds());
      setActiveSttId(offlineVoiceRunner.getActiveSttId());
      setActiveTtsId(offlineVoiceRunner.getActiveTtsId());
      setDownloadProgress(null);
    } catch (err: unknown) {
      setDownloadProgress(null);
      setStatusMessage(
        err instanceof Error
          ? err.message
          : 'Offline voice download interrupted. Browser voice remains ready.'
      );
    }
  };

  const handleAddCustomRepo = async (e: FormEvent) => {
    e.preventDefault();
    const clean = customRepoInput.trim();
    if (!clean || !clean.includes('/')) {
      setStatusMessage('Enter a Hugging Face repo path such as onnx-community/Qwen3-4B-ONNX.');
      return;
    }
    const created = saveCustomOpenSourceModel(clean);
    setCustomModels(loadCustomOpenSourceModels());
    setCustomRepoInput('');
    await handleLoadWebGpuModel(created);
  };

  const handleCheckOllama = async () => {
    setOllamaTestState('testing');
    try {
      const cleanBase = ollamaUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanBase}/api/tags`, { signal: AbortSignal.timeout(3000) });
      setOllamaTestState(res.ok ? 'ok' : 'fail');
    } catch {
      setOllamaTestState('fail');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Device Smartphone Compatibility Readout */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
            <Smartphone className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Device Compatibility</span>
          </span>
          <span className="text-[11px] text-[#38BDF8] font-medium">
            {hardware.recommendedTier}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#94A3B8]">
          <span>WebGPU: {hardware.webGpuAvailable ? 'Supported' : 'WASM Fallback'}</span>
          <span aria-hidden="true">·</span>
          <span>RAM: {hardware.deviceMemoryGb ? `${hardware.deviceMemoryGb} GB` : 'Auto'}</span>
          <span aria-hidden="true">·</span>
          <span>Cores: {hardware.cpuCores ?? 'Auto'}</span>
        </div>
      </div>

      {/* Real-Time Google + Open Web Search Toggle */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
            <Globe className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
            <span>Real-Time Web Search</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
            Ground responses with real-time Google Search, DuckDuckGo, and Wikipedia when online.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={webSearchEnabled}
          onClick={() => onToggleWebSearch(!webSearchEnabled)}
          className={`min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            webSearchEnabled
              ? 'bg-[#38BDF8]/18 text-[#38BDF8] border border-[#38BDF8]/35'
              : 'bg-[#111720] text-[#94A3B8] border border-white/10'
          }`}
        >
          {webSearchEnabled ? 'Enabled' : 'Off'}
        </button>
      </div>

      {/* Multi-Model Ensemble Synthesis Toggle */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
            <Layers className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
            <span>Multi-Model Ensemble ({ensembleModelIds.length})</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
            Cross-check 2–3 open models together (e.g. Gemma 4 + Qwen 3 8B + GPT-OSS 20B) for higher accuracy.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ensembleEnabled}
          onClick={() => onToggleEnsemble(!ensembleEnabled)}
          className={`min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            ensembleEnabled
              ? 'bg-[#38BDF8]/18 text-[#38BDF8] border border-[#38BDF8]/35'
              : 'bg-[#111720] text-[#94A3B8] border border-white/10'
          }`}
        >
          {ensembleEnabled ? 'Enabled' : 'Off'}
        </button>
      </div>

      {/* Download / Status Banner */}
      {statusMessage && (
        <div className="rounded-xl bg-[#0B1420] border border-[#38BDF8]/25 p-3 text-xs text-[#BAE6FD] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span>{statusMessage}</span>
            {downloadProgress !== null && (
              <span className="font-mono-tabular">{downloadProgress}%</span>
            )}
          </div>
          {downloadProgress !== null && (
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#38BDF8] transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Open-Source Chat Models (0 MB – 20B) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
          Open-Source Models (0 MB – 20B · Under-10B Phone Flagships)
        </h3>
        <ul className="flex flex-col gap-2">
          {allModels.map((model) => {
            const active = selectedModelId === model.id;
            const inEnsemble = ensembleModelIds.includes(model.id);
            const hasBrowserWeights = Boolean(model.hfRepo);
            const isLoadedInBrowser = loadedBrowserId === model.id;
            const isCachedOffline = installedIds.includes(model.id);
            const meetsRam =
              hardware.deviceMemoryGb === null || hardware.deviceMemoryGb >= model.minRamGb;
            return (
              <li
                key={model.id}
                className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
                  active || (ensembleEnabled && inEnsemble)
                    ? 'bg-[#0F1722] border-[#38BDF8]/40'
                    : 'bg-[#090D12] border-white/[0.07]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#E8EEF3] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                      <span className="truncate">{model.name}</span>
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
                      {model.params} · {model.sizeLabel} · {model.minRamGb}GB+ RAM
                      {model.chipsetNote ? ` · ${model.chipsetNote}` : ''} ·{' '}
                      <span className={meetsRam ? 'text-emerald-400' : 'text-amber-300'}>
                        {meetsRam ? 'Compatible' : 'Low RAM'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ensembleEnabled && model.runtime === 'cloud' && (
                      <button
                        type="button"
                        onClick={() => onToggleEnsembleModel(model.id)}
                        className={`min-h-[32px] px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                          inEnsemble
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                            : 'bg-[#131A24] text-[#94A3B8] hover:text-white border border-white/10'
                        }`}
                      >
                        {inEnsemble ? 'In Mix' : '+ Mix'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectModel(model)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-[#38BDF8] text-[#06080C] font-semibold'
                          : 'bg-[#131A24] text-[#CBD5E1] hover:text-white border border-white/10'
                      }`}
                    >
                      {active ? 'Active' : 'Use'}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed">{model.summary}</p>

                {hasBrowserWeights && (
                  <button
                    type="button"
                    onClick={() => void handleLoadWebGpuModel(model)}
                    disabled={downloadProgress !== null}
                    className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#131B26] border border-[#38BDF8]/25 text-[#7DD3FC] hover:bg-[#38BDF8]/15 text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {downloadProgress !== null ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Downloading to Offline Cache...</span>
                      </>
                    ) : isLoadedInBrowser ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Active Offline in Browser</span>
                      </>
                    ) : isCachedOffline ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Installed Offline · Load Cache</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Load Offline in Browser</span>
                      </>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Offline Voice Assistant Models (Whisper STT + Kokoro TTS) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
          Offline Voice Assistant Models (STT &amp; TTS)
        </h3>
        <ul className="flex flex-col gap-2">
          {OPEN_SOURCE_VOICE_MODELS.map((voice) => {
            const isActive =
              (voice.kind === 'stt' && activeSttId === voice.id) ||
              (voice.kind === 'tts' && activeTtsId === voice.id);
            const isInstalled = installedVoiceIds.includes(voice.id);
            return (
              <li
                key={voice.id}
                className={`rounded-xl border p-3 flex flex-col gap-2 ${
                  isActive
                    ? 'bg-[#0F1722] border-[#38BDF8]/40'
                    : 'bg-[#090D12] border-white/[0.07]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#E8EEF3] flex items-center gap-1.5">
                      {voice.kind === 'stt' ? (
                        <Mic className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{voice.name}</span>
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {voice.provider} · {voice.sizeLabel} · {voice.minRamGb}GB+ RAM
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                      Active Offline
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-snug">{voice.summary}</p>

                <button
                  type="button"
                  onClick={() => void handleInstallVoiceModel(voice)}
                  disabled={downloadProgress !== null}
                  className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#131B26] border border-[#38BDF8]/25 text-[#7DD3FC] hover:bg-[#38BDF8]/15 text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isActive ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Active Offline Voice</span>
                    </>
                  ) : isInstalled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Installed · Activate Offline</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Install &amp; Run Offline</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Custom Hugging Face Open-Source ONNX Model Loader */}
      <form
        onSubmit={(e) => void handleAddCustomRepo(e)}
        className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex flex-col gap-2"
      >
        <label htmlFor="custom-hf-repo-input" className="text-xs font-semibold text-[#CBD5E1]">
          Load Custom Open-Source HF Model
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="custom-hf-repo-input"
            type="text"
            value={customRepoInput}
            onChange={(e) => setCustomRepoInput(e.target.value)}
            placeholder="onnx-community/gemma-3-1b-it-ONNX"
            className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#06080C] border border-white/10 text-xs text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="submit"
            disabled={downloadProgress !== null}
            className="min-h-[38px] px-3 rounded-lg bg-[#131A24] border border-white/10 text-xs text-[#CBD5E1] hover:text-white inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Install</span>
          </button>
        </div>
      </form>

      {/* Local Phone / Termux / Desktop Ollama Endpoint */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex flex-col gap-2">
        <label htmlFor="ollama-endpoint-input" className="text-xs font-semibold text-[#CBD5E1]">
          Local Model Endpoint (Ollama / 20B / Edge)
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="ollama-endpoint-input"
            type="url"
            value={ollamaUrl}
            onChange={(e) => {
              onChangeOllamaUrl(e.target.value);
              setOllamaTestState('idle');
            }}
            placeholder="http://127.0.0.1:11434"
            className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#06080C] border border-white/10 text-xs text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="button"
            onClick={() => void handleCheckOllama()}
            className="min-h-[38px] px-3 rounded-lg bg-[#131A24] border border-white/10 text-xs text-[#CBD5E1] hover:text-white whitespace-nowrap"
          >
            {ollamaTestState === 'testing' ? 'Checking...' : 'Test'}
          </button>
        </div>
        {ollamaTestState === 'ok' && (
          <p className="text-[11px] text-emerald-400">
            Local Ollama server detected and ready for offline inference.
          </p>
        )}
        {ollamaTestState === 'fail' && (
          <p className="text-[11px] text-[#94A3B8]">
            No local Ollama instance found at this address. Built-in Offline Core and Browser
            WebGPU models remain ready.
          </p>
        )}
      </div>
    </div>
  );
}
