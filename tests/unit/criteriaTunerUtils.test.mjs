import { describe, it, expect } from 'vitest';
import { calculateSmartWeight } from '../../src/lib/criteriaWeights.js';

describe('calculateSmartWeight', () => {
  it('boosts budget-conscious options with affordable keywords', () => {
    const result = calculateSmartWeight(
      { label: 'Cheap home dinner', desc: 'Easy and budget friendly' },
      { budget: 5, time: 3, effort: 2, excitement: 2 }
    );

    expect(result).toBeGreaterThan(3);
  });

  it('boosts fast options when time urgency is high', () => {
    const result = calculateSmartWeight(
      { label: 'Fast lunch', desc: 'Quick and simple' },
      { budget: 2, time: 5, effort: 2, excitement: 2 }
    );

    expect(result).toBeGreaterThan(3);
  });

  it('keeps values within the supported 1-5 range', () => {
    const result = calculateSmartWeight(
      { label: 'Luxury resort stay', desc: 'A lavish escape' },
      { budget: 5, time: 5, effort: 5, excitement: 5 }
    );

    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(5);
  });
});
