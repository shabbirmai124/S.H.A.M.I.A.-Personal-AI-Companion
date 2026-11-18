import { useId } from 'react';
import { Mic } from 'lucide-react';
import type { CoreVisualState } from '../types/jarvis';

interface QuantumCoreProps {
  state: CoreVisualState;
  onToggleListen: () => void;
  compact?: boolean;
}

const STATE_LABELS: Record<CoreVisualState, string> = {
  idle: 'Ready · Tap core to speak',
  listening: 'Listening to your voice',
  thinking: 'Synthesizing response',
  speaking: 'Speaking response',
  'awaiting-permission': 'Permission confirmation required',
};

export function QuantumCore({ state, onToggleListen, compact = false }: QuantumCoreProps) {
  const uid = useId().replace(/:/g, '');
  const bezelId = `titaniumBezel-${uid}`;
  const coreId = `sapphireCore-${uid}`;
  const rimId = `rimHighlight-${uid}`;

  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isPermission = state === 'awaiting-permission';

  const accentHex = isPermission ? '#F59E0B' : '#38BDF8';
  const sizeClass = compact ? 'w-20 h-20' : 'w-44 h-44';

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onToggleListen}
        data-testid="arc-reactor-button"
        data-state={state}
        aria-label={
          isListening
            ? 'Stop listening'
            : isSpeaking
              ? 'Interrupt speech and listen'
              : 'Activate S.H.A.M.I.A. voice input'
        }
        className={`group relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#06080C] transition-transform duration-200 active:scale-[0.97] ${sizeClass}`}
      >
        {/* Soft atmospheric volumetric aura */}
        <span
          aria-hidden="true"
          className="absolute -inset-3 rounded-full pointer-events-none transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${accentHex}26 0%, ${accentHex}0A 48%, transparent 72%)`,
            opacity: isListening || isSpeaking ? 1 : 0.72,
          }}
        />

        {/* Harmonic acoustic wave rings when active */}
        {(isListening || isSpeaking) && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-1 rounded-full border border-[#38BDF8]/45 animate-core-wave pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="absolute inset-1 rounded-full border border-[#7DD3FC]/30 animate-core-wave pointer-events-none"
              style={{ animationDelay: '0.7s' }}
            />
          </>
        )}

        {/* Machined Titanium & Sapphire Optical Assembly */}
        <svg viewBox="0 0 220 220" className="w-full h-full" aria-hidden="true">
          <defs>
            <radialGradient id={bezelId} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2A333E" />
              <stop offset="55%" stopColor="#12171E" />
              <stop offset="100%" stopColor="#080B0F" />
            </radialGradient>
            <radialGradient id={coreId} cx="50%" cy="42%" r="60%">
              <stop offset="0%" stopColor={isPermission ? '#FDE68A' : '#E0F2FE'} stopOpacity="0.95" />
              <stop offset="38%" stopColor={accentHex} stopOpacity="0.55" />
              <stop offset="100%" stopColor="#070B10" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.03" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0.28" />
            </linearGradient>
          </defs>

          {/* Outer machined bezel */}
          <circle
            cx="110"
            cy="110"
            r="102"
            fill={`url(#${bezelId})`}
            stroke={`url(#${rimId})`}
            strokeWidth="1.5"
          />

          {/* 60 precision chronometer graduation ticks */}
          <g opacity="0.55">
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i * 6 * Math.PI) / 180;
              const isMajor = i % 5 === 0;
              const r1 = isMajor ? 88 : 92;
              const r2 = 96;
              return (
                <line
                  key={i}
                  x1={110 + Math.cos(angle) * r1}
                  y1={110 + Math.sin(angle) * r1}
                  x2={110 + Math.cos(angle) * r2}
                  y2={110 + Math.sin(angle) * r2}
                  stroke={isMajor ? accentHex : '#64748B'}
                  strokeOpacity={isMajor ? 0.75 : 0.45}
                  strokeWidth={isMajor ? '1.5' : '0.8'}
                />
              );
            })}
          </g>

          {/* Slow rotating precision optical ring */}
          <g
            className={isThinking || isListening ? 'animate-core-fast' : 'animate-core-slow'}
            style={{ transformOrigin: '110px 110px' }}
          >
            <circle
              cx="110"
              cy="110"
              r="78"
              fill="none"
              stroke={accentHex}
              strokeOpacity="0.34"
              strokeWidth="1.25"
              strokeDasharray="42 16 10 16"
            />
            <circle
              cx="110"
              cy="32"
              r="2.4"
              fill={accentHex}
              fillOpacity="0.85"
            />
            <circle
              cx="110"
              cy="188"
              r="2.4"
              fill={accentHex}
              fillOpacity="0.45"
            />
          </g>

          {/* Counter-rotating inner aperture track */}
          <g
            className="animate-core-reverse"
            style={{ transformOrigin: '110px 110px' }}
          >
            <circle
              cx="110"
              cy="110"
              r="62"
              fill="none"
              stroke="#E2E8F0"
              strokeOpacity="0.16"
              strokeWidth="1"
              strokeDasharray="20 12"
            />
          </g>

          {/* Recessed optical lens housing */}
          <circle
            cx="110"
            cy="110"
            r="48"
            fill="#06090D"
            stroke={accentHex}
            strokeOpacity={isListening || isSpeaking ? 0.85 : 0.4}
            strokeWidth="1.5"
          />

          {/* Luminous sapphire core orb */}
          <circle
            cx="110"
            cy="110"
            r={isListening || isSpeaking ? 35 : 31}
            fill={`url(#${coreId})`}
            className={`transition-all duration-300 ${
              state === 'idle' ? 'animate-core-breathe' : ''
            }`}
          />

          {/* Subtle glass specular crescent */}
          <path
            d="M 88 92 A 28 28 0 0 1 132 92"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.32"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Center crisp microphone affordance on hover/listening */}
        <span
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
            isListening ? 'opacity-100' : 'opacity-0 group-hover:opacity-90'
          }`}
        >
          <Mic
            className={`w-5 h-5 ${isPermission ? 'text-amber-950' : 'text-[#06080C]'}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {!compact && (
        <p
          data-testid="reactor-status-label"
          className="text-xs font-medium tracking-wide text-[#94A3B8] text-center"
        >
          {STATE_LABELS[state]}
        </p>
      )}
    </div>
  );
}
