'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with 'system' to avoid hydration mismatch
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load saved theme after mount to avoid hydration mismatch
  useEffect(() => {
    console.log('[ThemeContext] Component mounted, loading from localStorage...');
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme;
    console.log('[ThemeContext] Saved theme from localStorage:', savedTheme);
    if (savedTheme) {
      setThemeState(savedTheme);
      console.log('[ThemeContext] Set theme state to:', savedTheme);
    }
  }, []);

  // Update resolved theme and apply to document
  useEffect(() => {
    console.log('[ThemeContext] useEffect triggered, current theme:', theme);

    const updateResolvedTheme = () => {
      let resolved: 'light' | 'dark' = 'light';

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        console.log('[ThemeContext] Theme is system, resolved to:', resolved);
      } else {
        resolved = theme;
        console.log('[ThemeContext] Theme is explicit:', resolved);
      }

      console.log('[ThemeContext] Setting resolvedTheme to:', resolved);
      setResolvedTheme(resolved);

      // Apply theme to document
      console.log('[ThemeContext] Current classList before change:', document.documentElement.classList.toString());
      if (resolved === 'dark') {
        console.log('[ThemeContext] ADDING dark class');
        document.documentElement.classList.add('dark');
      } else {
        console.log('[ThemeContext] REMOVING dark class');
        document.documentElement.classList.remove('dark');
      }
      console.log('[ThemeContext] Current classList after change:', document.documentElement.classList.toString());
    };

    updateResolvedTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    console.log('[ThemeContext] setTheme called with:', newTheme);
    console.log('[ThemeContext] Updating theme state and localStorage...');
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('[ThemeContext] localStorage updated to:', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
