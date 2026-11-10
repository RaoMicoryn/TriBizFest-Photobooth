/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Camera, Download, Sparkles, TicketX } from "lucide-react";
import { getShare } from "@/lib/share-store";

export const metadata: Metadata = {
  title: "Foto Photobooth — Tribiz Fest 2026",
  robots: { index: false, follow: false },
};

// Same look as <Button variant="accent" size="lg"> / variant="outline" (that one is a
// client component and these are links, so the classes live here).
const ctaAccent =
  "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 text-[15px] font-bold text-white shadow-[0_3px_0_#5c0716,0_16px_30px_-14px_rgba(200,16,46,0.75)] ring-1 ring-inset ring-white/20 transition active:translate-y-[1px] active:shadow-[0_1px_0_#5c0716]";
const ctaOutline =
  "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ink/12 bg-white/85 text-[13px] font-bold text-ink shadow-soft transition hover:bg-white hover:border-ink/20 active:scale-[0.99]";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ src?: string | string[] }>;

/** Only images that live in Vercel Blob are allowed (no open redirects/hotlinks). */
function safeBlobUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function PhotoContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { src } = await searchParams;

  let imageUrl: string | null = null;
  let downloadUrl: string | null = null;

  if (id === "b") {
    const blobUrl = safeBlobUrl(Array.isArray(src) ? src[0] : src);
    if (blobUrl) {
      imageUrl = blobUrl;
      downloadUrl = `${blobUrl}${blobUrl.includes("?") ? "&" : "?"}download=1`;
    }
  } else if (getShare(id)) {
    imageUrl = `/api/share/${id}`;
    downloadUrl = `/api/share/${id}?download=1`;
  }

  if (!imageUrl || !downloadUrl) {
    return (
      <div className="ticket animate-pop relative w-full overflow-hidden p-6 text-center">
        <div className="stripes-ink pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 -rotate-3 place-items-center rounded-2xl bg-navy-800 text-cream shadow-[0_3px_0_#080926] ring-2 ring-cream">
            <TicketX className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-[26px] leading-none text-navy-800">
            Link tidak ditemukan
          </p>
          <p className="mx-auto mt-2.5 max-w-[17rem] text-[12.5px] leading-relaxed text-ink-soft">
            Link mungkin sudah kedaluwarsa. Minta temanmu membuat kode QR baru
            dari halaman Unduh.
          </p>
          <div className="perf my-4" aria-hidden="true" />
          <Link href="/" className={ctaOutline}>
            <Camera className="h-4 w-4" /> Buka Photobooth
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Polaroid-style print, same treatment as the export preview */}
      <div className="relative w-full px-2">
        <span
          className="tape -top-2.5 left-1/2 w-[86px] -translate-x-1/2 -rotate-2"
          aria-hidden="true"
        />
        <div className="animate-pop rotate-[0.6deg] rounded-[6px] bg-white p-2.5 pb-8 shadow-print ring-1 ring-ink/5">
          <img
            src={imageUrl}
            alt="Hasil photobooth Tribiz Fest 2026"
            className="h-auto w-full rounded-[2px]"
          />
          <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
            <span className="font-serif-i text-[14px] leading-none text-ink-soft">
              setiap cerita
            </span>
            <span className="font-mono text-[9px] font-bold tracking-[0.18em] text-muted">
              TF · 2026
            </span>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3">
        <a href={downloadUrl} download className={ctaAccent}>
          <Download className="h-5 w-5" /> Unduh Foto
        </a>
        <Link href="/" className={ctaOutline}>
          <Camera className="h-4 w-4" /> Bikin photobooth-mu sendiri
        </Link>
      </div>

      {/* Ticket-stub tip */}
      <div className="relative w-full rounded-2xl border border-dashed border-ink/25 bg-white/60 px-4 py-3">
        <p className="label-sm text-orange-700">Tips iPhone</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
          Kalau tombol unduh tidak menyimpan otomatis, tekan lama gambar lalu
          pilih &ldquo;Simpan ke Foto&rdquo;.
        </p>
      </div>
    </>
  );
}

export default function SharedPhotoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      {/* Ambient festival glow, same as the app shell */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-navy-300/30 blur-3xl" />
        <div className="absolute -right-28 top-1/3 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl" />
        <div className="absolute bottom-4 left-1/4 h-64 w-64 rounded-full bg-orange-200/25 blur-3xl" />
      </div>

      <main className="safe-top safe-bottom relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-6 px-5 py-6">
        <header className="mt-2 flex w-full items-center gap-2.5">
          <span className="relative grid h-11 w-11 shrink-0 -rotate-3 place-items-center rounded-[14px] bg-navy-800 text-cream shadow-[0_3px_0_#080926] ring-2 ring-cream">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-cream" />
          </span>
          <span>
            <span className="block font-display text-[21px] leading-none tracking-wide text-navy-800">
              PHOTOBOOTH
            </span>
            <span className="label-sm mt-1.5 block text-muted">Tribiz Fest · 2026</span>
          </span>
        </header>

        <div className="w-full text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-5 bg-orange-600/60" />
            <p className="label text-orange-700">Kiriman dari temanmu</p>
            <span className="h-px w-5 bg-orange-600/60" />
          </div>
          <h1 className="headline-ink mt-2.5 font-display text-[40px] leading-none">
            Foto kamu siap!
          </h1>
        </div>

        {/* Runtime data (params / searchParams) must sit inside Suspense with cacheComponents. */}
        <Suspense
          fallback={
            <div className="w-full px-2">
              <div className="h-80 w-full animate-pulse rounded-[6px] bg-white/80 shadow-print" />
            </div>
          }
        >
          <PhotoContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
