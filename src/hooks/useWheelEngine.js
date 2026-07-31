import { useState, useRef, useCallback } from 'react';
import { aiService } from '../services/aiService';
import { useLocalStorage } from './useLocalStorage';

const HISTORY_LIMIT = 100;

export function useWheelEngine({ promptInput, aiConfig, onError }) {
  const [options, setOptions] = useState([]);
  const [targetWinnerIndex, setTargetWinnerIndex] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [displayVerdict, setDisplayVerdict] = useState(null);

  const isGeneratingRef = useRef(false);
  const pendingVerdictRef = useRef(null);
  const [history, setHistory] = useLocalStorage('spinpick_history', []);

  const addHistoryItem = useCallback((item) => {
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT));
  }, [setHistory]);

  const handleGenerateOptions = useCallback(async (queryText) => {
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
        winnerIndex: res.winnerIndex,
        reasoning: res.reasoning,
        actionSteps: res.actionSteps,
        isSensitive: res.isSensitive,
      };
    } catch (err) {
      console.error('Failed to generate options:', err);
      setGenerateError('Could not generate options. Please try again.');
      onError?.(err);
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [promptInput, isSpinning, aiConfig, onError]);

  const handleSpinComplete = useCallback((winningSlice) => {
    const ctx = pendingVerdictRef.current;
    const verdict = {
      winner: winningSlice,
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

  const handleLoadPastSpin = useCallback((historyItem) => {
    if (historyItem.options && historyItem.options.length > 0) {
      setOptions(historyItem.options);
      setDisplayVerdict(null);
      pendingVerdictRef.current = null;
      setTargetWinnerIndex(historyItem.winnerIndex >= 0 ? historyItem.winnerIndex : 0);

      if (historyItem.winner && historyItem.reasoning) {
        const restoredVerdict = {
          winner: historyItem.winner,
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