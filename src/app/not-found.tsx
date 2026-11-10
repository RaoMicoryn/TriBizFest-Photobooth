import Link from "next/link";
import { Camera, TicketX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-8">
      <div className="ticket animate-pop relative w-full overflow-hidden p-6 text-center">
        <div className="stripes-ink pointer-events-none absolute inset-0 opacity-50" />
        <span
          aria-hidden="true"
          className="outline-year pointer-events-none absolute -right-1 -top-2 select-none font-display text-[96px] leading-none opacity-60"
        >
          404
        </span>
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 -rotate-3 place-items-center rounded-2xl bg-navy-800 text-cream shadow-[0_3px_0_#080926] ring-2 ring-cream">
            <TicketX className="h-6 w-6" />
          </span>
          <p className="label mt-4 text-orange-700">Tiket tidak valid</p>
          <h1 className="mt-2 font-display text-[30px] leading-none text-navy-800">
            Halaman tidak ketemu
          </h1>
          <p className="mx-auto mt-2.5 max-w-[17rem] text-[12.5px] leading-relaxed text-ink-soft">
            Link-nya mungkin salah atau sudah dipindah. Yuk balik ke photobooth
            dan mulai sesi baru.
          </p>
          <div className="perf my-4" aria-hidden="true" />
          <Link
            href="/"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 text-[15px] font-bold text-white shadow-[0_3px_0_#5c0716,0_16px_30px_-14px_rgba(200,16,46,0.75)] ring-1 ring-inset ring-white/20 transition active:translate-y-[1px] active:shadow-[0_1px_0_#5c0716]"
          >
            <Camera className="h-5 w-5" /> Ke Photobooth
          </Link>
        </div>
      </div>
    </main>
  );
}
