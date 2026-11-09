"use client";

/**
 * Recent results ("Riwayat"). Stored in localStorage as small JPEGs so a few
 * of them fit comfortably in the browser quota.
 */

export interface HistoryItem {
  id: string;
  /** JPEG data URL (~900px wide). */
  image: string;
  createdAt: number;
}

const KEY = "photobooth_history_v1";
const MAX_ITEMS = 8;
const EMPTY: HistoryItem[] = [];

const listeners = new Set<() => void>();
let cache: { raw: string | null; items: HistoryItem[] } = {
  raw: null,
  items: EMPTY,
};

function parse(raw: string | null): HistoryItem[] {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return EMPTY;
    return data.filter(
      (x): x is HistoryItem =>
        !!x &&
        typeof (x as HistoryItem).id === "string" &&
        typeof (x as HistoryItem).image === "string",
    );
  } catch {
    return EMPTY;
  }
}

export function getHistorySnapshot(): HistoryItem[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cache.items;
  }
  if (raw === cache.raw) return cache.items;
  cache = { raw, items: parse(raw) };
  return cache.items;
}

export function getHistoryServerSnapshot(): HistoryItem[] {
  return EMPTY;
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function save(items: HistoryItem[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    for (const l of listeners) l();
    return true;
  } catch {
    return false;
  }
}

export function addHistoryItem(image: string): void {
  if (typeof window === "undefined") return;
  const item: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    image,
    createdAt: Date.now(),
  };
  let next = [item, ...getHistorySnapshot()].slice(0, MAX_ITEMS);
  // Quota full: drop the oldest entries until it fits.
  while (!save(next) && next.length > 1) {
    next = next.slice(0, -1);
  }
}

export function removeHistoryItem(id: string): void {
  if (typeof window === "undefined") return;
  save(getHistorySnapshot().filter((x) => x.id !== id));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}
