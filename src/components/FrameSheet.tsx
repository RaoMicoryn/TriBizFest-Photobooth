"use client";
/* eslint-disable @next/next/no-img-element */

import { Check, Frame, X } from "lucide-react";
import { FRAME_OPTIONS } from "@/lib/frames";
import { usePhotobooth } from "@/lib/photobooth-context";

/**
 * Bottom sheet for picking a frame. It slides up above the floating nav, so
 * the camera preview (and its stream) stays alive while the user switches
 * frames — no route change needed.
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

  return (
    <div
      className={`fixed inset-0 z-30 transition-[visibility] ${
        open ? "visible" : "pointer-events-none invisible delay-300"
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Tutup pilihan bingkai"
        onClick={onClose}
        className={`absolute inset-0 bg-navy-950/45 backdrop-blur-[3px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-x-0 bottom-0 px-4 ${
          variant === "camera"
            ? "pb-[max(env(safe-area-inset-bottom),1rem)]"
            : "pb-[calc(max(env(safe-area-inset-bottom),0.9rem)+4.75rem)]"
        } transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="ticket relative mx-auto w-full max-w-md overflow-hidden p-4">
          {/* ticket notches */}
          <span className="notch absolute -left-[13px] top-[86px] border border-ink/15" aria-hidden="true" />
          <span className="notch absolute -right-[13px] top-[86px] border border-ink/15" aria-hidden="true" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 -rotate-3 place-items-center rounded-[12px] bg-navy-800 text-cream shadow-[0_2px_0_#080926] ring-2 ring-cream">
                <Frame className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="label-sm text-orange-700">Ganti gaya</p>
                <h3 className="mt-1 truncate font-display text-[19px] leading-none text-navy-800">
                  Pilih Bingkai
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

          <div className="perf my-3" aria-hidden="true" />

          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {FRAME_OPTIONS.map((option, idx) => {
              const isActive = activeId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    selectFrame(option.id);
                    onClose();
                  }}
                  aria-pressed={isActive}
                  className={`group relative shrink-0 rounded-[16px] p-1.5 text-left transition active:translate-y-[1px] ${
                    isActive
                      ? "bg-cream ring-2 ring-ink shadow-[0_3px_0_rgba(20,16,42,0.85)]"
                      : "bg-white/70 ring-1 ring-ink/10 hover:ring-orange-300"
                  }`}
                >
                  <div className="relative overflow-hidden rounded-[10px] bg-navy-100">
                    <div
                      className="relative h-20 overflow-hidden bg-navy-100"
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
                        className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </div>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1 top-0.5 font-mono text-[9px] font-bold tracking-widest text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <p
                    className={`mt-1.5 max-w-[170px] truncate px-0.5 text-[10.5px] font-extrabold ${
                      isActive ? "text-navy-800" : "text-ink-soft"
                    }`}
                  >
                    {option.name}
                    <span className="ml-1 font-mono text-[9px] font-bold tracking-wider text-muted">
                      {option.windows.length}×
                    </span>
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

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            Pratinjau kamera langsung ikut berubah
          </p>
        </div>
      </div>
    </div>
  );
}
