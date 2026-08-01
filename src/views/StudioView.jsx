import React, { useState, Suspense, lazy } from 'react';
import { WheelStage } from '../components/WheelStage';
import { ResultCard } from '../components/ResultCard';
import { CriteriaTuner } from '../components/CriteriaTuner';
import { QUICK_CHIPS } from '../data/presets';
import { Sparkles, RefreshCw } from '../lib/icons';

const HowItWorks = lazy(() => import('../components/HowItWorks').then(m => ({ default: m.HowItWorks })));

export function StudioView({
  promptInput,
  setPromptInput,
  currentPrompt,
  options,
  setOptions,
  targetWinnerIndex,
  setTargetWinnerIndex,
  isSpinning,
  setIsSpinning,
  isGenerating,
  generateError,
  displayVerdict,
  setDisplayVerdict,
  handleGenerateOptions,
  handleSpinComplete,
  handleEliminateAndRespin,
  addHistoryItem,
  onOpenSliceEditor,
  onOpenExporter,
}) {
  const [isCriteriaTunerOpen, setIsCriteriaTunerOpen] = useState(false);

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-36">
        <div className="hero-badge">
          <span aria-hidden="true" className="hero-badge-dot" />
          AI Decision Studio · Live Physics
        </div>

        <h1 className="font-extrabold tracking-tight mb-16 text-4xl sm:text-5xl lg:text-6xl">
          Type any <span className="accent-text">decision</span>.<br />
          Spin. Let the wheel pick.
        </h1>

        <p className="text-secondary mx-auto mb-28 text-lg max-w-2xl leading-relaxed">
          SpinPick turns any open-ended dilemma into a slick, weighted wheel of answers in one click — so you stop debating and start doing.
        </p>

        {/* Prompt Input Row */}
        <div className="glass-panel-glow flex flex-col sm:flex-row gap-8 mx-auto p-6 rounded-2xl max-w-2xl shadow-glow">
          <input
            type="text"
            placeholder="e.g. What should I cook for dinner tonight?"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateOptions()}
            disabled={isGenerating || isSpinning}
            aria-label="Enter your decision question"
            autoFocus
            className="flex-1 text-primary font-medium bg-transparent border-none outline-none text-lg px-6 py-4 placeholder:text-muted"
          />
          <button
            className="btn btn-primary rounded-xl px-24 py-14"
            onClick={() => handleGenerateOptions()}
            disabled={isGenerating || isSpinning || !promptInput.trim()}
            aria-busy={isGenerating}
          >
            {isGenerating
              ? <RefreshCw size={18} aria-hidden="true" className="spinner" />
              : <Sparkles size={18} aria-hidden="true" />}
            {isGenerating ? 'Generating…' : 'Spin it'}
          </button>
        </div>

        {/* Error banner */}
        {generateError && (
          <div role="alert" className="text-danger text-sm rounded-lg mt-12 px-6 py-4 bg-danger/10 border border-danger/30 max-w-2xl mx-auto">
            {generateError}
          </div>
        )}

        {/* Quick Chips */}
        <div
          role="group"
          aria-label="Quick example prompts"
          className="mt-20 flex flex-wrap gap-6 justify-center items-center"
        >
          <span className="mono text-xs text-muted font-bold">TRY:</span>
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

          {/* Interactive Tour Link */}
          <button
            className="chip hover:border-lime"
            onClick={() => window.dispatchEvent(new CustomEvent('spinpick:start-tour'))}
            aria-label="Start interactive tour"
            style={{ borderColor: 'rgba(216, 255, 91, 0.3)', color: 'var(--accent-lime)' }}
          >
            <Sparkles size={13} aria-hidden="true" />
            Take Tour
          </button>
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
      <div className={`wheel-verdict-grid items-start mt-24 ${displayVerdict?.winner ? 'wheel-verdict-grid-split' : 'wheel-verdict-grid-single'}`}>
        <WheelStage
          options={options}
          targetWinnerIndex={targetWinnerIndex}
          onSpinComplete={handleSpinComplete}
          isSpinning={isSpinning}
          setIsSpinning={setIsSpinning}
          currentPrompt={currentPrompt}
          onOpenSliceEditor={onOpenSliceEditor}
          onOpenCriteriaTuner={() => setIsCriteriaTunerOpen(!isCriteriaTunerOpen)}
          onOpenExporter={onOpenExporter}
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

      <Suspense fallback={<div className="text-center py-20"><RefreshCw size={24} className="spinner mx-auto" /><p className="text-muted mt-4">Loading HowItWorks...</p></div>}>
        <HowItWorks />
      </Suspense>
    </div>
  );
}