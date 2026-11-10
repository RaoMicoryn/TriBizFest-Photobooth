/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { getShare } from "@/lib/share-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Foto Photobooth — Tribiz Fest 2026",
  robots: { index: false, follow: false },
};

export default async function SharedPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getShare(id);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-5 py-8">
      <h1 className="font-display text-3xl tracking-wide text-navy-700">
        Foto kamu siap!
      </h1>

      {entry ? (
        <>
          <div className="w-full overflow-hidden rounded-[24px] bg-white p-2 shadow-float ring-1 ring-black/5">
            <img
              src={`/api/share/${id}`}
              alt="Hasil photobooth Tribiz Fest 2026"
              className="h-auto w-full rounded-[18px]"
            />
          </div>
          <a
            href={`/api/share/${id}?download=1`}
            download
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-base font-bold text-white shadow-lg shadow-orange-600/30 active:scale-[0.98]"
          >
            Unduh Foto
          </a>
          <p className="text-center text-xs leading-relaxed text-muted">
            Kalau tombol unduh tidak menyimpan otomatis (iPhone), tekan lama
            gambar lalu pilih &ldquo;Simpan ke Foto&rdquo;. Link ini aktif
            selama 30 menit.
          </p>
        </>
      ) : (
        <div className="w-full rounded-[24px] bg-white p-6 text-center shadow-soft">
          <p className="text-base font-bold text-ink">Link sudah kedaluwarsa</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Foto hanya disimpan 30 menit. Minta temanmu membuat kode QR baru
            dari halaman Unduh.
          </p>
        </div>
      )}
    </main>
  );
}
