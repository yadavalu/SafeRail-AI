"use client";

import Brand from "@/components/Brand";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { getCopy } from "@/i18n";

export default function Footer() {
  const { language } = useLocale();
  const text = getCopy(language).footer;

  return (
    <footer className="site-footer">
      <Brand href="/" className="footer-brand" />
      <div className="footer-links">
        <span>{text.imprint}</span>
        <Link href="/privacy">{text.privacy}</Link>
        <span>© {new Date().getFullYear()} SafeRail</span>
      </div>
    </footer>
  );
}
