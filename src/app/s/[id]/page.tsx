/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import type { Metadata } from "next";
import { getShare } from "@/lib/share-store";

export const metadata: Metadata = {
  title: "Foto Photobooth — Tribiz Fest 2026",
  robots: { index: false, follow: false },
};

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
      <div className="w-full rounded-[24px] bg-white p-6 text-center shadow-soft">
        <p className="text-base font-bold text-ink">Link tidak ditemukan</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Link mungkin sudah kedaluwarsa. Minta temanmu membuat kode QR baru
          dari halaman Unduh.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-hidden rounded-[24px] bg-white p-2 shadow-float ring-1 ring-black/5">
        <img
          src={imageUrl}
          alt="Hasil photobooth Tribiz Fest 2026"
          className="h-auto w-full rounded-[18px]"
        />
      </div>
      <a
        href={downloadUrl}
        download
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-base font-bold text-white shadow-lg shadow-orange-600/30 active:scale-[0.98]"
      >
        Unduh Foto
      </a>
      <p className="text-center text-xs leading-relaxed text-muted">
        Kalau tombol unduh tidak menyimpan otomatis (iPhone), tekan lama gambar
        lalu pilih &ldquo;Simpan ke Foto&rdquo;.
      </p>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-5 py-8">
      <h1 className="font-display text-3xl tracking-wide text-navy-700">
        Foto kamu siap!
      </h1>
      {/* Runtime data (params / searchParams) must sit inside Suspense with cacheComponents. */}
      <Suspense
        fallback={
          <div className="h-72 w-full animate-pulse rounded-[24px] bg-white/70" />
        }
      >
        <PhotoContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
