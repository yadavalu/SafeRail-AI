import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  href: string;
  className?: string;
};

export default function Brand({ href, className = "" }: BrandProps) {
  return (
    <Link
      className={`brand-logo ${className}`}
      href={href}
      aria-label="SafeRail"
    >
      <Image
        className="brand-logo-image"
        src="/saferail-wordmark.png"
        alt="SafeRail"
        width={1216}
        height={607}
        priority
      />
    </Link>
  );
}
