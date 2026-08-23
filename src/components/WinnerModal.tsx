import React, { useEffect, useState } from 'react';
import { WheelItem, SpinMode, ConfettiIntensity } from '../types';
import {
  Trophy,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Sparkles,
  X,
  Share2,
  Flame,
  Crown,
  Skull,
  RefreshCw,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { fireWinningConfetti } from '../utils/confetti';

interface WinnerModalProps {
  winner: WheelItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSpinAgain: () => void;
  onRemoveWinner: (item: WheelItem) => void;
  onRestoreAll?: () => void;
  mode: SpinMode;
  totalActiveCount: number;
  totalWeight: number;
  isEliminationMode?: boolean;
  enableConfetti?: boolean;
  confettiIntensity?: ConfettiIntensity;
  confettiDuration?: number;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  isOpen,
  onClose,
  onSpinAgain,
  onRemoveWinner,
  onRestoreAll,
  mode,
  totalActiveCount,
  totalWeight,
  isEliminationMode = false,
  enableConfetti = true,
  confettiIntensity = 'normal',
  confettiDuration = 3,
}) => {
  const [copied, setCopied] = useState(false);

  const isElimination = isEliminationMode || mode === 'elimination';
  const isChampion = isElimination && totalActiveCount <= 1;

  useEffect(() => {
    if (isOpen && winner) {
      if (enableConfetti && (!isElimination || isChampion)) {
        const finalIntensity: ConfettiIntensity = isChampion ? 'epic' : (confettiIntensity as ConfettiIntensity);
        fireWinningConfetti({
          intensity: finalIntensity,
          durationSeconds: isChampion ? Math.max(4, confettiDuration) : confettiDuration,
          isGoldChampion: isChampion,
        });
      }
    }
  }, [isOpen, winner, isElimination, isChampion, enableConfetti, confettiIntensity, confettiDuration]);

  // Close the modal with Escape, as promised by the close button tooltip
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !winner) return null;

  const probability = totalWeight > 0 ? ((winner.weight / totalWeight) * 100).toFixed(1) : '0';

  const handleCopy = () => {
    navigator.clipboard.writeText(winner.text);
    setCopied(true);
    sound.playPop(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'SpinPick Result',
          text: isChampion
            ? `👑 ${winner.text} is the Ultimate Battle Royale Champion on SpinPick!`
            : `SpinPick chose: ${winner.text}! 🎯`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopy();
    }
  };

  const handleEliminateAndContinue = () => {
    onRemoveWinner(winner);
    sound.playElimination();
    onClose();
  };

  const handleEliminateAndSpin = () => {
    onRemoveWinner(winner);
    sound.playElimination();
    onClose();
    setTimeout(() => {
      onSpinAgain();
    }, 250);
  };

  return (
    <div
      id="winner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="winner-modal-content"
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border shadow-[0_0_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-6 text-center transform transition-all animate-scale-up ${
          isChampion
            ? 'bg-[#0f0e06]/95 border-amber-500/40 shadow-[0_0_80px_rgba(245,158,11,0.25)]'
            : isElimination
            ? 'bg-[#120608]/95 border-rose-500/40 shadow-[0_0_80px_rgba(244,63,94,0.25)]'
            : 'bg-[#080810]/95 border-white/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Ribbon */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isChampion
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-pulse'
              : isElimination
              ? 'bg-gradient-to-r from-rose-600 via-orange-500 to-red-600'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
          }`}
          style={!isElimination ? { backgroundColor: winner.color } : undefined}
        />

        <button
          id="close-winner-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge / Trophy / Elimination Icon */}
        <div
          className={`mx-auto my-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl ${
            isChampion
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-amber-500/30'
              : isElimination
              ? 'bg-gradient-to-tr from-rose-600 to-red-700 text-white shadow-rose-600/30 ring-4 ring-rose-500/20 animate-bounce'
              : 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)]'
          }`}
        >
          {isChampion ? (
            <Crown className="w-9 h-9 text-black" />
          ) : isElimination ? (
            <Skull className="w-8 h-8 text-white" />
          ) : winner.icon ? (
            <span className="text-3xl">{winner.icon}</span>
          ) : (
            <Trophy className="w-8 h-8 text-black" />
          )}
        </div>

        {/* Pill status badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
            isChampion
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
              : isElimination
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
              : 'bg-white/5 border border-white/10 text-indigo-300'
          }`}
        >
          {isChampion ? (
            <>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Ultimate Champion</span>
            </>
          ) : isElimination ? (
            <>
              <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Contestant Eliminated!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>The Choice Has Been Made</span>
            </>
          )}
        </div>

        {/* Selected Item / Winner Name */}
        <h3
          id="winner-item-text"
          className={`text-2xl sm:text-3xl font-black tracking-tight break-words my-2 font-['Outfit'] ${
            isChampion
              ? 'text-amber-200'
              : isElimination
              ? 'text-rose-100 line-through decoration-rose-500 decoration-4'
              : 'text-white'
          }`}
        >
          {winner.text}
        </h3>

        {winner.note && (
          <p className="text-sm text-slate-400 italic mb-3 px-4">
            "{winner.note}"
          </p>
        )}

        {/* Elimination / Battle Royale Context Message */}
        {isElimination && !isChampion && (
          <p className="text-xs font-medium text-rose-300/90 mb-3">
            {totalActiveCount - 1 > 1
              ? `🔥 ${totalActiveCount - 1} contestants left in the arena battle!`
              : totalActiveCount - 1 === 1
              ? `⚡ 1 remaining survivor will be crowned Champion!`
              : `Final round complete!`}
          </p>
        )}

        {isChampion && (
          <p className="text-xs font-semibold text-amber-300/90 mb-3">
            🎉 Outlasted all other contestants to become the sole survivor!
          </p>
        )}

        {/* Stats Pill */}
        <div className="flex items-center justify-center gap-4 my-4 py-2 px-4 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300">
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Odds: </span>
            <span className={`font-bold ${isElimination ? 'text-rose-400' : 'text-indigo-400'}`}>
              {probability}%
            </span>
          </div>
          <div className="w-px h-3.5 bg-white/10" />
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Contestants: </span>
            <span className="font-bold text-slate-200">{totalActiveCount} alive</span>
          </div>
          {winner.weight > 1 && (
            <>
              <div className="w-px h-3.5 bg-white/10" />
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Weight: </span>
                <span className="font-bold text-amber-400">{winner.weight}x</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2.5 mt-6">
          {isChampion ? (
            /* Champion Action: Restart Battle Royale */
            <button
              id="restart-battle-royale-btn"
              onClick={() => {
                if (onRestoreAll) onRestoreAll();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all transform active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4 text-black" />
              <span>Revive All & Play Again</span>
            </button>
          ) : isElimination ? (
            /* Battle Royale Elimination Action Buttons */
            <>
              <button
                id="eliminate-and-spin-btn"
                onClick={handleEliminateAndSpin}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-base shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all transform active:scale-[0.98]"
              >
                <Flame className="w-4 h-4 text-white animate-pulse" />
                <span>Eliminate & Spin Next</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="eliminate-confirm-btn"
                  onClick={handleEliminateAndContinue}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 font-semibold text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminate Only</span>
                </button>

                <button
                  id="cancel-elimination-btn"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-xs transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Forgive / Keep</span>
                </button>
              </div>
            </>
          ) : (
            /* Classic Spin Again */
            <button
              id="spin-again-btn"
              onClick={() => {
                onClose();
                onSpinAgain();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white hover:bg-slate-100 text-black font-black text-base shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all transform active:scale-[0.98]"
            >
              <RotateCw className="w-4 h-4 text-black" />
              <span>Spin Again</span>
            </button>
          )}

          {/* Secondary Utilities */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              id="copy-winner-btn"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium text-xs transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Name</span>
                </>
              )}
            </button>

            <button
              id="share-winner-btn"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium text-xs transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Share Result</span>
            </button>
          </div>

          {!isElimination && totalActiveCount > 1 && (
            <button
              id="remove-winner-btn"
              onClick={() => {
                onRemoveWinner(winner);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-medium text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove "{winner.text.length > 14 ? winner.text.slice(0, 14) + '…' : winner.text}" from Wheel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

