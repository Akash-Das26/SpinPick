import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X, MousePointer, Keyboard, Zap } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    icon: <Sparkles className="w-8 h-8 text-indigo-400" />,
    title: 'Welcome to SpinPick!',
    description: 'The ultimate decision wheel studio. Spin the wheel, flip a coin, or let AI pick for you.',
    tip: 'Your choices are saved automatically.',
  },
  {
    icon: <MousePointer className="w-8 h-8 text-emerald-400" />,
    title: 'Spin the Wheel',
    description: 'Click the wheel or the SPIN button to make a random pick. The wheel uses physics-based animation for fair results.',
    tip: 'You can also press Spacebar to spin!',
  },
  {
    icon: <Zap className="w-8 h-8 text-amber-400" />,
    title: 'AI-Powered Decisions',
    description: 'Click "AI Generate" in the editor to create options from a text prompt. Describe your dilemma and let SpinPick suggest creative choices.',
    tip: 'Works offline too — no API key needed.',
  },
  {
    icon: <Keyboard className="w-8 h-8 text-purple-400" />,
    title: 'Keyboard Shortcuts',
    description: 'Press ? to see all shortcuts. Space = spin, M = mute, F = fullscreen, and more for power users.',
    tip: 'Press ? anytime to toggle this guide.',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#0c0c1a]/95 border border-white/10 p-8 shadow-[0_0_120px_rgba(99,102,241,0.15)] backdrop-blur-2xl space-y-6 animate-scale-up relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-indigo-500 w-6' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">{currentStep.icon}</div>
          <h3 className="text-xl font-bold text-white">{currentStep.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{currentStep.description}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
            💡 {currentStep.tip}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            {isLast ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Get Started</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={onClose}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Skip Tour
        </button>
      </div>
    </div>
  );
};
