import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  highContrast: false,
  toggleHighContrast: () => {},
  customColors: { primary: '#007bff', secondary: '#6c757d' },
  updateCustomColors: () => {},
});

const STORAGE_KEY = 'goenglish:theme';

// Utilidades locales para lectura/escritura segura
const isLikelyJson = (value) => {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  return (
    (s.startsWith('{') && s.endsWith('}')) ||
    (s.startsWith('[') && s.endsWith(']')) ||
    (s.startsWith('"') && s.endsWith('"'))
  );
};

const safeGetTheme = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const s = raw.trim();
    if (s === '[object Object]') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      return null;
    }
    if (isLikelyJson(s)) {
      try {
        const parsed = JSON.parse(s);
        return typeof parsed === 'string' ? parsed : null;
      } catch (_) {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        return null;
      }
    }
    return s;
  } catch (_) {
    return null;
  }
};

const safeSetTheme = (theme) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch (_) {
    try { window.localStorage.setItem(STORAGE_KEY, String(theme)); } catch (__) {}
  }
};

export const ThemeProvider = ({ children }) => {
  const getInitialTheme = useCallback(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const stored = safeGetTheme();
    if (stored === 'light' || stored === 'dark') return stored;

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }, []);

  const [theme, setTheme] = useState(() => getInitialTheme());
  const [highContrast, setHighContrast] = useState(false);
  const [customColors, setCustomColors] = useState({ primary: '#007bff', secondary: '#6c757d' });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-high-contrast', highContrast ? 'true' : 'false');
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-high-contrast', highContrast ? 'true' : 'false');
    safeSetTheme(theme);
  }, [theme, highContrast]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return () => {};
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((current) => !current);
  }, []);

  const updateCustomColors = useCallback((colors) => {
    setCustomColors(colors);
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme, highContrast, toggleHighContrast, customColors, updateCustomColors }),
    [theme, toggleTheme, highContrast, toggleHighContrast, customColors, updateCustomColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
