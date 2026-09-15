"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { message, resolveLocale, type Locale, type MessageKey } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "career-copilot-locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryLocale = params.get("lang");
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    const browserLocale = window.navigator.language;
    setLocaleState(resolveLocale(queryLocale || storedLocale || browserLocale));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  };

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t: (key) => message(locale, key) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  const next = locale === "en" ? "zh" : "en";
  return <button className="cc-language-toggle" type="button" onClick={() => setLocale(next)} aria-label={`${t("languageLabel")}: ${next === "en" ? t("english") : t("chinese")}`} title={t("languageLabel")}>
    <Languages size={15}/><span>{compact ? (next === "en" ? "EN" : "中") : next === "en" ? "English" : "中文"}</span>
  </button>;
}
