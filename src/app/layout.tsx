import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Saferail - Secure Your Communications",
  description: "A smart addon for Outlook and Gmail to keep your emails secure, compliant, and professional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
