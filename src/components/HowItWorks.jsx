import { MessageSquare, Cpu, PlayCircle } from '../lib/icons';
import styles from './HowItWorks.module.css';

export function HowItWorks() {
  return (
    <section className={`${styles.section} mt-80 mb-60`}>
      <div className="text-center mb-40">
        <span className="mono text-xs text-lime uppercase tracking-wider font-bold">
          HOW SPINPICK WORKS
        </span>
        <h2 className="font-black mt-6 text-2xl">
          How SpinPick Resolves Decision Paralysis
        </h2>
        <p className="text-muted text-base mx-auto mt-8 max-w-[580px]">
          One plain English query in, real-time AI option generation, and high-velocity physics output.
        </p>
      </div>

      <div className={styles.cardGrid}>
        {/* Step 1 */}
        <div className="glass-panel p-28">
          <div className={`${styles.cardIcon} ${styles.iconGreen}`}>
            <MessageSquare size={24} aria-hidden="true" />
          </div>
          <span className="mono text-xs text-lime font-bold">
            01 — TYPE QUERY
          </span>
          <h3 className="font-extrabold mt-4 mb-8 text-lg">
            Ask Any Open-Ended Dilemma
          </h3>
          <p className={styles.stepDescription}>
            Type what to cook, where to travel, which project to ship, or pick from our quick prompt chips.
          </p>
        </div>

        {/* Step 2 */}
        <div className="glass-panel p-28">
          <div className={`${styles.cardIcon} ${styles.iconCyan}`}>
            <Cpu size={24} aria-hidden="true" />
          </div>
          <span className="mono text-xs text-accent-cyan font-bold">
            02 — GENERATE OPTIONS
          </span>
          <h3 className="font-extrabold mt-4 mb-8 text-lg">
            Smart Option Generator
          </h3>
          <p className={styles.stepDescription}>
            OpenRouter or the built-in keyword generator parses your intent and generates 4 to 12 tailored choices with descriptions and colors.
          </p>
        </div>

        {/* Step 3 */}
        <div className="glass-panel p-28">
          <div className={`${styles.cardIcon} ${styles.iconPurple}`}>
            <PlayCircle size={24} aria-hidden="true" />
          </div>
          <span className="mono text-xs text-accent-purple font-bold">
            03 — SPIN & EXECUTE
          </span>
          <h3 className="font-extrabold mt-4 mb-8 text-lg">
            Physics Wheel & Action Plan
          </h3>
          <p className={styles.stepDescription}>
            Spin the wheel, hear synthetic audio clicks, land a winning pick, and receive 3 immediate action steps.
          </p>
        </div>
      </div>
    </section>
  );
}
