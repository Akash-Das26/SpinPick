import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  Disc,
  Sparkles,
  Zap,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
} from '../lib/icons';
import { TABS } from '../data/tabs';
import { useModalA11y } from '../hooks/useModalA11y';
import styles from './OnboardingTour.module.css';

const INTRO_STEPS = [
  {
    icon: Zap,
    title: 'Welcome to SpinPick',
    description:
      'Make faster decisions. Type any question, get AI-generated options on a physics-driven wheel, and spin to find your answer.',
    bgColor: 'rgba(216, 255, 91, 0.12)',
    color: 'var(--accent-lime)',
  },
  {
    icon: MessageSquare,
    title: 'Ask Anything',
    description:
      'Type your dilemma — "What should I cook?", "Where to travel?", or any open-ended question. AI generates tailored options just for you.',
    bgColor: 'rgba(216, 255, 91, 0.12)',
    color: 'var(--accent-lime)',
  },
  {
    icon: Disc,
    title: 'Spin, Win, Execute',
    description:
      'Hit SPIN — watch the wheel decelerate with realistic tick sounds, land on a winner, and get 3 immediate action steps to execute your decision.',
    bgColor: 'rgba(181, 108, 255, 0.12)',
    color: 'var(--accent-purple)',
  },
];

const PRO_TIPS_STEP = {
  icon: Sparkles,
  title: 'Pro Tips',
  description:
    'Click "Surprise Me" for a random prompt. Configure a secure OpenRouter proxy in deployment for AI-powered reasoning. Compare SpinPick to alternatives anytime.',
  bgColor: 'rgba(216, 255, 91, 0.12)',
  color: 'var(--accent-lime)',
};

const TAB_STEPS = TABS.map((tab) => ({
  icon: tab.icon,
  title: tab.label,
  description: tab.tour,
  bgColor: 'rgba(216, 255, 91, 0.12)',
  color: 'var(--accent-lime)',
}));

const STEPS = [...INTRO_STEPS, ...TAB_STEPS, PRO_TIPS_STEP];

export function OnboardingTour({ isOpen, onDismiss }) {
  const [step, setStep] = useState(0);
  const cardRef = useRef(null);
  const isLast = step === STEPS.length - 1;

  useModalA11y({ isOpen, modalRef: cardRef, onClose: onDismiss, focusDelay: 80, watch: [step] });

  if (!isOpen) return null;

  const current = STEPS[step];
  const IconComp = current.icon;

  const handleNext = () => {
    if (isLast) {
      onDismiss();
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SpinPick onboarding tour"
      className={`${styles.overlay} fixed grid-center p-20 backdrop-blur-sm`}
    >
      <div onClick={onDismiss} className={styles.overlayBackdrop} aria-hidden="true" />

      <div ref={cardRef} className={`glass-panel relative w-full z-1 ${styles.card}`} role="document">
        <button
          className={`btn btn-ghost btn-sm absolute p-6 text-muted ${styles.closeButton}`}
          onClick={onDismiss}
          aria-label="Skip tour"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className={`flex gap-6 mb-20 ${styles.progressRow}`} aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`${styles.progressDot} ${i <= step ? styles.progressDotActive : ''}`}
            />
          ))}
        </div>

        <div className="text-center">
          <div
            className={`${styles.stepIcon} grid-center mx-auto mb-16`}
            style={{
              '--step-bg': current.bgColor,
              '--step-color': current.color,
            }}
          >
            <IconComp size={30} aria-hidden="true" />
          </div>

          <span className="mono text-xs text-muted tracking-wider font-bold uppercase">
            Step {step + 1} of {STEPS.length}
          </span>

          <h2 className={`font-black mt-6 mb-10 text-xl ${styles.title}`}>{current.title}</h2>
          <p className={`text-secondary mx-auto mb-28 text-base ${styles.description}`}>{current.description}</p>
        </div>

        <div className={`flex justify-between items-center gap-12 ${styles.footerRow}`}>
          {step > 0 ? (
            <button className="btn btn-ghost btn-sm flex items-center gap-6" onClick={handlePrev} aria-label="Previous step">
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-6" aria-hidden="true">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`${styles.dotButton} ${i === step ? styles.dotButtonActive : ''}`}
              />
            ))}
          </div>

          <button
            className={`btn ${isLast ? 'btn-primary' : 'btn-secondary'} btn-sm flex items-center gap-6`}
            onClick={handleNext}
            aria-label={isLast ? 'Finish tour' : 'Next step'}
          >
            {isLast ? (
              <>
                <Check size={15} aria-hidden="true" />
                Got It!
              </>
            ) : (
              <>
                Next
                <ArrowRight size={15} aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        {step === 0 && (
          <div className="text-center mt-14">
            <button className={`btn btn-ghost text-muted ${styles.skipButton}`} onClick={onDismiss} aria-label="Skip the tour">
              Skip tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingTour;
