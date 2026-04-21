"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "dark", setTheme: () => {} });

export const LIGHT: Record<string, string> = {
  "--ast-bg": "#EEF3FA",
  "--ast-sidebar-bg": "#FFFFFF",
  "--ast-sidebar-border": "#E5E9F0",
  "--ast-card-bg": "#FFFFFF",
  "--ast-card-border": "#E5E7EB",
  "--ast-card-shadow": "0 1px 4px rgba(0,0,0,0.07)",
  "--ast-text1": "#111827",
  "--ast-text2": "#6B7280",
  "--ast-text3": "#9CA3AF",
  "--ast-nav-active-bg": "#EFF6FF",
  "--ast-nav-active-color": "#2563EB",
  "--ast-nav-active-border": "#3B82F6",
  "--ast-nav-inactive": "#6B7280",
  "--ast-icon-bg": "#FBF5E6",
  "--ast-icon-color": "#C89434",
  "--ast-input-bg": "#F9FAFB",
  "--ast-input-border": "#E5E7EB",
  "--ast-input-text": "#111827",
  "--ast-divider": "#E5E7EB",
  "--ast-gold": "#C89434",
  "--ast-gold-light": "#E8B84B",
  "--ast-success-bg": "#F0FDF4",
  "--ast-success-border": "#BBF7D0",
  "--ast-success-text": "#166534",
  "--ast-error-bg": "#FEF2F2",
  "--ast-error-border": "#FECACA",
  "--ast-error-text": "#991B1B",
  "--ast-warn-bg": "#FEF3C7",
  "--ast-warn-border": "#FDE68A",
  "--ast-warn-text": "#92400E",
  "--ast-badge-bg": "#F3F4F6",
  "--ast-badge-text": "#374151",
  "--ast-modal-bg": "#FFFFFF",
  "--ast-modal-overlay": "rgba(0,0,0,0.4)",
};

export const DARK: Record<string, string> = {
  "--ast-bg": "#141210",
  "--ast-sidebar-bg": "#1C1710",
  "--ast-sidebar-border": "rgba(200,148,52,0.12)",
  "--ast-card-bg": "#1E1A14",
  "--ast-card-border": "rgba(200,148,52,0.18)",
  "--ast-card-shadow": "none",
  "--ast-text1": "#F5E6C8",
  "--ast-text2": "rgba(245,230,200,0.55)",
  "--ast-text3": "rgba(245,230,200,0.35)",
  "--ast-nav-active-bg": "rgba(200,148,52,0.12)",
  "--ast-nav-active-color": "#C89434",
  "--ast-nav-active-border": "#C89434",
  "--ast-nav-inactive": "rgba(245,230,200,0.45)",
  "--ast-icon-bg": "#2A2218",
  "--ast-icon-color": "#C89434",
  "--ast-input-bg": "rgba(255,255,255,0.05)",
  "--ast-input-border": "rgba(200,148,52,0.2)",
  "--ast-input-text": "#F5E6C8",
  "--ast-divider": "rgba(200,148,52,0.1)",
  "--ast-gold": "#C89434",
  "--ast-gold-light": "#E8B84B",
  "--ast-success-bg": "rgba(34,197,94,0.08)",
  "--ast-success-border": "rgba(34,197,94,0.2)",
  "--ast-success-text": "#4ADE80",
  "--ast-error-bg": "rgba(139,26,42,0.15)",
  "--ast-error-border": "rgba(139,26,42,0.3)",
  "--ast-error-text": "#F87B8A",
  "--ast-warn-bg": "rgba(200,148,52,0.1)",
  "--ast-warn-border": "rgba(200,148,52,0.25)",
  "--ast-warn-text": "#E8B84B",
  "--ast-badge-bg": "rgba(255,255,255,0.07)",
  "--ast-badge-text": "rgba(245,230,200,0.7)",
  "--ast-modal-bg": "#1E1A14",
  "--ast-modal-overlay": "rgba(0,0,0,0.7)",
};

function applyVars(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // İlk yükleme: localStorage'dan oku
  useEffect(() => {
    const saved = localStorage.getItem("astronom_theme") as Theme | null;
    const initial = saved === "light" || saved === "dark" ? saved : "dark";
    if (initial !== "dark") {
      setThemeState(initial);
      applyVars(LIGHT);
    }
  }, []);

  // Tema değiştiğinde :root'a uygula
  useEffect(() => {
    applyVars(theme === "light" ? LIGHT : DARK);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("astronom_theme", t);
    applyVars(t === "light" ? LIGHT : DARK);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
