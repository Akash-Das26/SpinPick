import React, { useState, useEffect } from 'react';
import { Keyboard, X, Sparkles, Command } from 'lucide-react';
import { sound } from '../utils/audio';

interface HotkeyGuideProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const HotkeyGuide: React.FC<HotkeyGuideProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      keys: ['Spacebar'],
      description: 'Spin the wheel',
      category: 'Wheel Action',
      accent: 'text-amber-400',
    },
    {
      keys: ['F'],
      description: 'Toggle fullscreen presentation',
      category: 'View Mode',
      accent: 'text-cyan-400',
    },
    {
      keys: ['M'],
      description: 'Mute / unmute audio & clicks',
      category: 'Audio',
      accent: 'text-pink-400',
    },
    {
      keys: ['?'],
      description: 'Toggle this hotkey guide',
      category: 'General',
      accent: 'text-indigo-400',
    },
    {
      keys: ['Esc'],
      description: 'Close modals / exit fullscreen',
      category: 'Navigation',
      accent: 'text-slate-400',
    },
  ];

  // Listen for ? key to open/close hotkey guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          sound.playPop(next);
          return next;
        });
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="hotkey-guide-toggle-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          sound.playPop(!isOpen);
        }}
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl border transition-all shadow-xl select-none group ${
          isOpen
            ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30'
            : 'bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
        }`}
        title="Keyboard Shortcuts Guide (Press ?)"
      >
        <Keyboard className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold hidden sm:inline">Shortcuts</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded border border-white/15 text-slate-400">
          ?
        </kbd>
      </button>

      {/* Hotkey Overlay Modal */}
      {isOpen && (
        <div
          id="hotkey-guide-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            id="hotkey-guide-card"
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0a0a14]/95 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-5 sm:p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Keyboard Shortcuts</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400">Control the wheel effortlessly with your keyboard</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  sound.playPop(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-2">
              {shortcuts.map((sc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/5 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{sc.description}</div>
                    <div className="text-[10px] text-slate-400">{sc.category}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    {sc.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2.5 py-1 text-xs font-mono font-bold bg-[#141428] border border-white/20 rounded-lg text-slate-200 shadow-sm flex items-center justify-center min-w-[32px]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Tip */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Command className="w-3.5 h-3.5 text-slate-500" />
                <span>Tip: Press <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded font-mono text-slate-300">?</kbd> anytime to toggle</span>
              </span>

              <button
                onClick={() => {
                  setIsOpen(false);
                  sound.playPop(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
