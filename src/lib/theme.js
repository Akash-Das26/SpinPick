const STORAGE_KEY = 'spinpick_theme';
const THEME_ATTRIBUTE = 'data-theme';

export function resolveTheme(savedTheme, systemTheme) {
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return systemTheme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme, root = typeof document !== 'undefined' ? document.documentElement : null, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';

  if (root?.setAttribute) {
    root.setAttribute(THEME_ATTRIBUTE, normalizedTheme);
  }

  if (storage?.setItem) {
    storage.setItem(STORAGE_KEY, normalizedTheme);
  }

  return normalizedTheme;
}
