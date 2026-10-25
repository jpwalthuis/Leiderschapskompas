import type { Metadata, Viewport } from "next";
import { RICHTING, STANDAARDTAAL, vertaal } from "@/i18n";
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
    { media: "(prefers-color-scheme: light)", color: "#F3F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1520" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={STANDAARDTAAL} dir={RICHTING[STANDAARDTAAL]}>
      <body>{children}</body>
    </html>
  );
}
