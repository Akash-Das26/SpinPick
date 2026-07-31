import { Check, X } from '../lib/icons';
import styles from './ComparisonSection.module.css';

export function ComparisonSection() {
  const comparisonData = [
    {
      feature: 'Option Weighting',
      spinpick: 'Keyword Boost Engine (Budget, Time, Effort, Excitement)',
      others: 'Flat 50/50 chance or manual typing',
      highlight: true
    },
    {
      feature: 'Large List Mode (16+ items)',
      spinpick: 'Interactive 1v1 Bracket Elimination Tournament',
      others: 'Unreadable 32-slice cluttered wheel',
      highlight: true
    },
    {
      feature: 'Export Options & Image Quality',
      spinpick: 'Zero-watermark 1200px PNG + CSV/JSON import/export',
      others: 'Watermarked images or paid paywall',
      highlight: true
    },
    {
      feature: 'Decision Follow-Through',
      spinpick: 'Smart rationale + 3 immediate execution action steps',
      others: 'Static text pop-up with zero guidance',
      highlight: false
    },
    {
      feature: 'Monetization & Privacy',
      spinpick: '100% Free, zero ads, no account required',
      others: 'Intrusive ad banners & paywalled features',
      highlight: false
    }
  ];

  return (
    <section className="mt-80 mb-60">
      <div className={styles.sectionHeading}>
        <span className={`mono text-lime uppercase font-bold ${styles.headingLabel}`}>
          THE UNFAIR ADVANTAGE
        </span>
        <h2 className={`${styles.headingTitle} font-black mt-6`}>
          Why SpinPick Beats Traditional Wheels
        </h2>
        <p className={`${styles.headingText} text-muted mx-auto mt-8`}>
          See how SpinPick Decision Studio solves the core limitations of basic spinner apps.
        </p>
      </div>

      <div className={`${styles.tableWrapper} glass-panel overflow-x-auto p-32`}>
        <table className={`${styles.comparisonTable} w-full text-left`}>
          <thead>
            <tr className={styles.tableHeadRow}>
              <th className={`${styles.headerCell} text-muted uppercase`}>
                Capability
              </th>
              <th className={`${styles.headerCell} ${styles.headerHighlight} text-md text-lime font-extrabold`}>
                ⚡ SpinPick Decision Studio
              </th>
              <th className={`${styles.headerCell} text-muted`}>
                Traditional Wheel Apps
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, idx) => {
              const rowClasses = `${styles.bodyRow} ${row.highlight ? styles.highlightRow : ''}`.trim();
              return (
                <tr key={idx} className={rowClasses}>
                  <td className={`${styles.featureCell} font-bold text-base text-primary`}>
                    {row.feature}
                  </td>
                  <td className={`${styles.spinPickCell} font-bold text-base text-lime`}>
                    <div className="flex items-center gap-8">
                      <Check size={18} color="var(--accent-lime)" aria-hidden="true" />
                      <span>{row.spinpick}</span>
                    </div>
                  </td>
                  <td className={`${styles.otherCell} text-muted`}>
                    <div className="flex items-center gap-8">
                      <X size={16} color="var(--danger)" aria-hidden="true" />
                      <span>{row.others}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
