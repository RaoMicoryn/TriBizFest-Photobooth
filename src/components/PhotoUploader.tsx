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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraScreen } from "@/components/CameraScreen";
import { MAX_PHOTOS, usePhotobooth } from "@/lib/photobooth-context";
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
      className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl animate-fade-up stagger-2 sm:p-5"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {hasPhoto && (
        <div className="mb-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-ink">Foto Kamu</h3>
              <p className="text-[11px] text-muted">
                {userImages.length} foto · ganti kapan saja
              </p>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 rounded-full bg-rose-50 px-3.5 py-2 text-[11px] font-bold text-rose-500 transition active:scale-95 hover:bg-rose-100"
            >
              Hapus
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-navy-50/40 p-2.5">
            <div
              className={`grid h-24 w-24 shrink-0 gap-0.5 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/10 ${
                userImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {userImages.slice(0, 4).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">
                {userImages.length > 1
                  ? `${userImages.length} foto siap dipakai`
                  : "Foto siap dipakai"}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Atur posisi dan zoom-nya di bagian bingkai.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-bold text-navy-700 ring-1 ring-navy-200 transition active:scale-95 hover:bg-navy-50"
                >
                  <Camera className="h-3.5 w-3.5" /> Foto Ulang
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isReading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-bold text-navy-700 ring-1 ring-navy-200 transition active:scale-95 hover:bg-navy-50 disabled:opacity-60"
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
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => setRotation(rotation - 90)}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Kiri
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => setRotation(rotation + 90)}
            >
              <RotateCw className="w-3.5 h-3.5" /> Kanan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => setFit(fit === "cover" ? "contain" : "cover")}
            >
              {fit === "cover" ? (
                <Maximize className="w-3.5 h-3.5" />
              ) : (
                <Minimize className="w-3.5 h-3.5" />
              )}
              {fit === "cover" ? "Isi" : "Muat"}
            </Button>
          </div>
        </div>
      )}

      {!hasPhoto && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="group relative flex min-h-[168px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[24px] bg-gradient-to-br from-navy-700 via-navy-600 to-navy-500 p-4 text-center text-white shadow-lg shadow-navy-800/30 transition active:scale-[0.97]"
          >
            <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-400/30 blur-2xl" />
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur transition group-active:scale-90">
              <Camera className="h-7 w-7" />
            </span>
            <span className="relative">
              <span className="block text-sm font-extrabold">Buka Kamera</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/75">
                Fullscreen, filter &amp; foto berurutan sesuai bingkai
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isReading}
            className="group flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-navy-200 bg-navy-50/40 p-4 text-center transition active:scale-[0.97] disabled:opacity-60"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-navy-600 shadow-sm ring-1 ring-navy-100 transition group-active:scale-90">
              {isReading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <ImageIcon className="h-7 w-7" />
              )}
            </span>
            <span>
              <span className="block text-sm font-extrabold text-ink">
                {isReading ? "Memproses..." : "Dari Galeri"}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                JPG, PNG, atau WEBP
              </span>
            </span>
          </button>
        </div>
      )}

      {hasPhoto && (
        <Button
          variant="primary"
          size="lg"
          className="mt-1 w-full"
          onClick={goToFrame}
          disabled={isReading}
        >
          Pilih Bingkai <ArrowRight className="w-4 h-4" />
        </Button>
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
