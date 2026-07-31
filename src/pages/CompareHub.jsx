import { Link } from 'react-router-dom';
import { Check, Disc, Zap, Shield, Sparkles, ArrowRight } from '../lib/icons';
import { COMPETITORS } from '../data/competitors';
import { CTABanner } from '../components/CTABanner';
import { useSEO } from '../hooks/useSEO';
import { CompareNavbar } from '../components/CompareNavbar';
import styles from './CompareHub.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const TITLE = `SpinPick vs Competitors: Decision Spinner Comparisons (${CURRENT_YEAR})`;
const DESC =
  `Compare SpinPick to Wheel of Names, Picker Wheel, Wheel Decide, Spin-Wheel, Wooclap, and other decision spinner tools. Honest side-by-side feature comparisons for ${CURRENT_YEAR}.`;

/* ─── hub card ──────────────────────────────────────────────────────── */
function CompareCard({ competitor }) {
  const winCount = [
    !competitor.aiPowered,
    !competitor.tournamentMode,
    !competitor.decisionHistory,
    !competitor.noAccount,
    !competitor.noAds,
    !competitor.exportResults || false,
  ].filter(Boolean).length;

  return (
    <Link
      to={`/compare/${competitor.slug}`}
      className="no-underline"
      aria-label={`Compare SpinPick vs ${competitor.name}`}
    >
      <article className={`${styles.compareCard} bg-surface border-subtle rounded-lg p-28 flex-col gap-16 pointer transition-fast h-full`}>
        {/* header */}
        <div className="flex items-start justify-between gap-12">
          <div>
            <h2 className={`${styles.compareTitle} font-extrabold text-primary mb-4 font-display`}>
              SpinPick vs {competitor.name}
            </h2>
            <p className="text-sm text-muted">
              {competitor.domain}
            </p>
          </div>
          {winCount >= 4 && (
            <span className={`${styles.comparePill} shrink-0 rounded-full text-lime font-extrabold tracking-wider uppercase bg-lime-glow px-12 py-4 no-wrap`}>
              SpinPick Wins
            </span>
          )}
        </div>

        {/* blurb */}
        <p className="text-secondary flex-1 text-sm leading-relaxed">
          {competitor.description.slice(0, 120)}…
        </p>

        {/* quick facts */}
        <div className="flex flex-wrap gap-8">
          {[
            { label: 'Smart Engine', win: !competitor.aiPowered },
            { label: 'Free', win: true },
            { label: 'No Ads', win: !competitor.noAds },
            { label: 'Tournament', win: !competitor.tournamentMode },
          ].map(({ label, win }) => (
            <span
              key={label}
              className={`${styles.quickFact} ${win ? styles.quickFactWin : styles.quickFactNeutral} inline-flex items-center gap-4 rounded-full font-semibold px-10 py-4 text-xs`}
            >
              {win ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null}
              {label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-6 text-lime font-bold mt-4 text-sm">
          Read full comparison
          <ArrowRight size={15} aria-hidden="true" />
        </div>
      </article>
    </Link>
  );
}

/* ─── hub page ──────────────────────────────────────────────────────── */
export function CompareHub() {
  useSEO({
    title: TITLE,
    description: DESC,
    url: 'https://spinpick.app/compare',
  });

  // Breadcrumb JSON-LD
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://spinpick.app/' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://spinpick.app/compare' },
    ],
  };

  return (
    <div className={`${styles.page} bg-dark`}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <CompareNavbar />

      <main id="main-content">
        <article className={`container ${styles.pageShell}`}>
          <Link to="/" className="flex items-center gap-10 no-underline">
            <div className={styles.brandBubble}>
              <Disc size={18} color="#07070d" aria-hidden="true" />
            </div>
            <span className="font-black text-primary font-display">
              SpinPick
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <Link
              to="/compare"
              className={`${styles.topBarPill} text-lime font-bold text-sm no-underline`}
            >
              Compare
            </Link>
            <Link
              to="/"
              className={`${styles.topBarPrimary} text-inverse font-extrabold text-sm no-underline px-18 py-8 bg-lime-strong`}
            >
              Try SpinPick Free
            </Link>
          </div>
        </article>

        {/* Hero */}
        <div className={styles.heroSection}>
          <div className={styles.heroBadge}>
          <Zap size={13} aria-hidden="true" />
          Honest Comparisons · Updated {CURRENT_YEAR}
        </div>

        <h1 className={styles.heroTitle}>
          SpinPick vs{' '}
          <span
            className="accent-text"
          >
            Every Competitor
          </span>
        </h1>

        <p className={styles.heroCopy}>
          Honest, researched comparisons. We highlight where SpinPick wins, acknowledge where it doesn't, and help you pick the right tool.
        </p>
        </div>

        {/* Why SpinPick banner */}
        <div className={styles.featureGrid}>
          {[
            { icon: <Sparkles size={18} aria-hidden="true" />, title: 'Smart Options', text: 'OpenRouter proxy or keyword-based templates produce options and decision reasoning' },
            { icon: <Shield size={18} aria-hidden="true" />, title: '100% Free', text: 'No ads, no account, no premium tier — ever' },
            { icon: <Zap size={18} aria-hidden="true" />, title: 'Tournament Mode', text: 'Head-to-head elimination brackets built-in' },
            { icon: <Check size={18} aria-hidden="true" />, title: 'Decision History', text: 'Full log of past spins with timestamps and reasoning' },
          ].map(({ icon, title, text }) => (
            <div
              key={title}
              className={styles.featureCard}
            >
              <div className="text-lime">{icon}</div>
              <div className={styles.featureTitle}>{title}</div>
              <div className={styles.featureText}>{text}</div>
            </div>
          ))}
        </div>

        {/* Comparison grid */}
        <div className={styles.comparisonGrid}>
          {COMPETITORS.map((c) => (
            <CompareCard key={c.slug} competitor={c} />
          ))}
        </div>

        <CTABanner />
      </main>

      {/* Footer */}
      <footer className="text-muted text-sm border-top py-32">
        <div className="container flex justify-between items-center flex-wrap gap-16">
          <Link to="/" className="text-secondary font-bold no-underline">
            ← Back to SpinPick
          </Link>
          <span>© {new Date().getFullYear()} SpinPick · Decision Studio</span>
        </div>
      </footer>
    </div>
  );
}