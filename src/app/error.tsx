"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-8">
      <div className="ticket animate-pop relative w-full overflow-hidden p-6 text-center">
        <div className="stripes-ink pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 -rotate-3 place-items-center rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 text-white shadow-[0_3px_0_#5c0716] ring-2 ring-cream">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="label mt-4 text-orange-700">Ups, mesin macet</p>
          <h1 className="mt-2 font-display text-[30px] leading-none text-navy-800">
            Ada yang salah
          </h1>
          <p className="mx-auto mt-2.5 max-w-[17rem] text-[12.5px] leading-relaxed text-ink-soft">
            Terjadi kesalahan tak terduga. Coba muat ulang, foto yang sudah
            tersimpan di Arsip tetap aman.
          </p>
          <div className="perf my-4" aria-hidden="true" />
          <Button variant="accent" size="lg" className="w-full" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> Coba Lagi
          </Button>
        </div>
      </div>
    </main>
  );
}
