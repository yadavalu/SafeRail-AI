import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeRail – Compliance, bevor eine E-Mail zum Risiko wird",
  description:
    "SafeRail prüft ausgehende E-Mails in Echtzeit, erklärt Risiken im Kontext und schlägt regelkonforme Formulierungen vor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
