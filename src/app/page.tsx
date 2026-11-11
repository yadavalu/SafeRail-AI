"use client";

import Link from "next/link";
import Brand from "@/components/Brand";
import Footer from "@/components/Footer";
import InteractiveDemo from "@/components/InteractiveDemo";
import LanguageToggle from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { getCopy } from "@/i18n";

export default function Home() {
  const { language } = useLocale();
  const text = getCopy(language);

  return (
    <>
      <header className="site-header">
        <Brand href="#top" />
        <nav className="nav-links" aria-label={text.nav.label}>
          <a href="#produkt">{text.nav.product}</a>
          <a href="#steuerung">{text.nav.control}</a>
          <a href="#sicherheit">{text.nav.security}</a>
          <Link href="/privacy">{text.nav.privacy}</Link>
        </nav>
        <div className="header-actions">
          <LanguageToggle />
          <a className="cta" href="#kontakt">
            {text.nav.demo}
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <h1 className="display">
            {text.hero.title}{" "}
            <span className="hero-risk">{text.hero.highlight}</span>
            {text.hero.end}
          </h1>
          <div className="hero-grid">
            <div className="hero-copy">
              <p>{text.hero.description}</p>
              <a className="cta" href="#kontakt">
                {text.nav.demo}
              </a>
              <p className="eyebrow">{text.hero.infrastructure}</p>
            </div>
            <InteractiveDemo />
          </div>
        </section>

        <div className="flow" aria-hidden="true">
          <span className="flow-label" style={{ left: "clamp(20px, 4vw, 48px)" }}>
            {text.flow.draft}
          </span>
          <span className="flow-label" style={{ right: "clamp(20px, 4vw, 48px)" }}>
            {text.flow.recipient}
          </span>
          <div className="flow-track" />
          <div className="gate" />
          <span
            className="flow-label"
            style={{ left: "calc(50% + 16px)", color: "var(--paper)" }}
          >
            {text.flow.checking}
          </span>
          <div className="packet">
            <svg
              width="22"
              height="16"
              viewBox="0 0 22 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="1" width="20" height="14" />
              <path d="m1 2 10 7 10-7" />
            </svg>
            <span className="mono">{text.flow.email}</span>
          </div>
        </div>

        <section className="content-section compact">
          <div className="section-intro reveal">
            <h2>{text.risks.headline}</h2>
            <p>{text.risks.description}</p>
          </div>
          <div>
            {text.risks.rows.map((risk) => (
              <div className="risk-item reveal" key={risk.label}>
                <p>
                  {risk.before}
                  <span className="mark">{risk.highlight}</span>
                  {risk.after}
                </p>
                <span className="mono">{risk.label}</span>
              </div>
            ))}
          </div>
          <p className="eyebrow">{text.risks.note}</p>
        </section>

        <section className="process-section" id="produkt">
          <div className="process-inner">
            <p className="process-lead reveal">{text.product.lead}</p>
            <div>
              {text.product.steps.map((step, index) => (
                <div className="process-step reveal" key={step.title}>
                  <h3
                    style={
                      index === 0
                        ? { color: "#C23B26" }
                        : index === 2
                          ? { color: "#0A6F66" }
                          : undefined
                    }
                  >
                    {step.title}
                  </h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="control-section" id="steuerung">
          <div className="content-section">
            <div className="section-intro reveal">
              <p className="eyebrow">{text.control.audience}</p>
              <h2>{text.control.headline}</h2>
            </div>
            <div className="control-grid">
              <div className="activity-card reveal">
                <div className="activity-heading">
                  <strong>{text.control.activity}</strong>
                  <span>{text.control.activityDescription}</span>
                </div>
                <div className="activity-row">
                  <div className="activity-meta">
                    <div>
                      <strong>absender@unternehmen.de</strong>
                      <span className="activity-badge warning">
                        {text.control.warning}
                      </span>
                    </div>
                    <span className="mono">
                      {language === "de" ? "5. Juli" : "Jul 5"}, 14:14
                    </span>
                  </div>
                  <p>{text.control.investmentRule}</p>
                </div>
                <div className="activity-row">
                  <div className="activity-meta">
                    <div>
                      <strong>absender@unternehmen.de</strong>
                      <span className="activity-badge violation">
                        {text.control.violation}
                      </span>
                    </div>
                    <span className="mono">
                      {language === "de" ? "5. Juli" : "Jul 5"}, 13:18
                    </span>
                  </div>
                  <p>{text.control.privacyRule}</p>
                </div>
              </div>
              <div className="feature-list">
                {text.control.features.map((feature) => (
                  <div className="feature-row reveal" key={feature.title}>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="security-section" id="sicherheit">
          <div className="section-intro reveal">
            <h2>
              {text.security.headline}{" "}
              <span style={{ color: "var(--teal)", fontStyle: "italic" }}>
                {text.security.highlight}
              </span>
            </h2>
            <p>{text.security.description}</p>
          </div>
          <div className="security-flow reveal">
            <span className="eyebrow">{text.security.infrastructure}</span>
            <div className="security-cards">
              <div className="security-card">
                <h3>{text.security.server}</h3>
                <p>{text.security.serverDescription}</p>
              </div>
              <div
                aria-hidden="true"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="44"
                  height="20"
                  viewBox="0 0 44 20"
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="2.5"
                >
                  <path d="M0 10h40M32 2l9 8-9 8" />
                </svg>
              </div>
              <div className="security-card">
                <h3>{text.security.extension}</h3>
                <p>{text.security.extensionDescription}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="experts-section">
          <div className="content-section team-grid">
            <div className="section-intro reveal">
              <h2>{text.experts.headline}</h2>
              <div className="supported-by">
                <span className="eyebrow">{text.experts.supportedBy}</span>
                <strong>Bocconi for Innovation</strong>
                <strong>bmp Ventures</strong>
              </div>
            </div>
            <div className="experts-list reveal">
              <span className="eyebrow" style={{ paddingBottom: 14 }}>
                {text.experts.board}
              </span>
              {text.experts.advisors.map(([name, description]) => (
                <div className="advisor" key={name}>
                  <strong>{name}</strong>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="kontakt">
          <div className="content-section contact-grid">
            <div className="section-intro reveal">
              <h2>{text.contact.headline}</h2>
              <p>{text.contact.description}</p>
            </div>
            <form className="contact-form reveal">
              <div className="form-field">
                <label htmlFor="sr-name">{text.contact.name}</label>
                <input
                  id="sr-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                />
              </div>
              <div className="form-field">
                <label htmlFor="sr-mail">{text.contact.email}</label>
                <input
                  id="sr-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                />
              </div>
              <button className="cta-ink" type="button">
                {text.nav.demo}
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
