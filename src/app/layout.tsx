import type { Metadata, Viewport } from "next";
import { RICHTING, STANDAARDTAAL, vertaal } from "@/i18n";
import "@fontsource/cardo/400.css";
import "@fontsource/cardo/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: vertaal("app.naam"),
  description: vertaal("app.omschrijving"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1917" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={STANDAARDTAAL} dir={RICHTING[STANDAARDTAAL]}>
      <body>{children}</body>
    </html>
  );
}
