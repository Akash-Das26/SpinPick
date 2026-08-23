import React, { useState } from 'react';
import { WheelItem } from '../types';
import {
  Wand2,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  X,
  Sliders,
  Lightbulb,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface SmartWeightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WheelItem[];
  onApplyWeights: (weights: { id: string; weight: number; reason?: string }[]) => void;
}

interface WeightResult {
  id: string;
  weight: number;
  reason?: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const PRESET_PROMPTS = [
  'Make high-intensity tasks more likely to be picked',
  'Weight healthier and nutritious options higher',
  'Make budget-friendly / cheaper choices highest probability',
  'Prioritize quick and easy tasks (under 15 mins)',
  'Make jackpot/legendary rewards rare (low probability 1-2x)',
  'Favor creative and fun choices over routine chores',
];

// ─── Offline Smart Weighting Engine ─────────────────────────────────────
function computeOfflineWeights(
  items: WheelItem[],
  prompt: string
): { weights: WeightResult[]; summary: string } {
  const q = prompt.toLowerCase();
  const weights: WeightResult[] = [];

  const categories = [
    { keywords: ['intense', 'intensity', 'hard', 'difficult', 'challenge', 'power', 'strength', 'workout', 'gym', 'vigorous'], name: 'high-intensity' },
    { keywords: ['healthy', 'health', 'nutrition', 'nutritious', 'organic', 'fresh', 'clean', 'vitamin', 'protein'], name: 'healthy' },
    { keywords: ['budget', 'cheap', 'affordable', 'save', 'money', 'frugal', 'economy', 'low-cost', 'free'], name: 'budget' },
    { keywords: ['quick', 'fast', 'easy', 'simple', 'speed', 'rapid', 'immediate', '15 min', 'under 15', 'no-effort'], name: 'quick' },
    { keywords: ['rare', 'legendary', 'jackpot', 'unlikely', 'low probability', 'uncommon', 'epic'], name: 'rare' },
    { keywords: ['creative', 'fun', 'exciting', 'adventure', 'wild', 'bold', 'novelty', 'innovative', 'artistic'], name: 'creative' },
    { keywords: ['relax', 'calm', 'peace', 'chill', 'easygoing', 'comfort', 'cozy', 'soothe', 'meditat'], name: 'relaxation' },
    { keywords: ['social', 'group', 'team', 'together', 'friend', 'family', 'party', 'community'], name: 'social' },
  ];

  let activeCategory = categories.find((c) => c.keywords.some((k) => q.includes(k)));

  // Score each item against the active category
  for (const item of items) {
    let weight = 1;
    let reason = '';

    if (activeCategory) {
      const text = (item.text + ' ' + (item.note || '')).toLowerCase();
      const matchCount = activeCategory.keywords.filter((kw) => text.includes(kw)).length;
      const promptMatchCount = activeCategory.keywords.filter((kw) => q.includes(kw)).length;

      if (matchCount > 0) {
        weight = Math.min(10, 3 + matchCount * 2);
        reason = `Strong match for "${activeCategory.name}" criteria`;
      } else if (activeCategory.name === 'rare') {
        weight = Math.max(1, Math.floor(Math.random() * 2) + 1);
        reason = 'Making this choice rarer';
      } else {
        weight = Math.max(1, Math.floor(Math.random() * 3) + 1);
        reason = 'No direct keyword match — balanced weight';
      }
    } else {
      // No category matched — give varied weights for interesting distribution
      weight = Math.max(1, Math.min(5, Math.floor(Math.random() * 4) + 1));
      reason = 'General weighting — no specific criteria detected';
    }

    weights.push({ id: item.id, weight, reason });
  }

  const total = weights.reduce((s, w) => s + w.weight, 0);
  const avg = (total / weights.length).toFixed(1);
  const catName = activeCategory?.name || 'general';
  const summary = `Analyzed ${items.length} items against "${catName}" criteria. Average weight: ${avg}x. Items matching keywords received boosted weights (up to 10x).`;

  return { weights, summary };
}

// ─── Gemini API Smart Weighting ─────────────────────────────────────────
async function computeGeminiWeights(
  items: WheelItem[],
  prompt: string
): Promise<{ weights: WeightResult[]; summary: string }> {
  // Dynamic import so it only loads when Gemini is actually used
  const { GoogleGenAI } = await import('@google/genai');
  const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const itemList = items
    .map((item) => `- [id:${item.id}] "${item.text}" (current weight: ${item.weight})`)
    .join('\n');

  const systemInstruction = `You are a smart probability weighting assistant for a decision wheel.
Given a list of wheel options and a user's weighting instruction, assign a weight (1-10) to each item.
Higher weights mean the item is MORE likely to be picked. You MUST return ONLY valid JSON, no markdown.

Return format:
{
  "weights": [
    { "id": "item-id", "weight": 5, "reason": "Short explanation" }
  ],
  "summary": "1-2 sentence explanation of your weighting strategy"
}`;

  const response = await genai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: `User instruction: "${prompt}"\n\nItems:\n${itemList}`,
    config: {
      systemInstruction,
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  });

  const text = response.text || '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.weights) || parsed.weights.length === 0) {
    throw new Error('Gemini returned invalid weight format');
  }

  return {
    weights: parsed.weights.map((w: any) => ({
      id: w.id,
      weight: Math.max(1, Math.min(10, Number(w.weight) || 1)),
      reason: w.reason || '',
    })),
    summary: parsed.summary || `Gemini weighted ${parsed.weights.length} items based on "${prompt}".`,
  };
}

// ─── Component ──────────────────────────────────────────────────────────

export const SmartWeightingModal: React.FC<SmartWeightingModalProps> = ({
  isOpen,
  onClose,
  items,
  onApplyWeights,
}) => {
  const [prompt, setPrompt] = useState('Make high-intensity tasks more likely to be picked');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [previewWeights, setPreviewWeights] = useState<WeightResult[] | null>(null);
  const [usedGemini, setUsedGemini] = useState(false);

  if (!isOpen) return null;

  const activeItems = items.filter((i) => i.enabled);
  const currentTotalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);

  const previewTotalWeight = previewWeights
    ? activeItems.reduce((sum, item) => {
        const pw = previewWeights.find((w) => w.id === item.id);
        return sum + (pw ? pw.weight : item.weight);
      }, 0)
    : 0;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    if (activeItems.length === 0) {
      setError('Please ensure you have at least one active item on the wheel.');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewWeights(null);
    setSummary(null);

    try {
      let result: { weights: WeightResult[]; summary: string };

      if (GEMINI_API_KEY) {
        // Use Gemini AI
        try {
          result = await computeGeminiWeights(activeItems, prompt.trim());
          setUsedGemini(true);
        } catch (geminiErr) {
          console.warn('Gemini failed, falling back to offline engine:', geminiErr);
          result = computeOfflineWeights(activeItems, prompt.trim());
          setUsedGemini(false);
        }
      } else {
        // Use offline engine
        await new Promise((r) => setTimeout(r, 400)); // Brief UX delay
        result = computeOfflineWeights(activeItems, prompt.trim());
        setUsedGemini(false);
      }

      setSummary(result.summary);
      setPreviewWeights(result.weights);
      sound.playVictoryFanfare();
    } catch (err: any) {
      setError(err?.message || 'An error occurred while computing smart weights.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!previewWeights) return;
    onApplyWeights(previewWeights);
    sound.playPop(true);
    onClose();
  };

  return (
    <div
      id="smart-weighting-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="smart-weighting-modal-content"
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b0c16]/95 border border-indigo-500/30 p-6 shadow-[0_0_80px_rgba(99,102,241,0.25)] backdrop-blur-2xl space-y-4 animate-scale-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/20 text-white">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Smart Weighting</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {GEMINI_API_KEY ? 'Gemini AI' : 'No API Key'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {GEMINI_API_KEY
                  ? 'Gemini intelligently analyzes each item against your prompt and assigns smart weights.'
                  : '⚠️ Add VITE_GEMINI_API_KEY to your .env file for real AI-powered weighting. Currently using keyword-based fallback.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          {/* Prompt Section */}
          <form onSubmit={handleGenerate} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              Weighting Instruction / Prompt:
            </label>
            <div className="relative">
              <textarea
                id="smart-weighting-prompt-input"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Make high-intensity tasks more likely to be picked, or favor budget meals..."
                className="w-full rounded-xl bg-black/60 border border-white/15 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-medium"
              />
            </div>

            {/* Quick Idea Prompts */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Prompts:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPrompt(preset);
                      sound.playPop(false);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                      prompt === preset
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/40'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {/* Generate Trigger Button */}
            <div className="flex justify-end pt-1">
              <button
                id="generate-smart-weights-btn"
                type="submit"
                disabled={loading || !prompt.trim() || activeItems.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{GEMINI_API_KEY ? 'Gemini is analyzing...' : 'Analyzing choices...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Smart Weights</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Preview Panel */}
          {previewWeights && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wide">
                    {usedGemini ? 'Gemini' : 'Offline'} Weight Preview
                  </span>
                </div>
                <span className="text-[11px] font-mono text-indigo-300">
                  {previewWeights.length} items
                </span>
              </div>

              {/* Strategy Summary */}
              {summary && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-indigo-300">Strategy: </span>
                  {summary}
                </div>
              )}

              {/* Items Weight Breakdown List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {activeItems.map((item) => {
                  const assigned = previewWeights.find((w) => w.id === item.id);
                  const newWeight = assigned ? assigned.weight : item.weight;
                  const prevOdds =
                    currentTotalWeight > 0
                      ? ((item.weight / currentTotalWeight) * 100).toFixed(1)
                      : '0';
                  const newOdds =
                    previewTotalWeight > 0
                      ? ((newWeight / previewTotalWeight) * 100).toFixed(1)
                      : '0';
                  const isBoosted = newWeight > item.weight;
                  const isReduced = newWeight < item.weight;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 p-2.5 rounded-lg bg-black/30 border border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs font-medium text-white truncate">
                            {item.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono">
                          <span className="text-slate-400">{prevOdds}%</span>
                          <span className="text-slate-500">→</span>
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded ${
                              isBoosted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isReduced
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {newOdds}% ({newWeight}x)
                          </span>
                        </div>
                      </div>

                      {assigned?.reason && (
                        <p className="text-[11px] text-slate-400 pl-5 italic">
                          "{assigned.reason}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Weights scale slices from 1x to 10x</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors border border-white/5"
            >
              Cancel
            </button>

            {previewWeights && (
              <button
                id="apply-smart-weights-btn"
                onClick={handleApply}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Apply Weights to Wheel</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
