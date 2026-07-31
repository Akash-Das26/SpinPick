import { History, Trash2, Calendar, Sparkles } from '../lib/icons';
import styles from './DecisionHistory.module.css';

export function DecisionHistory({ history, onClearHistory, onLoadPastSpin }) {
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all decision log history? This cannot be undone.')) {
      onClearHistory();
    }
  };

  return (
    <div className={`${styles.root} mx-auto`}>
      <div className={styles.sectionHeader}>
        <div>
          <span className="mono text-xs text-lime font-bold tracking-wider uppercase">
            HISTORY
          </span>
          <h2 className="font-black mt-4 text-2xl">
            History
          </h2>
        </div>

        {history.length > 0 && (
          <button 
            className="btn btn-secondary btn-sm text-danger" 
            onClick={handleClear}
            aria-label="Clear all decision history"
          >
            <Trash2 size={15} aria-hidden="true" />
            Clear Log
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="glass-panel text-center p-48">
          <History size={48} color="var(--text-muted)" className={`${styles.emptyIcon} mx-auto mb-16`} aria-hidden="true" />
          <h3 className={`${styles.emptyTitle} font-extrabold`}>No Decision History Yet</h3>
          <p className="text-muted mt-6 text-sm">
            Spin the wheel in the studio or save custom wheels to record your decision trajectory.
          </p>
          <p className="text-muted mt-8 text-xs mono tracking-wider uppercase">
            Your past verdicts will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="flex-col gap-14">
          {history.map((item, idx) => (
            <div key={item.id || idx} className={`${styles.historyItem}`}>
              <div className={styles.historyDetails}>
                <div className="flex items-center gap-10 mb-6">
                  <span className={`${styles.historyBadge} mono text-xs text-lime`}>
                    VERDICT #{history.length - idx}
                  </span>
                  <span className="text-sm text-muted flex items-center gap-4">
                    <Calendar size={13} aria-hidden="true" />
                    {new Date(item.timestamp || Date.now()).toLocaleDateString()} at {new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h4 className={`${styles.cardTitle} font-extrabold text-primary`}>
                  {item.winner?.label || item.title || 'Decision Verdict'}
                </h4>
                
                {item.prompt && (
                  <p className={`${styles.cardPrompt} text-muted mt-2`}>
                    Prompt: "{item.prompt}"
                  </p>
                )}
              </div>

              <div className="flex gap-8">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onLoadPastSpin(item)}
                  aria-label={`Re-open "${item.winner?.label || 'spin'}" in studio`}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  Re-Open in Studio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
