import { useMemo, useState } from 'react';
import { Check, Cpu, Download, Globe, Loader2, Smartphone } from 'lucide-react';
import { OPEN_SOURCE_MODEL_CATALOG } from '../lib/memoryStore';
import { browserModelRunner, detectDeviceHardware } from '../lib/openSourceEngine';
import type { OpenSourceModelSpec } from '../types/shamia';

interface OpenSourceModelHubProps {
  selectedModelId: string;
  ollamaUrl: string;
  webSearchEnabled: boolean;
  onSelectModel: (spec: OpenSourceModelSpec) => void;
  onChangeOllamaUrl: (url: string) => void;
  onToggleWebSearch: (enabled: boolean) => void;
}

export function OpenSourceModelHub({
  selectedModelId,
  ollamaUrl,
  webSearchEnabled,
  onSelectModel,
  onChangeOllamaUrl,
  onToggleWebSearch,
}: OpenSourceModelHubProps) {
  const hardware = useMemo(() => detectDeviceHardware(), []);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadedBrowserId, setLoadedBrowserId] = useState<string | null>(() =>
    browserModelRunner.getLoadedModelId()
  );
  const [ollamaTestState, setOllamaTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const handleLoadWebGpuModel = async (spec: OpenSourceModelSpec) => {
    setDownloadProgress(5);
    setStatusMessage(`Preparing ${spec.name}...`);
    try {
      await browserModelRunner.loadModel(spec, (pct, msg) => {
        setDownloadProgress(pct);
        setStatusMessage(msg);
      });
      setLoadedBrowserId(spec.id);
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

      {/* Real-Time Free Open Web Search Toggle */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EEF3]">
            <Globe className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
            <span>Real-Time Web Search</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
            Ground responses with free live DuckDuckGo + Wikipedia search when online.
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

      {/* Open-Source 0MB–2B Smartphone Model List */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
          Open-Source Phone Models (0 MB – 2B)
        </h3>
        <ul className="flex flex-col gap-2">
          {OPEN_SOURCE_MODEL_CATALOG.map((model) => {
            const active = selectedModelId === model.id;
            const hasBrowserWeights = Boolean(model.hfRepo);
            const isLoadedInBrowser = loadedBrowserId === model.id;
            const meetsRam =
              hardware.deviceMemoryGb === null || hardware.deviceMemoryGb >= model.minRamGb;
            return (
              <li
                key={model.id}
                className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
                  active
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
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {model.params} · {model.sizeLabel} · {model.minRamGb}GB+ RAM ·{' '}
                      <span className={meetsRam ? 'text-emerald-400' : 'text-amber-300'}>
                        {meetsRam ? 'Compatible' : 'Low RAM'}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectModel(model)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-colors ${
                      active
                        ? 'bg-[#38BDF8] text-[#06080C] font-semibold'
                        : 'bg-[#131A24] text-[#CBD5E1] hover:text-white border border-white/10'
                    }`}
                  >
                    {active ? 'Active' : 'Use'}
                  </button>
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
                        <span>Cached Offline in Browser</span>
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

      {/* Local Phone / Termux / Desktop Ollama Endpoint */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] p-3 flex flex-col gap-2">
        <label htmlFor="ollama-endpoint-input" className="text-xs font-semibold text-[#CBD5E1]">
          Local 2B Model Endpoint (Ollama / Edge)
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
            Local Ollama server detected and ready for offline 2B inference.
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
