import React from 'react';
import { WheelItem, WheelTheme, WheelConfig } from '../types';
import { SpinWheel } from './SpinWheel';
import { Minimize2, RotateCw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface FullscreenStageProps {
  items: WheelItem[];
  theme: WheelTheme;
  config: WheelConfig;
  isSpinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: (winner: WheelItem) => void;
  onExitFullscreen: () => void;
  onToggleSound: () => void;
  onTriggerSpin: () => void;
}

export const FullscreenStage: React.FC<FullscreenStageProps> = ({
  items,
  theme,
  config,
  isSpinning,
  onSpinStart,
  onSpinEnd,
  onExitFullscreen,
  onToggleSound,
  onTriggerSpin,
}) => {
  return (
    <div
      id="fullscreen-stage"
      className="fixed inset-0 z-40 flex flex-col items-center justify-between p-6 bg-[#020205] select-none animate-fade-in overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-6xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-sm">
            SP
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
              {config.title || 'SpinPick'}
            </h1>
            <p className="text-xs text-slate-400">
              {items.filter((i) => i.enabled).length} active choices • Click or press Space to spin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
            title={config.enableSound ? 'Mute' : 'Unmute'}
          >
            {config.enableSound ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={onExitFullscreen}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md text-xs font-bold transition-colors"
            title="Exit Fullscreen (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Main Wheel Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full my-2">
        <SpinWheel
          items={items}
          theme={theme}
          config={config}
          isSpinning={isSpinning}
          onSpinStart={onSpinStart}
          onSpinEnd={onSpinEnd}
          size={580}
          canvasId="fullscreen-wheel-canvas"
        />
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex flex-col items-center gap-3 z-10">
        <button
          onClick={onTriggerSpin}
          disabled={isSpinning || items.filter((i) => i.enabled).length === 0}
          className="w-full py-4 px-8 rounded-2xl bg-white hover:bg-slate-100 text-black font-black text-lg sm:text-xl shadow-[0_0_40px_rgba(255,255,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {isSpinning ? (
            <>
              <RotateCw className="w-6 h-6 animate-spin text-black" />
              <span>Spinning in Progress...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
              <span>SPIN THE WHEEL</span>
            </>
          )}
        </button>

        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
          <span>[Space] Spin</span>
          <span>•</span>
          <span>[M] Mute</span>
          <span>•</span>
          <span>[Esc] Exit</span>
        </div>
      </div>
    </div>
  );
};
