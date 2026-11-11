import Link from "next/link";
import Brand from "@/components/Brand";
import InteractiveDemo from "@/components/InteractiveDemo";
import Footer from "@/components/Footer";

const risks = [
  {
    quote: (
      <>
        „Unsere <span className="mark">interne Zielmarge liegt bei 42&nbsp;%</span>,
        darunter gehen wir nicht.“
      </>
    ),
    label: "Vertraulich · Lieferant in Cc",
  },
  {
    quote: (
      <>
        „Lass uns{" "}
        <span className="mark">die Preise vorab mit dem Wettbewerb abstimmen</span>.“
      </>
    ),
    label: "Kartellrecht",
  },
  {
    quote: (
      <>
        „Anbei <span className="mark">die Kundenliste mit Geburtsdaten</span> für
        euren Abgleich.“
      </>
    ),
    label: "DSGVO",
  },
  {
    quote: (
      <>
        „Mit diesem Investment{" "}
        <span className="mark">können Sie nichts falsch machen</span>.“
      </>
    ),
    label: "Pflichthinweis fehlt",
  },
];

const processSteps = [
  {
    title: "Identifizieren",
    description:
      "SafeRail prüft die Nachricht gegen interne Regeln und externe Vorgaben.",
    color: "#C23B26",
  },
  {
    title: "Erklären",
    description:
      "Der Nutzer versteht sofort, welche Passage ein Risiko erzeugt und warum.",
  },
  {
    title: "Lösen",
    description:
      "Eine regelkonforme Alternative hilft, die Nachricht sicher abzuschließen.",
    color: "#0A6F66",
  },
];

const capabilities = [
  {
    title: "Regelmanagement",
    description:
      "Richtlinien mit wenigen Schritten für Nutzergruppen und Abteilungen konfigurieren.",
  },
  {
    title: "Gezielte Anwendung",
    description:
      "Vorgaben rollen- und teamspezifisch auf ausgehende E-Mails anwenden.",
  },
  {
    title: "Transparenz",
    description:
      "Häufige Fälle und Trends im zentralen Dashboard sichtbar machen.",
  },
];

const advisors = [
  ["Anna De Stefano", "Women of Legaltech 2020"],
  ["Dr. Antje Johst", "Legal, Zalando"],
  ["Dr. Marcus Feil", "Über 20 Jahre im Unternehmensrecht"],
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <Brand href="#top" />
        <nav className="nav-links" aria-label="Hauptnavigation">
          <a href="#produkt">Produkt</a>
          <a href="#steuerung">Steuerung</a>
          <a href="#sicherheit">Sicherheit</a>
          <Link href="/privacy">Datenschutz</Link>
        </nav>
        <a className="cta" href="#kontakt">
          Demo anfragen
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <h1 className="display">
            Compliance, bevor eine E-Mail zum{" "}
            <span className="hero-risk">Risiko</span> wird.
          </h1>
          <div className="hero-grid">
            <div className="hero-copy">
              <p>
                SafeRail prüft ausgehende E-Mails in Echtzeit, erklärt das Risiko
                im Kontext und schlägt eine regelkonforme Formulierung vor. In
                der Sekunde, in der es noch etwas nützt: vor dem Senden.
              </p>
              <a className="cta" href="#kontakt">
                Demo anfragen
              </a>
              <p className="eyebrow">
                Läuft lokal auf Ihrer Infrastruktur
              </p>
            </div>
            <InteractiveDemo />
          </div>
        </section>

        <div className="flow" aria-hidden="true">
          <span className="flow-label" style={{ left: "clamp(20px, 4vw, 48px)" }}>
            Entwurf
          </span>
          <span className="flow-label" style={{ right: "clamp(20px, 4vw, 48px)" }}>
            Empfänger
          </span>
          <div className="flow-track" />
          <div className="gate" />
          <span
            className="flow-label"
            style={{ left: "calc(50% + 16px)", color: "var(--paper)" }}
          >
            SafeRail prüft
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
            <span className="mono">E-MAIL</span>
          </div>
        </div>

        <section className="content-section compact">
          <div className="section-intro reveal">
            <h2>Niemand verschickt absichtlich ein Risiko.</h2>
            <p>
              Es passiert zwischen zwei Meetings. Kartellrecht, DSGVO und
              interne Richtlinien müssen in jeder einzelnen Formulierung
              stimmen – und der Fehler fällt meist erst auf, wenn die E-Mail
              draußen ist und sich kaum noch korrigieren lässt.
            </p>
          </div>
          <div>
            {risks.map((risk) => (
              <div className="risk-item reveal" key={risk.label}>
                <p>{risk.quote}</p>
                <span className="mono">{risk.label}</span>
              </div>
            ))}
          </div>
          <p className="eyebrow">Beispielhafte Formulierungen zur Illustration.</p>
        </section>

        <section className="process-section" id="produkt">
          <div className="process-inner">
            <p className="process-lead reveal">
              Eine intelligente Leitplanke direkt im E-Mail-Workflow. Sie greift
              nur ein, wenn es nötig ist – und dann in drei Schritten.
            </p>
            <div>
              {processSteps.map((step) => (
                <div className="process-step reveal" key={step.title}>
                  <h3 style={step.color ? { color: step.color } : undefined}>
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
              <p className="eyebrow">Für Compliance- und Rechtsteams</p>
              <h2>
                Regeln zentral ausrollen. Muster erkennen. Compliance
                verbessern.
              </h2>
            </div>
            <div className="control-grid">
              <div className="activity-card reveal">
                <div className="activity-heading">
                  <strong>Letzte Aktivität</strong>
                  <span>
                    Aktuelle Vorfälle nach Nutzer, Regeltyp, Schweregrad und
                    Datum.
                  </span>
                </div>
                <div className="activity-row">
                  <div className="activity-meta">
                    <div>
                      <strong>absender@unternehmen.de</strong>
                      <span className="activity-badge warning">WARNUNG</span>
                    </div>
                    <span className="mono">5. Juli, 14:14</span>
                  </div>
                  <p>
                    Bei Erwähnung von Investments muss der Hinweis „Capital at
                    risk“ enthalten sein.
                  </p>
                </div>
                <div className="activity-row">
                  <div className="activity-meta">
                    <div>
                      <strong>absender@unternehmen.de</strong>
                      <span className="activity-badge violation">VERSTOSS</span>
                    </div>
                    <span className="mono">5. Juli, 13:18</span>
                  </div>
                  <p>
                    Keine Weitergabe personenbezogener Daten – weder offen noch
                    verdeckt.
                  </p>
                </div>
              </div>
              <div className="feature-list">
                {capabilities.map((capability) => (
                  <div className="feature-row reveal" key={capability.title}>
                    <h3>{capability.title}</h3>
                    <p>{capability.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="security-section" id="sicherheit">
          <div className="section-intro reveal">
            <h2>
              Läuft bei Ihnen.{" "}
              <span style={{ color: "var(--teal)", fontStyle: "italic" }}>
                Nicht bei uns.
              </span>
            </h2>
            <p>
              SafeRail ist für die lokale Verarbeitung auf Ihrer Infrastruktur
              ausgelegt. Ihre Daten bleiben unter Ihrer Kontrolle.
            </p>
          </div>
          <div className="security-flow reveal">
            <span className="eyebrow">Ihre Infrastruktur</span>
            <div className="security-cards">
              <div className="security-card">
                <h3>Interner Server</h3>
                <p>
                  Prüft die Nachricht anhand Ihres Regelwerks – mit optimierten
                  Llama-Modellen.
                </p>
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
                <h3>Browser-Extension</h3>
                <p>
                  Zeigt Risiken und Korrekturvorschläge direkt im E-Mail-Workflow.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="experts-section">
          <div className="content-section team-grid">
            <div className="section-intro reveal">
              <h2>Im Austausch mit Experten entwickelt.</h2>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: "6px 28px",
                  color: "var(--muted)",
                }}
              >
                <span className="eyebrow">Unterstützt von</span>
                <strong>Bocconi for Innovation</strong>
                <strong>bmp Ventures</strong>
              </div>
            </div>
            <div className="experts-list reveal">
              <span className="eyebrow" style={{ paddingBottom: 14 }}>
                Beirat
              </span>
              {advisors.map(([name, description]) => (
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
              <h2>Bevor die nächste E-Mail rausgeht.</h2>
              <p>
                Wir zeigen Ihnen in einer kurzen Demo, wie SafeRail Risiken
                erkennt, erklärt und löst – in Ihrem E-Mail-Workflow.
              </p>
            </div>
            <form className="contact-form reveal">
              <div className="form-field">
                <label htmlFor="sr-name">Name</label>
                <input
                  id="sr-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                />
              </div>
              <div className="form-field">
                <label htmlFor="sr-mail">Geschäftliche E-Mail</label>
                <input
                  id="sr-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                />
              </div>
              <button className="cta-ink" type="button">
                Demo anfragen
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
