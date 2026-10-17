import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "IC Green Power · Note spese",
  description: "Registrazione note spese con estrazione AI da scontrini",
  applicationName: "ICGP Spese",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ICGP Spese",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  themeColor: "#1f6b3a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${sourceSans.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
