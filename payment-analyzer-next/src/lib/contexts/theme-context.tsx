/**
 * Theme Context
 * Provides theme system matching original HTML Payment Analyzer
 */

"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "light", // Original system uses light theme only
  storageKey = "payment-analyzer-theme",
}: Readonly<ThemeProviderProps>) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem(storageKey);
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored as Theme);
    }
  }, [storageKey]);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;

    const effectiveTheme: "light" | "dark" =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    // Use the resolved theme - now supports dark mode

    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);

    setResolvedTheme(effectiveTheme);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(storageKey, newTheme);
    },
    [storageKey]
  );

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Original Payment Analyzer Color Palette Hook
 * Provides access to the exact colors from the original HTML system
 */
export function useOriginalColors() {
  return {
    // Brand Colors
    primary: "#0f172a",
    primaryLight: "#1e293b",
    accent: "#3b82f6",
    accentDark: "#2563eb",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#dc2626",

    // Slate Scale
    slate: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },

    // Gradients (as CSS values)
    gradients: {
      primary: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      accent: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      warning: "linear-gradient(135deg, #f59e0b 0%, #f59e0b 100%)",
      danger: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      background: "linear-gradient(180deg, #f0f4f8 0%, #d9e2ec 100%)",
      header: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    },

    // Typography
    fonts: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      mono: "'SF Mono', 'Monaco', 'Cascadia Code', 'Consolas', ui-monospace, monospace",
    },
  };
}
