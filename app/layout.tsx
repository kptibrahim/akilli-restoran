import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Syne, Outfit } from "next/font/google";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400","600","700","800"] });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["300","400","500","600"] });

export const metadata: Metadata = {
  title: "Gastronom AI",
  description: "AI destekli akıllı restoran yönetim sistemi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`h-full ${syne.variable} ${outfit.variable}`}>
      <body className="min-h-full flex flex-col" style={{ background: "var(--ast-bg, #141210)" }}>
        {children}
      </body>
    </html>
  );
}
