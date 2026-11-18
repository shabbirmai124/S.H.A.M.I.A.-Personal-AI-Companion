import { useEffect, useState } from 'react';
import { Wind, Play, Square } from 'lucide-react';

const PHASES = [
  { label: 'Inhale slowly', seconds: 4 },
  { label: 'Hold gently', seconds: 4 },
  { label: 'Exhale completely', seconds: 6 },
  { label: 'Rest', seconds: 2 },
];

export function BreathingGuide() {
  const [active, setActive] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIdx((idx) => {
          const next = (idx + 1) % PHASES.length;
          setRemaining(PHASES[next].seconds);
          return next;
        });
        return 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  const currentPhase = PHASES[phaseIdx];

  const handleToggle = () => {
    if (active) {
      setActive(false);
      setPhaseIdx(0);
      setRemaining(PHASES[0].seconds);
    } else {
      setPhaseIdx(0);
      setRemaining(PHASES[0].seconds);
      setActive(true);
    }
  };

  return (
    <div
      aria-label="Guided breathing exercise"
      className="rounded-xl bg-[#090D12] border border-white/[0.08] p-3 flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[#E8EEF3]">
          <Wind className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" aria-hidden="true" />
          <span>4-4-6 Calm Breathing</span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[#38BDF8]/15 text-[#7DD3FC] hover:bg-[#38BDF8]/25 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          {active ? (
            <>
              <Square className="w-3 h-3" aria-hidden="true" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" aria-hidden="true" />
              <span>Begin</span>
            </>
          )}
        </button>
      </div>

      {active ? (
        <div className="flex items-center justify-between bg-[#06080C] rounded-lg px-3 py-2 border border-white/[0.07]">
          <span className="text-xs text-[#E8EEF3] font-medium">{currentPhase.label}</span>
          <span className="font-mono-tabular text-sm font-semibold text-[#38BDF8]">
            {remaining}s
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-[#94A3B8] leading-relaxed">
          Tap Begin for a 60-second slow breathing reset whenever stress rises.
        </p>
      )}
    </div>
  );
}
