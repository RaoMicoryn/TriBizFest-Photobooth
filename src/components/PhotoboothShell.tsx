"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Download,
  Frame,
  Sparkles,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/components/ui/button";
import { usePhotobooth } from "@/lib/photobooth-context";
import { haptic } from "@/lib/haptics";

export type StepKey = "upload" | "frame" | "export";

const STEPS: {
  key: StepKey;
  label: string;
  icon: React.ReactNode;
  path: string;
  hint: string;
}[] = [
  {
    key: "upload",
    label: "Foto",
    icon: <Camera className="h-[17px] w-[17px]" />,
    path: "/",
    hint: "Mulai dari sini",
  },
  {
    key: "frame",
    label: "Bingkai",
    icon: <Frame className="h-[17px] w-[17px]" />,
    path: "/frame-selection",
    hint: "Pilih gayamu",
  },
  {
    key: "export",
    label: "Unduh",
    icon: <Download className="h-[17px] w-[17px]" />,
    path: "/export",
    hint: "Siap dibagikan",
  },
];

const ORDER: StepKey[] = ["upload", "frame", "export"];

interface PhotoboothShellProps {
  children: React.ReactNode;
  step?: StepKey;
  title?: string;
  showBack?: boolean;
  /**
   * Called when a nav tab is tapped. Return true to say "handled" and skip the
   * default route change (used by the camera page to open the frame sheet
   * without leaving the page, so the camera keeps running).
   */
  onStepClick?: (key: StepKey) => boolean | void;
}

export function PhotoboothShell({
  children,
  step: propStep,
  title,
  showBack = true,
  onStepClick,
}: PhotoboothShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { framedImage, error, setError } = usePhotobooth();

  let currentStep: StepKey = propStep ?? "upload";
  if (!propStep) {
    if (pathname === "/export") currentStep = "export";
    else if (pathname === "/frame-selection") currentStep = "frame";
  }

  const currentIndex = ORDER.indexOf(currentStep);
  const currentMeta = STEPS[currentIndex];
  const heading = title ?? (currentStep === "upload" ? "Mulai" : currentMeta.label);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      {/* Ambient festival glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-navy-300/30 blur-3xl" />
        <div className="absolute -right-28 top-1/3 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl" />
        <div className="absolute bottom-4 left-1/4 h-64 w-64 rounded-full bg-orange-200/25 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="safe-top relative z-20">
        <div className="mx-auto w-full max-w-md px-5 pt-3">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Kembali"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/12 bg-white/80 text-ink-soft shadow-sm backdrop-blur transition hover:bg-white hover:text-ink active:scale-95"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
            ) : null}

            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="relative grid h-11 w-11 shrink-0 -rotate-3 place-items-center rounded-[14px] bg-navy-800 text-cream shadow-[0_3px_0_#080926] ring-2 ring-cream">
                <Sparkles className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-cream" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[21px] leading-none tracking-wide text-navy-800">
                  PHOTOBOOTH
                </span>
                <span className="label-sm mt-1.5 block text-muted">
                  Tribiz Fest · 2026
                </span>
              </span>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink/12 bg-white/80 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-wider text-navy-700 shadow-sm backdrop-blur">
              {String(currentIndex + 1).padStart(2, "0")}
              <span className="text-muted/60">/ 03</span>
            </span>
          </div>

          {/* Title + step rail */}
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-orange-600/60" />
                <p className="label text-orange-700">
                  Langkah {currentIndex + 1} dari {ORDER.length}
                </p>
              </div>
              <h1 className="mt-2 truncate font-display text-[32px] leading-none text-navy-800">
                {heading}
              </h1>
            </div>
            <p className="pb-1 font-serif-i text-[15px] leading-none text-ink-soft/80">
              {currentMeta.hint}
            </p>
          </div>

          <div className="mt-3.5 flex items-stretch gap-1.5">
            {STEPS.map((s, i) => {
              const active = s.key === currentStep;
              const done = i < currentIndex;
              return (
                <div
                  key={s.key}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-1.5 py-1.5 transition-all duration-300",
                    active
                      ? "border-navy-800 bg-navy-800 text-cream shadow-[0_2px_0_#080926]"
                      : done
                        ? "border-orange-300/70 bg-orange-50/80 text-orange-800"
                        : "border-ink/8 bg-white/55 text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold",
                      active
                        ? "bg-cream text-navy-800"
                        : done
                          ? "bg-orange-600 text-white"
                          : "bg-navy-50 text-navy-400",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <div className="mx-auto w-full max-w-md px-5 pb-32 pt-6">
          {/* One place for errors on every step (frame + export set them too). */}
          {error && (
            <div
              role="alert"
              className="animate-pop mb-4 flex items-start gap-3 rounded-2xl border-2 border-rose-600/70 bg-rose-50 p-3.5 shadow-[0_3px_0_rgba(176,14,40,0.35)]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-600 text-white shadow-[0_2px_0_#5c0716]">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 pt-1 text-[12.5px] font-semibold leading-snug text-rose-600">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Tutup pesan"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-rose-600 transition hover:bg-rose-100 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="animate-fade-up">{children}</div>
        </div>
      </main>

      {/* Floating bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.9rem)]">
        <nav className="mx-auto flex w-full max-w-md items-center gap-1.5 rounded-[24px] border border-ink/10 bg-white/93 p-1.5 shadow-float backdrop-blur-xl">
          {STEPS.map((s, i) => {
            const active = s.key === currentStep;
            const done = i < currentIndex;
            // Unduh only makes sense once a framed result exists.
            const disabled = s.key === "export" && !framedImage;
            return (
              <button
                key={s.key}
                type="button"
                disabled={disabled}
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  haptic("tap");
                  if (onStepClick?.(s.key)) return;
                  if (!active) router.push(s.path);
                }}
                className={cn(
                  "group relative flex flex-1 items-center justify-center gap-2 rounded-[18px] px-1.5 py-2.5 transition-all duration-200",
                  active
                    ? "bg-gradient-to-b from-navy-700 to-navy-900 text-cream shadow-[0_3px_0_#080926,0_12px_22px_-14px_rgba(13,14,60,0.9)]"
                    : "text-ink-soft hover:bg-navy-50/80 hover:text-navy-800",
                  disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-[11px] transition",
                    active
                      ? "bg-white/12 text-cream"
                      : done
                        ? "bg-orange-100 text-orange-700"
                        : "bg-navy-50 text-navy-500",
                  )}
                >
                  {done ? <Check className="h-[17px] w-[17px]" /> : s.icon}
                </span>
                <span className="text-[11px] font-extrabold leading-none">
                  {s.label}
                </span>
                {active && (
                  <span className="absolute -top-[3px] left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
