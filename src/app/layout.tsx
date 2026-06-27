import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suministros SOS 🇻🇪 — Coordinación de Insumos en Emergencias",
  description:
    "Plataforma colaborativa en tiempo real para coordinar la entrega de insumos en centros de acopio y refugios durante contingencias en Venezuela. Optimizada para redes 3G y uso offline.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  openGraph: {
    title: "Suministros SOS 🇻🇪",
    description:
      "Coordinación colaborativa de insumos en centros de acopio y refugios en Venezuela.",
    type: "website",
    locale: "es_VE",
    siteName: "Suministros SOS Venezuela",
  },
  other: {
    "theme-color": "#b91c1c",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
