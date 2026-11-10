"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Camera,
  Check,
  Loader2,
  ZoomOut,
  RotateCcw,
  Download,
  AlertCircle,
  Plus,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { readPhotoboothState, usePhotobooth } from "@/lib/photobooth-context";
import { useRouter } from "next/navigation";
import { FRAME_OPTIONS, getFrameById, type FrameOption } from "@/lib/frames";
import { renderPhotobooth } from "@/lib/canvas";
import { StickerLayer, StickerPanel } from "@/components/StickerEditor";
import { haptic } from "@/lib/haptics";

/** Width of the stored preview PNG (the export is rendered bigger). */
const PREVIEW_WIDTH = 600;

export function FrameSelector({ embedded = false }: { embedded?: boolean }) {
  const {
    userImages,
    selectedFrameId,
    selectFrame,
    setFramedImage,
    fit,
    setFit,
    rotation,
    zoom,
    offsetX,
    offsetY,
    setCrop,
    resetCrop,
    setStep,
    setError,
    fillPhotosTo,
  } = usePhotobooth();
  const router = useRouter();

  const [isRendering, setIsRendering] = useState(false);
  const [editMode, setEditMode] = useState<"foto" | "stiker">("foto");
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [imgSizes, setImgSizes] = useState<
    Record<number, { w: number; h: number }>
  >({});
  const previewRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
  } | null>(null);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frame = selectedFrameId ? getFrameById(selectedFrameId) : undefined;
  const requiredPhotos = frame?.windows.length ?? 0;
  const missingPhotos = Math.max(0, requiredPhotos - userImages.length);
  const canDownload = !!frame && missingPhotos === 0;

  useEffect(() => {
    return () => {
      if (renderTimer.current) clearTimeout(renderTimer.current);
    };
  }, []);

  /* ---------------- crop helpers ---------------- */

  /** Displayed photo size as a fraction of its own window box. */
  const dispFor = (
    win: { w: number; h: number },
    index: number,
    zoomValue = zoom,
  ) => {
    const size = imgSizes[index];
    if (!size || !frame) return { w: 1, h: 1 };
    const bw = win.w * frame.width;
    const bh = win.h * frame.height;
    // Each window has its own photo, so the scale is per window. Matches
    // `baseScaleFor` in canvas.ts.
    const base =
      fit === "contain"
        ? Math.min(bw / size.w, bh / size.h)
        : Math.max(bw / size.w, bh / size.h);
    const s = base * zoomValue;
    return { w: (size.w * s) / bw, h: (size.h * s) / bh };
  };

  const clampCrop = (x: number, y: number, zoomValue = zoom) => {
    if (!frame) return { offsetX: 0, offsetY: 0 };
    let maxX = Infinity;
    let maxY = Infinity;
    frame.windows.forEach((win, index) => {
      const disp = dispFor(win, index, zoomValue);
      maxX = Math.min(maxX, Math.max(0, (disp.w - 1) / 2));
      maxY = Math.min(maxY, Math.max(0, (disp.h - 1) / 2));
    });
    if (!Number.isFinite(maxX)) maxX = 0;
    if (!Number.isFinite(maxY)) maxY = 0;
    return {
      offsetX: Math.max(-maxX, Math.min(maxX, x)),
      offsetY: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const measure = (index: number, el: HTMLImageElement | null) => {
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    if (!w || !h) return;
    setImgSizes((prev) =>
      prev[index]?.w === w && prev[index]?.h === h
        ? prev
        : { ...prev, [index]: { w, h } },
    );
  };

  /* ---------------- rendering ---------------- */

  const renderNow = useCallback(async () => {
    const s = readPhotoboothState();
    if (!s.userImages.length || !s.selectedFrameId) return;
    const activeFrame = getFrameById(s.selectedFrameId);
    if (!activeFrame) return;
    if (s.userImages.length < activeFrame.windows.length) return;
    setIsRendering(true);
    try {
      const width = PREVIEW_WIDTH;
      const height = Math.round(
        (PREVIEW_WIDTH * activeFrame.height) / activeFrame.width,
      );
      const canvas = await renderPhotobooth({
        userImages: s.userImages,
        frameSrc: activeFrame.src,
        frameWidth: width,
        frameHeight: height,
        windows: activeFrame.windows,
        bleed: activeFrame.bleed,
        fit: s.fit,
        rotation: s.rotation,
        zoom: s.zoom,
        offsetX: s.offsetX,
        offsetY: s.offsetY,
        stickers: s.stickers,
      });
      setFramedImage(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error(err);
      setError("Gagal merender bingkai. Coba pilih bingkai lain.");
    } finally {
      setIsRendering(false);
    }
  }, [setFramedImage, setError]);

  const scheduleRender = () => {
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => {
      renderTimer.current = null;
      void renderNow();
    }, 350);
  };

  const handleSelect = async (option: FrameOption) => {
    selectFrame(option.id);
    await renderNow();
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // On the merged photo step, preselect the first frame so the preview and the
  // Unduh button are ready right after a photo is taken.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || selectedFrameId) return;
    const first = FRAME_OPTIONS[0];
    if (!first) return;
    autoSelected.current = true;
    selectFrame(first.id);
  }, [selectedFrameId, selectFrame]);

  // Re-render whenever the photo is replaced (or the frame changes), so
  // "Ganti Foto" immediately refreshes the framed preview.
  useEffect(() => {
    if (!selectedFrameId || !userImages.length) return;
    const timer = window.setTimeout(() => void renderNow(), 0);
    return () => window.clearTimeout(timer);
  }, [selectedFrameId, userImages, renderNow]);

  /* ---------------- drag to pan ---------------- */

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!frame) return;
    // Tapping empty space deselects a sticker; photo panning only in "Foto" mode.
    setSelectedSticker(null);
    if (editMode !== "foto") return;
    const s = readPhotoboothState();
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: s.offsetX,
      oy: s.offsetY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer / unsupported capture — dragging still works */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!d || !rect || !frame) return;
    const win = frame.windows[0];
    const next = clampCrop(
      d.ox + (e.clientX - d.px) / (win.w * rect.width),
      d.oy + (e.clientY - d.py) / (win.h * rect.height),
    );
    setCrop(next);
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    scheduleRender();
  };

  /* ---------------- zoom / fit ---------------- */

  const applyZoom = (value: number) => {
    const next = clampCrop(offsetX, offsetY, value);
    setCrop({ zoom: value, ...next });
    scheduleRender();
  };

  const toggleFit = () => {
    setFit(fit === "cover" ? "contain" : "cover");
    setCrop({ offsetX: 0, offsetY: 0 });
    scheduleRender();
  };

  return (
    <div className="space-y-5">
      {FRAME_OPTIONS.length === 0 && (
        <div className="card animate-fade-up p-7 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-navy-100 text-navy-500">
            <ImageIcon className="h-6 w-6" />
          </span>
          <h3 className="font-display text-[20px] text-navy-800">Bingkai belum tersedia</h3>
          <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted">
            Desain bingkai baru sedang disiapkan. Foto yang sudah kamu unggah
            tetap tersimpan.
          </p>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              setStep("upload");
              router.push("/");
            }}
          >
            Kembali ke Foto
          </Button>
        </div>
      )}

      {FRAME_OPTIONS.length > 0 && (
      <div className="card animate-fade-up p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-ink/10 bg-cream font-display text-[16px] text-navy-800 shadow-sm">
              02
            </span>
            <div>
              <h3 className="font-display text-[19px] leading-none text-navy-800">
                Pilih Bingkai
              </h3>
              <p className="mt-1 text-[10.5px] text-muted">
                {userImages.length
                  ? `Ketuk untuk mencoba · ${userImages.length} foto siap`
                  : "Ketuk untuk memilih bingkai"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-ink/10 bg-white px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-600">
            {FRAME_OPTIONS.length} gaya
          </span>
        </div>

        <div className="space-y-2.5">
          {FRAME_OPTIONS.map((option, idx) => {
            const isSelected = selectedFrameId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                aria-pressed={isSelected}
                className={`group relative flex w-full items-center gap-3 rounded-[18px] border-2 p-2 pr-3 text-left transition-all duration-200 active:translate-y-[1px] animate-fade-up ${
                  isSelected
                    ? "border-navy-800 bg-cream shadow-[0_3px_0_rgba(20,16,42,0.85)]"
                    : "border-ink/10 bg-white/75 hover:border-orange-300 hover:bg-white"
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-11 top-0.5 font-display text-[38px] leading-none text-navy-900/[0.06]"
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Live thumbnail: each window shows its own photo. */}
                <span className="relative shrink-0 rounded-[11px] bg-white p-1 shadow-sm ring-1 ring-ink/10">
                  <span
                    className="relative block h-[92px] overflow-hidden rounded-[7px] bg-navy-100"
                    style={{ aspectRatio: `${option.width} / ${option.height}` }}
                  >
                    {option.windows.map((win, winIndex) => {
                      const photo = userImages[winIndex] ?? userImages[0];
                      return (
                        <span
                          key={winIndex}
                          className="absolute overflow-hidden"
                          style={{
                            left: `${win.x * 100}%`,
                            top: `${win.y * 100}%`,
                            width: `${win.w * 100}%`,
                            height: `${win.h * 100}%`,
                          }}
                        >
                          {photo ? (
                            <img
                              src={photo}
                              alt=""
                              aria-hidden="true"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-navy-100 text-navy-300">
                              <ImageIcon className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                      );
                    })}
                    <img
                      src={option.src}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </span>
                  {isSelected && (
                    <span className="absolute -left-1.5 -top-1.5 -rotate-6 rounded-[3px] border-2 border-orange-600/80 bg-cream px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-orange-700 shadow-sm">
                      Dipilih
                    </span>
                  )}
                </span>

                <span className="relative min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`font-display text-[16px] leading-none ${
                        isSelected ? "text-navy-800" : "text-ink"
                      }`}
                    >
                      {option.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                        isSelected
                          ? "bg-orange-600 text-white"
                          : "bg-navy-50 text-navy-600"
                      }`}
                    >
                      {option.windows.length} foto
                    </span>
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-[10.5px] leading-relaxed text-muted">
                    {option.description}
                  </span>
                </span>

                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-orange-600 bg-orange-600 text-white animate-pop"
                      : "border-navy-200 text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        {isRendering && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-cream py-3 text-[11px] font-bold text-navy-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan bingkai...
          </div>
        )}
      </div>
      )}

      {!userImages.length && (
        <div className="card animate-fade-up p-6 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 text-white shadow-[0_3px_0_#5c0716]">
            <Camera className="h-6 w-6" />
          </span>
          <p className="font-display text-[21px] text-navy-800">Belum ada foto</p>
          <p className="mx-auto mt-1.5 max-w-[250px] text-xs leading-relaxed text-muted">
            Ambil foto dulu, lalu pilih bingkai yang kamu mau. Bingkainya bisa
            diganti kapan saja.
          </p>
          <Button
            variant="accent"
            className="mt-4 w-full"
            onClick={() => {
              setStep("upload");
              router.push("/");
            }}
          >
            <Camera className="h-4 w-4" /> Ambil Foto
          </Button>
        </div>
      )}

      {frame && userImages.length > 0 && (
        <div
          ref={previewRef}
          className="card scroll-mt-4 animate-pop overflow-hidden shadow-float"
        >
          <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-navy-800 text-cream shadow-[0_2px_0_#080926]">
                <ImageIcon className="h-[17px] w-[17px]" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[19px] leading-none text-navy-800">
                  Atur Foto
                </h3>
                <p className="mt-1.5 truncate text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">
                  Geser · zoom · tempel stiker
                </p>
              </div>
            </div>
            <span className="max-w-[8rem] shrink-0 truncate rounded-full border border-ink/10 bg-cream px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-navy-700">
              {frame.name}
            </span>
          </div>

          <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f7ecd3,#fbf3df)] px-3 py-5 sm:px-4">
            <div className="relative mx-auto w-full max-w-[420px]">
              <span className="tape -top-2.5 left-6 -rotate-6" aria-hidden="true" />
              <span className="tape -top-2.5 right-6 rotate-6" aria-hidden="true" />
              <div
                ref={boxRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`artboard mx-auto w-full touch-none select-none ${
                  editMode === "foto" ? "cursor-grab active:cursor-grabbing" : ""
                }`}
                style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
              >
            {frame.bleed && (
              <img
                src={userImages[0]}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            )}
            {frame.windows.map((win, index) => {
              const disp = dispFor(win, index);
              const photo = userImages[index];
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
                  {photo ? (
                    <>
                      {fit === "contain" && (
                        <img
                          src={photo}
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover blur-[6px] brightness-90"
                        />
                      )}
                      <img
                        ref={(el) => measure(index, el)}
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        draggable={false}
                        onLoad={(e) => measure(index, e.currentTarget)}
                        className="pointer-events-none absolute max-w-none select-none"
                        style={{
                          left: `${50 + offsetX * 100}%`,
                          top: `${50 + offsetY * 100}%`,
                          width: `${disp.w * 100}%`,
                          height: `${disp.h * 100}%`,
                          objectFit: Object.keys(imgSizes).length
                            ? undefined
                            : fit,
                          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-navy-50 text-navy-300">
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-[10px] font-bold">
                        Foto {index + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <img
              src={frame.src}
              alt={`Bingkai ${frame.name}`}
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <StickerLayer
              boxRef={boxRef}
              selectedId={selectedSticker}
              onSelect={(id) => {
                setSelectedSticker(id);
                if (id) setEditMode("stiker");
              }}
            />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
          {/* Mode switch */}
          <div className="segmented grid-cols-2">
            {(
              [
                { key: "foto", label: "Atur Foto", icon: <ImageIcon className="h-4 w-4" /> },
                { key: "stiker", label: "Stiker & Aksesori", icon: <Smile className="h-4 w-4" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  haptic("tap");
                  setEditMode(tab.key);
                  if (tab.key === "foto") setSelectedSticker(null);
                }}
                aria-pressed={editMode === tab.key}
                className="seg-btn"
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {missingPhotos > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2 text-xs font-medium text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Bingkai ini butuh {requiredPhotos} foto, baru ada{" "}
                  {userImages.length}. Ambil foto lagi lewat kamera, atau pakai
                  foto yang sama.
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => fillPhotosTo(requiredPhotos)}
                >
                  Pakai Foto Sama
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => {
                    if (embedded) {
                      document
                        .getElementById("photo-uploader")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      setStep("upload");
                      router.push("/");
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Foto Lagi
                </Button>
              </div>
            </div>
          )}

          {editMode === "stiker" && (
            <div className="mt-4 animate-fade-up">
              <StickerPanel
                selectedId={selectedSticker}
                onSelect={setSelectedSticker}
              />
            </div>
          )}

          {editMode === "foto" && (
          <>
          {/* Zoom */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink/8 bg-cream/60 px-3 py-1">
            <ZoomOut className="h-4 w-4 shrink-0 text-orange-600" />
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              aria-label="Zoom foto"
              className="range-fest"
            />
            <span className="w-8 shrink-0 text-right font-mono text-[9px] font-bold text-navy-600">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={toggleFit}
              title="Tampilkan seluruh foto"
            >
              {fit === "cover" ? "Muat Semua" : "Isi Penuh"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => {
                resetCrop();
                scheduleRender();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          </>
          )}

          <div className={embedded ? "mt-4" : "mt-4 grid grid-cols-2 gap-2"}>
            {!embedded && (
              <Button
                variant="outline"
                className="h-[52px]"
                onClick={() => {
                  setStep("upload");
                  router.push("/");
                }}
              >
                Kembali
              </Button>
            )}
            <Button
              variant="accent"
              className={`h-[52px] ${embedded ? "w-full" : ""}`}
              disabled={!canDownload}
              onClick={async () => {
                // Flush any pending debounced render so the export preview
                // matches the latest crop the user just set.
                if (renderTimer.current) {
                  clearTimeout(renderTimer.current);
                  renderTimer.current = null;
                }
                haptic("success");
                await renderNow();
                setStep("export");
                router.push("/export");
              }}
            >
              {canDownload ? (
                <>
                  Unduh Hasil <Download className="w-4 h-4" />
                </>
              ) : (
                <>Foto Belum Siap</>
              )}
            </Button>
          </div>
          <p className="mt-2.5 text-center text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">
            PNG · resolusi tinggi · siap cetak
          </p>
          </div>
        </div>
      )}
    </div>
  );
}
