"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Camera,
  Check,
  Loader2,
  Sparkles,
  ZoomIn,
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
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-7 text-center shadow-soft backdrop-blur-xl animate-fade-up">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-navy-100 text-navy-500">
            <ImageIcon className="h-6 w-6" />
          </span>
          <h3 className="text-base font-bold text-ink">Bingkai belum tersedia</h3>
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
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft backdrop-blur-xl animate-fade-up">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-100 text-orange-600">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-ink">Pilih Bingkai</h3>
            <p className="text-xs text-muted">
              {userImages.length
                ? `Ketuk untuk mencoba bingkai · ${userImages.length} foto siap`
                : "Ketuk untuk memilih bingkai"}
            </p>
          </div>
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
                className={`group flex w-full items-center gap-3.5 rounded-[22px] border-2 p-2.5 pr-3.5 text-left transition-all duration-200 active:scale-[0.99] animate-fade-up ${
                  isSelected
                    ? "border-orange-500 bg-orange-50/60 shadow-md shadow-orange-500/15"
                    : "border-navy-100/70 bg-white hover:border-orange-300 hover:shadow-sm"
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Live thumbnail: each window shows its own photo. */}
                <div
                  className="relative h-[96px] shrink-0 overflow-hidden rounded-xl bg-navy-100 ring-1 ring-black/10"
                  style={{ aspectRatio: `${option.width} / ${option.height}` }}
                >
                  {option.windows.map((win, winIndex) => {
                    const photo = userImages[winIndex] ?? userImages[0];
                    return (
                      <div
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
                          <div className="flex h-full w-full items-center justify-center bg-navy-100 text-navy-300">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <img
                    src={option.src}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={`text-sm font-bold ${
                        isSelected ? "text-orange-700" : "text-ink"
                      }`}
                    >
                      {option.name}
                    </p>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                      {option.windows.length} foto
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {option.description}
                  </p>
                </div>

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
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-navy-50 py-3 text-sm font-semibold text-navy-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan bingkai...
          </div>
        )}
      </div>
      )}

      {!userImages.length && (
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 text-center shadow-soft backdrop-blur-xl animate-fade-up">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-600">
            <Camera className="h-5 w-5" />
          </span>
          <p className="text-sm font-bold text-ink">Belum ada foto</p>
          <p className="mx-auto mt-1 max-w-[240px] text-xs leading-relaxed text-muted">
            Ambil foto dulu, lalu pilih bingkai yang kamu mau.
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
          className="scroll-mt-4 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-float backdrop-blur-xl animate-pop"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-navy-100 text-navy-600">
              <ImageIcon className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-ink">Atur Foto</h3>
          </div>
          <p className="mb-3 pl-10 text-[11px] text-muted">
            Geser foto untuk mengatur bagian yang masuk bingkai, lalu tambah stiker biar makin seru
          </p>

          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative mx-auto w-full max-w-[420px] touch-none select-none overflow-hidden rounded-[18px] bg-white shadow-inner ring-1 ring-black/5 ${
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

          {/* Mode switch */}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-navy-50 p-1">
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
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-95 ${
                  editMode === tab.key
                    ? "bg-white text-navy-700 shadow-sm"
                    : "text-muted"
                }`}
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
          <div className="mt-4 flex items-center gap-3">
            <ZoomOut className="h-4 w-4 shrink-0 text-orange-500" />
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              aria-label="Zoom foto"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-orange-100 accent-orange-600"
            />
            <ZoomIn className="h-4 w-4 shrink-0 text-orange-500" />
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
              className={embedded ? "w-full" : undefined}
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
        </div>
      )}
    </div>
  );
}
