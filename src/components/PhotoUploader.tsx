"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Loader2,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraScreen } from "@/components/CameraScreen";
import { MAX_PHOTOS, usePhotobooth } from "@/lib/photobooth-context";
import { setLiveClip } from "@/lib/live-recording";
import { downscaleDataUrl } from "@/lib/canvas";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

export function PhotoUploader() {
  const {
    userImages,
    addUserImages,
    clearUserImages,
    fit,
    setFit,
    rotation,
    setRotation,
    resetCrop,
    setStep,
    setError,
  } = usePhotobooth();
  const router = useRouter();

  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const hasPhoto = userImages.length > 0;

  const readFiles = async (files: File[]) => {
    const images = files
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_PHOTOS);
    if (!images.length) {
      setError("File yang dipilih bukan gambar.");
      return;
    }
    setIsReading(true);
    try {
      const smalls = await Promise.all(
        images.map(async (file) =>
          downscaleDataUrl(await fileToDataUrl(file)),
        ),
      );
      // Choosing new photos replaces the old set (kept in the chosen order).
      setLiveClip(null); // photos from the gallery have no selfie recording
      addUserImages(smalls);
    } catch {
      setError("Gagal membaca file gambar. Coba file lain.");
    } finally {
      setIsReading(false);
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void readFiles(files);
  };

  const goToFrame = () => {
    setStep("frame");
    router.push("/frame-selection");
  };

  // Photo came from the fullscreen camera: reset the crop and go straight on
  // to adjusting + downloading it in the frame.
  const handleCameraPhoto = (dataUrls: string[]) => {
    addUserImages(dataUrls);
    resetCrop();
    setRotation(0);
    setFit("cover");
    setCameraOpen(false);
    setStep("frame");
    router.push("/frame-selection");
  };

  const clearAll = () => {
    clearUserImages();
    setRotation(0);
    setFit("cover");
  };

  return (
    <div
      id="photo-uploader"
      className="card animate-fade-up stagger-2 p-4 sm:p-5"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* Card header */}
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-ink/10 bg-cream font-display text-[16px] text-navy-800 shadow-sm">
            01
          </span>
          <div>
            <h3 className="font-display text-[19px] leading-none text-navy-800">
              {hasPhoto ? "Foto Kamu" : "Ambil Foto"}
            </h3>
            <p className="mt-1 text-[10.5px] text-muted">
              {hasPhoto
                ? `${userImages.length} foto · bisa diganti kapan saja`
                : "Pilih cara yang paling nyaman"}
            </p>
          </div>
        </div>
        {hasPhoto ? (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-rose-600 transition hover:bg-rose-100 active:scale-95"
          >
            Hapus
          </button>
        ) : (
          <span className="shrink-0 rounded-full border border-ink/10 bg-white px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-navy-600">
            1–{MAX_PHOTOS} foto
          </span>
        )}
      </div>

      {hasPhoto && (
        <div className="mb-4">
          {/* Film strip of the chosen photos */}
          <div className="filmstrip relative overflow-hidden rounded-2xl px-2.5 pb-[15px] pt-[15px]">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {userImages.map((src, i) => (
                <div
                  key={i}
                  className="relative shrink-0 overflow-hidden rounded-[4px] bg-navy-950 ring-1 ring-white/25"
                >
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    className="h-[86px] w-[68px] object-cover"
                  />
                  <span className="absolute bottom-1 right-1.5 font-mono text-[9px] font-bold tracking-wider text-white/90">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              {userImages.length > 1
                ? `${userImages.length} foto siap dipakai`
                : "Foto siap dipakai"}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-2 text-[10.5px] font-bold text-cream shadow-sm transition hover:bg-navy-700 active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" /> Foto Ulang
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isReading}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-2 text-[10.5px] font-bold text-navy-700 transition hover:border-orange-300 active:scale-95 disabled:opacity-60"
              >
                {isReading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                Galeri
              </button>
            </div>
          </div>

          <div className="segmented mt-3 grid-cols-3">
            <button
              type="button"
              className="seg-btn h-11"
              onClick={() => setRotation(rotation - 90)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Kiri
            </button>
            <button
              type="button"
              className="seg-btn h-11"
              onClick={() => setRotation(rotation + 90)}
            >
              <RotateCw className="h-3.5 w-3.5" /> Kanan
            </button>
            <button
              type="button"
              className="seg-btn h-11"
              onClick={() => setFit(fit === "cover" ? "contain" : "cover")}
            >
              {fit === "cover" ? (
                <Maximize className="h-3.5 w-3.5" />
              ) : (
                <Minimize className="h-3.5 w-3.5" />
              )}
              {fit === "cover" ? "Isi" : "Muat"}
            </button>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="mt-3 w-full"
            onClick={goToFrame}
            disabled={isReading}
          >
            Lanjut Pilih Bingkai <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!hasPhoto && (
        <>
          {/* Big camera ticket */}
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="group relative w-full overflow-hidden rounded-[22px] bg-navy-800 p-3.5 text-left text-cream shadow-[0_4px_0_#080926,0_26px_44px_-26px_rgba(13,14,60,0.9)] ring-1 ring-inset ring-white/10 transition active:translate-y-[2px] active:shadow-[0_2px_0_#080926]"
          >
            <span className="polka pointer-events-none absolute inset-0 opacity-40" />
            <span className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-orange-500/40 blur-2xl" />

            <span className="relative block">
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live camera
                </span>
                <span className="font-mono text-[9px] tracking-[0.18em] text-cream/45">
                  01 / CAM
                </span>
              </span>

              <span className="viewfinder relative mt-2.5 block aspect-[2/1] overflow-hidden rounded-xl bg-navy-950/70 ring-1 ring-white/10">
                <span className="grid-lines absolute inset-0 opacity-40" />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur transition group-active:scale-90">
                    <Camera className="h-5 w-5" />
                  </span>
                </span>
                <span className="vf-br" aria-hidden="true" />
              </span>

              <span className="mt-3 flex items-center justify-between gap-2">
                <span className="block">
                  <span className="block font-display text-[23px] leading-none">
                    Buka Kamera
                  </span>
                  <span className="mt-1 block text-[10.5px] leading-snug text-cream/60">
                    Fullscreen · filter · sesuai bingkai
                  </span>
                </span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-navy-800 shadow-[0_2px_0_rgba(0,0,0,0.4)] transition group-hover:rotate-6">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </span>
            </span>
          </button>

          <div className="my-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="label-sm text-muted">atau</span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isReading}
            className="group flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-white/80 p-3 text-left shadow-sm transition hover:border-orange-300 hover:bg-white active:scale-[0.99] disabled:opacity-60"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-navy-100 transition group-active:scale-90">
              {isReading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold text-ink">
                {isReading ? "Memproses..." : "Upload dari Galeri"}
              </span>
              <span className="mt-0.5 block text-[10.5px] text-muted">
                JPG, PNG, atau WEBP · maks {MAX_PHOTOS} foto
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-orange-600" />
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium text-muted">
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            Tempat terang bikin hasil makin kinclong
          </p>
        </>
      )}

      {cameraOpen && (
        <CameraScreen
          onClose={() => setCameraOpen(false)}
          onUse={handleCameraPhoto}
        />
      )}
    </div>
  );
}
