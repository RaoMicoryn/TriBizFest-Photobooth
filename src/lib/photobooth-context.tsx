"use client";

import { useSyncExternalStore } from "react";
import { FRAME_OPTIONS, MAX_FRAME_PHOTOS } from "@/lib/frames";
import { getSticker, type PlacedSticker } from "@/lib/stickers";

export type Fit = "cover" | "contain";
export type Step = "upload" | "frame" | "export";

/** A run keeps up to as many photos as the biggest frame has windows. */
export const MAX_PHOTOS = MAX_FRAME_PHOTOS;

export interface PhotoboothState {
  step: Step;
  /** Photos for the selected frame, in window order (1 per window). */
  userImages: string[];
  fit: Fit;
  rotation: number;
  /** 1 = default fit; >1 zooms into the photo. */
  zoom: number;
  /** Pan offset as a fraction of the canvas size (-0.6 .. 0.6). */
  offsetX: number;
  offsetY: number;
  selectedFrameId: string | null;
  framedImage: string | null;
  /** Stickers / accessories placed on the framed result. */
  stickers: PlacedSticker[];
  error: string | null;
}

const INITIAL_STATE: PhotoboothState = {
  step: "upload",
  userImages: [],
  fit: "cover",
  rotation: 0,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  selectedFrameId: null,
  framedImage: null,
  stickers: [],
  error: null,
};

const STORAGE_KEY = "photobooth_state_v6";

function readFromStorage(): PhotoboothState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Omit<
      Partial<PhotoboothState>,
      "step" | "userImages" | "stickers"
    > & {
      stickers?: PlacedSticker[];
      step?: string;
      userImages?: unknown;
      /** Legacy single-photo saves. */
      userImage?: unknown;
    };
    // Legacy saves: "form" used to be the contact step.
    const step: Step =
      parsed.step === "export"
        ? "export"
        : parsed.step === "frame"
          ? "frame"
          : "upload";

    let userImages: string[] = [];
    if (Array.isArray(parsed.userImages)) {
      userImages = parsed.userImages.filter(
        (src): src is string => typeof src === "string" && src.length > 0,
      );
    } else if (typeof parsed.userImage === "string" && parsed.userImage) {
      userImages = [parsed.userImage];
    }

    // Drop a saved frame that no longer exists (e.g. after the artwork was
    // replaced), together with any render that used it.
    const selectedFrameId =
      typeof parsed.selectedFrameId === "string" &&
      FRAME_OPTIONS.some((f) => f.id === parsed.selectedFrameId)
        ? parsed.selectedFrameId
        : null;

    const stickers: PlacedSticker[] = Array.isArray(parsed.stickers)
      ? parsed.stickers.filter(
          (st): st is PlacedSticker =>
            !!st &&
            typeof st.id === "string" &&
            typeof st.stickerId === "string" &&
            !!getSticker(st.stickerId) &&
            Number.isFinite(st.x) &&
            Number.isFinite(st.y) &&
            Number.isFinite(st.size) &&
            Number.isFinite(st.rotation),
        )
      : [];

    return {
      ...INITIAL_STATE,
      ...parsed,
      stickers,
      userImages: userImages.slice(0, MAX_PHOTOS),
      selectedFrameId,
      framedImage: selectedFrameId ? (parsed.framedImage ?? null) : null,
      step,
    };
  } catch {
    return INITIAL_STATE;
  }
}

/** Module-level store: survives client-side navigation between routes. */
let state: PhotoboothState = readFromStorage();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function writeNow() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore, keep in-memory state */
  }
}

/**
 * Debounced persist: dragging the photo fires updates at ~60fps and the
 * framed PNG is large, so writing on every frame would stall the drag.
 */
function persist() {
  if (typeof window === "undefined") return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeNow();
  }, 400);
}

function update(updater: (current: PhotoboothState) => PhotoboothState) {
  state = updater(state);
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
}

export const photoboothActions = {
  setStep(step: Step) {
    update((s) => ({ ...s, step, error: null }));
  },
  addUserImages(dataUrls: string[]) {
    if (!dataUrls.length) return;
    update((s) => ({
      ...s,
      // A new set of photos replaces the previous one (window order).
      userImages: dataUrls.slice(0, MAX_PHOTOS),
      framedImage: null,
      error: null,
    }));
  },
  /**
   * Make sure there are `count` photos by repeating the existing ones in
   * order (used when someone picks a multi-window frame with fewer photos).
   */
  fillPhotosTo(count: number) {
    update((s) => {
      if (!s.userImages.length || s.userImages.length >= count) return s;
      const filled = [...s.userImages];
      let i = 0;
      while (filled.length < Math.min(count, MAX_PHOTOS)) {
        filled.push(s.userImages[i % s.userImages.length]);
        i++;
      }
      return { ...s, userImages: filled, framedImage: null, error: null };
    });
  },
  removeUserImage(index: number) {
    update((s) => ({
      ...s,
      userImages: s.userImages.filter((_, i) => i !== index),
      framedImage: null,
      error: null,
    }));
  },
  clearUserImages() {
    update((s) => ({
      ...s,
      userImages: [],
      framedImage: null,
      selectedFrameId: null,
      stickers: [],
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      fit: "cover",
      error: null,
    }));
  },
  setFit(fit: Fit) {
    update((s) => ({ ...s, fit, offsetX: 0, offsetY: 0 }));
  },
  setRotation(deg: number) {
    update((s) => ({
      ...s,
      rotation: ((deg % 360) + 360) % 360,
      offsetX: 0,
      offsetY: 0,
    }));
  },
  setCrop(patch: { zoom?: number; offsetX?: number; offsetY?: number }) {
    update((s) => ({ ...s, ...patch }));
  },
  resetCrop() {
    update((s) => ({ ...s, zoom: 1, offsetX: 0, offsetY: 0 }));
  },
  selectFrame(frameId: string | null) {
    update((s) => ({
      ...s,
      selectedFrameId: frameId,
      framedImage: null,
      error: null,
    }));
  },
  setFramedImage(dataUrl: string | null) {
    update((s) => ({ ...s, framedImage: dataUrl }));
  },
  addSticker(stickerId: string): string {
    const def = getSticker(stickerId);
    const id = `st_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    if (!def) return id;
    update((s) => ({
      ...s,
      stickers: [
        ...s.stickers,
        {
          id,
          stickerId,
          x: 0.5 + (Math.random() - 0.5) * 0.12,
          y: 0.5 + (Math.random() - 0.5) * 0.12,
          size: def.size,
          rotation: 0,
          flip: false,
        },
      ].slice(-40),
    }));
    return id;
  },
  duplicateSticker(id: string): string | null {
    const src = state.stickers.find((st) => st.id === id);
    if (!src) return null;
    const newId = `st_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    update((s) => ({
      ...s,
      stickers: [
        ...s.stickers,
        {
          ...src,
          id: newId,
          x: Math.min(0.95, src.x + 0.06),
          y: Math.min(0.95, src.y + 0.06),
        },
      ].slice(-40),
    }));
    return newId;
  },
  updateSticker(id: string, patch: Partial<Omit<PlacedSticker, "id" | "stickerId">>) {
    update((s) => ({
      ...s,
      stickers: s.stickers.map((st) => (st.id === id ? { ...st, ...patch } : st)),
    }));
  },
  bringStickerToFront(id: string) {
    update((s) => {
      const target = s.stickers.find((st) => st.id === id);
      if (!target) return s;
      return {
        ...s,
        stickers: [...s.stickers.filter((st) => st.id !== id), target],
      };
    });
  },
  removeSticker(id: string) {
    update((s) => ({ ...s, stickers: s.stickers.filter((st) => st.id !== id) }));
  },
  clearStickers() {
    update((s) => ({ ...s, stickers: [] }));
  },
  setError(msg: string | null) {
    update((s) => ({ ...s, error: msg }));
  },
  reset() {
    if (typeof window !== "undefined") {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    update(() => INITIAL_STATE);
  },
};

/**
 * Read the current store synchronously. Use inside effects/guards where the
 * value from `usePhotobooth()` may still be the server snapshot during the
 * hydration render (that snapshot has no localStorage data yet).
 */
export function readPhotoboothState(): PhotoboothState {
  return state;
}

export type PhotoboothContextValue = PhotoboothState & typeof photoboothActions;

/**
 * Provider kept for API compatibility. The store is module-level so all
 * components share the same instance without prop drilling.
 */
export function PhotoboothProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function usePhotobooth(): PhotoboothContextValue {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { ...current, ...photoboothActions };
}
