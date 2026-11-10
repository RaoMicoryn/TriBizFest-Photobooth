"use client";

import { Sparkles, Camera, Smile, Film, QrCode, Star } from "lucide-react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { HistorySection } from "@/components/HistorySection";
import { PhotoboothShell } from "@/components/PhotoboothShell";

const MARQUEE = ["Official Photobooth", "Tribiz Fest 2026", "Lensa Abadi", "Chroma Rana"];

export default function UploadPage() {
  return (
    <PhotoboothShell step="upload" title="Mulai" showBack={false}>
      <div className="space-y-4">
        {/* Festival ticket hero */}
        <section className="ticket animate-pop overflow-hidden">
          {/* Marquee strip */}
          <div className="relative overflow-hidden border-b-2 border-ink bg-navy-800 py-2 text-cream">
            <div className="animate-marquee flex w-max items-center">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex shrink-0 items-center gap-5 pr-5" aria-hidden={dup === 1}>
                  {[...Array(3)].flatMap((_, r) =>
                    MARQUEE.map((text) => (
                      <span key={`${r}-${text}`} className="label-sm flex items-center gap-2 whitespace-nowrap text-cream/90">
                        <Star className="h-2.5 w-2.5 fill-gold text-gold" />
                        {text}
                      </span>
                    )),
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="relative px-5 pb-5 pt-5">
            <div className="stripes-ink pointer-events-none absolute inset-0 opacity-50" />
            <span
              aria-hidden="true"
              className="outline-year pointer-events-none absolute -right-2 -top-1 select-none font-display text-[118px] leading-none opacity-60"
            >
              26
            </span>

        <div className="relative flex flex-wrap items-center gap-1.5">
          {["Lensa Abadi", "Chroma Rana"].map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-navy-700 shadow-sm"
            >
              <Sparkles className="h-3 w-3 text-orange-600" /> {name}
            </span>
          ))}
        </div>
            <div className="relative mt-3 flex items-start justify-between gap-2">
              <div className="min-w-0">

                <h2 className="font-display text-[52px] leading-[0.8] text-navy-800">
                  TRIBIZ
                  <br />
                  <span className="text-orange-600">FEST</span>
                </h2>

                <div className="mt-2 flex items-end gap-2">
                  <span className="headline-ink font-display text-[40px] leading-none">
                    2026
                  </span>
                  <span className="font-serif-i pb-0.5 text-[16px] leading-none text-ink-soft">
                    setiap cerita
                  </span>
                </div>
              </div>

              {/* Rubber seal */}
              <div className="relative -mt-10 grid h-[80px] w-[80px] shrink-0 -rotate-6 place-items-center rounded-full border-2 border-orange-700/80 bg-orange-50 text-orange-700 shadow-[0_2px_0_rgba(20,16,42,0.15)]">
                <span className="absolute inset-[5px] rounded-full border border-dashed border-orange-700/45" />
                <span className="text-center">
                  <span className="block text-[7.5px] font-extrabold tracking-[0.16em]">EST 2026</span>
                  <Star className="mx-auto my-0.5 h-3.5 w-3.5 fill-orange-600 stroke-orange-600" />
                  <span className="block text-[7.5px] font-extrabold tracking-[0.14em]">TRIBIZ</span>
                </span>
              </div>
            </div>

            <p className="relative mt-3 max-w-[19rem] text-[12.5px] leading-relaxed text-ink-soft">
              Foto berurutan, pilih bingkai, tempel stiker &amp; aksesori, lalu
              unduh atau bagikan lewat QR.
            </p>

            <div className="relative mt-4 grid grid-cols-2 gap-1.5">
              {[
                { icon: <Camera className="h-3.5 w-3.5" />, label: "Foto berurutan" },
                { icon: <Smile className="h-3.5 w-3.5" />, label: "20 aksesori" },
                { icon: <Film className="h-3.5 w-3.5" />, label: "Video proses" },
                { icon: <QrCode className="h-3.5 w-3.5" />, label: "Scan QR" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white/85 px-2.5 py-2 text-[10px] font-bold text-ink-soft shadow-sm"
                >
                  <span className="text-orange-600">{chip.icon}</span>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Ticket stub */}
          <div className="relative border-t-2 border-dashed border-ink/20 px-5 py-3">
            <span className="notch absolute -left-[13px] top-0 -translate-y-1/2 border border-ink/15" aria-hidden="true" />
            <span className="notch absolute -right-[13px] top-0 -translate-y-1/2 border border-ink/15" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-sm text-ink-soft/80">Admit one · photobooth</p>
                <p className="mt-1 font-mono text-[10px] font-semibold tracking-[0.18em] text-navy-700">
                  TF-2026-0001
                </p>
              </div>
              <div className="barcode w-24" aria-hidden="true" />
            </div>
          </div>
        </section>

        <PhotoUploader />
        <HistorySection />
      </div>
    </PhotoboothShell>
  );
}
