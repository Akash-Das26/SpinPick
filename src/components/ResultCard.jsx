import React, { useState } from 'react';
import { Trophy, Copy, Check, RotateCcw, AlertTriangle, ArrowRight, Bookmark, Share2, Link2 } from '../lib/icons';
import { shareVerdict, buildVerdictPermalink } from '../lib/share';
import styles from './ResultCard.module.css';

export function ResultCard({
  winner,
  reasoning,
  actionSteps = [],
  isSensitive,
  prompt,
  options = [],
  onSpinAgain,
  onEliminateAndRespin,
  onSaveToHistory
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!winner) return null;

  const handleCopy = () => {
    const text = `🎯 SpinPick Verdict: "${winner.label}"\n💡 ${reasoning || ''}\n⚡ Shared via SpinPick Decision Studio`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  const handleShareLink = () => {
    if (!navigator.clipboard) return;
    const permalink = buildVerdictPermalink({
      winner,
      reasoning,
      actionSteps,
      prompt,
      options,
      timestamp: Date.now(),
    });
    navigator.clipboard.writeText(permalink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSaveToHistory) {
      onSaveToHistory(winner, reasoning);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleShare = async () => {
    const result = await shareVerdict({ winner, reasoning });
    if (result === 'shared' || result === 'copied') {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className={`glass-panel-glow p-28 mt-24 ${styles.root}`}>
      {/* Top Header Badge */}
      <div className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-8">
          <div className="inline-flex items-center rounded-full font-extrabold bg-lime-strong text-inverse px-10 py-4 text-xs gap-4">
            <Trophy size={14} aria-hidden="true" />
            THE WHEEL HAS DECIDED
          </div>
        </div>

        <span className="mono text-sm text-muted">
          100% WEIGHTED VERDICT
        </span>
      </div>

      {/* Winner Title */}
      <div className="mb-20">
        <h2 className={`font-black text-primary leading-tight ${styles.winnerTitle}`}>
          {winner.label}
        </h2>
        {winner.desc && (
          <p className={`text-secondary mt-6 ${styles.winnerDescription}`}>
            {winner.desc}
          </p>
        )}
      </div>

      {/* AI Context & Reasoning */}
      {reasoning && (
        <div className={`${styles.reasoningBox}`}>
          <h4 className="mono text-xs text-lime tracking-wider mb-4 uppercase">
            DECISION RATIONALE & INSIGHT
          </h4>
          <p className="text-primary leading-normal text-base">
            {reasoning}
          </p>
        </div>
      )}

      {/* Action Steps Breakdown */}
      {actionSteps.length > 0 && (
        <div className="mb-24">
          <h4 className="mono text-xs text-muted tracking-wider mb-10 uppercase">
            NEXT ACTION PLAN
          </h4>
          <div className="flex-col gap-8">
            {actionSteps.map((step, idx) => (
              <div key={idx} className={`${styles.actionStep}`}>
                <ArrowRight size={16} color="var(--accent-lime)" className="shrink-0 mt-2" aria-hidden="true" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensitive Disclaimer */}
      {isSensitive && (
        <div className={`${styles.warningBox}`}>
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span>For decision support & educational purposes only. Not professional financial, legal, or medical advice.</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-10">
        <button className="btn btn-primary" onClick={onSpinAgain} aria-label="Spin again">
          <RotateCcw size={16} aria-hidden="true" />
          Spin Again
        </button>

        <button className="btn btn-secondary" onClick={onEliminateAndRespin} aria-label="Eliminate winning slice and respin">
          Eliminate Winner & Respin
        </button>

        <button className="btn btn-secondary" onClick={handleCopy} aria-label="Copy verdict to clipboard">
          {copied ? <Check size={16} color="var(--success)" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Copied!' : 'Copy Verdict'}
        </button>

        <button className="btn btn-secondary" onClick={handleCopyPrompt} aria-label="Copy prompt to clipboard">
          {promptCopied ? <Check size={16} color="var(--success)" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {promptCopied ? 'Copied!' : 'Copy Prompt'}
        </button>

        <button className="btn btn-secondary" onClick={handleShareLink} aria-label="Copy shareable link to verdict">
          {linkCopied ? <Check size={16} color="var(--success)" aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
          {linkCopied ? 'Link Copied!' : 'Share Link'}
        </button>

        <button className="btn btn-secondary" onClick={handleShare} aria-label="Share verdict">
          {shared ? <Check size={16} color="var(--success)" aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
          {shared ? 'Shared!' : 'Share'}
        </button>

        <button className="btn btn-secondary" onClick={handleSave} aria-label="Save verdict log">
          <Bookmark size={16} color={saved ? "var(--accent-lime)" : "currentColor"} aria-hidden="true" />
          {saved ? 'Saved!' : 'Save Log'}
        </button>
      </div>

    </div>
  );
}
