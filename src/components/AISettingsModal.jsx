import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Cpu, Sparkles, Check, AlertTriangle } from '../lib/icons';
import { useModalA11y } from '../hooks/useModalA11y';
import styles from './AISettingsModal.module.css';

export function AISettingsModal({ isOpen, onClose, aiConfig, setAiConfig, onRestartTour }) {
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [modelName, setModelName] = useState(aiConfig.modelName || 'openrouter/auto');
  const [optionCount, setOptionCount] = useState(aiConfig.optionCount || 8);
  const [savedMsg, setSavedMsg] = useState(false);

  const modalRef = useRef(null);

  useModalA11y({ isOpen, modalRef, onClose });

  // Sync state when modal opens or config updates
  useEffect(() => {
    if (isOpen) {
      setApiKey(aiConfig.apiKey || '');
      setModelName(aiConfig.modelName || 'openrouter/auto');
      setOptionCount(Number(aiConfig.optionCount) || 8);
    }
  }, [isOpen, aiConfig]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setAiConfig({
      ...aiConfig,
      apiKey: apiKey.trim(),
      modelName,
      optionCount: Number(optionCount) || 8
    });
    setSavedMsg(true);
    setTimeout(() => {
      setSavedMsg(false);
      onClose();
    }, 800);
  };

return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-settings-title"
      className={`${styles.aiSettingsModal__overlay} grid-center`}
    >
      <div ref={modalRef} className={`glass-panel p-28 w-full ${styles.aiSettingsModal__modal}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-10">
            <div className={`grid-center p-8 rounded-sm text-lime ${styles.aiSettingsModal__headerBadge}`}>
              <Cpu size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 id="ai-settings-title" className={`font-extrabold ${styles.aiSettingsModal__title}`}>AI Intelligence Settings</h3>
              <p className="text-sm text-muted">Configure OpenRouter access and your default wheel size</p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close AI settings modal">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-col gap-18">
          {/* API Key Input */}
          <div>
            <label htmlFor="openrouter-api-key" className="flex items-center gap-6 text-sm font-bold mb-6">
              <Key size={14} color="var(--accent-lime)" aria-hidden="true" />
              OpenRouter API Key (Optional)
            </label>
            <input 
              id="openrouter-api-key"
              type="password"
              placeholder="Paste your OpenRouter key (sk-or-v1...)" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-primary bg-surface rounded-sm border-medium py-12 px-14"
            />
            <p className="text-xs text-muted mt-4">
              Leave this blank to keep using the built-in generator. If you add a proxy URL in your environment, your key is forwarded there instead of being called directly from the browser.
            </p>
            <p className="text-xs text-muted mt-4">
              Need a key? Get one at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className={styles.aiSettingsModal__link}>openrouter.ai/keys</a>.
            </p>
          </div>

          {/* Model Selector */}
          <div>
            <label htmlFor="openrouter-model-select" className="block text-sm font-bold mb-6">
              OpenRouter Model
            </label>
            <select 
              id="openrouter-model-select"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full text-primary bg-surface rounded-sm border-medium py-12 px-14"
            >
              <option value="openrouter/auto">Auto (Best Available) — Recommended</option>
              <option value="openai/gpt-4o">GPT-4o (Smartest)</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Reasoning)</option>
              <option value="google/gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
              <option value="meta-llama/llama-3.1-405b">Llama 3.1 405B (Open Source)</option>
              <option value="mistralai/mistral-large">Mistral Large (Multilingual)</option>
            </select>
          </div>

          {/* Slices count slider */}
          <div>
            <div className="flex justify-between text-sm font-bold mb-6">
              <label htmlFor="slice-count-range">Default Slice Count:</label>
              <span className="mono text-lime">{optionCount} options</span>
            </div>
            <p className="text-xs text-muted mb-6">
              Start with a smaller wheel for quick decisions, or a larger one when you want more variety.
            </p>
            <input 
              id="slice-count-range"
              type="range"
              min="4"
              max="12"
              value={optionCount}
              onChange={(e) => setOptionCount(Number(e.target.value))}
              className={`${styles['aiSettingsModal__range--lime']} w-full`}
            />
          </div>

          {/* Security note */}
          <div className={styles.aiSettingsModal__securityNote}>
            <AlertTriangle size={14} color="var(--warning)" className="shrink-0" aria-hidden="true" />
            <span>Never share API keys publicly. Your key stays in browser memory for this session and is not persisted automatically.</span>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-10 mt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" aria-label="Save AI settings">
              {savedMsg ? <Check size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
              {savedMsg ? 'Saved Settings!' : 'Save Preferences'}
            </button>
          </div>

          {/* Hidden Restart Tour option */}
          <div className={styles.aiSettingsModal__restartWrapper}>
            <button
              type="button"
              onClick={() => { onRestartTour?.(); onClose(); }}
              className={`btn btn-ghost btn-sm text-muted px-8 py-4 ${styles.aiSettingsModal__restartButton}`}
              aria-label="Replay the onboarding tour"
              title="Restart the onboarding walkthrough"
            >
              Restart Tour ›
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
