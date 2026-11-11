"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCopy } from "@/i18n";

export type Language = "de" | "en";

type LocaleContextValue = {
  language: Language;
  toggleLanguage: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("de");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("saferail-language");
    if (savedLanguage === "de" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    const text = getCopy(language);
    const isPrivacyPage = window.location.pathname.startsWith("/privacy");
    document.title = isPrivacyPage
      ? text.metadata.privacyTitle
      : text.metadata.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) description.content = text.metadata.description;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((currentLanguage) => {
      const nextLanguage = currentLanguage === "de" ? "en" : "de";
      window.localStorage.setItem("saferail-language", nextLanguage);
      return nextLanguage;
    });
  }, []);

  return (
    <LocaleContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
