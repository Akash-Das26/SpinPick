import { Sparkles, ArrowRight } from '../lib/icons';
import { Link } from 'react-router-dom';
import styles from './CTABanner.module.css';

export function CTABanner({ heading, subheading }) {
  return (
    <div className={`${styles.ctaBanner} relative overflow-hidden text-center mt-72 border-glow rounded-xl`}>
      {/* decorative glow blobs */}
      <div aria-hidden="true" className={`${styles.ctaBanner__glowBlob} ${styles.ctaBanner__glowBlobTop}`} />
      <div aria-hidden="true" className={`${styles.ctaBanner__glowBlob} ${styles.ctaBanner__glowBlobBottom}`} />

      <div className={styles.ctaBanner__content}>
        <div className={styles.ctaBanner__badge}>
          <Sparkles size={13} aria-hidden="true" />
          Free — No Account Required
        </div>

        <h2 className={`${styles.ctaBanner__heading} font-display font-black text-primary leading-tight mb-16`}>
          {heading || 'Ready to make smarter decisions?'}
        </h2>

        <p className={`${styles.ctaBanner__copy} text-secondary leading-relaxed`}>
          {subheading ||
            'SpinPick is free, ad-free, and requires no account. Let AI generate your options and spin to a reasoned decision in seconds.'}
        </p>

        <Link to="/" className={`${styles.ctaBanner__ctaButton} inline-flex items-center gap-10`}>
          Try SpinPick Free
          <ArrowRight size={18} aria-hidden="true" />
        </Link>

        <p className={`${styles.ctaBanner__smallText} mt-14 text-muted text-xs`}>
          No signup · No credit card · 100% free
        </p>
      </div>
    </div>
  );
}
