import Brand from "@/components/Brand";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <Brand href="/" className="footer-brand" />
      <div className="footer-links">
        <span>[IMPRESSUM]</span>
        <Link href="/privacy">DATENSCHUTZ</Link>
        <span>© {new Date().getFullYear()} SafeRail</span>
      </div>
    </footer>
  );
}
