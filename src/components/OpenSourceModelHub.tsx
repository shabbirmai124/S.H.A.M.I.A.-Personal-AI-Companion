import { useMemo, useState, type FormEvent } from 'react';
import { Check, Cpu, Download, Globe, Layers, Loader2, Mic, Plus, ShieldCheck, Smartphone, Volume2 } from 'lucide-react';
import { OPEN_SOURCE_MODEL_CATALOG, OPEN_SOURCE_VOICE_MODELS } from '../lib/memoryStore';
import {
  browserModelRunner,
  detectDeviceHardware,
  loadCustomOpenSourceModels,
  offlineVoiceRunner,
  saveCustomOpenSourceModel,
} from '../lib/openSourceEngine';
import type { OfflineVoiceModelSpec, OpenSourceModelSpec, VoicePersona } from '../types/shamia';

interface OpenSourceModelHubProps {
  selectedModelId: string;
  ollamaUrl: string;
  webSearchEnabled: boolean;
  ensembleEnabled: boolean;
  ensembleModelIds: string[];
  voicePersona?: VoicePersona;
  onChangeVoicePersona?: (persona: VoicePersona) => void;
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
  voicePersona = 'female',
  onChangeVoicePersona,
  onSelectModel,
  onChangeOllamaUrl,
  onToggleWebSearch,
  onToggleEnsemble,
  onToggleEnsembleModel,
}: OpenSourceModelHubProps) {
  const hardware = useMemo(() => detectDeviceHardware(), []);
  const safeRamGb = hardware.effectiveRamGb;
  const [showAllCloudModels, setShowAllCloudModels] = useState(true);
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

  // Hardware-first safety sorting: models matching device RAM appear first
  const visibleModels = useMemo(() => {
    const sorted = [...allModels].sort((a, b) => {
      const aSafe = a.minRamGb <= safeRamGb ? 0 : 1;
      const bSafe = b.minRamGb <= safeRamGb ? 0 : 1;
      return aSafe - bSafe;
    });
    if (showAllCloudModels) return sorted;
    return sorted.filter((m) => m.minRamGb <= safeRamGb || m.id === selectedModelId);
  }, [allModels, safeRamGb, selectedModelId, showAllCloudModels]);

  const handleLoadWebGpuModel = async (spec: OpenSourceModelSpec) => {
    if (spec.minRamGb > safeRamGb) {
      setStatusMessage(
        `Safety Guard: ${spec.name} requires ${spec.minRamGb}GB+ RAM. Using Free Cloud mode so your device never freezes.`
      );
      onSelectModel(spec);
      return;
    }
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
    if (voice.minRamGb > safeRamGb) {
      setStatusMessage(`Safety Guard: ${voice.name} requires ${voice.minRamGb}GB+ RAM.`);
      return;
    }
    setDownloadProgress(5);
    setStatusMessage(`Installing ${voice.name}...`);
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
    <div className="flex flex-col gap-3.5">
      {/* Device Hardware & Safety Guard Readout */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
            <Smartphone className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Device Safety &amp; Hardware</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>OOM Protected</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#94A3B8]">
          <span>RAM: {safeRamGb} GB</span>
          <span aria-hidden="true">·</span>
          <span>Cores: {hardware.cpuCores ?? 4}</span>
          <span aria-hidden="true">·</span>
          <span>{hardware.webGpuAvailable ? 'WebGPU Ready' : 'WASM Safe Mode'}</span>
        </div>
      </div>

      {/* Clear Human Voice Selector (Female / Male — Non-Native Friendly) */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
          <Volume2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
          <span>Clear Natural Voice</span>
        </div>
        <div className="inline-flex rounded-lg bg-[#111720] p-0.5 border border-white/10">
          {(['female', 'male'] as const).map((p) => {
            const active = voicePersona === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChangeVoicePersona?.(p)}
                className={`min-h-[28px] px-2.5 rounded-md text-[11px] font-medium capitalize transition-colors ${
                  active
                    ? 'bg-[#38BDF8] text-[#06080C] font-semibold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {p === 'female' ? 'Female (Clear)' : 'Male (Clear)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-Time Google + Open Web Search Toggle */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
          <Globe className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
          <span>Real-Time Google Search</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={webSearchEnabled}
          onClick={() => onToggleWebSearch(!webSearchEnabled)}
          className={`min-h-[32px] px-3 rounded-lg text-xs font-medium transition-colors shrink-0 ${
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
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
          <Layers className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
          <span>Multi-Model Ensemble ({ensembleModelIds.length})</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ensembleEnabled}
          onClick={() => onToggleEnsemble(!ensembleEnabled)}
          className={`min-h-[32px] px-3 rounded-lg text-xs font-medium transition-colors shrink-0 ${
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

      {/* Open-Source Chat Models (Clean & Hardware-Filtered) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
            Compatible Models ({visibleModels.length})
          </h3>
          <button
            type="button"
            onClick={() => setShowAllCloudModels((v) => !v)}
            className="text-[11px] text-[#38BDF8] hover:underline"
          >
            {showAllCloudModels ? 'Safe Only' : 'Show All'}
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {visibleModels.map((model) => {
            const active = selectedModelId === model.id;
            const inEnsemble = ensembleModelIds.includes(model.id);
            const isLoadedInBrowser = loadedBrowserId === model.id;
            const isCachedOffline = installedIds.includes(model.id);
            const safeForLocalInstall = model.minRamGb <= safeRamGb;
            const canInstallInBrowser = Boolean(model.hfRepo) && safeForLocalInstall;

            return (
              <li
                key={model.id}
                className={`rounded-xl border p-2.5 flex flex-col gap-2 transition-colors ${
                  active || (ensembleEnabled && inEnsemble)
                    ? 'bg-[#0F1722] border-[#38BDF8]/40'
                    : 'bg-[#090D12] border-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#E8EEF3] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                      <span className="truncate">{model.name}</span>
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {model.params} ·{' '}
                      <span className={safeForLocalInstall ? 'text-emerald-400' : 'text-[#7DD3FC]'}>
                        {safeForLocalInstall ? 'Safe for Device' : 'Cloud Ready'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {ensembleEnabled && model.runtime === 'cloud' && (
                      <button
                        type="button"
                        onClick={() => onToggleEnsembleModel(model.id)}
                        className={`min-h-[30px] px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
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
                      className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-[#38BDF8] text-[#06080C] font-semibold'
                          : 'bg-[#131A24] text-[#CBD5E1] hover:text-white border border-white/10'
                      }`}
                    >
                      {active ? 'Active' : 'Use'}
                    </button>
                  </div>
                </div>

                {canInstallInBrowser && (
                  <button
                    type="button"
                    onClick={() => void handleLoadWebGpuModel(model)}
                    disabled={downloadProgress !== null}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#131B26] border border-[#38BDF8]/25 text-[#7DD3FC] hover:bg-[#38BDF8]/15 text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {downloadProgress !== null ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Installing...</span>
                      </>
                    ) : isLoadedInBrowser ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Active Offline</span>
                      </>
                    ) : isCachedOffline ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Installed Offline</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Install Offline</span>
                      </>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Offline Voice Assistant Models (Hardware-Filtered) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
          Offline Voice Models (STT &amp; TTS)
        </h3>
        <ul className="flex flex-col gap-2">
          {OPEN_SOURCE_VOICE_MODELS.filter((v) => v.minRamGb <= safeRamGb).map((voice) => {
            const isActive =
              (voice.kind === 'stt' && activeSttId === voice.id) ||
              (voice.kind === 'tts' && activeTtsId === voice.id);
            const isInstalled = installedVoiceIds.includes(voice.id);
            return (
              <li
                key={voice.id}
                className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-[#0F1722] border-[#38BDF8]/40'
                    : 'bg-[#090D12] border-white/[0.07]'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#E8EEF3] flex items-center gap-1.5">
                    {voice.kind === 'stt' ? (
                      <Mic className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{voice.name}</span>
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">{voice.sizeLabel}</p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleInstallVoiceModel(voice)}
                  disabled={downloadProgress !== null}
                  className="min-h-[30px] px-2.5 py-1 rounded-lg bg-[#131B26] border border-[#38BDF8]/25 text-[#7DD3FC] hover:bg-[#38BDF8]/15 text-[11px] font-medium inline-flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  {isActive || isInstalled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Ready</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Install</span>
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
          Add Custom HF Model
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="custom-hf-repo-input"
            type="text"
            value={customRepoInput}
            onChange={(e) => setCustomRepoInput(e.target.value)}
            placeholder="onnx-community/gemma-3-1b-it-ONNX"
            className="flex-1 min-h-[36px] px-2.5 py-1 rounded-lg bg-[#06080C] border border-white/10 text-xs text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="submit"
            disabled={downloadProgress !== null}
            className="min-h-[36px] px-3 rounded-lg bg-[#131A24] border border-white/10 text-xs text-[#CBD5E1] hover:text-white inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* Local Ollama Endpoint */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex flex-col gap-2">
        <label htmlFor="ollama-endpoint-input" className="text-xs font-semibold text-[#CBD5E1]">
          Local Ollama Endpoint
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
            className="flex-1 min-h-[36px] px-2.5 py-1 rounded-lg bg-[#06080C] border border-white/10 text-xs text-[#E8EEF3] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="button"
            onClick={() => void handleCheckOllama()}
            className="min-h-[36px] px-3 rounded-lg bg-[#131A24] border border-white/10 text-xs text-[#CBD5E1] hover:text-white whitespace-nowrap"
          >
            {ollamaTestState === 'testing' ? '...' : 'Test'}
          </button>
        </div>
        {ollamaTestState === 'ok' && (
          <p className="text-[11px] text-emerald-400">Connected to local Ollama.</p>
        )}
        {ollamaTestState === 'fail' && (
          <p className="text-[11px] text-[#94A3B8]">Offline Core &amp; Cloud models active.</p>
        )}
      </div>
    </div>
  );
}
