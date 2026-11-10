/**
 * Frame definitions.
 *
 * Each frame is a PNG overlay whose photo windows are transparent. Rendering
 * is: draw the user photo inside every window, then draw the overlay on top.
 * `windows` are fractions of the overlay size and are used to place the photo.
 *
 * To add a new frame later:
 *   1. Put the transparent-window PNG in `public/frames/`.
 *   2. Measure each photo window as fractions of the artwork size.
 *   3. Add an entry to `FRAME_OPTIONS` below.
 */

export interface PhotoWindow {
  /** Left edge, 0..1 of frame width. */
  x: number;
  /** Top edge, 0..1 of frame height. */
  y: number;
  /** Width, 0..1 of frame width. */
  w: number;
  /** Height, 0..1 of frame height. */
  h: number;
}

export interface FrameOption {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Public path of the overlay PNG (transparent photo windows). */
  src: string;
  width: number;
  height: number;
  windows: PhotoWindow[];
  /**
   * Draw the first photo behind the whole artwork so transparent holes in the
   * design (letter counters, decorative cut-outs) reveal the photo.
   */
  bleed?: boolean;
}

/**
 * Frames. The windows of a frame are filled in order: `windows[0]` gets the
 * first photo, `windows[1]` the second, and so on. The camera therefore shoots
 * exactly `windows.length` photos in a row for the selected frame.
 *
 * All PNGs are pre-flattened (see `public/frames`): everything outside the real
 * photo windows is opaque, so no transparent/black areas can show up around
 * the artwork (e.g. next to the stamp perforation).
 *
 * To add another frame later:
 *   1. Put the PNG in `public/frames/` (photo windows transparent, the rest opaque).
 *   2. Measure each photo window as fractions of the artwork size.
 *   3. Add an entry to `FRAME_OPTIONS` below.
 */
export const FRAME_OPTIONS: FrameOption[] = [
  {
    id: "lensa-abadi",
    name: "Lensa Abadi × Tribiz Fest",
    description:
      "Frame landscape bergaya perangko dengan satu jendela foto besar.",
    color: "#e11d48",
    src: "/frames/frame-lensa-abadi.png?v=2",
    width: 2985,
    height: 2375,
    windows: [{ x: 0.0918, y: 0.1225, w: 0.8168, h: 0.65 }],
    bleed: true,
  },
  {
    id: "tribiz-duo",
    name: "Tribiz Fest Vol.1 · Duo",
    description: "Frame portrait dengan 2 foto miring (01 dan 02).",
    color: "#c10000",
    src: "/frames/frame-tribiz-duo.png?v=2",
    width: 1760,
    height: 2480,
    windows: [
      { x: 0.133, y: 0.2883, w: 0.4864, h: 0.2601 },
      { x: 0.3767, y: 0.6278, w: 0.4932, h: 0.2694 },
    ],
  },
  {
    id: "tribiz-quad",
    name: "Tribiz Fest · Kolase 4",
    description: "Frame portrait biru dengan 1 foto besar dan 3 foto kecil.",
    color: "#1f2077",
    src: "/frames/frame-tribiz-quad.png?v=2",
    width: 1760,
    height: 2480,
    windows: [
      { x: 0.0625, y: 0.194, w: 0.875, h: 0.456 },
      { x: 0.0619, y: 0.6629, w: 0.5699, h: 0.2968 },
      { x: 0.6591, y: 0.6629, w: 0.2784, h: 0.1448 },
      { x: 0.6585, y: 0.8145, w: 0.2795, h: 0.1452 },
    ],
  },
  {
    id: "chroma-rana",
    name: "Chroma Rana · Landscape 4",
    description: "Frame landscape hitam-abu dengan 1 foto besar dan 3 foto kecil.",
    color: "#262626",
    src: "/frames/frame-chroma-rana.png?v=2",
    width: 3496,
    height: 2480,
    windows: [
      { x: 0.0481, y: 0.225, w: 0.6696, h: 0.6935 },
      { x: 0.7351, y: 0.2246, w: 0.2168, h: 0.2246 },
      { x: 0.7354, y: 0.4597, w: 0.2165, h: 0.2242 },
      { x: 0.7351, y: 0.694, w: 0.2168, h: 0.2246 },
    ],
  },
  {
    id: "diary-inces",
    name: "Diary Inces · Folder",
    description: "Frame landscape bergaya folder dengan 1 foto besar dan 3 foto lain.",
    color: "#fb9b00",
    src: "/frames/frame-diary-inces.png?v=1",
    width: 3496,
    height: 2480,
    windows: [
      { x: 0.0538, y: 0.173, w: 0.3962, h: 0.7609 },
      { x: 0.4608, y: 0.173, w: 0.1962, h: 0.3762 },
      { x: 0.4608, y: 0.5637, w: 0.1962, h: 0.3766 },
      { x: 0.6676, y: 0.4052, w: 0.2789, h: 0.5347 },
    ],
  },
  {
    id: "tribiz-kuning",
    name: "Tribiz Fest · Kuning",
    description: "Frame landscape kuning ceria dengan 1 foto besar dan 3 foto kecil.",
    color: "#ffd600",
    src: "/frames/frame-tribiz-kuning.png?v=1",
    width: 3496,
    height: 2480,
    windows: [
      { x: 0.0495, y: 0.2246, w: 0.6696, h: 0.694 },
      { x: 0.7337, y: 0.225, w: 0.2168, h: 0.2242 },
      { x: 0.734, y: 0.4593, w: 0.2165, h: 0.2246 },
      { x: 0.7337, y: 0.694, w: 0.2168, h: 0.2242 },
    ],
  },
  {
    id: "tribiz-perangko",
    name: "Tribiz Fest · Perangko Duo",
    description: "Dua foto portrait bergaya perangko di latar cokelat keemasan.",
    color: "#b07a2a",
    src: "/frames/frame-tribiz-perangko.png?v=1",
    width: 2000,
    height: 1419,
    windows: [
      { x: 0.0901, y: 0.1952, w: 0.339, h: 0.65 },
      { x: 0.5709, y: 0.1952, w: 0.339, h: 0.65 },
    ],
  },
];

export function getFrameById(id: string): FrameOption | undefined {
  return FRAME_OPTIONS.find((f) => f.id === id);
}

/** Aspect ratio (width / height) of the frame artwork. */
export function frameAspect(frame: FrameOption): number {
  return frame.width / frame.height;
}

/** The most photos any frame needs (the store keeps up to this many). */
export const MAX_FRAME_PHOTOS = Math.max(
  1,
  ...FRAME_OPTIONS.map((f) => f.windows.length),
);
