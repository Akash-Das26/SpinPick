import React from 'react';
import { SpinHistoryItem } from '../types';
import { History, BarChart3, Trash2, Download, X, Clock, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';
import { useModalA11y } from '../hooks/useModalA11y';

interface HistoryStatsDrawerProps {
  history: SpinHistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
}

export const HistoryStatsDrawer: React.FC<HistoryStatsDrawerProps> = ({
  history,
  isOpen,
  onClose,
  onClearHistory,
}) => {
  const modalRef = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  // Calculate item frequencies
  const frequencyMap: { [key: string]: { text: string; count: number; color: string; icon?: string } } = {};
  history.forEach((h) => {
    const key = h.winner.text;
    if (!frequencyMap[key]) {
      frequencyMap[key] = {
        text: h.winner.text,
        count: 0,
        color: h.winner.color || '#6366f1',
        icon: h.winner.icon,
      };
    }
    frequencyMap[key].count += 1;
  });

  const frequencyList = Object.values(frequencyMap).sort((a, b) => b.count - a.count);
  const totalSpins = history.length;

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const rows = [
      ['Timestamp', 'Date', 'Winner', 'Wheel Name', 'Mode'],
      ...history.map((h) => [
        h.timestamp,
        new Date(h.timestamp).toISOString(),
        `"${h.winner.text.replace(/"/g, '""')}"`,
        `"${h.wheelTitle.replace(/"/g, '""')}"`,
        h.mode,
      ]),
    ];
    const csv = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spinpick_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    sound.playPop(true);
  };

  return (
    <div
      id="history-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="history-drawer-content"
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="w-full max-w-md bg-[#080810]/95 border-l border-white/10 h-full p-5 flex flex-col justify-between shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/5 text-indigo-400 border border-white/10">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Spin History & Stats</h3>
                <p className="text-xs text-slate-400">{totalSpins} total spins recorded</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Winning Distribution Stats */}
          {frequencyList.length > 0 && (
            <div className="my-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Leaderboard / Frequency</span>
              </div>

              <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {frequencyList.slice(0, 5).map((stat, idx) => {
                  const pct = totalSpins > 0 ? ((stat.count / totalSpins) * 100).toFixed(0) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-slate-300">
                        <span className="truncate flex items-center gap-1.5">
                          {stat.icon && <span>{stat.icon}</span>}
                          <span>{stat.text}</span>
                        </span>
                        <span className="font-mono text-indigo-400 text-[11px] font-bold">
                          {stat.count} wins ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: stat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* History Log Timeline */}
        <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2 custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Clock className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm">No spin history yet.</p>
              <p className="text-xs text-slate-600 mt-1">Spin the wheel to start logging results!</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-950 font-bold shadow"
                    style={{ backgroundColor: item.winner.color || '#6366f1' }}
                  >
                    {item.winner.icon ? (
                      <span className="text-sm">{item.winner.icon}</span>
                    ) : (
                      <Trophy className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white truncate">{item.winner.text}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span>{item.wheelTitle}</span>
                      <span>•</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-black/40 text-slate-400 border border-white/5 flex-shrink-0">
                  {item.mode}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        {history.length > 0 && (
          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Clear all history logs?')) {
                  onClearHistory();
                  sound.playPop(false);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
