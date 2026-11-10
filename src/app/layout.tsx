import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Lilita_One } from "next/font/google";
import "./globals.css";
import { PhotoboothProvider } from "@/lib/photobooth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const lilita = Lilita_One({
  variable: "--font-lilita",
  weight: "400",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const TITLE = "Photobooth · Tribiz Fest 2026";
const DESCRIPTION =
  "Photobooth Tribiz Fest 2026 langsung dari HP: foto berurutan, bingkai seru, 20 stiker & aksesori, lalu unduh atau scan QR.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Photobooth",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Tribiz Fest 2026",
    locale: "id_ID",
    type: "website",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Photobooth", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d0e3c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      data-smooth-scroll
      className={`${geistSans.variable} ${geistMono.variable} ${lilita.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <PhotoboothProvider>{children}</PhotoboothProvider>
      </body>
    </html>
  );
}
