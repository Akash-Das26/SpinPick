import React from 'react';
import { WheelConfig, WheelTheme, PointerPosition, WheelFontFamily } from '../types';
import { WHEEL_THEMES, WHEEL_FONTS } from '../utils/themes';
import {
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  Flame,
  X,
  Palette,
  Gauge,
  Type,
  PartyPopper,
  Timer,
  Zap,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { fireWinningConfetti } from '../utils/confetti';

interface WheelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WheelConfig;
  currentThemeId: string;
  onUpdateConfig: (updates: Partial<WheelConfig>) => void;
  onSelectTheme: (themeId: string) => void;
}

export const WheelSettingsModal: React.FC<WheelSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  currentThemeId,
  onUpdateConfig,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const pointerPositions: { id: PointerPosition; label: string }[] = [
    { id: 'top', label: "Top (12 o'clock)" },
    { id: 'right', label: "Right (3 o'clock)" },
    { id: 'bottom', label: "Bottom (6 o'clock)" },
    { id: 'left', label: "Left (9 o'clock)" },
  ];

  const speedOptions: { id: 'slow' | 'normal' | 'fast' | 'hyper'; label: string; desc: string }[] = [
    { id: 'slow', label: 'Gentle', desc: 'Relaxed & suspenseful' },
    { id: 'normal', label: 'Standard', desc: 'Realistic physics' },
    { id: 'fast', label: 'Quick', desc: 'Brisk & responsive' },
    { id: 'hyper', label: 'Ludicrous', desc: 'Ultra high-speed vortex' },
  ];

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="settings-modal-content"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-[#080810]/95 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-6 space-y-6 max-h-[88vh] overflow-y-auto custom-scrollbar transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 text-indigo-400 border border-white/10">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Wheel Customization & Styling</h3>
              <p className="text-xs text-slate-400">Typography, color palettes, sound, and spin physics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Typography & Font Styles */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Type className="w-4 h-4 text-cyan-400" />
            <span>Wheel Typography & Font Style</span>
          </label>

          {/* Font Selector Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {WHEEL_FONTS.map((font) => {
              const isSelected = (config.fontFamily || 'Outfit') === font.id;
              return (
                <button
                  key={font.id}
                  onClick={() => {
                    onUpdateConfig({ fontFamily: font.id });
                    sound.playPop(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 text-white'
                      : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08] text-slate-300'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    {font.category}
                  </div>
                  <div
                    className="text-sm font-bold truncate mt-0.5"
                    style={{ fontFamily: font.id }}
                  >
                    {font.previewText}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-1">
                    {font.name.split('(')[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Text Transform & Size Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Letter Case Format:
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { id: 'uppercase', label: 'UPPERCASE' },
                    { id: 'none', label: 'As Entered' },
                    { id: 'capitalize', label: 'Capitalize' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateConfig({ textTransform: opt.id })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      (config.textTransform || 'none') === opt.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-black/40 text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>Font Size Multiplier:</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {(config.fontSizeMultiplier || 1.0).toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.4}
                step={0.1}
                value={config.fontSizeMultiplier || 1.0}
                onChange={(e) =>
                  onUpdateConfig({ fontSizeMultiplier: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 h-2 bg-black/50 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.8x (Compact)</span>
                <span>1.4x (Punchy)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Themes & Color Palettes */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Wheel Color Palettes & Themes</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {WHEEL_THEMES.map((theme: WheelTheme) => {
              const isSelected = theme.id === currentThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    sound.playPop(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-white/10 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-2">
                    {theme.sliceColors.slice(0, 6).map((color, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="font-bold text-xs text-white truncate">{theme.name}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {theme.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Physics & Timing */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span>Spin Duration & Speed Physics</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>Spin Duration:</span>
                <span className="font-mono text-indigo-400 font-bold">{config.spinDuration}s</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                step={1}
                value={config.spinDuration}
                onChange={(e) =>
                  onUpdateConfig({ spinDuration: parseInt(e.target.value, 10) })
                }
                className="w-full accent-indigo-500 h-2 bg-black/50 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>2s (Quick)</span>
                <span>15s (Max Tension)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Physics Speed Profile:
              </label>
              <select
                value={config.spinSpeed}
                onChange={(e) =>
                  onUpdateConfig({
                    spinSpeed: e.target.value as 'slow' | 'normal' | 'fast' | 'hyper',
                  })
                }
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {speedOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-slate-900">
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Pointer & Center Hub */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Pointer Needle Position
              </label>
              <select
                value={config.pointerPosition}
                onChange={(e) =>
                  onUpdateConfig({ pointerPosition: e.target.value as PointerPosition })
                }
                className="w-full rounded-xl bg-black/50 border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {pointerPositions.map((pos) => (
                  <option key={pos.id} value={pos.id} className="bg-slate-900">
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Center Hub Label
              </label>
              <input
                type="text"
                maxLength={8}
                value={config.centerText || ''}
                onChange={(e) => onUpdateConfig({ centerText: e.target.value })}
                placeholder="SPIN"
                className="w-full rounded-xl bg-black/50 border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 uppercase font-bold text-center tracking-wider"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Game Modes & Effects Toggles */}
        <div className="space-y-2.5 pt-2 border-t border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Audio & Celebrations
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                {config.enableSound ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">Audio & Tick Clicks</div>
                  <div className="text-[10px] text-slate-400">Synthesized audio effects</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.enableSound}
                onChange={(e) => onUpdateConfig({ enableSound: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Confetti Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">Confetti Explosion</div>
                  <div className="text-[10px] text-slate-400">Celebration on win</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.enableConfetti}
                onChange={(e) => onUpdateConfig({ enableConfetti: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Mystery Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Mystery Wheel Mode</div>
                  <div className="text-[10px] text-slate-400">Masks choices with "?"</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.mysteryMode}
                onChange={(e) => onUpdateConfig({ mysteryMode: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Elimination Battle Royale Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">Elimination Mode</div>
                  <div className="text-[10px] text-slate-400">Remove winner on each spin</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.eliminationMode}
                onChange={(e) => onUpdateConfig({ eliminationMode: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Expanded Confetti Settings Panel (when enabled) */}
          {config.enableConfetti && (
            <div
              id="confetti-customization-panel"
              className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/20 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PartyPopper className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Confetti Animation Settings</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    fireWinningConfetti({
                      intensity: config.confettiIntensity || 'normal',
                      durationSeconds: config.confettiDuration || 3,
                    });
                    sound.playVictoryFanfare();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>Test Confetti</span>
                </button>
              </div>

              {/* Confetti Intensity Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Confetti Intensity & Density:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'low', label: 'Gentle', desc: 'Light sprinkle', badge: '🎉' },
                      { id: 'normal', label: 'Standard', desc: 'Balanced burst', badge: '🎊' },
                      { id: 'high', label: 'High', desc: 'Heavy shower', badge: '✨' },
                      { id: 'epic', label: 'Epic Storm', desc: 'Maximum cannons', badge: '💥' },
                    ] as const
                  ).map((lvl) => {
                    const isSelected = (config.confettiIntensity || 'normal') === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          onUpdateConfig({ confettiIntensity: lvl.id });
                          sound.playPop(true);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30 text-white'
                            : 'bg-black/40 border-white/5 hover:border-white/15 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{lvl.label}</span>
                          <span className="text-xs">{lvl.badge}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{lvl.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confetti Duration Slider */}
              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Confetti Duration:</span>
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    {config.confettiDuration || 3} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={config.confettiDuration || 3}
                  onChange={(e) =>
                    onUpdateConfig({ confettiDuration: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-amber-400 h-2 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>1s (Short Burst)</span>
                  <span>5s (Standard)</span>
                  <span>10s (Prolonged Celebration)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/30"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};

