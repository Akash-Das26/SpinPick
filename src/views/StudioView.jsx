import React, { useState } from 'react';
import { WheelStage } from '../components/WheelStage';
import { ResultCard } from '../components/ResultCard';
import { CriteriaTuner } from '../components/CriteriaTuner';
import { HowItWorks } from '../components/HowItWorks';
import { QUICK_CHIPS } from '../data/presets';
import { Sparkles, RefreshCw } from '../lib/icons';

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
      <div className="text-center mb-32">
        <div className="hero-badge">
          <span aria-hidden="true" className="hero-badge-dot" />
          Studio
        </div>

        <h1 className="font-black tracking-tight mb-12 text-4xl">
          Type any <span className="accent-text">decision</span>. Spin.<br />
          Keyword Boost Engine & 1v1 Tournaments.
        </h1>

        <p className="text-secondary mx-auto mb-28 text-lg">
          SpinPick combines real-time option synthesis, multi-criteria weight tuning, and bracket elimination tournaments — 100% free with zero watermarks.
          <br /><span className="text-xs text-muted">
            AI reasoning requires server-side proxy configuration.
          </span>
        </p>

        {/* Take Tour Button */}
        <button
          className="btn btn-secondary btn-sm mt-8"
          onClick={() => window.dispatchEvent(new CustomEvent('spinpick:start-tour'))}
          aria-label="Start interactive tour"
        >
          <Sparkles size={14} aria-hidden="true" />
          Take Tour
        </button>

        {/* Prompt Input */}
        <div className="glass-panel-glow flex gap-8 mx-auto rounded-xl max-w-2xl">
          <input
            type="text"
            placeholder={`e.g. ${promptInput}`}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateOptions()}
            disabled={isGenerating || isSpinning}
            aria-label="Enter your decision question"
            autoFocus
            className="flex-1 text-primary font-medium bg-transparent border-none outline-none text-lg px-6 py-4"
          />
          <button
            className="btn btn-primary rounded-lg px-8"
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
          <div role="alert" className="text-danger text-sm rounded-sm mt-8 px-6 py-4">
            {generateError}
          </div>
        )}

        {/* Quick Chips */}
        <div
          role="group"
          aria-label="Quick example prompts"
          className="mt-16 flex flex-wrap gap-4 justify-center"
        >
          <span className="mono text-xs text-muted self-center">Quick Try:</span>
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

      <HowItWorks />
    </div>
  );
}