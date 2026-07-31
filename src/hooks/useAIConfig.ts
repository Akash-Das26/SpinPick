import { useState, useEffect, useCallback } from 'react';

interface AIConfig {
  apiKey: string;
  modelName: string;
  optionCount: number;
}

interface UseAIConfigReturn {
  aiConfig: AIConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>;
  updateModelName: (modelName: string) => void;
  updateOptionCount: (optionCount: number) => void;
  updateApiKey: (apiKey: string) => void;
  resetConfig: () => void;
}

export function useAIConfig(): UseAIConfigReturn {
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
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

  const updateModelName = useCallback((modelName: string) => {
    setAiConfig(prev => ({ ...prev, modelName }));
  }, []);

  const updateOptionCount = useCallback((optionCount: number) => {
    setAiConfig(prev => ({ ...prev, optionCount }));
  }, []);

  const updateApiKey = useCallback((apiKey: string) => {
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