import { useState, type FormEvent } from 'react';
import {
  BellOff,
  Bluetooth,
  ExternalLink,
  Flashlight,
  Phone,
  Sun,
  Wifi,
} from 'lucide-react';
import type { DeviceControlState } from '../types/jarvis';

interface DeviceControlDeckProps {
  controls: DeviceControlState;
  onRequestToggle: (setting: 'wifi' | 'bluetooth' | 'dnd' | 'flashlight', nextVal: boolean) => void;
  onRequestBrightness: (level: number) => void;
  onRequestDial: (target: string) => void;
  onRequestOpenApp: (appName: string) => void;
}

const QUICK_APPS = ['Spotify', 'YouTube Music', 'Google Maps', 'Gmail', 'Google Calendar'];

export function DeviceControlDeck({
  controls,
  onRequestToggle,
  onRequestBrightness,
  onRequestDial,
  onRequestOpenApp,
}: DeviceControlDeckProps) {
  const [dialInput, setDialInput] = useState('');

  const handleDialSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!dialInput.trim()) return;
    onRequestDial(dialInput.trim());
    setDialInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8] mb-2.5">
          Phone Controls (Permission-Gated)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onRequestToggle('wifi', !controls.wifi)}
            aria-pressed={controls.wifi}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
              controls.wifi
                ? 'bg-[#38BDF8]/12 border-[#38BDF8]/35 text-[#E0F2FE]'
                : 'bg-[#090D12] border-white/[0.08] text-[#94A3B8] hover:text-[#E8EEF3]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Wi-Fi</span>
            </span>
            <span className="text-[11px] opacity-80">{controls.wifi ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestToggle('bluetooth', !controls.bluetooth)}
            aria-pressed={controls.bluetooth}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
              controls.bluetooth
                ? 'bg-[#38BDF8]/12 border-[#38BDF8]/35 text-[#E0F2FE]'
                : 'bg-[#090D12] border-white/[0.08] text-[#94A3B8] hover:text-[#E8EEF3]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bluetooth className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Bluetooth</span>
            </span>
            <span className="text-[11px] opacity-80">{controls.bluetooth ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestToggle('dnd', !controls.dnd)}
            aria-pressed={controls.dnd}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
              controls.dnd
                ? 'bg-amber-500/15 border-amber-400/35 text-amber-100'
                : 'bg-[#090D12] border-white/[0.08] text-[#94A3B8] hover:text-[#E8EEF3]'
            }`}
          >
            <span className="flex items-center gap-2">
              <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>DND</span>
            </span>
            <span className="text-[11px] opacity-80">{controls.dnd ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestToggle('flashlight', !controls.flashlight)}
            aria-pressed={controls.flashlight}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
              controls.flashlight
                ? 'bg-amber-400/20 border-amber-300/45 text-amber-100'
                : 'bg-[#090D12] border-white/[0.08] text-[#94A3B8] hover:text-[#E8EEF3]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Flashlight className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Torch</span>
            </span>
            <span className="text-[11px] opacity-80">{controls.flashlight ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* Screen Brightness */}
      <div className="rounded-xl bg-[#090D12] border border-white/[0.07] px-3 py-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#CBD5E1] font-medium">
            <Sun className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Display Brightness</span>
          </span>
          <span className="font-mono-tabular text-[#38BDF8]">{controls.brightness}%</span>
        </div>
        <input
          type="range"
          min={35}
          max={100}
          step={5}
          value={controls.brightness}
          onChange={(e) => onRequestBrightness(parseInt(e.target.value, 10))}
          aria-label="Screen brightness level"
          className="w-full accent-[#38BDF8] cursor-pointer h-1.5"
        />
      </div>

      {/* Quick Phone Dialer */}
      <form onSubmit={handleDialSubmit} className="flex flex-col gap-2">
        <label htmlFor="quick-dial-input" className="text-xs font-semibold tracking-wide text-[#94A3B8]">
          Quick Dialer
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="quick-dial-input"
            type="tel"
            value={dialInput}
            onChange={(e) => setDialInput(e.target.value)}
            placeholder="Enter phone number..."
            className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#090D12] border border-white/[0.08] text-sm text-[#E8EEF3] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="submit"
            aria-label="Stage phone call"
            className="min-h-[40px] px-3 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/25 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dial</span>
          </button>
        </div>
      </form>

      {/* Quick App Launcher */}
      <div>
        <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8] mb-2">
          App Launcher
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_APPS.map((app) => (
            <button
              key={app}
              type="button"
              onClick={() => onRequestOpenApp(app)}
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#090D12] border border-white/[0.08] hover:border-[#38BDF8]/40 text-xs text-[#CBD5E1] hover:text-[#E8EEF3] inline-flex items-center gap-1 transition-colors"
            >
              <span>{app}</span>
              <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
