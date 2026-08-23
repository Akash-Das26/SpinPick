import React from 'react';
import { Sparkles, RotateCw, Trophy, Share2 } from 'lucide-react';

const STEPS = [
  {
    icon: <Sparkles className="w-6 h-6 text-indigo-400" />,
    title: 'Add Your Choices',
    description:
      'Type options one-by-one, paste a list in bulk, or use AI to generate creative ideas from a prompt.',
  },
  {
    icon: <RotateCw className="w-6 h-6 text-emerald-400" />,
    title: 'Spin the Wheel',
    description:
      'Click the wheel or press Spacebar. Physics-based animation ensures a fair, random result every time.',
  },
  {
    icon: <Trophy className="w-6 h-6 text-amber-400" />,
    title: 'Get Your Verdict',
    description:
      'The winner is celebrated with confetti. In Battle Royale mode, losers are eliminated until one champion remains.',
  },
  {
    icon: <Share2 className="w-6 h-6 text-purple-400" />,
    title: 'Share & Save',
    description:
      'Export as PNG/CSV/JSON, share via social media, or save wheels as templates for future decisions.',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="w-full max-w-4xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <p className="text-indigo-400 text-xs font-semibold tracking-[0.25em] uppercase mb-2">
          How It Works
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Decisions Made <span className="text-indigo-400">Effortless</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Step {idx + 1}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
