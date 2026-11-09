import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PhotoboothProvider } from "@/lib/photobooth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Photobooth — Studio Momen Aesthetic",
  description:
    "Buat foto photobooth aesthetic langsung dari HP. Unggah atau ambil foto, pilih bingkai, dan unduh hasilnya.",
};

export const viewport: Viewport = {
  themeColor: "#fffbf5",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <PhotoboothProvider>{children}</PhotoboothProvider>
      </body>
    </html>
  );
}
