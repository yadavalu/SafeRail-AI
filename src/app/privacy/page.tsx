import type { Metadata } from "next";
import PrivacyPolicyContent from "@/components/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | SafeRail AI",
  description:
    "Wie SafeRail AI Ihre Daten erfasst, verwendet und schützt.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
