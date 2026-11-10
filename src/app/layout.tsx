import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lilita_One } from "next/font/google";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Photobooth — Tribiz Fest 2026",
  description:
    "Photobooth Tribiz Fest 2026 langsung dari HP: foto berurutan, bingkai seru, 20 stiker & aksesori, lalu unduh atau scan QR.",
  appleWebApp: { capable: true, title: "Photobooth", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1f2077",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      className={`${geistSans.variable} ${geistMono.variable} ${lilita.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <PhotoboothProvider>{children}</PhotoboothProvider>
      </body>
    </html>
  );
}
