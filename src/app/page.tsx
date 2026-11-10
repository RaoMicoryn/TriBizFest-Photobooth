"use client";

import { Sparkles, Camera, AlertCircle, Smile, Film, QrCode } from "lucide-react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { HistorySection } from "@/components/HistorySection";
import { PhotoboothShell } from "@/components/PhotoboothShell";
import { usePhotobooth } from "@/lib/photobooth-context";

export default function UploadPage() {
  const { error } = usePhotobooth();

  return (
    <PhotoboothShell step="upload" title="Mulai" showBack={false}>
      <div className="space-y-4">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[30px] bg-navy-700 p-5 pb-6 text-white shadow-float animate-pop sm:p-7">
          <div className="polka absolute inset-0" />
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-orange-400/30 blur-2xl" />
          <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-orange-600/35 blur-2xl" />

          {/* Floating stars */}
          <span className="star-shape animate-twinkle absolute right-6 top-5 h-7 w-7 bg-orange-400" />
          <span className="star-shape animate-twinkle absolute right-16 top-14 h-4 w-4 bg-white [animation-delay:0.6s]" />
          <span className="star-shape animate-wiggle absolute bottom-5 right-7 h-9 w-9 bg-orange-600 ring-2 ring-white" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-navy-700">
              <Sparkles className="h-3.5 w-3.5 text-orange-600" /> Lensa Abadi
            </span>
            <h2 className="font-display title-sticker mt-4 text-[40px] leading-[0.95] sm:text-5xl">
              TRIBIZ
              <br />
              FEST <span className="text-orange-300">2026</span>
            </h2>
            <p className="mt-3 inline-block rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-md">
              Every tradition tells a story
            </p>
            <p className="mt-3 max-w-[17rem] text-[13px] leading-relaxed text-white/85">
              Foto berurutan, pilih bingkai, tempel stiker &amp; aksesori, lalu
              unduh atau bagikan lewat QR.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {[
                { icon: <Camera className="h-3.5 w-3.5" />, label: "Foto berurutan" },
                { icon: <Smile className="h-3.5 w-3.5" />, label: "20 aksesori" },
                { icon: <Film className="h-3.5 w-3.5" />, label: "Video proses" },
                { icon: <QrCode className="h-3.5 w-3.5" />, label: "Scan QR" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur"
                >
                  {chip.icon}
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 animate-fade-up">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <PhotoUploader />
        <HistorySection />
      </div>
    </PhotoboothShell>
  );
}
