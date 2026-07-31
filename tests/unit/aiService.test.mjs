import { describe, it, expect } from 'vitest';
import { aiService, COLOR_SCHEMES } from '../../src/services/aiService.js';

/* ==========================================================================
   Unit Tests: aiService — SpinPick Decision Engine
   ========================================================================== */

describe('COLOR_SCHEMES', () => {
  it('exports 5 color schemes', () => {
    expect(Object.keys(COLOR_SCHEMES)).toHaveLength(5);
  });

  it('each scheme has exactly 8 colors', () => {
    for (const [name, colors] of Object.entries(COLOR_SCHEMES)) {
      expect(colors, `${name} should have 8 colors`).toHaveLength(8);
    }
  });

  it('all colors are valid hex strings', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const colors of Object.values(COLOR_SCHEMES)) {
      for (const color of colors) {
        expect(color, `Invalid color: ${color}`).toMatch(hexRegex);
      }
    }
  });

  it('electric scheme is first and matches expected values', () => {
    expect(COLOR_SCHEMES.electric[0]).toBe('#d8ff5b');
    expect(COLOR_SCHEMES.electric[7]).toBe('#b56cff');
  });
});

/* ── Category Routing ───────────────────────────────────────── */

describe('generateWheelOptions — category routing (offline fallback)', () => {
  it('returns food options for dinner-related prompts', async () => {
    const result = await aiService.generateWheelOptions('What should I cook for dinner tonight?');
    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
    expect(result.options.length).toBeLessThanOrEqual(8);
    // All options should have food-related labels
    for (const opt of result.options) {
      expect(opt.label).toBeTruthy();
      expect(opt.desc).toBeTruthy();
    }
  });

  it('returns travel options for vacation prompts', async () => {
    const result = await aiService.generateWheelOptions('Best travel destination this weekend');
    expect(result.source).toBe('SpinPick Decision Engine');
    for (const opt of result.options) {
      expect(opt.label).toBeTruthy();
      expect(opt.desc).toBeTruthy();
    }
  });

  it('returns tech options for project prompts', async () => {
    const result = await aiService.generateWheelOptions('What side project should I build?');
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('returns movie options for entertainment prompts', async () => {
    const result = await aiService.generateWheelOptions('What movie should I watch tonight?');
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('returns generic options for unknown prompts', async () => {
    const result = await aiService.generateWheelOptions('What color should I paint my room?');
    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBe(8);
  });
});

/* ── optionCount ────────────────────────────────────────────── */

describe('generateWheelOptions — optionCount', () => {
  it('respects optionCount when less than available', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?', { optionCount: 3 });
    // The offline engine generates a random subset, so it should be ≤ optionCount
    expect(result.options.length).toBeLessThanOrEqual(3);
    expect(result.options.length).toBeGreaterThanOrEqual(2); // minimum floor
  });

  it('respects optionCount when greater than available', async () => {
    const result = await aiService.generateWheelOptions('What movie should I watch?', { optionCount: 20 });
    // Can only return up to what's in the knowledge base (6 movies)
    expect(result.options.length).toBe(6);
  });

  it('defaults to 8 when no optionCount provided', async () => {
    const result = await aiService.generateWheelOptions('What should I do today?');
    expect(result.options.length).toBe(8);
  });
});

/* ── Result Structure ──────────────────────────────────────── */

describe('generateWheelOptions — result structure', () => {
  it('every option has id, label, desc, weight, and color', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    for (const opt of result.options) {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('label');
      expect(opt).toHaveProperty('desc');
      expect(opt).toHaveProperty('weight');
      expect(opt).toHaveProperty('color');
    }
  });

  it('all options have unique IDs', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    const ids = result.options.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each option\'s color is in the electric scheme', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    const validColors = new Set(COLOR_SCHEMES.electric);
    for (const opt of result.options) {
      expect(validColors.has(opt.color), `Invalid color ${opt.color} for option ${opt.label}`).toBe(true);
    }
  });

  it('winnerIndex is a valid index within options array', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    expect(result.winnerIndex).toBeGreaterThanOrEqual(0);
    expect(result.winnerIndex).toBeLessThan(result.options.length);
  });

  it('returns reasoning string containing the winner label', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    const winner = result.options[result.winnerIndex];
    expect(result.reasoning).toContain(winner.label);
  });

  it('returns 3 action steps with first step referencing the winner', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    expect(result.actionSteps).toHaveLength(3);
    const winner = result.options[result.winnerIndex];
    // Only the first action step contains the winner label; steps 1 and 2 are generic
    expect(result.actionSteps[0]).toContain(winner.label);
  });

  it('returns source as SpinPick Decision Engine for offline mode', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('isSensitive is false for normal prompts', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?');
    expect(result.isSensitive).toBe(false);
  });
});

/* ── Sensitive Prompts ─────────────────────────────────────── */

describe('generateWheelOptions — sensitive prompts', () => {
  const sensitiveTests = [
    { prompt: 'Should I invest in stocks?', keyword: 'invest' },
    { prompt: 'What crypto should I buy?', keyword: 'crypto' },
    { prompt: 'Help me with my taxes', keyword: 'tax' },
    { prompt: 'Which doctor should I see?', keyword: 'doctor' },
    { prompt: 'Is this a good legal contract?', keyword: 'legal' },
    { prompt: 'Should I sue my landlord?', keyword: 'lawsuit' },
    { prompt: 'What divorce lawyer should I hire?', keyword: 'divorce' },
    { prompt: 'How should I budget my money?', keyword: 'budget' },
  ];

  for (const { prompt, keyword } of sensitiveTests) {
    it(`marks "${keyword}" prompt as sensitive`, async () => {
      const result = await aiService.generateWheelOptions(prompt);
      expect(result.isSensitive, `Prompt "${prompt}" should be sensitive`).toBe(true);
    });
  }

  it('still returns valid options for sensitive prompts', async () => {
    const result = await aiService.generateWheelOptions('Should I invest in stocks?');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
    expect(result.winnerIndex).toBeGreaterThanOrEqual(0);
  });
});

/* ── Edge Cases ────────────────────────────────────────────── */

describe('generateWheelOptions — edge cases', () => {
  it('handles very short prompt like "yes"', async () => {
    const result = await aiService.generateWheelOptions('yes');
    expect(result.options.length).toBe(8);
    // Generic options include a dynamic label using prompt text; after shuffle, one should contain 'yes'
    const hasPromptLabel = result.options.some(o => o.label.includes('yes'));
    expect(hasPromptLabel).toBe(true);
  });

  it('handles empty-ish prompt', async () => {
    const result = await aiService.generateWheelOptions('a');
    expect(result.options.length).toBe(8);
  });

  it('handles prompts matching multiple categories — first match wins', async () => {
    // 'cook' matches food; this should return food options
    const result = await aiService.generateWheelOptions('cook movie project');
    const labels = result.options.map(o => o.label);
    // The first match in the code is 'cook' → food.dinner
    // Food labels are things like 'Sheet-Pan Garlic Fajitas'
    expect(labels.some(l => l.includes('Fajitas') || l.includes('Risotto') || l.includes('Salmon'))).toBe(true);
  });

  it('uses offline fallback when apiKey is empty', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?', { apiKey: '' });
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('uses offline fallback when apiKey is too short', async () => {
    const result = await aiService.generateWheelOptions('What should I cook?', { apiKey: 'short' });
    expect(result.source).toBe('SpinPick Decision Engine');
  });
});
