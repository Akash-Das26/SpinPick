import { Link } from 'react-router-dom';
import { Disc } from '../lib/icons';
import styles from './CompareHeader.module.css';

export function CompareHeader() {
  return (
    <nav className={`${styles.nav} sticky top-0 z-50 border-bottom backdrop-blur`} aria-label="Main navigation">
      <div className={`${styles.container} container flex items-center justify-between gap-16`}>
        <Link to="/" className="no-underline flex items-center gap-10">
          <div className={styles.logoBubble}>
            <Disc size={18} color="#07070d" aria-hidden="true" />
          </div>
          <span className={styles.brand}>SpinPick</span>
        </Link>

        <div className={styles.actions}>
          <Link to="/compare" className={`${styles.actionLink} ${styles.compareLink}`}>
            Compare
          </Link>
          <Link to="/" className={`${styles.actionLink} ${styles.tryLink}`}>
            Try Free
          </Link>
        </div>
      </div>
    </nav>
  );
}
