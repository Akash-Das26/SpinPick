import React, { useState, useRef } from 'react';
import { SlidersHorizontal, Sparkles, DollarSign, Clock, Zap, Flame, RotateCcw, Check, X, Info } from '../lib/icons';
import { useModalA11y } from '../hooks/useModalA11y';
import { calculateSmartWeight } from '../lib/criteriaWeights';
import styles from './CriteriaTuner.module.css';

export function CriteriaTuner({ options, setOptions, onClose }) {
  const modalRef = useRef(null);

  useModalA11y({ isOpen: true, modalRef, onClose });

  const [criteria, setCriteria] = useState({
    budget: 3,
    time: 3,
    effort: 2,
    excitement: 4
  });

  const [appliedMsg, setAppliedMsg] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleApplyCriteria = () => {
    const reweighted = options.map((opt) => ({
      ...opt,
      weight: calculateSmartWeight(opt, criteria)
    }));

    setOptions(reweighted);
    setAppliedMsg(true);
    setTimeout(() => {
      setAppliedMsg(false);
      if (onClose) onClose();
    }, 600);
  };

  const handleReset = () => {
    setCriteria({ budget: 3, time: 3, effort: 3, excitement: 3 });
    setOptions(options.map(o => ({ ...o, weight: 1 })));
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="criteria-tuner-title"
      className={`glass-panel p-24 mt-20 ${styles.criteriaTuner__panel}`}
    >
      <div className={`${styles.criteriaTuner__header} flex justify-between items-center mb-18`}>
        <div className="flex items-center gap-10">
          <div className="grid-center text-lime p-8 rounded-sm bg-lime-glow">
            <SlidersHorizontal size={20} aria-hidden="true" />
          </div>
        </div>
        <div>
          <h3 className={`font-extrabold ${styles.criteriaTuner__title}`}>Keyword Boost Weight Tuner</h3>
          <p className="text-sm text-muted">
            Adjust decision factors — SpinPick boosts slice weights based on keyword matching in option titles.
          </p>
        </div>
      </div>

      {/* Info tooltip */}
      <div className="relative inline-block ml-4">
        <button
          type="button"
          className="text-muted hover:text-lime transition-colors"
          aria-label="How keyword boosting works"
          aria-expanded={showTooltip}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info size={16} aria-hidden="true" />
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
              Weights adjusted by keyword matching. For precise control, edit weights directly in Slice Editor.
            </div>
          )}
        </button>
      </div>

      <button className="btn btn-ghost btn-sm" onClick={handleReset} title="Reset to equal 1x weights">
        <RotateCcw size={14} aria-hidden="true" />
        Equal Weights
      </button>

      <button
        className="btn btn-ghost btn-sm mb-18 self-end"
        onClick={onClose}
        aria-label="Close criteria tuner"
      >
        <X size={16} aria-hidden="true" />
        Close
      </button>

      <div className={`${styles.criteriaTuner__grid}`}>
        {/* Budget / Cost Preference */}
        <div className={`${styles.criteriaTuner__card}`}>
          <div className="flex justify-between text-sm font-bold mb-8">
            <span className="flex items-center gap-6">
              <DollarSign size={15} color="var(--accent-lime)" aria-hidden="true" />
              Budget Consciousness
            </span>
            <span className="mono text-lime">Lvl {criteria.budget}</span>
          </div>
          <input 
            type="range" min="1" max="5" 
            value={criteria.budget} 
            onChange={(e) => setCriteria({ ...criteria, budget: Number(e.target.value) })}
            className={`w-full ${styles['criteriaTuner__range--lime']}`}
            aria-label="Budget Consciousness Level"
          />
          <span className="block mt-4 text-xs text-muted">
            {criteria.budget >= 4 ? 'Boosts affordable & high-value choices' : 'Neutral budget priority'}
          </span>
        </div>

        {/* Time / Speed Preference */}
        <div className={`${styles.criteriaTuner__card}`}>
          <div className="flex justify-between font-bold mb-8 text-sm">
            <span className="flex items-center gap-6">
              <Clock size={15} color="var(--accent-cyan)" aria-hidden="true" />
              Time Urgency
            </span>
            <span className="mono text-accent-cyan">Lvl {criteria.time}</span>
          </div>
          <input 
            type="range" min="1" max="5" 
            value={criteria.time} 
            onChange={(e) => setCriteria({ ...criteria, time: Number(e.target.value) })}
            className={`w-full ${styles['criteriaTuner__range--cyan']}`}
            aria-label="Time Urgency Level"
          />
          <span className="block mt-4 text-xs text-muted">
            {criteria.time >= 4 ? 'Favors fast, quick execution' : 'Standard preparation speed'}
          </span>
        </div>

        {/* Effort / Simplicity Preference */}
        <div className={`${styles.criteriaTuner__card}`}>
          <div className="flex justify-between font-bold mb-8 text-sm">
            <span className="flex items-center gap-6">
              <Zap size={15} color="var(--accent-purple)" aria-hidden="true" />
              Low Effort Preference
            </span>
            <span className="mono text-accent-purple">Lvl {criteria.effort}</span>
          </div>
          <input 
            type="range" min="1" max="5" 
            value={criteria.effort} 
            onChange={(e) => setCriteria({ ...criteria, effort: Number(e.target.value) })}
            className={`w-full ${styles['criteriaTuner__range--purple']}`}
            aria-label="Low Effort Preference Level"
          />
          <span className="block mt-4 text-xs text-muted">
            {criteria.effort >= 4 ? 'Prioritizes minimal friction choices' : 'Willing to exert effort'}
          </span>
        </div>

        {/* Excitement / Payoff Preference */}
        <div className={`${styles.criteriaTuner__card}`}>
          <div className="flex justify-between font-bold mb-8 text-sm">
            <span className="flex items-center gap-6">
              <Flame size={15} color="#ff4d6d" aria-hidden="true" />
              Excitement / Novelty
            </span>
            <span className="mono text-danger">Lvl {criteria.excitement}</span>
          </div>
          <input 
            type="range" min="1" max="5" 
            value={criteria.excitement} 
            onChange={(e) => setCriteria({ ...criteria, excitement: Number(e.target.value) })}
            className={`w-full ${styles['criteriaTuner__range--danger']}`}
            aria-label="Excitement and Novelty Level"
          />
          <span className="block mt-4 text-xs text-muted">
            {criteria.excitement >= 4 ? 'Drives up bold & high-reward picks' : 'Standard novelty preference'}
          </span>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex justify-end gap-10">
        <button className="btn btn-primary rounded-lg" onClick={handleApplyCriteria}>
          {appliedMsg ? <Check size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {appliedMsg ? 'Smart Weights Applied!' : 'Apply Criteria Weights to Wheel'}
        </button>
      </div>
    </div>
  );
}