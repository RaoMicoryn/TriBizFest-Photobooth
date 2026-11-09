"use client";

import { useSyncExternalStore } from "react";

/** True when the browser can open the native share sheet with an image file. */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([""], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

/** Hydration-safe: false on the server, real value on the client. */
export function useCanShare(): boolean {
  return useSyncExternalStore(noopSubscribe, canShareFiles, () => false);
}

export type ShareResult = "shared" | "cancelled" | "failed";

/**
 * Open the native share sheet (iOS / Android) with the image. Call it straight
 * from a tap handler with a File that is already prepared — browsers drop the
 * "user gesture" if you do slow async work first.
 */
export async function shareImageFile(
  file: File,
  title = "Photobooth",
): Promise<ShareResult> {
  try {
    await navigator.share({ files: [file], title });
    return "shared";
  } catch (err) {
    if ((err as { name?: string } | null)?.name === "AbortError") {
      return "cancelled";
    }
    return "failed";
  }
}

export async function dataUrlToFile(
  dataUrl: string,
  filename: string,
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function downloadFile(file: File | Blob, filename: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
