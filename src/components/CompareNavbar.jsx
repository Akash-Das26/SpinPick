import { Link } from 'react-router-dom';
import { Disc } from '../lib/icons';
import styles from './CompareNavbar.module.css';

export function CompareNavbar() {
  return (
    <nav className={`${styles.compareNavbar__nav} sticky top-0 z-50 border-bottom backdrop-blur`} aria-label="Main navigation">
      <div className={`${styles.compareNavbar__container} container flex items-center justify-between gap-16`}>
        <Link to="/" className="no-underline flex items-center gap-10">
          <div className={`${styles.compareNavbar__logoBubble} grid-center`}>
            <Disc size={18} color="#07070d" aria-hidden="true" />
          </div>
          <span className={styles.compareNavbar__brand}>SpinPick</span>
        </Link>

        <div className={styles.compareNavbar__actions}>
          <Link to="/compare" className={`${styles.compareNavbar__actionLink} ${styles.compareNavbar__compareLink}`}>
            Compare
          </Link>
          <Link to="/" className={`${styles.compareNavbar__actionLink} ${styles.compareNavbar__tryLink}`}>
            Try Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default CompareNavbar;