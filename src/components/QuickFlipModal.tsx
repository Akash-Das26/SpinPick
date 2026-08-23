import React, { useState } from 'react';
import { Sparkles, X, Dices, Coins } from 'lucide-react';
import { sound } from '../utils/audio';

interface QuickFlipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickFlipModal: React.FC<QuickFlipModalProps> = ({ isOpen, onClose }) => {
  const [activeType, setActiveType] = useState<'coin' | 'dice' | 'yesno'>('coin');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setResult(null);
    sound.playSpinStart();

    setTimeout(() => {
      if (activeType === 'coin') {
        const coin = Math.random() < 0.5 ? '🪙 HEADS' : '🪙 TAILS';
        setResult(coin);
      } else if (activeType === 'dice') {
        const diceVal = Math.floor(Math.random() * 6) + 1;
        const diceEmojis = ['⚀ 1', '⚁ 2', '⚂ 3', '⚃ 4', '⚄ 5', '⚅ 6'];
        setResult(`🎲 Rolled a ${diceEmojis[diceVal - 1]}`);
      } else {
        const answers = ['✨ YES!', '🚫 NO', '🔮 MAYBE', '⚡ DO IT NOW', '🛑 WAIT'];
        const ans = answers[Math.floor(Math.random() * answers.length)];
        setResult(ans);
      }
      setIsFlipping(false);
      sound.playVictoryFanfare();
    }, 1200);
  };

  return (
    <div
      id="quick-flip-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="quick-flip-content"
        className="relative w-full max-w-sm rounded-2xl bg-[#080810]/95 border border-white/10 p-6 text-center space-y-4 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-indigo-400" />
            <span>Quick Decision Flip</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            onClick={() => {
              setActiveType('coin');
              setResult(null);
            }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeType === 'coin' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Coin Flip
          </button>
          <button
            onClick={() => {
              setActiveType('dice');
              setResult(null);
            }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeType === 'dice' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roll Dice
          </button>
          <button
            onClick={() => {
              setActiveType('yesno');
              setResult(null);
            }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeType === 'yesno' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Yes / No
          </button>
        </div>

        {/* Animation & Result Stage */}
        <div className="py-8 flex flex-col items-center justify-center min-h-[140px] bg-white/5 rounded-xl border border-white/5">
          {isFlipping ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin" />
              <span className="text-xs text-indigo-300 font-mono animate-pulse">
                {activeType === 'coin' ? 'Flipping Coin...' : activeType === 'dice' ? 'Rolling Die...' : 'Consulting Fate...'}
              </span>
            </div>
          ) : result ? (
            <div className="animate-scale-up space-y-1">
              <div className="text-3xl font-black text-white font-['Outfit'] tracking-tight">
                {result}
              </div>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                Result
              </span>
            </div>
          ) : (
            <div className="text-slate-500 text-xs">
              Press the button below to {activeType === 'coin' ? 'flip' : activeType === 'dice' ? 'roll' : 'ask'}
            </div>
          )}
        </div>

        <button
          onClick={handleFlip}
          disabled={isFlipping}
          className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-black font-black text-sm shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 transition-all transform active:scale-98"
        >
          {isFlipping ? 'Deciding...' : activeType === 'coin' ? 'Flip Coin' : activeType === 'dice' ? 'Roll Die' : 'Get Answer'}
        </button>
      </div>
    </div>
  );
};
