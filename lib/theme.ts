export const THEME_STORAGE_KEY = 'bookmark-vault-theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Get stored theme preference from localStorage
 * Returns null if not set or invalid
 */
export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save theme preference to localStorage
 */
export function setStoredTheme(mode: ThemeMode): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve theme mode to actual light/dark value
 * For 'system', checks OS preference via matchMedia
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';

  // mode === 'system'
  if (typeof window === 'undefined') {
    return 'light'; // SSR fallback
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Apply theme class to document element
 */
export function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
