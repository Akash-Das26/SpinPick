import { describe, it, expect } from 'vitest';
import { getTheme, WHEEL_THEMES } from '../../src/utils/themes.ts';

describe('Theme utils', () => {
  describe('WHEEL_THEMES', () => {
    it('exports multiple themes', () => {
      expect(WHEEL_THEMES.length).toBeGreaterThanOrEqual(5);
    });

    it('each theme has required properties', () => {
      for (const theme of WHEEL_THEMES) {
        expect(theme.id).toBeTruthy();
        expect(theme.name).toBeTruthy();
        expect(theme.description).toBeTruthy();
        expect(Array.isArray(theme.sliceColors)).toBe(true);
        expect(theme.sliceColors.length).toBeGreaterThanOrEqual(4);
        expect(theme.rimColor).toBeTruthy();
        expect(theme.hubColor).toBeTruthy();
      }
    });

    it('has cyber-neon as default theme', () => {
      const neon = WHEEL_THEMES.find((t) => t.id === 'cyber-neon');
      expect(neon).toBeDefined();
      expect(neon.name).toContain('Cyber');
    });
  });

  describe('getTheme', () => {
    it('returns the correct theme by id', () => {
      const theme = getTheme('cyber-neon');
      expect(theme).toBeDefined();
      expect(theme.id).toBe('cyber-neon');
    });

    it('falls back to first theme for unknown id', () => {
      const theme = getTheme('nonexistent-theme-id');
      expect(theme).toBeDefined();
      expect(theme.id).toBe(WHEEL_THEMES[0].id);
    });
  });
});
