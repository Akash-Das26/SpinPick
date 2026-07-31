import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Disc, Volume2, VolumeX, Sliders, Sparkles, Menu, X, BarChart2, Moon, Sun 
} from '../lib/icons';
import { TABS } from '../data/tabs';
import { useSound } from '../hooks/useSound';
import { useModalA11y } from '../hooks/useModalA11y';
import styles from './Navbar.module.css';

export function Navbar({ activeTab, setActiveTab, openSettings, onSurprise, theme, toggleTheme }) {
  const { soundEnabled, toggleSound } = useSound();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useModalA11y({
    isOpen: isMobileMenuOpen,
    modalRef: mobileMenuRef,
    onClose: () => setIsMobileMenuOpen(false),
    focusableSelector: 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  });

  const tabs = TABS;

return (
    <nav
      className={`${styles.nav} ${isScrolled ? styles.navScrolled : styles.navTransparent}`}
      aria-label="Main navigation"
    >
      <div className={`${styles.navInner} flex items-center justify-between gap-16 flex-wrap`}>
        {/* Brand Logo — acts as link to Studio */}
        <div
          role="link"
          tabIndex={0}
          onClick={() => { setActiveTab('studio'); setIsMobileMenuOpen(false); }}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('studio')}
          aria-label="SpinPick — go to Studio"
          className="flex items-center gap-10 pointer shrink-0"
        >
          <div
            className={`grid-center ${styles.navBrandIcon}`}
            aria-hidden="true"
          >
            <Disc size={20} color="#07070d" className={styles.navLogoSpinIcon} />
          </div>
          <div className={styles.navBrandText}>
            <span className={`font-display font-extrabold text-lg text-primary ${styles.navBrandName}`}>
              Spin<span className="text-lime">Pick</span>
            </span>
            <span className={`mono block text-muted tracking-wider ${styles.navBrandTagline}`}>
              DECISION STUDIO
            </span>
          </div>
        </div>

        {/* Tab Navigation - Desktop */}
        <div
          role="tablist"
          aria-label="App sections"
          className={styles.navTabsDesktop}
        >
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-ghost'} rounded-full gap-6 no-wrap`}
              onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="tab-label">{label}</span>
            </button>
          ))}
        </div>

        {/* Right-side Action Buttons */}
        <div className="flex items-center gap-8 shrink-0">
          <button
            className={`btn btn-secondary btn-sm px-10 py-8 ${styles.navThemeToggle}`}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>

          <button
            className="btn btn-secondary btn-sm px-10 py-8"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Sound effects on — click to mute' : 'Sound effects off — click to enable'}
            title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
          >
            {soundEnabled
              ? <Volume2 size={16} color="var(--accent-lime)" aria-hidden="true" />
              : <VolumeX size={16} color="var(--text-muted)" aria-hidden="true" />}
          </button>

          <button
            className="btn btn-secondary btn-sm px-10 py-8"
            onClick={openSettings}
            aria-label="Open AI model and API key settings"
            title="AI Model & Key Settings"
          >
            <Sliders size={16} aria-hidden="true" />
          </button>

          <Link
            to="/compare"
            className={`${styles.navCompareLink} inline-flex items-center gap-6 rounded-full text-secondary text-sm font-bold transition-fast no-underline`}
            aria-label="See how SpinPick compares to alternatives"
          >
            <BarChart2 size={13} aria-hidden="true" />
            <span className="surprise-text">Compare</span>
          </Link>

          <button
            className="btn btn-primary btn-sm rounded-full px-12 py-8"
            onClick={onSurprise}
            aria-label="Load a random surprise decision into the studio"
          >
            <Sparkles size={15} aria-hidden="true" />
            <span className="surprise-text">Surprise Me</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            className={`btn btn-ghost btn-sm ${styles.navMobileToggle} px-10 py-8`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile tabs drawer */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className={styles.navDrawer}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              role="menuitem"
              className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-secondary'} ${styles.navMenuButton}`}
              onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
            >
              <Icon size={18} aria-hidden="true" className={`text-center ${styles.navIcon24}`} />
              {label}
            </button>
          ))}
          <Link
            to="/compare"
            onClick={() => setIsMobileMenuOpen(false)}
            className={styles.navCompareLinkMobile}
          >
            <BarChart2 size={18} aria-hidden="true" className={styles.navIcon24} />
            Compare Alternatives
          </Link>
        </div>
      )}
    </nav>
  );
}
