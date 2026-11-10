"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Download,
  Frame,
  Sparkles,
  Check,
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
}[] = [
  { key: "upload", label: "Foto", icon: <Camera className="w-[18px] h-[18px]" />, path: "/" },
  { key: "frame", label: "Bingkai", icon: <Frame className="w-[18px] h-[18px]" />, path: "/frame-selection" },
  { key: "export", label: "Unduh", icon: <Download className="w-[18px] h-[18px]" />, path: "/export" },
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
  const { framedImage } = usePhotobooth();

  let currentStep: StepKey = propStep ?? "upload";
  if (!propStep) {
    if (pathname === "/export") currentStep = "export";
    else if (pathname === "/frame-selection") currentStep = "frame";
  }

  const currentIndex = ORDER.indexOf(currentStep);
  const currentMeta = STEPS[currentIndex];
  const progress = ((currentIndex + 1) / ORDER.length) * 100;

  return (
    <div className="relative min-h-dvh flex flex-col overflow-x-hidden">
      {/* Decorative floating blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-[42%] bg-navy-300/40 blur-3xl animate-float" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-[42%] bg-orange-300/30 blur-3xl animate-float [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-[42%] bg-orange-200/25 blur-3xl animate-float [animation-delay:4s]" />
      </div>

      {/* Top bar */}
      <header className="relative z-20 safe-top">
        <div className="mx-auto w-full max-w-md px-5 pt-4">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Kembali"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-white/70 bg-white/70 text-ink-soft shadow-sm backdrop-blur transition hover:bg-white hover:text-ink active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}

            <div className="flex flex-1 items-center gap-2">
              <span className="grid h-10 w-10 -rotate-3 place-items-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-700/30 ring-2 ring-white">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <span className="font-display text-xl leading-none tracking-wide text-navy-700">
                Photobooth
              </span>
            </div>

            <span className="rounded-full border border-navy-200/70 bg-white/70 px-3 py-1 text-[11px] font-bold text-navy-600 backdrop-blur">
              {currentIndex + 1}/{ORDER.length}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">
                  Langkah {currentIndex + 1} dari {ORDER.length}
                </p>
                <h1 className="mt-0.5 font-display text-[26px] leading-tight tracking-wide text-navy-700">
                  {title ?? (currentStep === "upload" ? "Mulai" : currentMeta.label)}
                </h1>
              </div>
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      i <= currentIndex
                        ? "w-6 bg-gradient-to-r from-navy-600 to-navy-500"
                        : "w-3 bg-navy-200",
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy-700 via-navy-500 to-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <div className="mx-auto w-full max-w-md px-5 pb-32 pt-6">
          <div className="animate-fade-up">{children}</div>
        </div>
      </main>

      {/* Floating bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.9rem)]">
        <nav className="mx-auto flex w-full max-w-md items-center gap-1 rounded-[24px] border border-white/80 bg-white/85 p-1.5 shadow-float backdrop-blur-xl">
          {STEPS.map((s, i) => {
            const active = s.key === currentStep;
            // Unduh only makes sense once a framed result exists.
            const disabled = s.key === "export" && !framedImage;
            return (
              <button
                key={s.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  haptic("tap");
                  if (onStepClick?.(s.key)) return;
                  if (!active) router.push(s.path);
                }}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-2 transition-all duration-200",
                  active
                    ? "bg-gradient-to-br from-navy-600 to-navy-500 text-white shadow-md shadow-navy-500/30"
                    : "text-ink-soft hover:bg-navy-50",
                  disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <span className="grid place-items-center">
                  {i < currentIndex ? (
                    <Check className="w-[18px] h-[18px]" />
                  ) : (
                    s.icon
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">
                  {s.label}
                </span>
                {active && (
                  <span className="absolute -top-0.5 h-1 w-6 rounded-full bg-white/80" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
