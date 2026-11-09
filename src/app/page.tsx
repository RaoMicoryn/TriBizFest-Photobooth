"use client";

import { Sparkles, Camera, Image as ImageIcon, AlertCircle, Wand2 } from "lucide-react";
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
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-900 via-navy-800 to-navy-600 p-5 text-white shadow-float animate-pop sm:rounded-[32px] sm:p-7">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/25 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-orange-300/30 blur-2xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" /> Studio Photobooth
            </span>
            <h2 className="mt-3 text-[22px] font-extrabold leading-tight tracking-tight sm:mt-4 sm:text-[26px]">
              Ciptakan momen <br />
              <span className="text-white drop-shadow">photobooth</span> yang
              tak terlupakan
            </h2>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-white/85 sm:text-sm">
              Ambil foto langsung dari kamera atau pilih dari galeri, lalu lihat
              hasilnya di dalam bingkai.
            </p>

            <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <ImageIcon className="w-3.5 h-3.5" /> Galeri HP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <Camera className="w-3.5 h-3.5" /> Kamera Langsung
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <Wand2 className="w-3.5 h-3.5" /> Bingkai Keren
              </span>
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
