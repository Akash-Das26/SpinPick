import { Link, useParams, Navigate } from 'react-router-dom';
import { Check, X, Disc, ExternalLink } from '../lib/icons';
import { COMPETITORS, getCompetitorBySlug, SPINPICK_FEATURES } from '../data/competitors';
import { ComparisonTable } from '../components/ComparisonTable';
import { FAQSection } from '../components/FAQSection';
import { CTABanner } from '../components/CTABanner';
import { useSEO } from '../hooks/useSEO';
import { CompareNavbar } from '../components/CompareNavbar';
import styles from './ComparisonPage.module.css';

/* ─── pros/cons block ───────────────────────────────────────────────── */
function ProsConsList({ items, type }) {
  const isPlus = type === 'pros';
  return (
    <ul className="list-none flex flex-col gap-10">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-10">
          <span
            className={`${styles.prosConsIcon} ${isPlus ? styles.prosConsIconPlus : styles.prosConsIconMinus} shrink-0 inline-flex-center`}
            aria-hidden="true"
          >
            {isPlus ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          </span>
          <span className={`${styles.prosConsText}`}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── section heading ───────────────────────────────────────────────── */
function SectionH2({ children }) {
  return (
    <h2 className={`${styles.sectionTitle} font-display font-extrabold text-primary mb-24`}>
      {children}
    </h2>
  );
}

/* ─── verdict card ──────────────────────────────────────────────────── */
function VerdictCard({ text }) {
  return (
    <div className={styles.verdictCard}>
      <div aria-hidden="true" className={styles.verdictGlow} />
      <div className={styles.verdictLabel}>
        <Check size={15} strokeWidth={3} aria-hidden="true" />
        Our Verdict
      </div>
      <p className={styles.verdictCopy}>
        {text}
      </p>
    </div>
  );
}

/* ─── breadcrumb ────────────────────────────────────────────────────── */
function Breadcrumb({ competitorName }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-32">
      <ol
        className="list-none flex items-center gap-8 flex-wrap text-sm text-muted"
      >
        <li>
          <Link to="/" className="text-muted no-underline">
            Home
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <Link to="/compare" className="text-muted no-underline">
            Compare
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" className="text-secondary">
          SpinPick vs {competitorName}
        </li>
      </ol>
    </nav>
  );
}

/* ─── page ──────────────────────────────────────────────────────────── */
export function ComparisonPage() {
  const { slug } = useParams();
  const competitor = getCompetitorBySlug(slug);

  useSEO({
    title: competitor?.metaTitle,
    description: competitor?.metaDescription,
    url: `https://spinpick.app/compare/${slug}`,
    ogTitle: competitor?.metaTitle,
    ogDescription: competitor?.metaDescription,
  });

  // 404 → redirect to hub
  if (!competitor) return <Navigate to="/compare" replace />;

  // Structured data: BreadcrumbList + Product
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://spinpick.app/' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://spinpick.app/compare' },
      {
        '@type': 'ListItem',
        position: 3,
        name: `SpinPick vs ${competitor.name}`,
        item: `https://spinpick.app/compare/${slug}`,
      },
    ],
  };

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SpinPick',
    applicationCategory: 'Utility',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: SPINPICK_FEATURES.tagline,
    url: 'https://spinpick.app/',
  };

  return (
    <div className={`${styles.page} bg-dark`}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />

      <CompareNavbar />

      <main id="main-content">
        <article className={`container ${styles.contentShell}`}>
          <div className={styles.contentFrame}>
          <Breadcrumb competitorName={competitor.name} />

          {/* ── Hero ── */}
          <header className="mb-48">
            <h1 className={styles.heroTitle}>
              {competitor.h1}
            </h1>

            <p className={styles.heroIntro}>
              {competitor.intro}
            </p>

            {/* tool name badges */}
            <div className="flex gap-12 flex-wrap items-center">
              <span className={styles.badge}>
                <Disc size={14} aria-hidden="true" />
                SpinPick
              </span>
              <span className={styles.vsText}>vs</span>
              <a
                href={`https://${competitor.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryBadge}
              >
                {competitor.name}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </header>

          {/* ── About competitor ── */}
          <section className="mb-48">
            <SectionH2>What is {competitor.name}?</SectionH2>
            <p className={styles.aboutText}>
              {competitor.description}
            </p>
          </section>

          {/* ── Feature table ── */}
          <section className="mb-48">
            <SectionH2>Side-by-Side Feature Comparison</SectionH2>
            <div className="bg-surface border-subtle rounded-lg overflow-hidden">
              <ComparisonTable competitor={competitor} />
            </div>
          </section>

          {/* ── Pros/Cons ── */}
          <section className="mb-48">
            <SectionH2>{competitor.name}: Honest Pros & Cons</SectionH2>
            <div className={styles.gridTwo}>
              <div className={styles.prosCard}>
                <h3 className={styles.prosHeading}>
                  ✓ Pros
                </h3>
                <ProsConsList items={competitor.pros} type="pros" />
              </div>

              <div className={styles.consCard}>
                <h3 className={styles.consHeading}>
                  ✗ Cons
                </h3>
                <ProsConsList items={competitor.cons} type="cons" />
              </div>
            </div>
          </section>

          {/* ── Verdict ── */}
          <section className="mb-48">
            <SectionH2>The Verdict</SectionH2>
            <VerdictCard text={competitor.verdict} />
          </section>

          {/* ── Other comparisons ── */}
          <section className="mb-48">
            <SectionH2>More Comparisons</SectionH2>
            <div className="flex gap-12 flex-wrap">
              {COMPETITORS.filter((c) => c.slug !== slug).map((c) => (
                <Link
                  key={c.slug}
                  to={`/compare/${c.slug}`}
                  className={`${styles.compareLink} bg-surface`}
                >
                  vs {c.name}
                </Link>
              ))}
            </div>
          </section>

          {/* ── FAQ ── */}
          <FAQSection faqs={competitor.faqs} pageSlug={slug} />

          {/* ── CTA ── */}
          <CTABanner
            heading={`Try SpinPick — the smarter ${competitor.name} alternative`}
            subheading={`Free, ad-free, keyword-boosted, no account needed. See for yourself why SpinPick is the modern upgrade.`}
          />
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-top text-muted py-32 text-sm">
        <div className="container flex justify-between items-center flex-wrap gap-16">
          <div className="flex gap-16 flex-wrap">
            <Link to="/" className="text-muted no-underline">
              Home
            </Link>
            <Link to="/compare" className="text-muted no-underline">
              Compare Hub
            </Link>
            {COMPETITORS.filter((c) => c.slug !== slug).slice(0, 3).map((c) => (
              <Link
                key={c.slug}
                to={`/compare/${c.slug}`}
                className="text-muted no-underline"
              >
                vs {c.name}
              </Link>
            ))}
          </div>
          <span>© {new Date().getFullYear()} SpinPick</span>
        </div>
      </footer>
    </div>
  );
}
