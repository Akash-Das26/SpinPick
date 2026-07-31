import { useState, useEffect, useCallback } from 'react';

export function useAIConfig() {
  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem('spinpick_aiconfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          apiKey: '',
          modelName: parsed.modelName || 'openrouter/auto',
          optionCount: Number(parsed.optionCount) || 8
        };
      }
      return { apiKey: '', modelName: 'openrouter/auto', optionCount: 8 };
    } catch {
      return { apiKey: '', modelName: 'openrouter/auto', optionCount: 8 };
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('spinpick_aiconfig', JSON.stringify({
        modelName: aiConfig.modelName,
        optionCount: aiConfig.optionCount
      }));
    } catch (e) {
      console.warn('Failed to write AI config to sessionStorage:', e);
    }
  }, [aiConfig.modelName, aiConfig.optionCount]);

  const updateModelName = useCallback((modelName) => {
    setAiConfig(prev => ({ ...prev, modelName }));
  }, []);

  const updateOptionCount = useCallback((optionCount) => {
    setAiConfig(prev => ({ ...prev, optionCount }));
  }, []);

  const updateApiKey = useCallback((apiKey) => {
    setAiConfig(prev => ({ ...prev, apiKey }));
  }, []);

  const resetConfig = useCallback(() => {
    setAiConfig({ apiKey: '', modelName: 'openrouter/auto', optionCount: 8 });
  }, []);

  return {
    aiConfig,
    setAiConfig,
    updateModelName,
    updateOptionCount,
    updateApiKey,
    resetConfig,
  };
}