"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import {
  Copy,
  FlipHorizontal2,
  Layers,
  Trash2,
  X,
  Maximize2,
} from "lucide-react";
import { usePhotobooth } from "@/lib/photobooth-context";
import {
  STICKERS,
  STICKER_CATEGORIES,
  getSticker,
  stickerSrc,
  type StickerCategory,
} from "@/lib/stickers";
import { haptic } from "@/lib/haptics";

type Drag =
  | { mode: "move"; id: string; px: number; py: number; x: number; y: number }
  | {
      mode: "scale";
      id: string;
      cx: number;
      cy: number;
      dist0: number;
      ang0: number;
      size0: number;
      rot0: number;
    };

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * Interactive overlay that sits on top of the framed preview. Drag a sticker
 * to move it, drag the round handle to resize + rotate, tap the X to delete.
 */
export function StickerLayer({
  boxRef,
  selectedId,
  onSelect,
}: {
  boxRef: React.RefObject<HTMLDivElement | null>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { stickers, updateSticker, removeSticker, bringStickerToFront } =
    usePhotobooth();
  const dragRef = useRef<Drag | null>(null);

  const rectOf = () => boxRef.current?.getBoundingClientRect() ?? null;

  const startMove = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    const st = stickers.find((s) => s.id === id);
    if (!st) return;
    if (selectedId !== id) haptic("select");
    onSelect(id);
    bringStickerToFront(id);
    dragRef.current = {
      mode: "move",
      id,
      px: e.clientX,
      py: e.clientY,
      x: st.x,
      y: st.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const startScale = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    const st = stickers.find((s) => s.id === id);
    const rect = rectOf();
    if (!st || !rect) return;
    const cx = rect.left + st.x * rect.width;
    const cy = rect.top + st.y * rect.height;
    dragRef.current = {
      mode: "scale",
      id,
      cx,
      cy,
      dist0: Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)),
      ang0: Math.atan2(e.clientY - cy, e.clientX - cx),
      size0: st.size,
      rot0: st.rotation,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    const rect = rectOf();
    if (!d || !rect) return;
    e.stopPropagation();
    if (d.mode === "move") {
      updateSticker(d.id, {
        x: clamp(d.x + (e.clientX - d.px) / rect.width, 0, 1),
        y: clamp(d.y + (e.clientY - d.py) / rect.height, 0, 1),
      });
    } else {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      const ang = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
      let rot = d.rot0 + ((ang - d.ang0) * 180) / Math.PI;
      rot = ((((rot + 180) % 360) + 360) % 360) - 180;
      updateSticker(d.id, {
        size: clamp((d.size0 * dist) / d.dist0, 0.06, 0.95),
        rotation: Math.round(rot),
      });
    }
  };

  const onUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    dragRef.current = null;
  };

  return (
    <>
      {stickers.map((st) => {
        const def = getSticker(st.stickerId);
        if (!def) return null;
        const selected = st.id === selectedId;
        return (
          <div
            key={st.id}
            onPointerDown={(e) => startMove(e, st.id)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="absolute cursor-move touch-none select-none"
            style={{
              left: `${st.x * 100}%`,
              top: `${st.y * 100}%`,
              width: `${st.size * 100}%`,
              aspectRatio: `${def.w} / ${def.h}`,
              transform: `translate(-50%, -50%) rotate(${st.rotation}deg)`,
              zIndex: selected ? 30 : 20,
            }}
          >
            <img
              src={stickerSrc(def)}
              alt={def.name}
              draggable={false}
              className="pointer-events-none h-full w-full select-none"
              style={{ transform: st.flip ? "scaleX(-1)" : undefined }}
            />
            {selected && (
              <>
                <span className="pointer-events-none absolute -inset-1.5 rounded-lg border-2 border-dashed border-white shadow-[0_0_0_1.5px_rgba(31,32,119,0.85)]" />
                <button
                  type="button"
                  aria-label="Hapus stiker"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic("warning");
                    removeSticker(st.id);
                    onSelect(null);
                  }}
                  className="absolute -left-3.5 -top-3.5 grid h-7 w-7 place-items-center rounded-full bg-orange-600 text-white shadow-lg ring-2 ring-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ubah ukuran dan putar"
                  onPointerDown={(e) => startScale(e, st.id)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  className="absolute -bottom-4 -right-4 grid h-8 w-8 touch-none place-items-center rounded-full bg-navy-700 text-white shadow-lg ring-2 ring-white"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Sticker tray + controls for the selected sticker. */
export function StickerPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const {
    stickers,
    addSticker,
    duplicateSticker,
    updateSticker,
    removeSticker,
    clearStickers,
    bringStickerToFront,
  } = usePhotobooth();
  const [category, setCategory] = useState<StickerCategory>("kacamata");
  const selected = stickers.find((s) => s.id === selectedId) ?? null;
  const list = STICKERS.filter((s) => s.category === category);

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {STICKER_CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                haptic("tap");
                setCategory(c.id);
              }}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition active:scale-95 ${
                active
                  ? "animate-chip-pop bg-gradient-to-b from-navy-700 to-navy-900 text-cream shadow-[0_2px_0_#080926]"
                  : "border border-ink/10 bg-white/80 text-ink-soft hover:border-orange-300"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {list.map((def) => (
          <button
            key={def.id}
            type="button"
            onClick={() => {
              haptic("select");
              onSelect(addSticker(def.id));
            }}
            className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border border-ink/10 bg-white/85 p-1.5 shadow-sm transition hover:border-orange-300 hover:bg-white active:scale-90"
          >
            <img
              src={stickerSrc(def)}
              alt={def.name}
              draggable={false}
              className="h-full max-h-12 w-full object-contain transition group-active:scale-110"
            />
            <span className="w-full truncate text-center text-[9px] font-extrabold uppercase tracking-[0.06em] leading-none text-muted">
              {def.name}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="animate-pop space-y-3 rounded-[18px] border border-ink/10 bg-cream/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-extrabold text-navy-800">
              <Layers className="h-3.5 w-3.5 shrink-0 text-orange-600" />
              <span className="truncate">{getSticker(selected.stickerId)?.name}</span>
            </p>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="shrink-0 rounded-full border border-ink/10 bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-soft transition active:scale-95"
            >
              Selesai
            </button>
          </div>

          <label className="block">
            <span className="mb-0.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              Ukuran
              <span className="font-mono text-[9px] tracking-normal text-navy-600">
                {Math.round(selected.size * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={6}
              max={90}
              step={1}
              value={Math.round(selected.size * 100)}
              onChange={(e) =>
                updateSticker(selected.id, { size: Number(e.target.value) / 100 })
              }
              aria-label="Ukuran stiker"
              className="range-fest"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              Putar
              <span className="font-mono text-[9px] tracking-normal text-navy-600">
                {selected.rotation}°
              </span>
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selected.rotation}
              onChange={(e) =>
                updateSticker(selected.id, { rotation: Number(e.target.value) })
              }
              aria-label="Putar stiker"
              className="range-fest"
            />
          </label>

          <div className="grid grid-cols-4 gap-1.5">
            <ToolButton
              label="Balik"
              onClick={() => {
                haptic("tap");
                updateSticker(selected.id, { flip: !selected.flip });
              }}
            >
              <FlipHorizontal2 className="h-4 w-4" />
            </ToolButton>
            <ToolButton
              label="Gandakan"
              onClick={() => {
                haptic("select");
                const id = duplicateSticker(selected.id);
                if (id) onSelect(id);
              }}
            >
              <Copy className="h-4 w-4" />
            </ToolButton>
            <ToolButton
              label="Depan"
              onClick={() => {
                haptic("tap");
                bringStickerToFront(selected.id);
              }}
            >
              <Layers className="h-4 w-4" />
            </ToolButton>
            <ToolButton
              label="Hapus"
              danger
              onClick={() => {
                haptic("warning");
                removeSticker(selected.id);
                onSelect(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </ToolButton>
          </div>
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed border-ink/15 bg-cream/50 px-3 py-2.5 text-center text-[10.5px] leading-relaxed text-muted">
          Ketuk aksesori untuk menambahkan. Geser di foto untuk memindah, tarik
          tombol bulat di pojok untuk ubah ukuran &amp; putar.
        </p>
      )}

      {stickers.length > 0 && (
        <button
          type="button"
          onClick={() => {
            haptic("warning");
            clearStickers();
            onSelect(null);
          }}
          className="w-full rounded-xl border border-rose-200/70 bg-rose-50/70 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-rose-600 transition hover:bg-rose-100 active:scale-95"
        >
          Hapus semua stiker ({stickers.length})
        </button>
      )}
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-[12px] py-2 text-[9px] font-extrabold uppercase tracking-[0.06em] transition active:scale-90 ${
        danger
          ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200/70"
          : "bg-white text-navy-700 ring-1 ring-ink/10 shadow-sm"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
