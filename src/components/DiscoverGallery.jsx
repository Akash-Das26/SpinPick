import { Sparkles, ArrowRight } from '../lib/icons';
import { PRESET_GALLERY } from '../data/presets';
import styles from './DiscoverGallery.module.css';

export function DiscoverGallery({ onSelectPreset }) {
  return (
    <div className={styles.discoverGallery}>
      <div className={styles.discoverGallery__sectionHeading}>
        <span className="mono text-sm text-lime font-bold tracking-wider uppercase">
          DISCOVER
        </span>
        <h2 className={`${styles.discoverGallery__title} font-black mt-6`}>
          Discover
        </h2>
        <p className={`${styles.discoverGallery__copy} text-muted mx-auto mt-8`}>
          Select any curated template to load it instantly into your studio workspace.
        </p>
      </div>

      <div className={styles.discoverGallery__grid}>
        {PRESET_GALLERY.map((preset) => {
          const IconComp = preset.icon || Sparkles;
          return (
            <div key={preset.id} className={`${styles.discoverGallery__card} glass-panel`}>
              <div>
                <div className={`${styles.discoverGallery__cardHeader} mb-16`}>
                  <div className={`${styles.discoverGallery__cardIcon} text-lime`}>
                    <IconComp size={22} aria-hidden="true" />
                  </div>
                  <span className={`${styles.discoverGallery__categoryTag} mono text-xs text-muted`}>{preset.category}</span>
                </div>

                <h3 className={`${styles.discoverGallery__cardTitle} font-extrabold mb-8`}>{preset.title}</h3>
                <p className={`${styles.discoverGallery__cardText} text-muted mb-16`}>{preset.desc}</p>

                <div className={styles.discoverGallery__previewLabel}>Quick preview</div>
                <div className={styles.discoverGallery__tags}>
                  {preset.options.slice(0, 4).map((opt) => (
                    <span key={opt.id} className={styles.discoverGallery__tag}>
                      {opt.label}
                    </span>
                  ))}
                  {preset.options.length > 4 && (
                    <span className="mono text-xs text-lime">
                      +{preset.options.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelectPreset(preset)}
                className="btn btn-secondary btn-sm w-full justify-between"
                aria-label={`Load "${preset.title}" wheel into studio`}
              >
                <span>Load Wheel into Studio</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
