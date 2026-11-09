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
      className={`fixed inset-0 z-[60] flex flex-col bg-neutral-950/92 text-white backdrop-blur-md ${
        closing ? "animate-cam-out" : "animate-cam-in"
      }`}
      style={{ height: "100dvh" }}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <p className="text-sm font-bold">
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
        <img
          src={item.image}
          alt="Hasil photobooth"
          className="animate-pop max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
        />
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
    <section className="animate-fade-up stagger-3 rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-100 text-navy-600">
            <History className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-sm font-bold leading-tight text-ink">
              Hasil Terakhir
            </h3>
            <p className="text-[11px] text-muted">
              Tersimpan di perangkat ini · {items.length} foto
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Hapus semua riwayat foto?")) clearHistory();
          }}
          className="shrink-0 rounded-full bg-navy-50 px-3 py-2 text-[11px] font-bold text-ink-soft transition active:scale-95 hover:bg-navy-100"
        >
          Hapus semua
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenId(item.id)}
            style={{ animationDelay: `${i * 50}ms` }}
            className="animate-fade-up group relative h-28 shrink-0 snap-start overflow-hidden rounded-2xl bg-navy-50 ring-1 ring-black/10 transition active:scale-95"
          >
            <img
              src={item.image}
              alt="Hasil sebelumnya"
              draggable={false}
              className="h-full w-auto object-cover transition duration-300 group-hover:scale-[1.03]"
            />
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
