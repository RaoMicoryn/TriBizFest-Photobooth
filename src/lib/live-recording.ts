"use client";

import { applyFilterToCanvas } from "@/lib/filters";

/**
 * "Live" selfie recording: records the camera preview (mirrored + filtered
 * exactly like the preview) from the moment the camera opens until the last
 * photo is accepted, so the video shows the whole selfie session.
 */

export interface LiveClip {
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

export function canRecordLive(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return false;
  return MIME_CANDIDATES.some((c) => MediaRecorder.isTypeSupported(c.mime));
}

/* The finished clip is handed from the camera to the download page. */
let current: LiveClip | null = null;
export const setLiveClip = (clip: LiveClip | null) => {
  current = clip;
};
export const getLiveClip = () => current;

export interface LiveRecorder {
  /** Stop and return the clip (null if nothing was recorded). */
  stop(): Promise<LiveClip | null>;
  /** Stop and throw everything away. */
  cancel(): void;
}

const MAX_DIM = 640;
const FPS = 24;
const MAX_MS = 120_000;

export function startLiveRecording(
  getVideo: () => HTMLVideoElement | null,
  getSettings: () => { mirror: boolean; filterId: string },
): LiveRecorder | null {
  const picked = MIME_CANDIDATES.find(
    (c) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime),
  );
  if (!picked || !canRecordLive()) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: Blob[] = [];
  let timer: number | null = null;
  let cancelled = false;
  let ready = false;
  let startedAt = 0;

  const init = (video: HTMLVideoElement) => {
    const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
    let w = Math.round(video.videoWidth * scale);
    let h = Math.round(video.videoHeight * scale);
    w -= w % 2;
    h -= h % 2;
    canvas.width = w;
    canvas.height = h;
    stream = canvas.captureStream(FPS);
    recorder = new MediaRecorder(stream, {
      mimeType: picked.mime,
      videoBitsPerSecond: 2_500_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(500);
    startedAt = performance.now();
    ready = true;
  };

  const drawFrame = () => {
    const video = getVideo();
    if (!video || !video.videoWidth || !video.videoHeight) return;
    if (!ready) init(video);
    const w = canvas.width;
    const h = canvas.height;
    const { mirror, filterId } = getSettings();

    // Cover-fit so switching cameras never stretches the picture.
    const s = Math.max(w / video.videoWidth, h / video.videoHeight);
    const dw = video.videoWidth * s;
    const dh = video.videoHeight * s;
    ctx.save();
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.restore();
    applyFilterToCanvas(canvas, filterId);

    if (performance.now() - startedAt > MAX_MS) halt();
  };

  const halt = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  timer = window.setInterval(drawFrame, 1000 / FPS);

  const finish = (): Promise<LiveClip | null> =>
    new Promise((resolve) => {
      halt();
      if (!recorder || recorder.state === "inactive" || cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        resolve(
          !cancelled && chunks.length
            ? {
                blob: new Blob(chunks, { type: picked.mime.split(";")[0] }),
                ext: picked.ext,
                mime: picked.mime.split(";")[0],
              }
            : null,
        );
        return;
      }
      recorder.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: picked.mime.split(";")[0] });
        resolve(
          cancelled || !blob.size
            ? null
            : { blob, ext: picked.ext, mime: picked.mime.split(";")[0] },
        );
      };
      try {
        recorder.requestData();
        recorder.stop();
      } catch {
        resolve(null);
      }
    });

  return {
    stop() {
      return finish();
    },
    cancel() {
      cancelled = true;
      void finish();
    },
  };
}

