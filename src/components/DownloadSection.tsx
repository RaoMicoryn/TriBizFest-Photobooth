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
  Film,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { usePhotobooth } from "@/lib/photobooth-context";
import { renderPhotobooth, canvasToBlob, canvasToThumb } from "@/lib/canvas";
import { getFrameById } from "@/lib/frames";
import { addHistoryItem } from "@/lib/history";
import { downloadFile, shareImageFile, useCanShare } from "@/lib/share";
import { canRecordVideo, createProcessVideo } from "@/lib/timelapse";
import { haptic } from "@/lib/haptics";

const EXPORT_WIDTH = 1200;
const FILENAME = "photobooth-hasil.png";

interface ExportResult {
  file: File;
  /** Small JPEG for the history strip + on-screen preview. */
  thumb: string;
}

type QrState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

interface VideoResult {
  file: File;
  url: string;
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
    stickers,
    framedImage,
    setError,
  } = usePhotobooth();
  const canShare = useCanShare();
  const [result, setResult] = useState<ExportResult | null>(null);
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState<"download" | "share" | null>(null);
  const [qr, setQr] = useState<QrState>({ status: "idle" });
  const [qrAttempt, setQrAttempt] = useState(0);
  const [video, setVideo] = useState<VideoResult | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const savedFileRef = useRef<File | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const [videoSupported, setVideoSupported] = useState(false);

  useEffect(() => {
    // Feature detection must run on the client only (hydration-safe).
    const t = window.setTimeout(() => setVideoSupported(canRecordVideo()), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

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
          stickers,
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
  }, [userImages, selectedFrameId, fit, rotation, zoom, offsetX, offsetY, stickers, setError]);

  // Upload the finished image so the QR code can point at a real download page.
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    const t = window.setTimeout(() => setQr({ status: "uploading" }), 0);
    (async () => {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: result.file,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { id: string };
        if (!cancelled) {
          setQr({ status: "ready", url: `${window.location.origin}/s/${data.id}` });
        }
      } catch {
        if (!cancelled) {
          setQr({
            status: "error",
            message: "Kode QR belum bisa dibuat. Cek koneksi lalu coba lagi.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [result, qrAttempt]);

  // Remember the result in "Hasil Terakhir" once it was saved or shared.
  const record = () => {
    if (!result || savedFileRef.current === result.file) return;
    savedFileRef.current = result.file;
    addHistoryItem(result.thumb);
  };

  const handleDownload = () => {
    if (!result) return;
    haptic("success");
    downloadFile(result.file, FILENAME);
    record();
    setDone("download");
  };

  const handleShare = async () => {
    if (!result) return;
    haptic("tap");
    setSharing(true);
    const status = await shareImageFile(result.file);
    setSharing(false);
    if (status === "shared") {
      haptic("success");
      record();
      setDone("share");
    }
  };

  const makeVideo = async () => {
    if (!selectedFrameId || videoBusy) return;
    const frame = getFrameById(selectedFrameId);
    if (!frame) return;
    haptic("select");
    setVideoBusy(true);
    setVideoProgress(0);
    setVideoError(null);
    try {
      const out = await createProcessVideo(
        {
          userImages,
          frameSrc: frame.src,
          frameWidth: frame.width,
          frameHeight: frame.height,
          windows: frame.windows,
          bleed: frame.bleed,
          fit,
          rotation,
          zoom,
          offsetX,
          offsetY,
          stickers,
        },
        setVideoProgress,
      );
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      const url = URL.createObjectURL(out.blob);
      videoUrlRef.current = url;
      setVideo({
        file: new File([out.blob], `photobooth-proses.${out.ext}`, { type: out.mime }),
        url,
      });
      haptic("success");
    } catch (err) {
      console.error(err);
      setVideoError(
        err instanceof Error ? err.message : "Gagal membuat video. Coba lagi.",
      );
      haptic("warning");
    } finally {
      setVideoBusy(false);
    }
  };

  const shareVideo = async () => {
    if (!video) return;
    try {
      await navigator.share({ files: [video.file], title: "Video Photobooth" });
    } catch {
      /* cancelled or unsupported — the download button is still there */
    }
  };

  if (!framedImage) return null;

  const activeFrame = selectedFrameId ? getFrameById(selectedFrameId) : undefined;
  const exportHeight = activeFrame
    ? Math.round((EXPORT_WIDTH * activeFrame.height) / activeFrame.width)
    : EXPORT_WIDTH;
  const preparing = !result;
  const isLocalHost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl animate-fade-up sm:p-5">
        <div
          className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[22px] bg-white shadow-inner ring-1 ring-black/5 animate-pop"
          style={{
            aspectRatio: activeFrame
              ? `${activeFrame.width} / ${activeFrame.height}`
              : "2 / 3",
          }}
        >
          <img
            src={result?.thumb ?? framedImage}
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

      {/* Process video */}
      {videoSupported && (
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 text-center shadow-soft backdrop-blur-xl animate-fade-up stagger-1">
          <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-navy-600 to-navy-500 text-white shadow-lg shadow-navy-600/30">
            <Film className="h-5 w-5" />
          </span>
          <h3 className="text-base font-bold text-ink">Video Proses Foto</h3>
          <p className="mx-auto mt-1 max-w-[260px] text-xs leading-relaxed text-muted">
            Video pendek: bingkai kosong terisi foto satu per satu, lalu stiker
            muncul. Cocok buat story.
          </p>

          {video ? (
            <div className="mt-4 space-y-2.5">
              <video
                src={video.url}
                controls
                playsInline
                loop
                muted
                autoPlay
                className="mx-auto max-h-[360px] w-full max-w-[260px] rounded-2xl bg-black shadow-md"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => {
                    haptic("success");
                    downloadFile(video.file, video.file.name);
                  }}
                >
                  <Download className="h-4 w-4" /> Unduh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={shareVideo}
                >
                  <Share2 className="h-4 w-4" /> Bagikan
                </Button>
              </div>
              <button
                type="button"
                onClick={makeVideo}
                disabled={videoBusy}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-navy-600 transition active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Buat ulang
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="mt-4 w-full"
              onClick={makeVideo}
              disabled={videoBusy || preparing}
            >
              {videoBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Merekam{" "}
                  {Math.round(videoProgress * 100)}%
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" /> Buat Video
                </>
              )}
            </Button>
          )}

          {videoBusy && (
            <div className="mx-auto mt-3 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy-600 to-orange-500 transition-[width] duration-200"
                style={{ width: `${Math.round(videoProgress * 100)}%` }}
              />
            </div>
          )}
          {videoBusy && (
            <p className="mt-2 text-[11px] text-muted">
              Jangan tutup atau pindah tab dulu ya, sekitar beberapa detik.
            </p>
          )}
          {videoError && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" /> {videoError}
            </p>
          )}
        </div>
      )}

      {/* QR code */}
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 text-center shadow-soft backdrop-blur-xl animate-fade-up stagger-2">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-600/30">
          <QrCodeIcon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-ink">Scan & Unduh di HP Lain</h3>
        <p className="mx-auto mt-1 max-w-[260px] text-xs leading-relaxed text-muted">
          Pindai kode QR ini di HP temanmu untuk langsung membuka dan mengunduh
          foto ini. Aktif 30 menit.
        </p>

        <div className="mt-4 flex min-h-[214px] items-center justify-center">
          {qr.status === "ready" ? (
            <div className="animate-pop rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
              <QRCodeCanvas value={qr.url} size={190} level="M" />
            </div>
          ) : qr.status === "error" ? (
            <div className="space-y-3">
              <p className="mx-auto max-w-[240px] text-xs font-semibold text-rose-500">
                {qr.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrAttempt((n) => n + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-xs font-semibold text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
              Menyiapkan kode QR...
            </div>
          )}
        </div>

        {qr.status === "ready" && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
            <Sparkles className="h-3 w-3" /> Siap dipindai
          </p>
        )}
        {qr.status === "ready" && isLocalHost && (
          <p className="mx-auto mt-3 max-w-[260px] text-[11px] leading-relaxed text-amber-600">
            Kamu masih buka lewat localhost, jadi HP lain belum bisa membuka
            link ini. Buka website lewat alamat IP jaringan atau setelah
            di-deploy.
          </p>
        )}
      </div>
    </div>
  );
}
