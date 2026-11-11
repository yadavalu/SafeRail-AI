"use client";

import Brand from "@/components/Brand";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { getCopy } from "@/i18n";
import Link from "next/link";

export default function PrivacyPolicyContent() {
  const { language } = useLocale();
  const text = getCopy(language);

  return (
    <>
      <header className="privacy-header">
        <Brand href="/" />
        <LanguageToggle />
      </header>

      <main className="privacy-main" lang={language}>
        <div className="privacy-updated">{text.privacy.lastUpdated}</div>
        <h1>{text.privacy.title}</h1>
        <p className="privacy-intro">{text.privacy.intro}</p>

        <nav className="privacy-nav" aria-label={text.nav.label}>
          {text.privacy.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.number} {section.title}
            </a>
          ))}
        </nav>

        {text.privacy.sections.map((section) => (
          <section
            className="privacy-section"
            key={section.id}
            id={section.id}
          >
            <span className="privacy-number" aria-hidden="true">
              {section.number}
            </span>
            <div>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => {
                const label =
                  "label" in paragraph ? paragraph.label : undefined;
                return (
                  <p key={label ?? paragraph.text}>
                    {label && <strong>{label}: </strong>}
                    {paragraph.text}
                    {section.id === "contact-us" && (
                      <>
                        {" "}
                        <a href="mailto:safety@saferail.ai">
                          safety@saferail.ai
                        </a>
                        .
                      </>
                    )}
                  </p>
                );
              })}
            </div>
          </section>
        ))}
        <p className="privacy-back">
          <Link href="/">{text.footer.back}</Link>
        </p>
      </main>

      <Footer />
    </>
  );
}
