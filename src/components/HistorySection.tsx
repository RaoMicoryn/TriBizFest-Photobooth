"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, History, Loader2, Share2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  removeHistoryItem,
  subscribeHistory,
  type HistoryItem,
} from "@/lib/history";
import {
  dataUrlToFile,
  downloadFile,
  shareImageFile,
  useCanShare,
} from "@/lib/share";

function HistoryViewer({
  item,
  onClose,
}: {
  item: HistoryItem;
  onClose: () => void;
}) {
  const canShare = useCanShare();
  const [file, setFile] = useState<File | null>(null);
  const [closing, setClosing] = useState(false);

  // Prepare the file up front so the share sheet opens straight from the tap.
  useEffect(() => {
    let cancelled = false;
    dataUrlToFile(item.image, `photobooth-${item.id}.jpg`)
      .then((f) => {
        if (!cancelled) setFile(f);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, item.image]);

  const close = () => {
    setClosing(true);
    window.setTimeout(onClose, 180);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hasil foto"
      className={`fixed inset-0 z-[60] flex flex-col bg-navy-950/94 text-white backdrop-blur-md ${
        closing ? "animate-cam-out" : "animate-cam-in"
      }`}
      style={{ height: "100dvh" }}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <p className="label text-cream/80">
          {new Date(item.createdAt).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Tutup"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/15 transition active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-2">
        {/* Same polaroid print as the export preview */}
        <div className="animate-pop max-h-full max-w-full rotate-[0.6deg] rounded-[6px] bg-white p-2.5 pb-7 shadow-2xl">
          <img
            src={item.image}
            alt="Hasil photobooth"
            className="max-h-[calc(100dvh-20rem)] w-auto max-w-full rounded-[2px] object-contain"
          />
          <p className="mt-2 text-center font-mono text-[8.5px] font-bold tracking-[0.2em] text-muted">
            TRIBIZ FEST · 2026
          </p>
        </div>
      </div>

      <div className="animate-slide-up-soft space-y-2.5 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
        {canShare && (
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            disabled={!file}
            onClick={async () => {
              if (file) await shareImageFile(file);
            }}
          >
            {file ? (
              <Share2 className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            Bagikan
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            disabled={!file}
            onClick={() => file && downloadFile(file, file.name)}
          >
            <Download className="h-4 w-4" /> Unduh
          </Button>
          <Button
            variant="outline"
            className="border-rose-300/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
            onClick={() => {
              removeHistoryItem(item.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function HistorySection() {
  const items = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  );
  const [openId, setOpenId] = useState<string | null>(null);

  if (!items.length) return null;
  const openItem = items.find((x) => x.id === openId) ?? null;

  return (
    <section className="card animate-fade-up stagger-3 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-b from-orange-500 to-orange-700 text-white shadow-[0_2px_0_#5c0716]">
            <History className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="font-display text-[19px] leading-none text-navy-800">
              Arsip Foto
            </h3>
            <p className="mt-1 text-[10.5px] text-muted">
              {items.length} hasil tersimpan di perangkat ini
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Hapus semua riwayat foto?")) clearHistory();
          }}
          className="shrink-0 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-soft transition hover:border-rose-200 hover:text-rose-600 active:scale-95"
        >
          Hapus
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 pt-1">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenId(item.id)}
            style={{ animationDelay: `${i * 50}ms` }}
            className={`animate-fade-up group relative shrink-0 snap-start rounded-[9px] bg-white p-1.5 pb-5 shadow-print ring-1 ring-ink/5 transition duration-300 hover:rotate-0 active:scale-95 ${
              i % 2 ? "rotate-[1.8deg]" : "-rotate-[1.8deg]"
            }`}
          >
            <img
              src={item.image}
              alt="Hasil sebelumnya"
              draggable={false}
              className="h-28 w-auto max-w-[124px] rounded-[3px] object-cover ring-1 ring-ink/10"
            />
            <span className="absolute inset-x-0 bottom-1.5 text-center font-mono text-[8.5px] font-bold tracking-[0.2em] text-ink-soft/75">
              TF · {String(i + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>

      {openItem && (
        <HistoryViewer
          key={openItem.id}
          item={openItem}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
