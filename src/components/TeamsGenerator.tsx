import React, { useState, useEffect } from 'react';
import { WheelItem, TeamGroup } from '../types';
import { Users, Shuffle, Copy, Check, Sparkles, X } from 'lucide-react';
import { sound } from '../utils/audio';
import { secureShuffle } from '../utils/random';

interface TeamsGeneratorProps {
  items: WheelItem[];
  isOpen: boolean;
  onClose: () => void;
}

const TEAM_PRESETS = [
  { name: 'Red Dragons', color: '#ef4444' },
  { name: 'Blue Falcons', color: '#3b82f6' },
  { name: 'Emerald Titans', color: '#10b981' },
  { name: 'Golden Phoenix', color: '#f59e0b' },
  { name: 'Purple Wizards', color: '#8b5cf6' },
  { name: 'Cyan Sharks', color: '#06b6d4' },
  { name: 'Neon Cobras', color: '#ec4899' },
  { name: 'Silver Wolves', color: '#94a3b8' },
];

export const TeamsGenerator: React.FC<TeamsGeneratorProps> = ({ items, isOpen, onClose }) => {
  const activeItems = items.filter((i) => i.enabled);
  const [numTeams, setNumTeams] = useState<number>(2);
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [copied, setCopied] = useState(false);

  const generateTeams = () => {
    if (activeItems.length === 0) return;

    sound.playPop(true);
    // Shuffle copy of active items
    const shuffled = secureShuffle(activeItems);

    const actualCount = Math.min(numTeams, Math.max(1, activeItems.length));
    const newTeams: TeamGroup[] = Array.from({ length: actualCount }, (_, i) => ({
      teamName: TEAM_PRESETS[i % TEAM_PRESETS.length].name,
      color: TEAM_PRESETS[i % TEAM_PRESETS.length].color,
      members: [],
    }));

    shuffled.forEach((item, index) => {
      const targetTeam = index % actualCount;
      newTeams[targetTeam].members.push(item);
    });

    setTeams(newTeams);
  };

  useEffect(() => {
    if (isOpen) {
      generateTeams();
    }
  }, [isOpen, numTeams, items]);

  if (!isOpen) return null;

  const handleCopyTeams = () => {
    const text = teams
      .map(
        (t) =>
          `🏆 ${t.teamName} (${t.members.length}):\n` +
          t.members.map((m) => `  - ${m.icon ? m.icon + ' ' : ''}${m.text}`).join('\n')
      )
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.playPop(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="teams-generator-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="teams-generator-content"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-[#080810]/95 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-6 space-y-5 transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 text-indigo-400 border border-white/10">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Random Team Generator</h3>
              <p className="text-xs text-slate-400">
                Instantly balance {activeItems.length} choices into randomized groups
              </p>
            </div>
          </div>

          <button
            id="close-teams-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Number of Teams:</label>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumTeams(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    numTeams === n
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-black/40 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reshuffle-teams-btn"
              onClick={generateTeams}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Re-shuffle</span>
            </button>

            <button
              id="copy-teams-btn"
              onClick={handleCopyTeams}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy List</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
          {teams.map((team, idx) => (
            <div
              key={idx}
              className="flex flex-col rounded-xl bg-white/5 border border-white/5 p-3.5 shadow-md relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: team.color }}
              />

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  {team.teamName}
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/40 text-slate-300 border border-white/5">
                  {team.members.length}
                </span>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[140px] custom-scrollbar">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/5 text-xs text-slate-200"
                  >
                    {member.icon && <span>{member.icon}</span>}
                    <span className="truncate font-medium">{member.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
