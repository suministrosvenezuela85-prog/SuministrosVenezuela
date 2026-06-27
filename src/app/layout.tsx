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
  metadataBase: new URL("https://suministrosvenezuela.com"),
  title: "Suministros SOS 🇻🇪 — Coordinación de Insumos (Iniciativa Ciudadana)",
  description:
    "Plataforma colaborativa e independiente, creada de civiles para civiles en Venezuela, para coordinar la entrega de insumos en centros de acopio y refugios durante contingencias. Sin fines de lucro ni afiliaciones. Optimizada para redes 3G y uso offline.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  openGraph: {
    title: "Suministros SOS 🇻🇪 — Iniciativa Ciudadana de Civiles para Civiles",
    description:
      "Plataforma colaborativa e independiente para coordinar en tiempo real la entrega de insumos en centros de acopio y refugios en Venezuela. De civiles para civiles.",
    url: "https://suministrosvenezuela.com",
    type: "website",
    locale: "es_VE",
    siteName: "Suministros SOS Venezuela",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Suministros SOS Venezuela — Iniciativa Ciudadana Independiente",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Suministros SOS 🇻🇪 — De Civiles para Civiles",
    description:
      "Plataforma independiente y colaborativa para coordinar insumos en centros de acopio y refugios en Venezuela.",
    images: ["/og-image.png"],
  },
  other: {
    "theme-color": "#0f172a",
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
