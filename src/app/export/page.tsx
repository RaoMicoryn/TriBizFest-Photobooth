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

  if (!framedImage) return null;

  return (
    <PhotoboothShell step="export" title="Unduh Hasil">
      <div className="space-y-5">
        <DownloadSection />

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            reset();
            router.push("/");
          }}
        >
          <RefreshCw className="h-4 w-4" /> Mulai Photobooth Baru
        </Button>
      </div>
    </PhotoboothShell>
  );
}
