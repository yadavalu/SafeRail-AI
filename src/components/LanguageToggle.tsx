"use client";

import { useLocale } from "@/components/LocaleProvider";

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLocale();
  const nextLanguage = language === "de" ? "en" : "de";

  return (
    <button
      className="language-toggle"
      type="button"
      onClick={toggleLanguage}
      aria-label={
        language === "de"
          ? "Switch language to English"
          : "Sprache auf Deutsch umstellen"
      }
      title={
        language === "de"
          ? "Switch language to English"
          : "Sprache auf Deutsch umstellen"
      }
    >
      <svg
        aria-hidden="true"
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
      <span>{nextLanguage.toUpperCase()}</span>
    </button>
  );
}
