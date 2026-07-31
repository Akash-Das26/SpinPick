import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { WheelStage } from './components/WheelStage';
import { ResultCard } from './components/ResultCard';
import { SliceEditor } from './components/SliceEditor';
import { AISettingsModal } from './components/AISettingsModal';
import { CriteriaTuner } from './components/CriteriaTuner';
import { ExporterModal } from './components/ExporterModal';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';
import { OnboardingTour } from './components/OnboardingTour';
import styles from './App.module.css';

import { aiService } from './services/aiService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SoundProvider } from './hooks/useSound.jsx';
import { QUICK_CHIPS, SURPRISE_PROMPTS } from './data/presets';
import { Sparkles, RefreshCw } from './lib/icons';
import { applyTheme, resolveTheme } from './lib/theme';

// Code-split heavy tab views to keep initial JS bundle ultra-fast
const CustomBuilder = lazy(() => import('./components/CustomBuilder').then(m => ({ default: m.CustomBuilder })));
const DiscoverGallery = lazy(() => import('./components/DiscoverGallery').then(m => ({ default: m.DiscoverGallery })));
const DecisionHistory = lazy(() => import('./components/DecisionHistory').then(m => ({ default: m.DecisionHistory })));
const TournamentMode = lazy(() => import('./components/TournamentMode').then(m => ({ default: m.TournamentMode })));

const HISTORY_LIMIT = 100;

export function App() {
  return (
    <SoundProvider>
      <AppInner />
    </SoundProvider>
  );
}

function AppInner() {
  const [activeTab, setActiveTab] = useState('studio');
  const [isSliceEditorOpen, setIsSliceEditorOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isCriteriaTunerOpen, setIsCriteriaTunerOpen] = useState(false);
  const [isExporterOpen, setIsExporterOpen] = useState(false);

  const [promptInput, setPromptInput] = useState('What should I cook for dinner tonight?');
  const [currentPrompt, setCurrentPrompt] = useState('What should I cook for dinner tonight?');
  const [options, setOptions] = useState([]);
  const [targetWinnerIndex, setTargetWinnerIndex] = useState(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const isGeneratingRef = useRef(false);
  const pendingVerdictRef = useRef(null);
  const [displayVerdict, setDisplayVerdict] = useState(null);

  const [showTour, setShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useLocalStorage('spinpick_tour_seen', false);
  const [history, setHistory] = useLocalStorage('spinpick_history', []);
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem('spinpick_theme');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      return resolveTheme(savedTheme, systemTheme);
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  // Show onboarding tour after options load on first visit
  useEffect(() => {
    if (options.length > 0 && !hasSeenTour && !showTour) {
      // Small delay to let the UI settle
      // Delay to let the user see the wheel before the tour overlay appears
      const timer = setTimeout(() => setShowTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [options, hasSeenTour, showTour]);

  const handleDismissTour = useCallback(() => {
    setShowTour(false);
    setHasSeenTour(true);
  }, [setHasSeenTour]);

  const handleRestartTour = useCallback(() => {
    // Reset tour state so it shows again
    setHasSeenTour(false);
    setShowTour(true);
  }, [setHasSeenTour]);

  const addHistoryItem = useCallback((item) => {
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT));
  }, [setHistory]);

  const isOpenRouterProxyEnabled = Boolean(import.meta.env.VITE_OPENROUTER_PROXY_URL);

  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem('spinpick_aiconfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          apiKey: '',
          modelName: parsed.modelName || 'openrouter/auto',
          optionCount: Number(parsed.optionCount) || 8
        };
      }
      return { apiKey: '', modelName: 'openrouter/auto', optionCount: 8 };
    } catch {
      return { apiKey: '', modelName: 'openrouter/auto', optionCount: 8 };
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('spinpick_aiconfig', JSON.stringify({
        modelName: aiConfig.modelName,
        optionCount: aiConfig.optionCount
      }));
    } catch (e) {
      console.warn('Failed to write AI config to sessionStorage:', e);
    }
  }, [aiConfig.modelName, aiConfig.optionCount]);


  const handleGenerateOptions = useCallback(async (queryText) => {
    const q = (queryText || promptInput).trim();
    if (!q || isGeneratingRef.current || isSpinning) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setGenerateError(null);
    setDisplayVerdict(null);
    setCurrentPrompt(q);
    pendingVerdictRef.current = null;

    try {
      const res = await aiService.generateWheelOptions(q, aiConfig);
      setOptions(res.options);
      setTargetWinnerIndex(res.winnerIndex);

      pendingVerdictRef.current = {
        winnerIndex: res.winnerIndex,
        reasoning: res.reasoning,
        actionSteps: res.actionSteps,
        isSensitive: res.isSensitive,
      };
    } catch (err) {
      console.error('Failed to generate options:', err);
      setGenerateError('Could not generate options. Please try again.');
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [promptInput, isSpinning, aiConfig]);

  const handleGenerateOptionsRef = useRef(handleGenerateOptions);
  useEffect(() => {
    handleGenerateOptionsRef.current = handleGenerateOptions;
  }, [handleGenerateOptions]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      // Use setTimeout to ensure initial render completes and refs are ready
      setTimeout(() => {
        // Use ref to avoid stale closure
        handleGenerateOptionsRef.current('What should I cook for dinner tonight?');
      }, 0);
    }
  }, []); // Empty deps - only run once on mount

  const handleSpinComplete = (winningSlice) => {
    const ctx = pendingVerdictRef.current;
    const verdict = {
      winner: winningSlice,
      reasoning: ctx?.reasoning ?? `The wheel landed on "${winningSlice.label}".`,
      actionSteps: ctx?.actionSteps ?? [
        `Commit to "${winningSlice.label}" immediately.`,
        'Gather whatever you need to start.',
        'Enjoy your decision without second-guessing!',
      ],
      isSensitive: ctx?.isSensitive ?? false,
    };

    setDisplayVerdict(verdict);

    addHistoryItem({
      id: `spin-${Date.now()}`,
      timestamp: Date.now(),
      prompt: currentPrompt,
      winner: winningSlice,
      options: [...options], // Store full options array for exact restore
      winnerIndex: options.findIndex(o => o.id === winningSlice.id),
      reasoning: verdict.reasoning,
      actionSteps: verdict.actionSteps,
      isSensitive: verdict.isSensitive,
    });
  };

  const handleEliminateAndRespin = () => {
    if (!displayVerdict?.winner || options.length <= 2) {
      alert('Need at least 2 options remaining to eliminate!');
      return;
    }
    const remaining = options.filter((o) => o.id !== displayVerdict.winner.id);
    setOptions(remaining);
    setDisplayVerdict(null);
    pendingVerdictRef.current = null;
    setTargetWinnerIndex(Math.floor(Math.random() * remaining.length));
  };

const handleSurprise = () => {
    const picked = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    setPromptInput(picked);
    handleGenerateOptions(picked);
    if (activeTab !== 'studio') {
      setActiveTab('studio');
    }
  };

  const handleSelectPreset = (preset) => {
    setPromptInput(preset.title);
    setCurrentPrompt(preset.title);
    setOptions(preset.options);
    setDisplayVerdict(null);
    pendingVerdictRef.current = null;
    setTargetWinnerIndex(0);
    setActiveTab('studio');
  };

  const handleLoadCustomWheel = (wheelData) => {
    setPromptInput(wheelData.title);
    setCurrentPrompt(wheelData.title);
    setOptions(wheelData.options);
    setDisplayVerdict(null);
    pendingVerdictRef.current = null;
    setTargetWinnerIndex(0);
    setActiveTab('studio');
  };

  const handleLoadPastSpin = (historyItem) => {
    if (historyItem.options && historyItem.options.length > 0) {
      // Restore exact past wheel state
      setPromptInput(historyItem.prompt || '');
      setCurrentPrompt(historyItem.prompt || '');
      setOptions(historyItem.options);
      setDisplayVerdict(null);
      pendingVerdictRef.current = null;
      setTargetWinnerIndex(historyItem.winnerIndex >= 0 ? historyItem.winnerIndex : 0);
      
      // If there's a saved verdict, restore it too
      if (historyItem.winner && historyItem.reasoning) {
        const restoredVerdict = {
          winner: historyItem.winner,
          reasoning: historyItem.reasoning,
          actionSteps: historyItem.actionSteps || [],
          isSensitive: historyItem.isSensitive || false,
        };
        setDisplayVerdict(restoredVerdict);
      }
    } else if (historyItem.prompt) {
      // Fallback: regenerate from prompt (old history format)
      setPromptInput(historyItem.prompt);
      handleGenerateOptions(historyItem.prompt);
    }
    setActiveTab('studio');
  };

  return (
    <div className={`${styles.wrapper} flex-col`}>
      <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openSettings={() => setIsAISettingsOpen(true)}
          onSurprise={handleSurprise}
          theme={theme}
          toggleTheme={toggleTheme}
        />

      <main id="main-content" className={`container flex-1 ${styles.mainContainer}`}>

        {/* ── STUDIO TAB ─────────────────────────────────────────── */}
        {activeTab === 'studio' && (
          <div>
            {/* Hero */}
            <div className="text-center mb-32">
              <div className={`${styles.heroBadge}`}>
                <span aria-hidden="true" className={styles.heroBadgeDot} />
                Studio
              </div>

              <h1 className={`font-black tracking-tight mb-12 ${styles.heroTitle}`}>
                Type any <span className="accent-text">decision</span>. Spin.<br />
                Multi-criteria AI & 1v1 Tournaments.
              </h1>

              <p className={`text-secondary mx-auto mb-28 ${styles.heroCopy}`}>
                SpinPick combines real-time AI option synthesis, multi-criteria weight tuning, and bracket elimination tournaments — 100% free with zero watermarks.
              </p>

              {/* Prompt Input */}
              <div
                className={`glass-panel-glow flex gap-8 mx-auto rounded-xl ${styles.promptWrapper}`}
              >
                <input
                  type="text"
                  placeholder="e.g. What should I cook for dinner tonight?"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateOptions()}
                  disabled={isGenerating || isSpinning}
                  aria-label="Enter your decision question"
                  autoFocus
                  className={`flex-1 text-primary font-medium ${styles.promptInput}`}
                />
                <button
                  className="btn btn-primary rounded-lg"
                  onClick={() => handleGenerateOptions()}
                  disabled={isGenerating || isSpinning || !promptInput.trim()}
                  aria-busy={isGenerating}
                >
                  {isGenerating
                    ? <RefreshCw size={18} aria-hidden="true" className="spinner" />
                    : <Sparkles size={18} aria-hidden="true" />}
                  {isGenerating ? 'Generating…' : 'Generate Wheel'}
                </button>
              </div>

              {/* Error banner */}
              {generateError && (
                <div role="alert" className={`text-danger text-sm rounded-sm ${styles.errorBanner}`}>
                  {generateError}
                </div>
              )}

              {/* Quick Chips */}
              <div
                role="group"
                aria-label="Quick example prompts"
                className={styles.quickChipsContainer}
              >
                <span className={`${styles.quickChipsLabel} mono text-xs text-muted self-center`} aria-hidden="true">
                  Quick Try:
                </span>
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className="chip"
                    onClick={() => { setPromptInput(chip); handleGenerateOptions(chip); }}
                    disabled={isGenerating || isSpinning}
                    aria-label={`Try prompt: ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Multi-Criteria Tuner Drawer */}
            {isCriteriaTunerOpen && (
              <CriteriaTuner 
                options={options} 
                setOptions={setOptions} 
                onClose={() => setIsCriteriaTunerOpen(false)} 
              />
            )}

            {/* Wheel + Verdict Grid */}
            <div className={`wheel-verdict-grid items-start mt-24 ${styles.wheelVerdictGrid} ${displayVerdict?.winner ? styles.wheelVerdictGridSplit : styles.wheelVerdictGridSingle}`}>
              <WheelStage
                options={options}
                targetWinnerIndex={targetWinnerIndex}
                onSpinComplete={handleSpinComplete}
                isSpinning={isSpinning}
                setIsSpinning={setIsSpinning}
                currentPrompt={currentPrompt}
                onOpenSliceEditor={() => setIsSliceEditorOpen(true)}
                onOpenCriteriaTuner={() => setIsCriteriaTunerOpen(!isCriteriaTunerOpen)}
                onOpenExporter={() => setIsExporterOpen(true)}
              />

              {displayVerdict?.winner && (
                <ResultCard
                  winner={displayVerdict.winner}
                  reasoning={displayVerdict.reasoning}
                  actionSteps={displayVerdict.actionSteps}
                  isSensitive={displayVerdict.isSensitive}
                  prompt={currentPrompt}
                  onSpinAgain={() => {
                    setDisplayVerdict(null);
                    setTargetWinnerIndex(Math.floor(Math.random() * options.length));
                  }}
                  onEliminateAndRespin={handleEliminateAndRespin}
                  onSaveToHistory={(w, r) => {
                    addHistoryItem({
                      id: `saved-${Date.now()}`,
                      timestamp: Date.now(),
                      prompt: currentPrompt,
                      winner: w,
                      reasoning: r,
                    });
                  }}
                />
              )}
            </div>

            <HowItWorks />
          </div>
        )}

        {/* ── SECONDARY TABS WITH LAZY LOADING ───────────────────── */}
        <Suspense fallback={
          <div className={styles.suspenseFallback}>
            <RefreshCw size={24} className="spinner" />
            <p className={styles.suspenseText}>Loading studio module...</p>
          </div>
        }>
          {activeTab === 'tournament' && (
            <TournamentMode 
              options={options} 
              onExitTournament={() => setActiveTab('studio')} 
            />
          )}

          {activeTab === 'builder' && (
            <CustomBuilder onLoadCustomWheel={handleLoadCustomWheel} />
          )}

          {activeTab === 'discover' && (
            <DiscoverGallery onSelectPreset={handleSelectPreset} />
          )}

          {activeTab === 'history' && (
            <DecisionHistory
              history={history}
              onClearHistory={() => setHistory([])}
              onLoadPastSpin={handleLoadPastSpin}
            />
          )}
        </Suspense>
      </main>

      <Footer hasOpenRouterProxy={isOpenRouterProxyEnabled} />

      <SliceEditor
        isOpen={isSliceEditorOpen}
        onClose={() => setIsSliceEditorOpen(false)}
        options={options}
        setOptions={setOptions}
      />

      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        aiConfig={aiConfig}
        setAiConfig={setAiConfig}
        onRestartTour={handleRestartTour}
      />

      {/* Feature C: Exporter & Data Hub Modal */}
      <ExporterModal 
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
        currentPrompt={currentPrompt}
        options={options}
        setOptions={setOptions}
        displayVerdict={displayVerdict}
      />

      <OnboardingTour
        isOpen={showTour}
        onDismiss={handleDismissTour}
      />

    </div>
  );
}
