"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

export interface Theme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceDeep: string;
  border: string;
  borderMuted: string;
  gold: string;
  goldGradient: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnGold: string;
  tabBg: string;
  inputBorder: string;
  inputColor: string;
  ctaBg: string;
  ctaBorder: string;
  ctaBtnColor: string;
  ctaBtnBorder: string;
  divider: string;
  dividerText: string;
  previewBg: string;
  previewText: string;
  previewSep: string;
  regenBorder: string;
  regenColor: string;
  footer: string;
  loadingBg: string;
  loadingColor: string;
  cardShadow: string;
  linkColor: string;
  linkBorder: string;
  checkBorder: string;
  checkBg: string;
  btnBg: string;
  btnColor: string;
  btnShadow: string;
}

const DARK: Theme = {
  mode: "dark",
  bg: "#0F1923",
  surface: "#1A2535",
  surfaceDeep: "#0F1923",
  border: "rgba(255,255,255,0.06)",
  borderMuted: "rgba(255,255,255,0.12)",
  gold: "#F5C842",
  goldGradient: "linear-gradient(135deg, #F5C842, #E8A800)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.28)",
  textOnGold: "#0F1923",
  tabBg: "#152030",
  inputBorder: "rgba(255,255,255,0.1)",
  inputColor: "#FFFFFF",
  ctaBg: "linear-gradient(135deg, #1A2535, #243044)",
  ctaBorder: "rgba(245,200,66,0.2)",
  ctaBtnColor: "#F5C842",
  ctaBtnBorder: "rgba(245,200,66,0.4)",
  divider: "rgba(255,255,255,0.08)",
  dividerText: "rgba(255,255,255,0.35)",
  previewBg: "#0F1923",
  previewText: "rgba(255,255,255,0.85)",
  previewSep: "rgba(255,255,255,0.18)",
  regenBorder: "rgba(255,255,255,0.15)",
  regenColor: "rgba(255,255,255,0.6)",
  footer: "rgba(255,255,255,0.2)",
  loadingBg: "rgba(255,255,255,0.07)",
  loadingColor: "rgba(255,255,255,0.3)",
  cardShadow: "rgba(0,0,0,0.3)",
  linkColor: "rgba(255,255,255,0.4)",
  linkBorder: "rgba(255,255,255,0.1)",
  checkBorder: "rgba(255,255,255,0.15)",
  checkBg: "rgba(255,255,255,0.05)",
  btnBg: "linear-gradient(135deg, #F5C842, #E8A800)",
  btnColor: "#0F1923",
  btnShadow: "0 6px 20px rgba(245,200,66,0.35)",
};

const LIGHT: Theme = {
  mode: "light",
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceDeep: "#FDF8F0",
  border: "rgba(0,0,0,0.07)",
  borderMuted: "rgba(0,0,0,0.1)",
  gold: "#D49500",
  goldGradient: "linear-gradient(135deg, #FFD23F, #F5B800)",
  textPrimary: "#1A1A2E",
  textSecondary: "#7A7A90",
  textMuted: "#B0B0BC",
  textOnGold: "#FFFFFF",
  tabBg: "#EAEAEA",
  inputBorder: "rgba(0,0,0,0.09)",
  inputColor: "#1A1A2E",
  ctaBg: "#FFFFFF",
  ctaBorder: "rgba(245,184,0,0.35)",
  ctaBtnColor: "#1A1200",
  ctaBtnBorder: "rgba(0,0,0,0.0)",
  divider: "rgba(0,0,0,0.08)",
  dividerText: "#B8B8C4",
  previewBg: "#FDF8F0",
  previewText: "#2D2D2D",
  previewSep: "#DDD",
  regenBorder: "rgba(0,0,0,0.15)",
  regenColor: "#7A7A90",
  footer: "#C0C0CC",
  loadingBg: "#E8E8EC",
  loadingColor: "#ABABBB",
  cardShadow: "rgba(0,0,0,0.08)",
  linkColor: "#9090A0",
  linkBorder: "#EAEAEE",
  checkBorder: "#DCDCE8",
  checkBg: "#FFFFFF",
  btnBg: "#1A1A2E",
  btnColor: "#FFFFFF",
  btnShadow: "0 6px 20px rgba(0,0,0,0.18)",
};

export const THEMES = { dark: DARK, light: LIGHT };

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: DARK, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("enspire-theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.background = THEMES[mode].bg;
    document.body.style.background = THEMES[mode].bg;
  }, [mode]);

  const toggle = () => {
    setMode((m) => {
      const next = m === "dark" ? "light" : "dark";
      localStorage.setItem("enspire-theme", next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[mode], toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
