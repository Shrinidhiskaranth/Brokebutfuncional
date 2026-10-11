import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'bbf:theme';

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // storage can be blocked; fall back to the system setting
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Light/dark theme: follows the system until the user chooses, then remembers the choice. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15122B' : '#F3F0FF');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Not persisting is fine; the toggle still works for this visit.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
