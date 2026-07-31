import { useState, useRef, useCallback } from 'react';
import { aiService, WheelOption } from '../services/aiService';
import { useLocalStorage } from './useLocalStorage';

const HISTORY_LIMIT = 100;

export interface Verdict {
  winner: WheelOption;
  reasoning: string;
  actionSteps: string[];
  isSensitive: boolean;
  winnerIndex: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  winner: WheelOption;
  options: WheelOption[];
  winnerIndex: number;
  reasoning: string;
  actionSteps: string[];
  isSensitive: boolean;
}

export interface UseWheelEngineOptions {
  promptInput: string;
  aiConfig: { modelName: string; optionCount: number; apiKey: string };
  onError?: (err: Error) => void;
}

export interface UseWheelEngineReturn {
  options: WheelOption[];
  setOptions: React.Dispatch<React.SetStateAction<WheelOption[]>>;
  targetWinnerIndex: number | null;
  setTargetWinnerIndex: (index: number | null) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  isGenerating: boolean;
  generateError: string | null;
  displayVerdict: Verdict | null;
  setDisplayVerdict: React.Dispatch<React.SetStateAction<Verdict | null>>;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  handleGenerateOptions: (queryText?: string) => Promise<void>;
  handleSpinComplete: (winningSlice: WheelOption) => void;
  handleEliminateAndRespin: () => void;
  handleLoadPastSpin: (historyItem: HistoryItem) => void;
  addHistoryItem: (item: HistoryItem) => void;
}

export function useWheelEngine({ promptInput, aiConfig, onError }: UseWheelEngineOptions): UseWheelEngineReturn {
  const [options, setOptions] = useState<WheelOption[]>([]);
  const [targetWinnerIndex, setTargetWinnerIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [displayVerdict, setDisplayVerdict] = useState<Verdict | null>(null);

  const isGeneratingRef = useRef(false);
  const pendingVerdictRef = useRef<Verdict | null>(null);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('spinpick_history', []);

  const addHistoryItem = useCallback((item: HistoryItem) => {
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT));
  }, [setHistory]);

  const handleGenerateOptions = useCallback(async (queryText?: string) => {
    const q = (queryText || promptInput).trim();
    if (!q || isGeneratingRef.current || isSpinning) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setGenerateError(null);
    setDisplayVerdict(null);
    pendingVerdictRef.current = null;

    try {
      const res = await aiService.generateWheelOptions(q, aiConfig);
      setOptions(res.options);
      setTargetWinnerIndex(res.winnerIndex);

      pendingVerdictRef.current = {
        winner: res.options[res.winnerIndex],
        winnerIndex: res.winnerIndex,
        reasoning: res.reasoning,
        actionSteps: res.actionSteps,
        isSensitive: res.isSensitive,
      };
    } catch (err) {
      console.error('Failed to generate options:', err);
      setGenerateError('Could not generate options. Please try again.');
      onError?.(err as Error);
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [promptInput, isSpinning, aiConfig, onError]);

  const handleSpinComplete = useCallback((winningSlice: WheelOption) => {
    const ctx = pendingVerdictRef.current;
    const winnerIdx = options.findIndex(o => o.id === winningSlice.id);
    const verdict: Verdict = {
      winner: winningSlice,
      winnerIndex: winnerIdx >= 0 ? winnerIdx : 0,
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
      prompt: promptInput,
      winner: winningSlice,
      options: [...options],
      winnerIndex: options.findIndex(o => o.id === winningSlice.id),
      reasoning: verdict.reasoning,
      actionSteps: verdict.actionSteps,
      isSensitive: verdict.isSensitive,
    });
  }, [promptInput, options, addHistoryItem]);

  const handleEliminateAndRespin = useCallback(() => {
    if (!displayVerdict?.winner || options.length <= 2) {
      alert('Need at least 2 options remaining to eliminate!');
      return;
    }
    const remaining = options.filter((o) => o.id !== displayVerdict.winner.id);
    setOptions(remaining);
    setDisplayVerdict(null);
    pendingVerdictRef.current = null;
    setTargetWinnerIndex(Math.floor(Math.random() * remaining.length));
  }, [displayVerdict, options]);

  const handleLoadPastSpin = useCallback((historyItem: HistoryItem) => {
    if (historyItem.options && historyItem.options.length > 0) {
      setOptions(historyItem.options);
      setDisplayVerdict(null);
      pendingVerdictRef.current = null;
      setTargetWinnerIndex(historyItem.winnerIndex >= 0 ? historyItem.winnerIndex : 0);

      if (historyItem.winner && historyItem.reasoning) {
        const restoredVerdict: Verdict = {
          winner: historyItem.winner,
          winnerIndex: historyItem.winnerIndex >= 0 ? historyItem.winnerIndex : 0,
          reasoning: historyItem.reasoning,
          actionSteps: historyItem.actionSteps || [],
          isSensitive: historyItem.isSensitive || false,
        };
        setDisplayVerdict(restoredVerdict);
      }
    } else if (historyItem.prompt) {
      handleGenerateOptions(historyItem.prompt);
    }
  }, [handleGenerateOptions]);

  return {
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
    history,
    setHistory,
    handleGenerateOptions,
    handleSpinComplete,
    handleEliminateAndRespin,
    handleLoadPastSpin,
    addHistoryItem,
  };
}