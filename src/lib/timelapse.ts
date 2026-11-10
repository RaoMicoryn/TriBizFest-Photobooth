"use client";

import { renderPhotobooth, type RenderPhotoboothOptions } from "@/lib/canvas";

/**
 * "Process video": the frame starts empty, every photo pops into its window one
 * by one, then the stickers land. Recorded from a canvas with MediaRecorder, so
 * it works offline and on iOS 14.5+ (mp4) and Android / desktop (mp4 or webm).
 */

export interface ProcessVideo {
  blob: Blob;
  ext: "mp4" | "webm";
  mime: string;
}

const MIME_CANDIDATES: { mime: string; ext: "mp4" | "webm" }[] = [
  { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
  { mime: "video/mp4", ext: "mp4" },
  { mime: "video/webm;codecs=vp9", ext: "webm" },
  { mime: "video/webm;codecs=vp8", ext: "webm" },
  { mime: "video/webm", ext: "webm" },
];

export function canRecordVideo(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return false;
  return MIME_CANDIDATES.some((c) => MediaRecorder.isTypeSupported(c.mime));
}

const VIDEO_WIDTH = 720;
const FPS = 30;

export async function createProcessVideo(
  opts: RenderPhotoboothOptions,
  onProgress?: (fraction: number) => void,
): Promise<ProcessVideo> {
  const picked = MIME_CANDIDATES.find(
    (c) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime),
  );
  if (!picked) throw new Error("Browser ini belum mendukung perekaman video.");

  const width = VIDEO_WIDTH;
  let height = Math.round((width * opts.frameHeight) / opts.frameWidth);
  height -= height % 2;

  const base: RenderPhotoboothOptions = {
    ...opts,
    frameWidth: width,
    frameHeight: height,
    stickers: [],
  };
  const total = opts.windows.length;
  const hasStickers = (opts.stickers?.length ?? 0) > 0;

  // Pre-render every state of the frame.
  const steps: HTMLCanvasElement[] = [];
  steps.push(await renderPhotobooth({ ...base, photoCount: 0 }));
  for (let k = 1; k <= total; k++) {
    steps.push(await renderPhotobooth({ ...base, photoCount: k }));
  }
  if (hasStickers) {
    steps.push(
      await renderPhotobooth({ ...base, stickers: opts.stickers, photoCount: total }),
    );
  }

  // Timeline (seconds): fade into each step, then hold.
  const FADE = 0.35;
  const timeline: { start: number }[] = [];
  let t = 0;
  steps.forEach((_, i) => {
    timeline.push({ start: t });
    const hold = i === 0 ? 0.7 : i === steps.length - 1 ? 1.9 : 0.85;
    t += (i === 0 ? 0 : FADE) + hold;
  });
  const duration = t;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung.");

  const draw = (time: number) => {
    let idx = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (time >= timeline[i].start) idx = i;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (idx > 0 && time < timeline[idx].start + FADE) {
      const a = (time - timeline[idx].start) / FADE;
      ctx.drawImage(steps[idx - 1], 0, 0);
      ctx.globalAlpha = Math.min(1, Math.max(0, a));
      // Tiny "pop": the new state scales in from 98% → 100%.
      const s = 0.98 + 0.02 * a;
      ctx.translate(width / 2, height / 2);
      ctx.scale(s, s);
      ctx.drawImage(steps[idx], -width / 2, -height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(steps[idx], 0, 0);
    }
  };

  draw(0);
  const stream = out.captureStream(FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType: picked.mime,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<ProcessVideo>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Gagal merekam video."));
    recorder.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      const blob = new Blob(chunks, { type: picked.mime.split(";")[0] });
      if (!blob.size) reject(new Error("Video kosong."));
      else resolve({ blob, ext: picked.ext, mime: picked.mime.split(";")[0] });
    };

    const startedAt = performance.now();
    recorder.start(250);
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      if (elapsed >= duration) {
        window.clearInterval(timer);
        draw(duration);
        onProgress?.(1);
        window.setTimeout(() => {
          try {
            recorder.requestData();
            recorder.stop();
          } catch (err) {
            reject(err instanceof Error ? err : new Error("Gagal menyimpan video."));
          }
        }, 120);
        return;
      }
      draw(elapsed);
      onProgress?.(Math.min(0.99, elapsed / duration));
    }, 1000 / FPS);
  });
}
