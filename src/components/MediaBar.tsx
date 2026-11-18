import { Music, Pause, Play, SkipForward, Square, Volume2 } from 'lucide-react';
import type { MusicTrack } from '../types/jarvis';

interface MediaBarProps {
  track: MusicTrack;
  isPlaying: boolean;
  volume: number;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onStop: () => void;
  onVolumeChange: (val: number) => void;
}

export function MediaBar({
  track,
  isPlaying,
  volume,
  onTogglePlay,
  onNextTrack,
  onStop,
  onVolumeChange,
}: MediaBarProps) {
  return (
    <section
      data-testid="media-player-bar"
      aria-label="Active audio playback"
      className="rounded-2xl bg-[#0B0F15]/90 border border-white/[0.09] p-3.5 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/12 text-[#38BDF8] flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#E8EEF3] truncate">{track.title}</p>
            <p className="text-xs text-[#94A3B8] truncate">
              {track.artist} · {isPlaying ? 'Playing' : 'Paused'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause music' : 'Resume music'}
            className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-[#38BDF8] hover:bg-[#38BDF8]/15 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onNextTrack}
            aria-label="Next track"
            className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#E8EEF3] hover:bg-white/5 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop music"
            className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Volume2 className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" aria-hidden="true" />
        <input
          type="range"
          min={0.05}
          max={0.55}
          step={0.05}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          aria-label="Music volume"
          className="w-full accent-[#38BDF8] cursor-pointer h-1.5"
        />
      </div>
    </section>
  );
}
