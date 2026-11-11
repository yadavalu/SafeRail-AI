import type { Metadata } from "next";
import Brand from "@/components/Brand";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | SafeRail AI",
  description:
    "How SafeRail AI collects, uses, and safeguards your information.",
};

type PolicySection = {
  id: string;
  number: string;
  title: string;
  paragraphs: { label?: string; text: string }[];
};

const sections: PolicySection[] = [
  {
    id: "information-we-collect",
    number: "01",
    title: "Information We Collect",
    paragraphs: [
      {
        label: "Text Content",
        text: 'SafeRail AI processes the text you type into web forms or messages to perform compliance and safety analysis. This processing happens in real-time or upon clicking "Send," depending on your evaluation configuration.',
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
        text: "Text content is transmitted over secure HTTPS connections to the API endpoints you have configured (e.g., Gemini, Ollama) for the purpose of processing safety analyses.",
      },
      {
        label: "Storage",
        text: "We do not store your text content permanently. User preferences are stored locally on your device and are not uploaded to our servers unless specifically required by features you explicitly opt-in to (such as cloud-synced settings).",
      },
    ],
  },
  {
    id: "data-security",
    number: "04",
    title: "Data Security",
    paragraphs: [
      {
        text: "We implement industry-standard security measures to protect your data during transmission and ensure that local storage is handled according to Chrome Extension security best practices.",
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
        text: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.",
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
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <header className="privacy-header">
        <Brand href="/" />
      </header>

      <main className="privacy-main" lang="en">
        <div className="privacy-updated">Last updated: June 2026</div>
        <h1>Privacy Policy</h1>
        <p className="privacy-intro">
          SafeRail AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
          committed to protecting your privacy. This Privacy Policy explains
          how we collect, use, and safeguard your information when you use the
          SafeRail AI Chrome Extension and our services.
        </p>

        <nav className="privacy-nav" aria-label="Privacy policy sections">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.number} {section.title}
            </a>
          ))}
        </nav>

        {sections.map((section) => (
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
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.label ?? paragraph.text}>
                  {paragraph.label && <strong>{paragraph.label}: </strong>}
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
              ))}
            </div>
          </section>
        ))}
      </main>

      <Footer />
    </>
  );
}
