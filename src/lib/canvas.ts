import type { Fit } from "@/lib/photobooth-context";
import type { PhotoWindow } from "@/lib/frames";

/**
 * Canvas utilities for rendering the photobooth composition.
 * - loadImage: load an image src into an HTMLImageElement
 * - renderPhotobooth: composite one photo per frame window
 */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

interface DrawPhotoOptions {
  fit: Fit;
  rotation: number;
  /** Pixels per source pixel. Already includes the user's zoom. */
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Draw the photo so it fills (cover) or fits (contain) a target box. */
function drawPhotoInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  opts: DrawPhotoOptions,
) {
  const { fit, rotation, scale, offsetX, offsetY } = opts;

  const drawW = img.width * scale;
  const drawH = img.height * scale;

  if (fit === "contain") {
    // Blurred cover copy behind the letterboxed photo, so the window never
    // shows flat white bars.
    ctx.save();
    ctx.filter = `blur(${Math.round(Math.min(bw, bh) * 0.05)}px) brightness(0.92)`;
    const bgScale = Math.max(bw / img.width, bh / img.height);
    const bgW = img.width * bgScale;
    const bgH = img.height * bgScale;
    ctx.drawImage(img, bx + (bw - bgW) / 2, by + (bh - bgH) / 2, bgW, bgH);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(bx + bw / 2 + offsetX * bw, by + bh / 2 + offsetY * bh);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Base scale for a photo inside the given windows. Every window now gets its
 * own photo, so callers pass just that window: cover uses the scale that fills
 * the box (never leaves a gap); contain uses the one that shows the whole
 * photo.
 */
function baseScaleFor(
  img: HTMLImageElement,
  windows: PhotoWindow[],
  frameWidth: number,
  frameHeight: number,
  fit: Fit,
): number {
  if (!windows.length) return 1;
  const scales = windows.map((win) => {
    const bw = win.w * frameWidth;
    const bh = win.h * frameHeight;
    return fit === "contain"
      ? Math.min(bw / img.width, bh / img.height)
      : Math.max(bw / img.width, bh / img.height);
  });
  return fit === "contain" ? Math.min(...scales) : Math.max(...scales);
}

export interface RenderPhotoboothOptions {
  /**
   * Photos in window order: `userImages[0]` fills window 0, `userImages[1]`
   * fills window 1, and so on. If fewer photos than windows are supplied the
   * last photo is reused so rendering never fails.
   */
  userImages: string[];
  frameSrc: string;
  frameWidth: number;
  frameHeight: number;
  windows: PhotoWindow[];
  /**
   * When true, the first photo also fills the canvas behind the artwork so
   * transparent decorative holes (e.g. inside the lettering) reveal the photo
   * instead of a blank colour.
   */
  bleed?: boolean;
  fit?: Fit;
  rotation?: number; // degrees
  /** Zoom relative to the base fit. 1 = default. */
  zoom?: number;
  /** Pan offset as a fraction of each window's size. */
  offsetX?: number;
  offsetY?: number;
}

/**
 * Composite one photo per frame window and draw the frame overlay on top.
 */
export async function renderPhotobooth(
  opts: RenderPhotoboothOptions,
): Promise<HTMLCanvasElement> {
  const {
    userImages,
    frameSrc,
    frameWidth,
    frameHeight,
    windows,
    bleed = false,
    fit = "cover",
    rotation = 0,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
  } = opts;

  if (!userImages.length) {
    throw new Error("Belum ada foto untuk dirender.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung oleh browser ini.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, frameWidth, frameHeight);

  const [photoImgs, frameImg] = await Promise.all([
    Promise.all(userImages.map((src) => loadImage(src))),
    loadImage(frameSrc),
  ]);

  // Bleed frames: cover the whole artwork with the first photo so the
  // transparent holes in the lettering show the photo, not white.
  if (bleed) {
    const img = photoImgs[0];
    const scale =
      Math.max(frameWidth / img.width, frameHeight / img.height) * zoom;
    drawPhotoInBox(ctx, img, 0, 0, frameWidth, frameHeight, {
      fit: "cover",
      rotation,
      scale,
      offsetX: 0,
      offsetY: 0,
    });
  }

  // Photo layers live on their own canvas so the frame's opaque artwork can
  // erase overflow (irregular/wavy windows) without punching holes in the
  // white backing.
  const layer = document.createElement("canvas");
  layer.width = frameWidth;
  layer.height = frameHeight;
  const lctx = layer.getContext("2d");
  if (!lctx) throw new Error("Canvas tidak didukung oleh browser ini.");

  windows.forEach((win, index) => {
    const img = photoImgs[index] ?? photoImgs[photoImgs.length - 1];
    const bx = win.x * frameWidth;
    const by = win.y * frameHeight;
    const bw = win.w * frameWidth;
    const bh = win.h * frameHeight;
    const scale = baseScaleFor(img, [win], frameWidth, frameHeight, fit) * zoom;

    lctx.save();
    lctx.beginPath();
    lctx.rect(bx, by, bw, bh);
    lctx.clip();
    drawPhotoInBox(lctx, img, bx, by, bw, bh, {
      fit,
      rotation,
      scale,
      offsetX,
      offsetY,
    });
    lctx.restore();
  });

  // Keep the photo only inside the actual transparent windows. Bleed frames
  // instead let the photo show through every transparent hole.
  if (!bleed) {
    lctx.globalCompositeOperation = "destination-out";
    lctx.drawImage(frameImg, 0, 0, frameWidth, frameHeight);
    lctx.globalCompositeOperation = "source-over";
  }

  ctx.drawImage(layer, 0, 0);
  ctx.drawImage(frameImg, 0, 0, frameWidth, frameHeight);

  return canvas;
}

export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  type = "image/png",
): string {
  return canvas.toDataURL(type);
}

export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename = "photobooth-hasil.png",
): Promise<void> {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Gagal membuat file gambar.")),
      type,
      quality,
    );
  });
}

/** Small JPEG data URL of a canvas (used for the history strip). */
export function canvasToThumb(
  canvas: HTMLCanvasElement,
  width = 900,
  quality = 0.85,
): string {
  const scale = Math.min(1, width / canvas.width);
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/jpeg", quality);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", quality);
}

/** Downscale a data URL so it stays light for storage & rendering. */
export async function downscaleDataUrl(
  dataUrl: string,
  maxDim = 1600,
): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return dataUrl;
  }
}
