import React, { useState, useEffect } from 'react';
import { WheelItem } from '../types';
import { Trophy, RotateCw, ChevronRight } from 'lucide-react';
import { sound } from '../utils/audio';
import { secureShuffle } from '../utils/random';

interface TournamentModeProps {
  items: WheelItem[];
  isOpen: boolean;
  onClose: () => void;
}

interface Match {
  a: WheelItem;
  b: WheelItem;
  winner?: WheelItem;
}

interface BracketRound {
  name: string;
  matches: Match[];
}

const TBD_ITEM: WheelItem = { id: 'tbd', text: 'TBD', color: '#333', weight: 1, enabled: true };

function buildBracket(items: WheelItem[]): BracketRound[] {
  const active = items.filter((i) => i.enabled);
  if (active.length < 2) return [];

  // Pad to power of 2
  let size = 2;
  while (size < active.length) size *= 2;
  const padded = [...active];
  while (padded.length < size) {
    padded.push({ ...active[padded.length % active.length], id: `bye-${padded.length}`, text: 'BYE' });
  }

  const shuffled = secureShuffle(padded);
  const rounds: BracketRound[] = [];
  let currentCount = shuffled.length;

  while (currentCount >= 2) {
    const matchCount = currentCount / 2;
    const roundName =
      matchCount === 1
        ? 'Finals'
        : matchCount === 2
        ? 'Semi-Finals'
        : `Round ${rounds.length + 1}`;

    const matches: Match[] = [];
    for (let i = 0; i < matchCount; i++) {
      if (rounds.length === 0) {
        // First round: populate from shuffled array
        matches.push({
          a: shuffled[i * 2],
          b: shuffled[i * 2 + 1],
        });
      } else {
        // Later rounds: TBD (will be filled as winners are picked)
        matches.push({ a: TBD_ITEM, b: TBD_ITEM });
      }
    }

    rounds.push({ name: roundName, matches });
    currentCount = matchCount;
  }

  return rounds;
}

export const TournamentMode: React.FC<TournamentModeProps> = ({
  items,
  isOpen,
  onClose,
}) => {
  const [bracket, setBracket] = useState<BracketRound[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [champion, setChampion] = useState<WheelItem | null>(null);

  // Rebuild the bracket from current items every time the modal opens,
  // so edits made since the last tournament are always reflected.
  useEffect(() => {
    if (isOpen) {
      setBracket(buildBracket(items));
      setCurrentRoundIdx(0);
      setCurrentMatchIdx(0);
      setChampion(null);
    }
  }, [isOpen, items]);

  const activeItems = items.filter((i) => i.enabled);

  const currentRound = bracket[currentRoundIdx];
  const currentMatch = currentRound?.matches[currentMatchIdx];
  const isFinished = champion !== null;

  const handlePickWinner = (winner: WheelItem) => {
    if (!currentRound || !currentMatch) return;

    // Handle BYE — auto-advance the non-BYE competitor
    if (currentMatch.a.text === 'BYE') {
      winner = currentMatch.b;
    } else if (currentMatch.b.text === 'BYE') {
      winner = currentMatch.a;
    }

    // Clone bracket and mark winner on current match
    const newBracket = bracket.map((round, rIdx) => ({
      ...round,
      matches: round.matches.map((m, mIdx) =>
        rIdx === currentRoundIdx && mIdx === currentMatchIdx
          ? { ...m, winner }
          : { ...m }
      ),
    }));

    // Advance winner to next round
    if (currentRoundIdx < bracket.length - 1) {
      const nextMatchIdx = Math.floor(currentMatchIdx / 2);
      const isTopHalf = currentMatchIdx % 2 === 0;

      if (isTopHalf) {
        newBracket[currentRoundIdx + 1].matches[nextMatchIdx] = {
          ...newBracket[currentRoundIdx + 1].matches[nextMatchIdx],
          a: winner,
        };
      } else {
        newBracket[currentRoundIdx + 1].matches[nextMatchIdx] = {
          ...newBracket[currentRoundIdx + 1].matches[nextMatchIdx],
          b: winner,
        };
      }
    }

    setBracket(newBracket);

    // Move to next match
    if (currentMatchIdx < currentRound.matches.length - 1) {
      setCurrentMatchIdx(currentMatchIdx + 1);
    } else if (currentRoundIdx < bracket.length - 1) {
      setCurrentRoundIdx(currentRoundIdx + 1);
      setCurrentMatchIdx(0);
    } else {
      // Tournament complete!
      setChampion(winner);
      sound.playVictoryFanfare();
    }
  };

  const handleReset = () => {
    setBracket(buildBracket(items));
    setCurrentRoundIdx(0);
    setCurrentMatchIdx(0);
    setChampion(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#080810]/95 border border-white/10 p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-5 animate-scale-up overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Tournament Bracket</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {activeItems.length} contestants
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reset bracket"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>

        {isFinished && champion ? (
          /* Champion Display */
          <div className="text-center py-8 space-y-4 animate-scale-up">
            <div className="text-6xl animate-bounce">👑</div>
            <h2 className="text-3xl font-black text-white">{champion.text}</h2>
            <p className="text-amber-400 font-bold text-lg">🏆 TOURNAMENT CHAMPION</p>
            {champion.note && (
              <p className="text-sm text-slate-400 max-w-md mx-auto">{champion.note}</p>
            )}
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors shadow-lg shadow-amber-600/30 mt-4"
            >
              Start New Tournament
            </button>
          </div>
        ) : currentMatch ? (
          /* Current Match */
          <div className="space-y-6">
            {/* Round & Match Info */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {currentRound?.name}
              </span>
              <span>
                Match {currentMatchIdx + 1} of {currentRound?.matches.length}
              </span>
            </div>

            {/* VS Card */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
              {/* Competitor A */}
              <button
                onClick={() => handlePickWinner(currentMatch.a)}
                className="group p-6 rounded-2xl bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 transition-all text-center cursor-pointer active:scale-95"
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/20 group-hover:border-indigo-400 transition-colors flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: currentMatch.a.color }}
                >
                  {currentMatch.a.icon || currentMatch.a.text.charAt(0)}
                </div>
                <p className="font-bold text-white text-sm">{currentMatch.a.text}</p>
                {currentMatch.a.note && (
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{currentMatch.a.note}</p>
                )}
                <p className="text-[10px] text-indigo-400 mt-2 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to advance →
                </p>
              </button>

              {/* VS Badge */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-slate-600">VS</span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>

              {/* Competitor B */}
              <button
                onClick={() => handlePickWinner(currentMatch.b)}
                className="group p-6 rounded-2xl bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 transition-all text-center cursor-pointer active:scale-95"
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/20 group-hover:border-purple-400 transition-colors flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: currentMatch.b.color }}
                >
                  {currentMatch.b.icon || currentMatch.b.text.charAt(0)}
                </div>
                <p className="font-bold text-white text-sm">{currentMatch.b.text}</p>
                {currentMatch.b.note && (
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{currentMatch.b.note}</p>
                )}
                <p className="text-[10px] text-purple-400 mt-2 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  ← Click to advance
                </p>
              </button>
            </div>

            <p className="text-center text-xs text-slate-500">
              Click on a competitor to advance them to the next round
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>Not enough contestants for a tournament (need at least 2)</p>
          </div>
        )}

        {/* Bracket Overview */}
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs font-bold text-slate-400 mb-3">Bracket Overview</p>
          <div className="space-y-3">
            {bracket.map((round, rIdx) => (
              <div key={rIdx} className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {round.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {round.matches.map((m, mIdx) => {
                    const isActive = rIdx === currentRoundIdx && mIdx === currentMatchIdx;
                    const isCompleted = m.winner !== undefined;
                    return (
                      <div
                        key={mIdx}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          isActive
                            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                            : isCompleted
                            ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-white/5 border-white/5 text-slate-500'
                        }`}
                      >
                        {isCompleted ? (
                          <span>✓ {m.winner!.text}</span>
                        ) : (
                          <span>{m.a.text} vs {m.b.text}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
