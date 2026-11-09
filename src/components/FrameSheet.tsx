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
        className={`absolute inset-0 bg-navy-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${
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
        <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-float backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-600">
                <Frame className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h3 className="text-sm font-bold leading-tight text-ink">
                  Pilih Bingkai
                </h3>
                <p className="text-[11px] text-muted">
                  Pratinjau kamera langsung ikut berubah
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-9 w-9 place-items-center rounded-full bg-navy-50 text-ink-soft transition hover:bg-navy-100 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {FRAME_OPTIONS.map((option) => {
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
                  className={`relative shrink-0 rounded-2xl border-2 p-1.5 text-left transition active:scale-[0.98] ${
                    isActive
                      ? "border-orange-500 bg-orange-50"
                      : "border-navy-100 bg-white hover:border-orange-300"
                  }`}
                >
                  <div
                    className="relative h-20 overflow-hidden rounded-xl bg-navy-100 ring-1 ring-black/10"
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
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                  <p
                    className={`mt-1.5 max-w-[170px] truncate px-0.5 text-[11px] font-bold ${
                      isActive ? "text-orange-700" : "text-ink"
                    }`}
                  >
                    {option.name} · {option.windows.length} foto
                  </p>
                  {isActive && (
                    <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-orange-600 text-white shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
