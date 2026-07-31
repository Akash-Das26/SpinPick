import { describe, it, expect } from 'vitest';
import { applyTheme, resolveTheme } from '../../src/lib/theme.js';

describe('theme helpers', () => {
  it('keeps an explicit light theme choice', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
  });

  it('falls back to the system preference when no saved theme exists', () => {
    expect(resolveTheme(null, 'dark')).toBe('dark');
    expect(resolveTheme(null, 'light')).toBe('light');
  });

  it('applies the theme to the document root and storage', () => {
    const storage = new Map();
    const root = { setAttribute: () => {} };
    const calls = [];
    root.setAttribute = (name, value) => calls.push([name, value]);

    const theme = applyTheme('light', root, {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    });

    expect(theme).toBe('light');
    expect(calls).toEqual([['data-theme', 'light']]);
    expect(storage.get('spinpick_theme')).toBe('light');
  });
});
