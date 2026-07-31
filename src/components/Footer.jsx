/* global __APP_VERSION__ -- injected by Vite define from package.json */
import { Disc } from '../lib/icons';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export function Footer({ hasOpenRouterProxy }) {
  return (
    <footer className={`${styles.footer} text-muted text-sm`}>
      <div className="container flex-col gap-20">
        <div className={styles.footer__top}>
          <div className={styles.footer__logoArea}>
            <div className={`${styles.footer__logoBubble} grid-center`}>
              <Disc size={14} color="#07070d" aria-hidden="true" />
            </div>
            <span className={styles.footer__brandText}>
              SpinPick Decision Studio
            </span>
            <span className={styles.footer__versionBadge}>© {new Date().getFullYear()} · v{__APP_VERSION__}</span>
          </div>

          <div className="flex gap-20 items-center">
            <span className="mono text-xs">
              {hasOpenRouterProxy ? 'Powered by OpenRouter AI via secure proxy & Web Audio API' : 'Powered by Web Audio API & keyword-based templates'}
            </span>
          </div>
        </div>

        {/* nav links */}
        <div className={styles.footer__navLinks}>
          <Link to="/" className="text-muted no-underline">Home</Link>
          <Link to="/compare" className="text-muted no-underline">Compare Alternatives</Link>
          <Link to="/compare/wheel-of-names" className="text-muted no-underline">vs Wheel of Names</Link>
          <Link to="/compare/picker-wheel" className="text-muted no-underline">vs Picker Wheel</Link>
          <Link to="/compare/wheel-decide" className="text-muted no-underline">vs Wheel Decide</Link>
          <Link to="/compare/spin-wheel" className="text-muted no-underline">vs Spin-Wheel</Link>
        </div>
      </div>
    </footer>
  );
}
