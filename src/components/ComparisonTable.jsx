import { Check, X, Minus } from '../lib/icons';
import { SPINPICK_FEATURES } from '../data/competitors';
import styles from './ComparisonTable.module.css';

/* ─── small sub-components ─────────────────────────────────────────── */

function FeatureCell({ value }) {
  if (value === true)
    return (
      <span className={`${styles.comparisonTable__iconBadge} ${styles['comparisonTable__iconBadge--yes']}`} aria-label="Yes">
        <Check size={15} strokeWidth={3} />
      </span>
    );
  if (value === false)
    return (
      <span className={`${styles.comparisonTable__iconBadge} ${styles['comparisonTable__iconBadge--no']}`} aria-label="No">
        <X size={15} strokeWidth={3} />
      </span>
    );
  // string value
  return (
    <span className={`${styles.comparisonTable__smallText} text-secondary`}>
      {value ?? <Minus size={14} color="var(--text-muted)" aria-label="Unknown" />}
    </span>
  );
}

const ROWS = [
  { key: 'pricing', label: 'Pricing' },
  { key: 'freeOption', label: 'Free Option' },
  { key: 'noAds', label: 'Ad-Free' },
  { key: 'noAccount', label: 'No Account Needed' },
  { key: 'aiPowered', label: 'AI-Powered Options' },
  { key: 'maxOptions', label: 'Max Options' },
  { key: 'apiIntegration', label: 'AI Engine' },
  { key: 'weightedSpin', label: 'Weighted Entries' },
  { key: 'tournamentMode', label: 'Tournament / Bracket' },
  { key: 'decisionHistory', label: 'Decision History' },
  { key: 'exportResults', label: 'Export Results' },
  { key: 'customColors', label: 'Custom Colors' },
  { key: 'soundEffects', label: 'Sound Effects' },
  { key: 'mobileReady', label: 'Mobile Ready' },
  { key: 'openSource', label: 'Open Source' },
];

/* ─── main component ────────────────────────────────────────────────── */

export function ComparisonTable({ competitor }) {
  const cols = [SPINPICK_FEATURES, competitor];

  return (
    <section aria-label="Feature comparison table" className="overflow-x-auto">
      <table className={`${styles.comparisonTable__root} w-full`}>
        <thead>
          <tr>
            {/* empty corner */}
            <th scope="col" className={`${styles.comparisonTable__headerCorner} text-left text-muted font-semibold uppercase border-bottom bg-none px-18 py-14`}>
              Feature
            </th>

            {cols.map((col, i) => {
              const isSpinPick = i === 0;
              const headerCellClass = isSpinPick
                ? styles['comparisonTable__headerCell--spinpick']
                : styles['comparisonTable__headerCell--competitor'];
              return (
                <th
                  key={col.name}
                  scope="col"
                  className={`${styles.comparisonTable__headerCell} ${headerCellClass} px-20 py-16 text-center`}
                >
                  <div className="flex flex-col items-center gap-4">
                    {isSpinPick && (
                      <span className={`${styles.comparisonTable__headerBadge} uppercase font-extrabold tracking-wider mb-4`}>
                        This App
                      </span>
                    )}
                    <span
                      className={`font-display font-extrabold text-md ${isSpinPick ? 'text-primary' : 'text-secondary'}`}
                    >
                      {col.name}
                    </span>
                    <span className="text-muted text-xs">
                      {col.tagline}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {ROWS.map((row, rowIdx) => {
            const isEven = rowIdx % 2 === 0;
            return (
              <tr key={row.key} className={styles.comparisonTable__bodyRow}>
                <td className={`${styles.comparisonTable__featureCell} text-secondary font-semibold border-bottom`}>
                  {row.label}
                </td>

                {cols.map((col, i) => {
                  const isSpinPick = i === 0;
                  const cellClass = isSpinPick
                    ? isEven
                      ? styles.comparisonTable__spinpickBodyCell
                      : `${styles.comparisonTable__spinpickBodyCell} ${styles.comparisonTable__spinpickBodyCellAlt}`
                    : styles.comparisonTable__competitorBodyCell;
                  return (
                    <td key={col.name} className={`${cellClass} text-center border-bottom`}>
                      <FeatureCell value={col[row.key]} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
