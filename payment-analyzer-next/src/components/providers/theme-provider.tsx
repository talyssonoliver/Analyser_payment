/**
 * Theme Provider
 * Manages and applies Payment Analyzer theme with original color scheme
 * Integrates with preferences store and our custom theme system
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { usePreferences } from '@/lib/stores/preferences-store';
import { useOriginalColors } from '@/lib/contexts/theme-context';
import type { Theme } from '@/lib/stores/preferences-store';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  originalColors: ReturnType<typeof useOriginalColors>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences, updateDisplay } = usePreferences();
  const theme = preferences.display.theme;
  const originalColors = useOriginalColors();

  // Get the effective theme - Payment Analyzer uses light theme primarily
  const getEffectiveTheme = useCallback((): 'light' | 'dark' => {
    // For now, always return light to match original Payment Analyzer
    // Future versions could support dark theme
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'light';
      }
      return 'light';
    }
    // Force light theme for consistency with original
    return 'light';
  }, [theme]);

  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>('light');

  // Update effective theme when theme changes or system preference changes
  useEffect(() => {
    const updateEffectiveTheme = () => {
      setEffectiveTheme(getEffectiveTheme());
    };

    // Initial update
    updateEffectiveTheme();

    // Listen to system theme changes if theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateEffectiveTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, getEffectiveTheme]);

  // Apply Payment Analyzer theme to document with original colors
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add current theme class (always light for original consistency)
    root.classList.add('light');
    
    // Apply Payment Analyzer original color scheme using CSS variables
    // These match the globals.css :root variables exactly
    root.style.setProperty('--primary', originalColors.primary);
    root.style.setProperty('--primary-light', originalColors.primaryLight);
    root.style.setProperty('--accent', originalColors.accent);
    root.style.setProperty('--accent-dark', originalColors.accentDark);
    root.style.setProperty('--success', originalColors.success);
    root.style.setProperty('--warning', originalColors.warning);
    root.style.setProperty('--danger', originalColors.danger);
    
    // Apply background gradient matching original
    root.style.setProperty('--background-gradient', originalColors.gradients.background);
    root.style.setProperty('--header-gradient', originalColors.gradients.header);
    
    // Set semantic colors for compatibility
    root.style.setProperty('--background', originalColors.slate[50]);
    root.style.setProperty('--foreground', originalColors.primary);
    root.style.setProperty('--card', '#ffffff');
    root.style.setProperty('--card-foreground', originalColors.primary);
    root.style.setProperty('--border', originalColors.slate[200]);
    root.style.setProperty('--muted', originalColors.slate[500]);
    root.style.setProperty('--muted-foreground', originalColors.slate[600]);
    
    // Apply body gradient background
    document.body.style.background = originalColors.gradients.background;
    document.body.style.fontFamily = originalColors.fonts.primary;
  }, [effectiveTheme, originalColors]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    effectiveTheme,
    setTheme: (newTheme: Theme) => {
      updateDisplay({ theme: newTheme });
    },
    originalColors,
  }), [theme, effectiveTheme, updateDisplay, originalColors]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
