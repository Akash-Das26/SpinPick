import { Sparkles, ArrowRight } from '../lib/icons';
import { Link } from 'react-router-dom';
import styles from './CTABanner.module.css';

export function CTABanner({ heading, subheading }) {
  return (
    <div className={`${styles.wrapper} relative overflow-hidden text-center mt-72 border-glow rounded-xl`}>
      {/* decorative glow blobs */}
      <div aria-hidden="true" className={`${styles.glowBlob} ${styles.glowBlobTop}`} />
      <div aria-hidden="true" className={`${styles.glowBlob} ${styles.glowBlobBottom}`} />

      <div className={styles.content}>
        <div className={styles.badge}>
          <Sparkles size={13} aria-hidden="true" />
          Free — No Account Required
        </div>

        <h2 className={`${styles.heading} font-display font-black text-primary leading-tight mb-16`}>
          {heading || 'Ready to make smarter decisions?'}
        </h2>

        <p className={`${styles.copy} text-secondary leading-relaxed`}>
          {subheading ||
            'SpinPick is free, ad-free, and requires no account. Let AI generate your options and spin to a reasoned decision in seconds.'}
        </p>

        <Link to="/" className={`${styles.ctaButton} inline-flex items-center gap-10`}>
          Try SpinPick Free
          <ArrowRight size={18} aria-hidden="true" />
        </Link>

        <p className={`${styles.smallText} mt-14 text-muted text-xs`}>
          No signup · No credit card · 100% free
        </p>
      </div>
    </div>
  );
}
