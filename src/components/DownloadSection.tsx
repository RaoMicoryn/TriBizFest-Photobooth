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
import { getLiveClip } from "@/lib/live-recording";

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
  const [live, setLive] = useState<VideoResult | null>(null);

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

  // The selfie-session recording made by the camera (if any).
  useEffect(() => {
    const clip = getLiveClip();
    if (!clip) return;
    const url = URL.createObjectURL(clip.blob);
    const t = window.setTimeout(
      () =>
        setLive({
          file: new File([clip.blob], `photobooth-live.${clip.ext}`, { type: clip.mime }),
          url,
        }),
      0,
    );
    return () => {
      window.clearTimeout(t);
      URL.revokeObjectURL(url);
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
        const data = (await res.json()) as { path: string };
        if (!cancelled) {
          setQr({ status: "ready", url: `${window.location.origin}${data.path}` });
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

  const shareVideo = async (v: VideoResult | null = video) => {
    if (!v) return;
    try {
      await navigator.share({ files: [v.file], title: "Video Photobooth" });
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
      <div className="card animate-fade-up overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-ink/10 bg-cream font-display text-[16px] text-navy-800 shadow-sm">
              03
            </span>
            <div>
              <h3 className="font-display text-[19px] leading-none text-navy-800">
                Hasil Cetak
              </h3>
              <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">
                Pratinjau ekspor
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-ink/10 bg-white px-2.5 py-1.5 font-mono text-[9px] font-bold tracking-wider text-navy-600">
            {EXPORT_WIDTH} × {exportHeight} px
          </span>
        </div>

        <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f7ecd3,#fbf3df)] px-4 py-6">
          <span className="stripes-ink pointer-events-none absolute inset-0 opacity-40" />
          <span className="absolute left-6 top-5 h-3 w-3 rounded-full bg-orange-300/70" />
          <span className="absolute right-8 top-10 h-2 w-2 rounded-full bg-navy-300/60" />
          <span className="absolute bottom-6 left-10 h-2 w-2 rounded-full bg-gold/70" />

          <div className="relative mx-auto w-full max-w-[320px]">
            <span className="tape -top-2.5 left-1/2 w-[86px] -translate-x-1/2 -rotate-2" aria-hidden="true" />
            <div className="relative rotate-[0.6deg] rounded-[6px] bg-white p-2.5 pb-7 shadow-print ring-1 ring-ink/5 animate-pop">
              <div
                className="relative overflow-hidden rounded-[2px] bg-navy-100"
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
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                <span className="truncate font-serif-i text-[13px] leading-none text-ink-soft">
                  {activeFrame?.name ?? "Tribiz Fest 2026"}
                </span>
                <span className="shrink-0 font-mono text-[8.5px] font-bold tracking-[0.18em] text-muted">
                  TF · 2026
                </span>
              </div>
              {done && (
                <span className="absolute -right-2 top-4 rotate-6 rounded-[3px] border-2 border-emerald-600/80 bg-cream px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
                  Tersimpan
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 p-4 sm:p-5">
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
            variant={canShare ? "primary" : "accent"}
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

          <p className="flex items-center justify-center gap-1.5 pt-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            PNG · resolusi tinggi · siap cetak
          </p>
        </div>

        {done && (
          <p className="animate-fade-up flex items-center justify-center gap-1.5 border-t border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-center text-[10.5px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {done === "share" ? "Terkirim" : `Tersimpan sebagai ${FILENAME}`} ·
            masuk ke Arsip Foto
          </p>
        )}
      </div>

      {/* Live selfie recording */}
      {live && (
        <div className="card animate-fade-up stagger-1 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-700 text-white shadow-[0_2px_0_#5c0716]">
              <Film className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[18px] leading-none text-navy-800">
                  Video Live Selfie
                </h3>
                <span className="rounded-full bg-orange-600 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-white">
                  Live
                </span>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                Rekaman utuh dari kamu mulai bergaya sampai selesai foto, seperti
                Live Photo.
              </p>
            </div>
          </div>
          <video
            src={live.url}
            controls
            playsInline
            loop
            muted
            autoPlay
            className="mx-auto mt-4 max-h-[380px] w-full max-w-[270px] rounded-xl bg-black shadow-lg ring-1 ring-ink/10"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="accent"
              size="sm"
              className="h-11"
              onClick={() => {
                haptic("success");
                downloadFile(live.file, live.file.name);
              }}
            >
              <Download className="h-4 w-4" /> Unduh Video
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => shareVideo(live)}
            >
              <Share2 className="h-4 w-4" /> Bagikan
            </Button>
          </div>
        </div>
      )}

      {/* Process video */}
      {videoSupported && (
        <div className="card animate-fade-up stagger-1 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-navy-600 to-navy-900 text-cream shadow-[0_2px_0_#080926]">
              <Film className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[18px] leading-none text-navy-800">
                Video Proses Foto
              </h3>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                Video pendek: bingkai kosong terisi foto satu per satu, lalu
                stiker muncul. Cocok buat story.
              </p>
            </div>
          </div>

          {video ? (
            <div className="mt-4 space-y-2.5">
              <video
                src={video.url}
                controls
                playsInline
                loop
                muted
                autoPlay
                className="mx-auto max-h-[360px] w-full max-w-[250px] rounded-xl bg-black shadow-lg ring-1 ring-ink/10"
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
                  onClick={() => shareVideo(video)}
                >
                  <Share2 className="h-4 w-4" /> Bagikan
                </Button>
              </div>
              <button
                type="button"
                onClick={makeVideo}
                disabled={videoBusy}
                className="mx-auto flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[10px] font-bold text-navy-600 transition hover:border-orange-300 active:scale-95"
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
            <p className="mt-2 text-center text-[10.5px] text-muted">
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
      <div className="card animate-fade-up stagger-2 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-700 text-white shadow-[0_2px_0_#5c0716]">
            <QrCodeIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[18px] leading-none text-navy-800">
              Scan &amp; Unduh di HP Lain
            </h3>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              Pindai kode QR ini di HP temanmu untuk langsung membuka dan
              mengunduh foto ini.
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-white/60 p-4">
          <span className="stripes-ink pointer-events-none absolute inset-0 opacity-40" />
          {qr.status === "ready" ? (
            <div className="relative animate-pop rounded-xl bg-white p-3 shadow-lg ring-1 ring-ink/5">
              <QRCodeCanvas value={qr.url} size={186} level="M" />
            </div>
          ) : qr.status === "error" ? (
            <div className="relative space-y-3 text-center">
              <p className="mx-auto max-w-[240px] text-[11px] font-semibold text-rose-500">
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
            <div className="relative flex flex-col items-center gap-2 text-[11px] font-semibold text-muted">
              <Loader2 className="h-6 w-6 animate-spin text-navy-500" />
              Menyiapkan kode QR...
            </div>
          )}
        </div>

        {qr.status === "ready" && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Siap dipindai
            <Sparkles className="h-3 w-3" />
          </p>
        )}
        {qr.status === "ready" && isLocalHost && (
          <p className="mt-2 max-w-[300px] text-[10px] leading-relaxed text-amber-600">
            Kamu masih buka lewat localhost, jadi HP lain belum bisa membuka
            link ini. Buka website lewat alamat IP jaringan atau setelah
            di-deploy.
          </p>
        )}
      </div>
    </div>
  );
}
