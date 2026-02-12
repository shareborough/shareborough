import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeContextValue {
  /** The user's preference: 'light', 'dark', or 'system' */
  mode: ThemeMode;
  /** The resolved theme actually applied: 'light' or 'dark' */
  resolved: "light" | "dark";
  /** Change the theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Cycle through: light → dark → system → light */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#111827" : "#4a7c59");
  }
}

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemPreference();
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(getStoredMode()));

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
    const r = resolve(next);
    setResolved(r);
    applyTheme(r);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light");
  }, [mode, setMode]);

  // Apply on mount
  useEffect(() => {
    applyTheme(resolved);
  }, []);

  // Listen for system preference changes (only matters when mode === "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      if (mode === "system") {
        const r = getSystemPreference();
        setResolved(r);
        applyTheme(r);
      }
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
