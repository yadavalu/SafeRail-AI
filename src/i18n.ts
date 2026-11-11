import type { Language } from "@/components/LocaleProvider";

export const copy = {
  de: {
    metadata: {
      title: "SafeRail – Compliance, bevor eine E-Mail zum Risiko wird",
      description:
        "SafeRail prüft ausgehende E-Mails in Echtzeit, erklärt Risiken im Kontext und schlägt regelkonforme Formulierungen vor.",
      privacyTitle: "Datenschutzerklärung | SafeRail AI",
    },
    nav: {
      label: "Hauptnavigation",
      product: "Produkt",
      control: "Steuerung",
      security: "Sicherheit",
      privacy: "Datenschutz",
      demo: "Demo anfragen",
    },
    hero: {
      title: "Compliance, bevor eine E-Mail zum",
      highlight: "Risiko",
      end: " wird.",
      description:
        "SafeRail prüft ausgehende E-Mails in Echtzeit, erklärt das Risiko im Kontext und schlägt eine regelkonforme Formulierung vor. In der Sekunde, in der es noch etwas nützt: vor dem Senden.",
      infrastructure: "Läuft lokal auf Ihrer Infrastruktur",
    },
    flow: {
      draft: "Entwurf",
      recipient: "Empfänger",
      checking: "SafeRail prüft",
      email: "E-MAIL",
    },
    risks: {
      headline: "Niemand verschickt absichtlich ein Risiko.",
      description:
        "Es passiert zwischen zwei Meetings. Kartellrecht, DSGVO und interne Richtlinien müssen in jeder einzelnen Formulierung stimmen – und der Fehler fällt meist erst auf, wenn die E-Mail draußen ist und sich kaum noch korrigieren lässt.",
      rows: [
        {
          before: "„Unsere ",
          highlight: "interne Zielmarge liegt bei 42 %",
          after: ", darunter gehen wir nicht.“",
          label: "Vertraulich · Lieferant in Cc",
        },
        {
          before: "„Lass uns ",
          highlight: "die Preise vorab mit dem Wettbewerb abstimmen",
          after: ".“",
          label: "Kartellrecht",
        },
        {
          before: "„Anbei ",
          highlight: "die Kundenliste mit Geburtsdaten",
          after: " für euren Abgleich.“",
          label: "DSGVO",
        },
        {
          before: "„Mit diesem Investment ",
          highlight: "können Sie nichts falsch machen",
          after: ".“",
          label: "Pflichthinweis fehlt",
        },
      ],
      note: "Beispielhafte Formulierungen zur Illustration.",
    },
    product: {
      lead: "Eine intelligente Leitplanke direkt im E-Mail-Workflow. Sie greift nur ein, wenn es nötig ist – und dann in drei Schritten.",
      steps: [
        {
          title: "Identifizieren",
          description:
            "SafeRail prüft die Nachricht gegen interne Regeln und externe Vorgaben.",
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
        },
      ],
    },
    control: {
      audience: "Für Compliance- und Rechtsteams",
      headline: "Regeln zentral ausrollen. Muster erkennen. Compliance verbessern.",
      activity: "Letzte Aktivität",
      activityDescription:
        "Aktuelle Vorfälle nach Nutzer, Regeltyp, Schweregrad und Datum.",
      warning: "WARNUNG",
      violation: "VERSTOSS",
      investmentRule:
        "Bei Erwähnung von Investments muss der Hinweis „Capital at risk“ enthalten sein.",
      privacyRule:
        "Keine Weitergabe personenbezogener Daten – weder offen noch verdeckt.",
      features: [
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
      ],
    },
    security: {
      headline: "Läuft bei Ihnen.",
      highlight: "Nicht bei uns.",
      description:
        "SafeRail ist für die lokale Verarbeitung auf Ihrer Infrastruktur ausgelegt. Ihre Daten bleiben unter Ihrer Kontrolle.",
      infrastructure: "Ihre Infrastruktur",
      server: "Interner Server",
      serverDescription:
        "Prüft die Nachricht anhand Ihres Regelwerks – mit optimierten Llama-Modellen.",
      extension: "Browser-Extension",
      extensionDescription:
        "Zeigt Risiken und Korrekturvorschläge direkt im E-Mail-Workflow.",
    },
    experts: {
      headline: "Im Austausch mit Experten entwickelt.",
      supportedBy: "Unterstützt von",
      board: "Beirat",
      advisors: [
        ["Anna De Stefano", "Women of Legaltech 2020"],
        ["Dr. Antje Johst", "Legal, Zalando"],
        ["Dr. Marcus Feil", "Über 20 Jahre im Unternehmensrecht"],
      ],
    },
    contact: {
      headline: "Bevor die nächste E-Mail rausgeht.",
      description:
        "Wir zeigen Ihnen in einer kurzen Demo, wie SafeRail Risiken erkennt, erklärt und löst – in Ihrem E-Mail-Workflow.",
      name: "Name",
      email: "Geschäftliche E-Mail",
      sending: "Wird gesendet …",
      success: "Vielen Dank. Ihre Anfrage wurde an SafeRail gesendet.",
      error:
        "Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie kiyan@saferail.io.",
    },
    demo: {
      ariaLabel: "SafeRail E-Mail-Demo",
      newMessage: "NEUE NACHRICHT",
      subject: "Re: Konditionen Q3",
      to: "An",
      cc: "Cc",
      external: "extern",
      greeting: "Hallo Sarah,",
      message:
        "Bitte verwende für die Verhandlung ausschließlich die interne Zielmarge von 42 % und gehe nicht unter einen Einkaufsrabatt von 18 %.",
      riskyPrefix: "Bitte verwende für die Verhandlung ausschließlich die",
      riskyText:
        "interne Zielmarge von 42 % und gehe nicht unter einen Einkaufsrabatt von 18 %",
      rewrite:
        "Die Parameter für die Verhandlung schicke ich dir gleich separat über unseren internen Kanal.",
      rest: "Ansonsten sollte alles wie besprochen sein.",
      signoff: "Viele Grüße",
      sender: "Daniel",
      halted: "Versand angehalten",
      severity: "Hohes Risiko",
      reason:
        "Diese E-Mail enthält vertrauliche interne Verhandlungsparameter. Da ein externer Lieferant in Kopie steht, kann der Versand die kommerzielle Strategie offenlegen.",
      apply: "Regelkonforme Formulierung übernehmen",
      fixed: "Formulierung übernommen.",
      compliant: "Die Nachricht ist regelkonform.",
      send: "Senden",
      sent: "Gesendet.",
      safe: "Das Risiko hat das Unternehmen nie verlassen.",
      again: "Noch einmal",
      checking: "SafeRail prüft …",
    },
    footer: {
      imprint: "IMPRESSUM",
      privacy: "DATENSCHUTZ",
      back: "Zurück zu SafeRail",
    },
    privacy: {
      lastUpdated: "Zuletzt aktualisiert: Juni 2026",
      title: "Datenschutzerklärung",
      intro:
        "SafeRail AI („wir“, „unser“ oder „uns“) verpflichtet sich, Ihre Privatsphäre zu schützen. Diese Datenschutzerklärung erläutert, wie wir Ihre Daten erfassen, verwenden und schützen, wenn Sie die SafeRail-AI-Chrome-Erweiterung und unsere Dienste nutzen.",
      sections: [
        {
          id: "information-we-collect",
          number: "01",
          title: "Welche Informationen wir erfassen",
          paragraphs: [
            {
              label: "Textinhalte",
              text: "SafeRail AI verarbeitet Texte, die Sie in Webformulare oder Nachrichten eingeben, um Compliance- und Sicherheitsanalysen durchzuführen. Diese Verarbeitung erfolgt je nach Konfiguration in Echtzeit oder beim Klicken auf „Senden“.",
            },
            {
              label: "Benutzereinstellungen",
              text: "Einstellungen wie Ihren bevorzugten Evaluierungsmodus, das Design und API-Endpunkte speichern wir lokal auf Ihrem Gerät mithilfe der Chrome Storage API.",
            },
          ],
        },
        {
          id: "how-we-use-information",
          number: "02",
          title: "Wie wir Informationen verwenden",
          paragraphs: [
            {
              text: "Die Textinhalte dienen ausschließlich der Sicherheitsanalyse, dem Erkennen von Verstößen und dem Vorschlagen alternativer Formulierungen. Wir verwenden Ihre Texte weder für Marketing und Werbung noch für andere Zwecke außerhalb der Kernfunktionen der SafeRail-AI-Erweiterung.",
            },
          ],
        },
        {
          id: "data-transmission-and-storage",
          number: "03",
          title: "Datenübertragung und Speicherung",
          paragraphs: [
            {
              label: "Übertragung",
              text: "Textinhalte werden über sichere HTTPS-Verbindungen an die von Ihnen konfigurierten API-Endpunkte (z. B. Gemini, Ollama) übertragen, um Sicherheitsanalysen durchzuführen.",
            },
            {
              label: "Speicherung",
              text: "Wir speichern Ihre Textinhalte nicht dauerhaft. Benutzereinstellungen bleiben lokal auf Ihrem Gerät und werden nicht auf unsere Server hochgeladen, es sei denn, eine von Ihnen ausdrücklich aktivierte Funktion erfordert dies (z. B. synchronisierte Cloud-Einstellungen).",
            },
          ],
        },
        {
          id: "data-security",
          number: "04",
          title: "Datensicherheit",
          paragraphs: [
            {
              text: "Wir setzen branchenübliche Sicherheitsmaßnahmen ein, um Ihre Daten während der Übertragung zu schützen und die lokale Speicherung gemäß den Best Practices für Chrome-Erweiterungen zu handhaben.",
            },
          ],
        },
        {
          id: "your-choices",
          number: "05",
          title: "Ihre Wahlmöglichkeiten",
          paragraphs: [
            {
              text: "Sie können zwischen den Evaluierungsmodi „Echtzeit“ und „Beim Senden“ wählen. Außerdem können Sie die Erweiterung jederzeit über die Chrome-Erweiterungsverwaltung deaktivieren.",
            },
          ],
        },
        {
          id: "changes-to-this-policy",
          number: "06",
          title: "Änderungen dieser Datenschutzerklärung",
          paragraphs: [
            {
              text: "Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Über Änderungen informieren wir Sie, indem wir die neue Datenschutzerklärung auf dieser Seite veröffentlichen.",
            },
          ],
        },
        {
          id: "contact-us",
          number: "07",
          title: "Kontakt",
          paragraphs: [
            {
              text: "Wenn Sie Fragen zu dieser Datenschutzerklärung haben, kontaktieren Sie uns bitte unter",
            },
          ],
        },
      ],
    },
  },
  en: {
    metadata: {
      title: "SafeRail – Compliance before an email becomes a risk",
      description:
        "SafeRail checks outgoing emails in real time, explains risks in context, and suggests compliant wording.",
      privacyTitle: "Privacy Policy | SafeRail AI",
    },
    nav: {
      label: "Main navigation",
      product: "Product",
      control: "Controls",
      security: "Security",
      privacy: "Privacy",
      demo: "Request a demo",
    },
    hero: {
      title: "Compliance, before an email becomes a",
      highlight: "risk",
      end: ".",
      description:
        "SafeRail checks outgoing emails in real time, explains risks in context, and suggests compliant wording. At the moment it can still make a difference: before you hit send.",
      infrastructure: "Runs locally on your infrastructure",
    },
    flow: {
      draft: "Draft",
      recipient: "Recipient",
      checking: "SafeRail checks",
      email: "EMAIL",
    },
    risks: {
      headline: "No one sends a risky email on purpose.",
      description:
        "It happens between meetings. Antitrust law, GDPR, and internal policies must be reflected in every sentence—and often the mistake only becomes clear once the email is out and can barely be taken back.",
      rows: [
        {
          before: "“Our ",
          highlight: "internal target margin is 42%",
          after: "; we won't go lower.”",
          label: "Confidential · Supplier in Cc",
        },
        {
          before: "“Let's ",
          highlight: "coordinate prices with the competition in advance",
          after: ".”",
          label: "Antitrust",
        },
        {
          before: "“Attached is ",
          highlight: "the customer list with dates of birth",
          after: " for your review.”",
          label: "GDPR",
        },
        {
          before: "“With this investment, ",
          highlight: "you can't go wrong",
          after: ".”",
          label: "Required disclaimer missing",
        },
      ],
      note: "Example wording for illustrative purposes.",
    },
    product: {
      lead: "An intelligent guardrail built into the email workflow. It steps in only when needed—and then in three steps.",
      steps: [
        {
          title: "Identify",
          description:
            "SafeRail checks the message against internal policies and external requirements.",
        },
        {
          title: "Explain",
          description:
            "Users immediately understand which passage creates a risk and why.",
        },
        {
          title: "Resolve",
          description:
            "A compliant alternative helps users finish the message safely.",
        },
      ],
    },
    control: {
      audience: "For compliance and legal teams",
      headline: "Roll out policies centrally. Spot patterns. Improve compliance.",
      activity: "Recent activity",
      activityDescription:
        "Recent incidents by user, policy type, severity, and date.",
      warning: "WARNING",
      violation: "VIOLATION",
      investmentRule:
        "Investment mentions must include the disclaimer “Capital at risk.”",
      privacyRule:
        "Personal data must not be shared—directly or indirectly.",
      features: [
        {
          title: "Policy management",
          description:
            "Configure policies for user groups and departments in just a few steps.",
        },
        {
          title: "Targeted enforcement",
          description:
            "Apply requirements to outgoing emails by role and team.",
        },
        {
          title: "Transparency",
          description:
            "See common cases and trends in a central dashboard.",
        },
      ],
    },
    security: {
      headline: "Runs on your systems.",
      highlight: "Not ours.",
      description:
        "SafeRail is designed to process data locally on your infrastructure. Your data stays under your control.",
      infrastructure: "Your infrastructure",
      server: "Internal server",
      serverDescription:
        "Checks messages against your policies using optimized Llama models.",
      extension: "Browser extension",
      extensionDescription:
        "Shows risks and suggested corrections directly in the email workflow.",
    },
    experts: {
      headline: "Built in collaboration with experts.",
      supportedBy: "Supported by",
      board: "Advisory board",
      advisors: [
        ["Anna De Stefano", "Women of Legaltech 2020"],
        ["Dr. Antje Johst", "Legal, Zalando"],
        ["Dr. Marcus Feil", "20+ years in corporate law"],
      ],
    },
    contact: {
      headline: "Before the next email goes out.",
      description:
        "In a short demo, we'll show you how SafeRail detects, explains, and resolves risks in your email workflow.",
      name: "Name",
      email: "Business email",
      sending: "Sending …",
      success: "Thank you. Your request has been sent to SafeRail.",
      error:
        "We couldn't send your request. Please try again later or contact kiyan@saferail.io.",
    },
    demo: {
      ariaLabel: "SafeRail email demo",
      newMessage: "NEW MESSAGE",
      subject: "Re: Q3 terms",
      to: "To",
      cc: "Cc",
      external: "external",
      greeting: "Hi Sarah,",
      message:
        "Please use the internal target margin of 42% for negotiations and do not go below an 18% purchase discount.",
      riskyPrefix: "Please use the",
      riskyText:
        "internal target margin of 42% for negotiations and do not go below an 18% purchase discount",
      rewrite:
        "I’ll send you the negotiation parameters separately via our internal channel.",
      rest: "Everything else should be as discussed.",
      signoff: "Best regards,",
      sender: "Daniel",
      halted: "Sending paused",
      severity: "High risk",
      reason:
        "This email contains confidential internal negotiation parameters. Because an external supplier is copied, sending it could reveal the company's commercial strategy.",
      apply: "Apply compliant wording",
      fixed: "Wording updated.",
      compliant: "The message is compliant.",
      send: "Send",
      sent: "Sent.",
      safe: "The risk never left the company.",
      again: "Again",
      checking: "SafeRail is checking …",
    },
    footer: {
      imprint: "LEGAL NOTICE",
      privacy: "PRIVACY",
      back: "Back to SafeRail",
    },
    privacy: {
      lastUpdated: "Last updated: June 2026",
      title: "Privacy Policy",
      intro:
        "SafeRail AI (“we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the SafeRail AI Chrome Extension and our services.",
      sections: [
        {
          id: "information-we-collect",
          number: "01",
          title: "Information We Collect",
          paragraphs: [
            {
              label: "Text Content",
              text: 'SafeRail AI processes the text you type into web forms or messages to perform compliance and safety analysis. This processing happens in real time or when you click "Send", depending on your evaluation configuration.',
            },
            {
              label: "User Preferences",
              text: "We store your settings, such as your preferred Evaluation Mode, Theme, and API Endpoints, locally on your device using Chrome's storage API.",
            },
          ],
        },
        {
          id: "how-we-use-information",
          number: "02",
          title: "How We Use Information",
          paragraphs: [
            {
              text: "The text content is used solely to provide safety analysis, identify violations, and offer rewriting suggestions. We do not use your text for marketing, advertising, or any purpose other than providing the core functionality of the SafeRail AI extension.",
            },
          ],
        },
        {
          id: "data-transmission-and-storage",
          number: "03",
          title: "Data Transmission and Storage",
          paragraphs: [
            {
              label: "Transmission",
              text: "Text content is transmitted over secure HTTPS connections to the API endpoints you have configured (e.g., Gemini, Ollama) to process safety analyses.",
            },
            {
              label: "Storage",
              text: "We do not permanently store your text content. User preferences are stored locally on your device and are not uploaded to our servers unless specifically required by features you explicitly opt in to (such as cloud-synced settings).",
            },
          ],
        },
        {
          id: "data-security",
          number: "04",
          title: "Data Security",
          paragraphs: [
            {
              text: "We implement industry-standard security measures to protect your data during transmission and ensure local storage follows Chrome Extension security best practices.",
            },
          ],
        },
        {
          id: "your-choices",
          number: "05",
          title: "Your Choices",
          paragraphs: [
            {
              text: 'You can choose between "Real-time" and "On-Send" evaluation modes. You can also disable the extension at any time through the Chrome Extensions manager.',
            },
          ],
        },
        {
          id: "changes-to-this-policy",
          number: "06",
          title: "Changes to This Policy",
          paragraphs: [
            {
              text: "We may update this Privacy Policy from time to time. We will notify you of changes by posting the new Privacy Policy on this page.",
            },
          ],
        },
        {
          id: "contact-us",
          number: "07",
          title: "Contact Us",
          paragraphs: [
            {
              text: "If you have any questions about this Privacy Policy, please contact us at",
            },
          ],
        },
      ],
    },
  },
} as const;

export function getCopy(language: Language) {
  return copy[language];
}
