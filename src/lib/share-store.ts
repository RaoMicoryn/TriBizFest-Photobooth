import { randomBytes } from "node:crypto";

/**
 * Tiny in-memory store for "scan the QR to download" links. Photos live for
 * 30 minutes and are never written to disk.
 *
 * NOTE: in-memory means it works on a normal Node server (`next start`, VPS,
 * Docker, `next dev`). On serverless hosts (e.g. Vercel) each request can hit
 * a different instance, so swap this for Vercel Blob / S3 / Redis there.
 */

interface Entry {
  data: Buffer;
  type: string;
  expires: number;
}

const g = globalThis as unknown as { __photoboothShare?: Map<string, Entry> };
const store: Map<string, Entry> = (g.__photoboothShare ??= new Map());

export const SHARE_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 80;
export const MAX_SHARE_BYTES = 12 * 1024 * 1024;

function prune() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expires <= now) store.delete(id);
  }
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function saveShare(data: Buffer, type: string): string {
  prune();
  const id = randomBytes(7).toString("base64url");
  store.set(id, { data, type, expires: Date.now() + SHARE_TTL_MS });
  return id;
}

export function getShare(id: string): Entry | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    store.delete(id);
    return null;
  }
  return entry;
}
