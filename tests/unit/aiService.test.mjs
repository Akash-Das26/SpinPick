import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ==========================================================================
   Unit Tests: src/utils/ai.ts — AI Generation Service
   ========================================================================== */

describe('AI Generation Service', () => {
  let generateAiOptions, aiResultToWheelItems;

  beforeEach(async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.stubEnv('VITE_OPENROUTER_PROXY_URL', '');
    vi.resetModules();
    const mod = await import('../../src/utils/ai.ts');
    generateAiOptions = mod.generateAiOptions;
    aiResultToWheelItems = mod.aiResultToWheelItems;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('generateAiOptions — offline fallback (no API key)', () => {
    it('returns food options for dinner-related prompts', async () => {
      const result = await generateAiOptions('What should I cook for dinner tonight?');
      expect(result.options.length).toBeGreaterThanOrEqual(2);
      expect(result.options.length).toBeLessThanOrEqual(8);
      expect(result.reasoning).toBeTruthy();
      expect(result.actionSteps.length).toBe(3);
    });

    it('returns travel options for trip-related prompts', async () => {
      const result = await generateAiOptions('Where should I go for vacation?');
      expect(result.options.length).toBeGreaterThanOrEqual(2);
    });

    it('returns tech options for code-related prompts', async () => {
      const result = await generateAiOptions('What project should I build next?');
      expect(result.options.length).toBeGreaterThanOrEqual(2);
    });

    it('returns entertainment options for movie-related prompts', async () => {
      const result = await generateAiOptions('What movie should I watch tonight?');
      expect(result.options.length).toBeGreaterThanOrEqual(2);
    });

    it('returns generic options for unknown prompts', async () => {
      const result = await generateAiOptions('Help me decide something random');
      expect(result.options.length).toBeGreaterThanOrEqual(2);
    });

    it('respects optionCount parameter', async () => {
      const result = await generateAiOptions('pizza night', { optionCount: 4 });
      expect(result.options.length).toBeLessThanOrEqual(4);
    });

    it('generates valid option structure', async () => {
      const result = await generateAiOptions('dinner ideas');
      for (const opt of result.options) {
        expect(opt.label).toBeTruthy();
        expect(opt.desc).toBeTruthy();
        expect(typeof opt.weight).toBe('number');
        expect(opt.weight).toBeGreaterThanOrEqual(1);
      }
    });

    it('includes reasoning and action steps', async () => {
      const result = await generateAiOptions('pick a restaurant');
      expect(result.reasoning.length).toBeGreaterThan(10);
      expect(result.actionSteps.length).toBe(3);
      result.actionSteps.forEach((step) => {
        expect(step.length).toBeGreaterThan(5);
      });
    });

    it('includes recommendedIndex within valid range', async () => {
      const result = await generateAiOptions('what to do today');
      expect(result.recommendedIndex).toBeGreaterThanOrEqual(0);
      expect(result.recommendedIndex).toBeLessThan(result.options.length);
    });
  });

  describe('generateAiOptions — Gemini AI path', () => {
    it('falls back to offline when no API key is set', async () => {
      const result = await generateAiOptions('dinner ideas');
      // Should still return valid results via offline fallback
      expect(result.options.length).toBeGreaterThanOrEqual(2);
      expect(result.reasoning).toBeTruthy();
    });
  });

  describe('aiResultToWheelItems', () => {
    it('converts AI result to WheelItem-compatible objects', () => {
      const result = {
        options: [
          { label: 'Option A', desc: 'Desc A', weight: 2 },
          { label: 'Option B', desc: 'Desc B', weight: 1 },
        ],
        recommendedIndex: 0,
        reasoning: 'Test reasoning',
        actionSteps: ['Step 1', 'Step 2', 'Step 3'],
      };

      const colors = ['#ff0000', '#00ff00', '#0000ff'];
      const items = aiResultToWheelItems(result, colors);

      expect(items).toHaveLength(2);
      expect(items[0].text).toBe('Option A');
      expect(items[0].color).toBe('#ff0000');
      expect(items[0].weight).toBe(2);
      expect(items[0].enabled).toBe(true);
      expect(items[0].note).toBe('Desc A');

      expect(items[1].text).toBe('Option B');
      expect(items[1].color).toBe('#00ff00');
      expect(items[1].weight).toBe(1);
    });

    it('wraps colors cyclically when more options than colors', () => {
      const result = {
        options: [
          { label: 'A', desc: '', weight: 1 },
          { label: 'B', desc: '', weight: 1 },
          { label: 'C', desc: '', weight: 1 },
          { label: 'D', desc: '', weight: 1 },
        ],
        recommendedIndex: 0,
        reasoning: '',
        actionSteps: [],
      };

      const colors = ['#ff0000', '#00ff00'];
      const items = aiResultToWheelItems(result, colors);

      expect(items[0].color).toBe('#ff0000');
      expect(items[1].color).toBe('#00ff00');
      expect(items[2].color).toBe('#ff0000');
      expect(items[3].color).toBe('#00ff00');
    });

    it('sets all items as enabled', () => {
      const result = {
        options: [
          { label: 'X', desc: '', weight: 1 },
          { label: 'Y', desc: '', weight: 3 },
        ],
        recommendedIndex: 0,
        reasoning: '',
        actionSteps: [],
      };

      const items = aiResultToWheelItems(result, ['#aaa', '#bbb']);
      expect(items.every((i) => i.enabled === true)).toBe(true);
    });
  });
});
