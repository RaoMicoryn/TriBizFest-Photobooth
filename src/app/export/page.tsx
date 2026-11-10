"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadSection } from "@/components/DownloadSection";
import { PhotoboothShell } from "@/components/PhotoboothShell";
import { readPhotoboothState, usePhotobooth } from "@/lib/photobooth-context";
import { useRouter } from "next/navigation";

export default function ExportPage() {
  const { framedImage, reset } = usePhotobooth();
  const router = useRouter();

  useEffect(() => {
    // `framedImage` is stale during the hydration render — use the store.
    if (!readPhotoboothState().framedImage) router.replace("/");
  }, [router]);

  // Nothing to export yet: show a placeholder while the effect above redirects.
  if (!framedImage) {
    return (
      <PhotoboothShell step="export" title="Unduh Hasil">
        <div className="card h-[26rem] animate-pulse" aria-busy="true" />
      </PhotoboothShell>
    );
  }

  return (
    <PhotoboothShell step="export" title="Unduh Hasil">
      <div className="space-y-4">
        <DownloadSection />

        <div className="card animate-fade-up stagger-3 flex items-center justify-between gap-3 p-3.5">
          <div className="min-w-0">
            <p className="label-sm text-muted">Sesi selesai?</p>
            <p className="mt-1.5 font-serif-i text-[15px] leading-none text-navy-800">
              Ambil momen berikutnya
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              reset();
              router.push("/");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Mulai Baru
          </Button>
        </div>
      </div>
    </PhotoboothShell>
  );
}
