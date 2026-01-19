"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getStoredTheme,
  setStoredTheme,
  resolveTheme,
  applyThemeClass,
  type ThemeMode,
  type ResolvedTheme,
} from "@/lib/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme();
    const initialMode = stored ?? "system";
    setModeState(initialMode);

    const resolved = resolveTheme(initialMode);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (mode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      const newResolved: ResolvedTheme = e.matches ? "dark" : "light";
      setResolvedTheme(newResolved);
      applyThemeClass(newResolved);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    setStoredTheme(newMode);

    const resolved = resolveTheme(newMode);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  return createElement(
    ThemeContext.Provider,
    { value: { mode, resolvedTheme, setMode } },
    children
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
