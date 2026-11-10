"use client";
/* eslint-disable @next/next/no-img-element */

import { haptic } from "@/lib/haptics";
import {
  setLiveClip,
  startLiveRecording,
  type LiveRecorder,
} from "@/lib/live-recording";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Check,
  ChevronDown,
  FlipHorizontal2,
  Frame,
  Loader2,
  RotateCcw,
  SwitchCamera,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FrameSheet } from "@/components/FrameSheet";
import { FRAME_OPTIONS } from "@/lib/frames";
import {
  PHOTO_FILTERS,
  applyFilterToCanvas,
  filterToCss,
  getFilterById,
} from "@/lib/filters";
import { usePhotobooth } from "@/lib/photobooth-context";

const MAX_CAPTURE_DIM = 1600;

/** A <video> bound to a (shared) camera stream. */
function LiveVideo({
  stream,
  className,
  style,
}: {
  stream: MediaStream;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Measures the stage and returns the biggest box of `aspect` that fits in it. */
function useStageBox(aspect: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = Math.max(0, Math.min(size.w, size.h * aspect));
  const h = aspect > 0 ? w / aspect : 0;
  return { ref, box: { w: Math.floor(w), h: Math.floor(h) } };
}

export function CameraScreen({
  onClose,
  onUse,
}: {
  onClose: () => void;
  /**
   * Called once every window of the frame has a photo: the final (filtered,
   * mirrored) photos as data URLs, in window order.
   */
  onUse: (dataUrls: string[]) => void;
}) {
  const { selectedFrameId } = usePhotobooth();
  const previewFrame =
    FRAME_OPTIONS.find((f) => f.id === selectedFrameId) ??
    FRAME_OPTIONS[0] ??
    null;

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mirror, setMirror] = useState(true);
  const [filterId, setFilterId] = useState("normal");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  /** Photos already accepted for the earlier windows of the frame. */
  const [shots, setShots] = useState<string[]>([]);
  const [flashKey, setFlashKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const captureRef = useRef<HTMLVideoElement>(null);
  // Live selfie recording (whole session, mirrored + filtered like the preview).
  const liveRecRef = useRef<LiveRecorder | null>(null);
  const settingsRef = useRef({ mirror: true, filterId: "normal" });
  useEffect(() => {
    settingsRef.current = { mirror, filterId };
  }, [mirror, filterId]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalShots = previewFrame?.windows.length ?? 1;
  const currentShot = shots.length; // 0-based index of the photo being taken
  const isLastShot = currentShot >= totalShots - 1;
  const sequenceStarted = shots.length > 0 || !!captured;

  const aspect = previewFrame ? previewFrame.width / previewFrame.height : 3 / 4;
  const { ref: stageRef, box } = useStageBox(aspect);

  useEffect(() => {
    if (!stream || liveRecRef.current) return;
    setLiveClip(null);
    liveRecRef.current = startLiveRecording(
      () => captureRef.current,
      () => settingsRef.current,
    );
  }, [stream]);

  // Leaving without finishing: drop the recording.
  useEffect(() => {
    return () => {
      liveRecRef.current?.cancel();
      liveRecRef.current = null;
    };
  }, []);

  const filterCss = filterToCss(getFilterById(filterId).params);
  const liveStyle: React.CSSProperties = {
    filter: filterCss === "none" ? undefined : filterCss,
    transform: mirror ? "scaleX(-1)" : undefined,
    transition: "filter 0.25s ease",
  };

  const unsupported =
    typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia;

  /* ---------------- camera lifecycle ---------------- */

  useEffect(() => {
    if (unsupported) return;
    let cancelled = false;
    let acquired: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = s;
        setStream(s);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as { name?: string } | null)?.name;
        setError(
          name === "NotAllowedError"
            ? "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, atau pakai galeri."
            : name === "NotFoundError"
              ? "Kamera tidak ditemukan di perangkat ini."
              : "Tidak bisa mengakses kamera. Silakan gunakan galeri.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, attempt, unsupported]);

  // Hidden, always-playing video: snapshots are taken from this element.
  useEffect(() => {
    const video = captureRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  // Lock page scroll while the camera is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  /* ---------------- actions ---------------- */

  const switchCamera = () => {
    const next = facing === "user" ? "environment" : "user";
    setStream(null);
    setError(null);
    setLoading(true);
    setMirror(next === "user");
    setFacing(next);
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  const capture = () => {
    const video = captureRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const scale = Math.min(
      1,
      MAX_CAPTURE_DIM / Math.max(video.videoWidth, video.videoHeight),
    );
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // What you see is what you get: a mirrored preview gives a mirrored photo.
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    applyFilterToCanvas(canvas, filterId);

    setCaptured(canvas.toDataURL("image/jpeg", 0.92));
    setFlashKey((k) => k + 1);
    haptic("shutter");
  };

  /** Accept the photo in review: go on to the next window, or finish. */
  const acceptShot = async () => {
    if (!captured) return;
    const next = [...shots, captured];
    if (next.length >= totalShots) {
      const rec = liveRecRef.current;
      liveRecRef.current = null;
      setLiveClip(rec ? await rec.stop() : null);
      onUse(next);
      return;
    }
    setShots(next);
    setCaptured(null);
    haptic("select");
  };

  /** Throw away the last accepted photo and shoot that window again. */
  const undoLastShot = () => {
    setCaptured(null);
    setShots((prev) => prev.slice(0, -1));
  };

  /* ---------------- render ---------------- */

  const windows = previewFrame?.windows ?? [{ x: 0, y: 0, w: 1, h: 1 }];
  const showError = error ?? (unsupported
    ? "Browser ini tidak mendukung akses kamera. Silakan gunakan galeri."
    : null);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kamera"
      className={`fixed inset-0 z-[60] flex flex-col overflow-hidden bg-navy-950 text-white ${
        closing ? "animate-cam-out" : "animate-cam-in"
      }`}
      style={{ height: "100dvh" }}
    >
      {/* Cinematic scrims so controls stay readable over any photo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/30 to-transparent"
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup kamera"
          className="cam-pill grid h-11 w-11 place-items-center rounded-full text-white transition active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={!previewFrame || sequenceStarted}
          className="cam-pill flex min-w-0 max-w-[58%] items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold text-white transition active:scale-95 disabled:opacity-0"
        >
          <Frame className="h-3.5 w-3.5 shrink-0 text-gold" />
          <span className="truncate">{previewFrame?.name ?? "Bingkai"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>

        <button
          type="button"
          onClick={() => setMirror((m) => !m)}
          disabled={!!captured}
          aria-pressed={mirror}
          aria-label="Balik cermin"
          className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-90 disabled:opacity-0 ${
            mirror ? "bg-cream text-navy-900 shadow-lg" : "cam-pill text-white"
          }`}
        >
          <FlipHorizontal2 className="h-5 w-5" />
        </button>
      </div>

      {/* Progress for multi-photo frames */}
      {totalShots > 1 && (
        <div className="relative z-10 flex items-center justify-center gap-3 px-4 pb-1">
          <span className="font-mono text-[9px] font-bold tracking-[0.18em] text-cream/60">
            FRAME
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: totalShots }).map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i < currentShot
                    ? "w-2 bg-gold"
                    : i === currentShot
                      ? "w-6 bg-white"
                      : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/85">
            Foto {currentShot + 1} / {totalShots}
          </span>
          {shots.length > 0 && !captured && (
            <button
              type="button"
              onClick={undoLastShot}
              className="cam-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition active:scale-95"
            >
              <RotateCcw className="h-3 w-3" /> Ulang
            </button>
          )}
        </div>
      )}

      {/* Stage */}
      <div ref={stageRef} className="relative min-h-0 flex-1 px-3 py-1">
        <div className="flex h-full w-full items-center justify-center">
          {box.w > 0 && (
            <div
              key={captured ? "review" : "live"}
              className={`relative overflow-hidden rounded-[20px] bg-white shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/20 ${
                captured ? "animate-pop" : ""
              }`}
              style={{ width: box.w, height: box.h }}
            >
              {/* Bleed: the feed also fills the artboard so transparent
                  cut-outs in the artwork show the photo. */}
              {previewFrame?.bleed &&
                (captured ? (
                  <img
                    src={captured}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  stream && (
                    <LiveVideo
                      stream={stream}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={liveStyle}
                    />
                  )
                ))}

              {windows.map((win, index) => {
                const done = index < currentShot;
                const active = index === currentShot;
                return (
                  <div
                    key={index}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${win.x * 100}%`,
                      top: `${win.y * 100}%`,
                      width: `${win.w * 100}%`,
                      height: `${win.h * 100}%`,
                    }}
                  >
                    {done ? (
                      <img
                        src={shots[index]}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                      />
                    ) : active ? (
                      captured ? (
                        <img
                          src={captured}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        stream && (
                          <LiveVideo
                            stream={stream}
                            className="h-full w-full object-cover"
                            style={liveStyle}
                          />
                        )
                      )
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-navy-900 to-black text-white/40">
                        <span className="font-display text-[26px] leading-none">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[8.5px] font-extrabold uppercase tracking-[0.22em]">
                          Menunggu
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {previewFrame && (
                <img
                  src={previewFrame.src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  onError={() => setError(`Gambar bingkai tidak ditemukan: ${previewFrame.src}. Pastikan folder public/frames ikut ter-copy, lalu restart npm run dev.`)}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Loading / error */}
        {!captured && !stream && !showError && loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-white/80">
            <Loader2 className="h-7 w-7 animate-spin" />
            Mengaktifkan kamera...
          </div>
        )}
        {showError && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <div className="animate-pop w-full max-w-xs rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
              <AlertCircle className="mx-auto h-8 w-8 text-orange-400" />
              <p className="mt-3 text-sm font-medium leading-relaxed text-white/90">
                {showError}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Tutup
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={retry}
                  disabled={unsupported}
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Shutter flash */}
        {flashKey > 0 && (
          <div
            key={flashKey}
            className="animate-shutter-flash pointer-events-none absolute inset-0 bg-white"
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
        <div className="rounded-[26px] border border-white/70 bg-cream/97 p-3 shadow-[0_-18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {captured ? (
            <div className="animate-slide-up-soft grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                size="lg"
                className="border-ink/15 bg-white text-ink hover:bg-white"
                onClick={() => setCaptured(null)}
              >
                <RotateCcw className="h-4 w-4" /> Ulangi
              </Button>
              <Button variant="accent" size="lg" onClick={acceptShot}>
                <Check className="h-5 w-5" />
                {isLastShot ? "Pakai Foto" : `Lanjut Foto ${currentShot + 2}`}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                <span className="label-sm text-muted">Filter</span>
                <span className="font-mono text-[9px] tracking-[0.18em] text-muted">
                  TRIBIZ · CAM
                </span>
              </div>
              <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
                {PHOTO_FILTERS.map((f) => {
                  const active = f.id === filterId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterId(f.id)}
                      aria-pressed={active}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                        active
                          ? "animate-chip-pop bg-navy-800 text-cream shadow-sm"
                          : "border border-ink/10 bg-white/80 text-ink-soft hover:border-orange-300"
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  disabled={!previewFrame || sequenceStarted}
                  className="flex w-16 flex-col items-center gap-1 justify-self-start text-[9px] font-extrabold uppercase tracking-[0.12em] text-ink-soft transition active:scale-90 disabled:opacity-40"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white text-navy-800 shadow-sm">
                    <Frame className="h-5 w-5" />
                  </span>
                  Bingkai
                </button>

                <button
                  type="button"
                  onClick={capture}
                  disabled={!stream}
                  aria-label="Ambil foto"
                  className="group grid h-[80px] w-[80px] place-items-center rounded-full bg-gradient-to-b from-orange-500 to-orange-700 p-[4px] shadow-[0_4px_0_#5c0716,0_14px_28px_-10px_rgba(200,16,46,0.7)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#5c0716] disabled:opacity-40"
                >
                  <span className="grid h-full w-full place-items-center rounded-full bg-cream">
                    <span className="block h-[58px] w-[58px] rounded-full bg-white ring-1 ring-navy-900/10 transition duration-150 group-active:scale-90" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={switchCamera}
                  className="flex w-16 flex-col items-center gap-1 justify-self-end text-[9px] font-extrabold uppercase tracking-[0.12em] text-ink-soft transition active:scale-90"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white text-navy-800 shadow-sm">
                    <SwitchCamera className="h-5 w-5" />
                  </span>
                  Putar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <FrameSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        variant="camera"
      />

      {/* Invisible source used for snapshots. */}
      <video
        ref={captureRef}
        autoPlay
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>,
    document.body,
  );
}
