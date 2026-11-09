/**
 * Photo filters.
 *
 * Each filter is a set of CSS-filter-like params. The same params drive:
 *  - the live camera preview (CSS `filter`, works on every browser), and
 *  - the captured photo (pixel math on a canvas), because iOS Safari does not
 *    support `CanvasRenderingContext2D.filter`.
 */

export interface FilterParams {
  grayscale?: number;
  sepia?: number;
  /** degrees */
  hue?: number;
  saturate?: number;
  contrast?: number;
  brightness?: number;
}

export interface PhotoFilter {
  id: string;
  name: string;
  params: FilterParams;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: "normal", name: "Normal", params: {} },
  {
    id: "hangat",
    name: "Hangat",
    params: { sepia: 0.22, saturate: 1.25, contrast: 1.05, brightness: 1.05 },
  },
  {
    id: "segar",
    name: "Segar",
    params: { saturate: 1.4, contrast: 1.08, brightness: 1.05 },
  },
  {
    id: "jadul",
    name: "Jadul",
    params: { sepia: 0.6, saturate: 1.1, contrast: 0.95, brightness: 1.05 },
  },
  {
    id: "pudar",
    name: "Pudar",
    params: { saturate: 0.85, contrast: 0.88, brightness: 1.1 },
  },
  {
    id: "drama",
    name: "Drama",
    params: { saturate: 1.15, contrast: 1.3, brightness: 0.95 },
  },
  {
    id: "bw",
    name: "Hitam Putih",
    params: { grayscale: 1, contrast: 1.15 },
  },
];

export function getFilterById(id: string): PhotoFilter {
  return PHOTO_FILTERS.find((f) => f.id === id) ?? PHOTO_FILTERS[0];
}

/** CSS `filter` value for the live preview ("none" when nothing applies). */
export function filterToCss(params: FilterParams): string {
  const parts: string[] = [];
  if (params.grayscale) parts.push(`grayscale(${params.grayscale})`);
  if (params.sepia) parts.push(`sepia(${params.sepia})`);
  if (params.hue) parts.push(`hue-rotate(${params.hue}deg)`);
  if (params.saturate !== undefined && params.saturate !== 1)
    parts.push(`saturate(${params.saturate})`);
  if (params.contrast !== undefined && params.contrast !== 1)
    parts.push(`contrast(${params.contrast})`);
  if (params.brightness !== undefined && params.brightness !== 1)
    parts.push(`brightness(${params.brightness})`);
  return parts.length ? parts.join(" ") : "none";
}

type Mat3 = [number, number, number, number, number, number, number, number, number];

/** Affine colour transform: out = M * rgb + offset (values in 0..1). */
interface Affine {
  m: Mat3;
  o: [number, number, number];
}

const IDENTITY: Affine = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] };

function mul(s: Mat3, a: Affine): Affine {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a.m;
  const m: Mat3 = [
    s[0] * a0 + s[1] * a3 + s[2] * a6,
    s[0] * a1 + s[1] * a4 + s[2] * a7,
    s[0] * a2 + s[1] * a5 + s[2] * a8,
    s[3] * a0 + s[4] * a3 + s[5] * a6,
    s[3] * a1 + s[4] * a4 + s[5] * a7,
    s[3] * a2 + s[4] * a5 + s[5] * a8,
    s[6] * a0 + s[7] * a3 + s[8] * a6,
    s[6] * a1 + s[7] * a4 + s[8] * a7,
    s[6] * a2 + s[7] * a5 + s[8] * a8,
  ];
  const [o0, o1, o2] = a.o;
  return {
    m,
    o: [
      s[0] * o0 + s[1] * o1 + s[2] * o2,
      s[3] * o0 + s[4] * o1 + s[5] * o2,
      s[6] * o0 + s[7] * o1 + s[8] * o2,
    ],
  };
}

function grayscaleMat(amount: number): Mat3 {
  const i = 1 - Math.min(1, Math.max(0, amount));
  return [
    0.2126 + 0.7874 * i, 0.7152 - 0.7152 * i, 0.0722 - 0.0722 * i,
    0.2126 - 0.2126 * i, 0.7152 + 0.2848 * i, 0.0722 - 0.0722 * i,
    0.2126 - 0.2126 * i, 0.7152 - 0.7152 * i, 0.0722 + 0.9278 * i,
  ];
}

function sepiaMat(amount: number): Mat3 {
  const i = 1 - Math.min(1, Math.max(0, amount));
  return [
    0.393 + 0.607 * i, 0.769 - 0.769 * i, 0.189 - 0.189 * i,
    0.349 - 0.349 * i, 0.686 + 0.314 * i, 0.168 - 0.168 * i,
    0.272 - 0.272 * i, 0.534 - 0.534 * i, 0.131 + 0.869 * i,
  ];
}

function hueMat(deg: number): Mat3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
}

function saturateMat(s: number): Mat3 {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
}

function buildAffine(p: FilterParams): Affine {
  let a = IDENTITY;
  if (p.grayscale) a = mul(grayscaleMat(p.grayscale), a);
  if (p.sepia) a = mul(sepiaMat(p.sepia), a);
  if (p.hue) a = mul(hueMat(p.hue), a);
  if (p.saturate !== undefined && p.saturate !== 1)
    a = mul(saturateMat(p.saturate), a);
  if (p.contrast !== undefined && p.contrast !== 1) {
    const k = p.contrast;
    const c = 0.5 - 0.5 * k;
    a = {
      m: a.m.map((v) => v * k) as Mat3,
      o: [a.o[0] * k + c, a.o[1] * k + c, a.o[2] * k + c],
    };
  }
  if (p.brightness !== undefined && p.brightness !== 1) {
    const b = p.brightness;
    a = {
      m: a.m.map((v) => v * b) as Mat3,
      o: [a.o[0] * b, a.o[1] * b, a.o[2] * b],
    };
  }
  return a;
}

/** Bake a filter into the canvas pixels (in place). No-op for "normal". */
export function applyFilterToCanvas(
  canvas: HTMLCanvasElement,
  filterId: string,
): void {
  const { params } = getFilterById(filterId);
  if (filterToCss(params) === "none") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { m, o } = buildAffine(params);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  const o0 = o[0] * 255;
  const o1 = o[1] * 255;
  const o2 = o[2] * 255;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const nr = m[0] * r + m[1] * g + m[2] * b + o0;
    const ng = m[3] * r + m[4] * g + m[5] * b + o1;
    const nb = m[6] * r + m[7] * g + m[8] * b + o2;
    d[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
  ctx.putImageData(image, 0, 0);
}
