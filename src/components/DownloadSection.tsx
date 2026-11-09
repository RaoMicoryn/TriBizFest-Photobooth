"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import {
  Download,
  QrCode as QrCodeIcon,
  Loader2,
  CheckCircle2,
  Sparkles,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { usePhotobooth } from "@/lib/photobooth-context";
import { renderPhotobooth, canvasToBlob, canvasToThumb } from "@/lib/canvas";
import { getFrameById } from "@/lib/frames";
import { addHistoryItem } from "@/lib/history";
import { downloadFile, shareImageFile, useCanShare } from "@/lib/share";

const EXPORT_WIDTH = 1200;
const FILENAME = "photobooth-hasil.png";

interface ExportResult {
  file: File;
  /** Small JPEG for the history strip. */
  thumb: string;
}

export function DownloadSection() {
  const {
    userImages,
    selectedFrameId,
    fit,
    rotation,
    zoom,
    offsetX,
    offsetY,
    framedImage,
    setError,
  } = usePhotobooth();
  const canShare = useCanShare();
  const [result, setResult] = useState<ExportResult | null>(null);
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState<"download" | "share" | null>(null);
  const savedFileRef = useRef<File | null>(null);
  const currentPageUrl =
    typeof window !== "undefined" ? window.location.href : "";

  // Render the full-size file up front. Share sheets must be opened straight
  // from a tap, so the file has to be ready before the user presses Bagikan.
  useEffect(() => {
    if (!userImages.length || !selectedFrameId) return;
    const frame = getFrameById(selectedFrameId);
    if (!frame) return;
    let cancelled = false;

    (async () => {
      try {
        const canvas = await renderPhotobooth({
          userImages,
          frameSrc: frame.src,
          frameWidth: EXPORT_WIDTH,
          frameHeight: Math.round((EXPORT_WIDTH * frame.height) / frame.width),
          windows: frame.windows,
          bleed: frame.bleed,
          fit,
          rotation,
          zoom,
          offsetX,
          offsetY,
        });
        const blob = await canvasToBlob(canvas);
        const thumb = canvasToThumb(canvas);
        if (!cancelled) {
          setResult({
            file: new File([blob], FILENAME, { type: "image/png" }),
            thumb,
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Gagal menyiapkan file unduhan.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userImages, selectedFrameId, fit, rotation, zoom, offsetX, offsetY, setError]);

  // Remember the result in "Hasil Terakhir" once it was saved or shared.
  const record = () => {
    if (!result || savedFileRef.current === result.file) return;
    savedFileRef.current = result.file;
    addHistoryItem(result.thumb);
  };

  const handleDownload = () => {
    if (!result) return;
    downloadFile(result.file, FILENAME);
    record();
    setDone("download");
  };

  const handleShare = async () => {
    if (!result) return;
    setSharing(true);
    const status = await shareImageFile(result.file);
    setSharing(false);
    if (status === "shared") {
      record();
      setDone("share");
    }
  };

  if (!framedImage) return null;

  const activeFrame = selectedFrameId ? getFrameById(selectedFrameId) : undefined;
  const exportHeight = activeFrame
    ? Math.round((EXPORT_WIDTH * activeFrame.height) / activeFrame.width)
    : EXPORT_WIDTH;
  const preparing = !result;

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl animate-fade-up sm:p-5">
        <div
          className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[22px] bg-white shadow-inner ring-1 ring-black/5 animate-pop"
          style={{
            aspectRatio: activeFrame
              ? `${activeFrame.width} / ${activeFrame.height}`
              : "2 / 3",
          }}
        >
          <img
            src={framedImage}
            alt="Hasil photobooth"
            className="h-full w-full object-cover"
          />
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            {EXPORT_WIDTH} × {exportHeight} px
          </span>
        </div>

        <div className="mt-5 space-y-2.5">
          {canShare && (
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={handleShare}
              disabled={preparing || sharing}
            >
              {preparing || sharing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
              {preparing ? "Menyiapkan file..." : "Bagikan"}
            </Button>
          )}

          <Button
            variant={canShare ? "outline" : "accent"}
            size="lg"
            className="w-full"
            onClick={handleDownload}
            disabled={preparing}
          >
            {preparing && !canShare ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Menyiapkan file...
              </>
            ) : done === "download" ? (
              <>
                <CheckCircle2 className="h-5 w-5" /> Berhasil Diunduh
              </>
            ) : (
              <>
                <Download className="h-5 w-5" /> Download Hasil (PNG)
              </>
            )}
          </Button>
        </div>

        {done && (
          <p className="animate-fade-up mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {done === "share" ? "Terkirim" : `Tersimpan sebagai ${FILENAME}`} ·
            masuk ke Hasil Terakhir
          </p>
        )}
      </div>

      <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 text-center shadow-soft backdrop-blur-xl animate-fade-up stagger-2">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-600/30">
          <QrCodeIcon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-ink">Scan & Bagikan</h3>
        <p className="mx-auto mt-1 max-w-[240px] text-xs leading-relaxed text-muted">
          Pindai kode QR ini di HP lain untuk membuka halaman unduhan foto.
        </p>
        <div className="mt-4 flex justify-center">
          <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
            <QRCodeCanvas value={currentPageUrl} size={190} level="M" />
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
          <Sparkles className="h-3 w-3" /> Siap dibagikan
        </p>
      </div>
    </div>
  );
}
