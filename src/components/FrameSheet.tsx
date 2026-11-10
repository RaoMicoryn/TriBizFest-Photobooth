"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Frame, X } from "lucide-react";
import { FRAME_OPTIONS } from "@/lib/frames";
import { usePhotobooth } from "@/lib/photobooth-context";
import { haptic } from "@/lib/haptics";

/**
 * Frame picker.
 * - Phones: bottom sheet that slides up above the floating nav.
 * - Desktop (md+): centered dialog.
 * Both show a scrollable GRID (no horizontal dragging), can be filtered by the
 * number of photos, and work with the keyboard (arrows / Enter / Esc).
 * The camera preview and its stream stay alive behind it.
 */
export function FrameSheet({
  open,
  onClose,
  variant = "nav",
}: {
  open: boolean;
  onClose: () => void;
  /** "camera" sits at the very bottom (no floating nav under it). */
  variant?: "nav" | "camera";
}) {
  const { selectedFrameId, selectFrame, userImages } = usePhotobooth();
  const activeId = selectedFrameId ?? FRAME_OPTIONS[0]?.id;
  const [filter, setFilter] = useState<number | "all">("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () =>
      Array.from(new Set(FRAME_OPTIONS.map((f) => f.windows.length))).sort(
        (a, b) => a - b,
      ),
    [],
  );
  const visible = FRAME_OPTIONS.filter(
    (f) => filter === "all" || f.windows.length === filter,
  );

  // Scroll the selected frame into view whenever the picker opens.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      gridRef.current
        ?.querySelector<HTMLElement>('[aria-pressed="true"]')
        ?.scrollIntoView({ block: "center", behavior: "auto" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [open]);

  // Esc closes; arrow keys move between frames (works with a mouse-free desktop too).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        return;
      }
      const grid = gridRef.current;
      if (!grid) return;
      const cards = Array.from(
        grid.querySelectorAll<HTMLButtonElement>("[data-frame-card]"),
      );
      if (!cards.length) return;
      e.preventDefault();
      const cols = Math.max(
        1,
        getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      );
      let idx = cards.findIndex((c) => c === document.activeElement);
      if (idx < 0) idx = Math.max(0, cards.findIndex((c) => c.getAttribute("aria-pressed") === "true"));
      const delta =
        e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" ? -cols : cols;
      const next = Math.min(cards.length - 1, Math.max(0, idx + delta));
      cards[next].focus();
      cards[next].scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-30 transition-[visibility] ${
        open ? "visible" : "pointer-events-none invisible delay-300"
      }`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Pilih bingkai"
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Tutup pilihan bingkai"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-navy-950/50 backdrop-blur-[3px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 px-4 md:inset-0 md:flex md:items-center md:justify-center md:p-8 ${
          variant === "camera"
            ? "pb-[max(env(safe-area-inset-bottom),1rem)]"
            : "pb-[calc(max(env(safe-area-inset-bottom),0.9rem)+4.75rem)]"
        } transition-all duration-300 ease-out ${
          open
            ? "translate-y-0 md:scale-100 md:opacity-100"
            : "translate-y-full md:translate-y-0 md:scale-95 md:opacity-0"
        }`}
      >
        <div className="ticket pointer-events-auto relative mx-auto flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden p-4 md:max-h-[86dvh] md:max-w-4xl md:p-6">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 -rotate-3 place-items-center rounded-[12px] bg-navy-800 text-cream shadow-[0_2px_0_#080926] ring-2 ring-cream">
                <Frame className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="label-sm text-orange-700">Ganti gaya</p>
                <h3 className="mt-1 truncate font-display text-[19px] leading-none text-navy-800 md:text-[22px]">
                  Pilih Bingkai
                  <span className="ml-2 font-mono text-[11px] font-bold tracking-wider text-muted">
                    {FRAME_OPTIONS.length} gaya
                  </span>
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-ink-soft shadow-sm transition hover:bg-cream active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filter by number of photos */}
          <div className="no-scrollbar -mx-1 mt-3 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-0.5">
            {(["all", ...counts] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  haptic("tap");
                  setFilter(c);
                }}
                aria-pressed={filter === c}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition active:scale-95 ${
                  filter === c
                    ? "bg-navy-800 text-cream shadow-sm"
                    : "bg-white/80 text-ink-soft ring-1 ring-ink/10 hover:bg-white"
                }`}
              >
                {c === "all" ? "Semua" : `${c} foto`}
              </button>
            ))}
          </div>

          <div className="perf my-3 shrink-0" aria-hidden="true" />

          {/* Grid: scrolls vertically, no dragging needed */}
          <div className="-mr-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div
              ref={gridRef}
              className="grid grid-cols-2 gap-2.5 pb-1 sm:grid-cols-3 md:grid-cols-4 md:gap-3.5"
            >
              {visible.map((option) => {
                const idx = FRAME_OPTIONS.findIndex((f) => f.id === option.id);
                const isActive = activeId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-frame-card
                    onClick={() => {
                      haptic("select");
                      selectFrame(option.id);
                      onClose();
                    }}
                    aria-pressed={isActive}
                    className={`group relative flex flex-col rounded-[16px] p-1.5 text-left outline-none transition active:translate-y-[1px] focus-visible:ring-2 focus-visible:ring-navy-700 md:hover:-translate-y-0.5 ${
                      isActive
                        ? "bg-cream ring-2 ring-ink shadow-[0_3px_0_rgba(20,16,42,0.85)]"
                        : "bg-white/70 ring-1 ring-ink/10 hover:bg-white hover:ring-orange-300 hover:shadow-md"
                    }`}
                  >
                    {/* Fixed-height stage so wide and tall frames line up */}
                    <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-[10px] bg-navy-100 md:h-36">
                      <div
                        className="relative h-full overflow-hidden"
                        style={{ aspectRatio: `${option.width} / ${option.height}` }}
                      >
                        {userImages.length > 0 &&
                          option.windows.map((win, i) => (
                            <img
                              key={i}
                              src={userImages[i] ?? userImages[0]}
                              alt=""
                              aria-hidden="true"
                              className="absolute object-cover"
                              style={{
                                left: `${win.x * 100}%`,
                                top: `${win.y * 100}%`,
                                width: `${win.w * 100}%`,
                                height: `${win.h * 100}%`,
                              }}
                            />
                          ))}
                        <img
                          src={option.src}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="absolute inset-0 h-full w-full"
                        />
                      </div>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1.5 top-1 font-mono text-[9px] font-bold tracking-widest text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <p
                      className={`mt-1.5 truncate px-0.5 text-[11px] font-extrabold ${
                        isActive ? "text-navy-800" : "text-ink-soft"
                      }`}
                    >
                      {option.name}
                    </p>
                    <p className="px-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
                      {option.windows.length} foto
                    </p>

                    {isActive && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-white shadow-[0_2px_0_#5c0716] ring-2 ring-cream">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 && (
              <p className="py-8 text-center text-xs text-muted">
                Belum ada bingkai untuk jumlah foto ini.
              </p>
            )}
          </div>

          <p className="mt-3 hidden shrink-0 items-center justify-center gap-1.5 text-center text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted md:flex">
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            Klik bingkai · panah keyboard untuk pindah · Esc untuk tutup
          </p>
          <p className="mt-3 flex shrink-0 items-center justify-center gap-1.5 text-center text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted md:hidden">
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            Pratinjau kamera langsung ikut berubah
          </p>
        </div>
      </div>
    </div>
  );
}
