/**
 * Sticker / accessory library. Every sticker is a small inline SVG so there
 * are no extra files to host and it renders identically in the DOM preview and
 * on the export canvas.
 */

export type StickerCategory = "kacamata" | "topi" | "wajah" | "dekor";

export interface StickerDef {
  id: string;
  name: string;
  category: StickerCategory;
  /** SVG viewBox size. */
  w: number;
  h: number;
  /** Default width as a fraction of the frame width. */
  size: number;
  /** Inner SVG markup. */
  body: string;
}

export interface PlacedSticker {
  id: string;
  stickerId: string;
  /** Center, as a fraction of the frame width / height. */
  x: number;
  y: number;
  /** Width as a fraction of the frame width. */
  size: number;
  /** Degrees. */
  rotation: number;
  flip: boolean;
}

export const STICKER_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "kacamata", label: "Kacamata" },
  { id: "topi", label: "Topi & Mahkota" },
  { id: "wajah", label: "Wajah" },
  { id: "dekor", label: "Dekor" },
];

const RED = "#c10000";
const DARK_RED = "#7a0000";
const GOLD = "#fb9b00";
const NAVY = "#1f2077";
const INK = "#111111";

function star(cx: number, cy: number, ro: number, ri: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function flower(cx: number, cy: number, r: number, color: string): string {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    s += `<circle cx="${(cx + r * 1.05 * Math.cos(a)).toFixed(1)}" cy="${(cy + r * 1.05 * Math.sin(a)).toFixed(1)}" r="${r}" fill="${color}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.75).toFixed(1)}" fill="${GOLD}"/>`;
}

function flowerCrown(): string {
  const colors = [RED, "#ffffff", "#ff8fb1", GOLD, RED, "#ffffff", "#ff8fb1"];
  let s = `<path d="M8 54 Q120 14 232 54" fill="none" stroke="#2e9b4f" stroke-width="7" stroke-linecap="round"/>`;
  for (let i = 0; i < colors.length; i++) {
    const t = i / (colors.length - 1);
    const x = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 120 + t * t * 232;
    const y = (1 - t) * (1 - t) * 54 + 2 * (1 - t) * t * 14 + t * t * 54;
    s += `<ellipse cx="${(x + 10).toFixed(1)}" cy="${(y + 12).toFixed(1)}" rx="11" ry="5" fill="#2e9b4f" transform="rotate(35 ${(x + 10).toFixed(1)} ${(y + 12).toFixed(1)})"/>`;
    s += flower(Number(x.toFixed(1)), Number(y.toFixed(1)), 10, colors[i]);
  }
  return s;
}

const HEART_PATH =
  "M50 85 C10 55 0 35 0 22 C0 8 12 0 25 0 C37 0 46 8 50 16 C54 8 63 0 75 0 C88 0 100 8 100 22 C100 35 90 55 50 85Z";

export const STICKERS: StickerDef[] = [
  /* ---------------- Kacamata ---------------- */
  {
    id: "kacamata-bulat",
    name: "Kacamata Bulat",
    category: "kacamata",
    w: 200,
    h: 80,
    size: 0.32,
    body: `<circle cx="52" cy="42" r="32" fill="#ffffff" fill-opacity=".2" stroke="${INK}" stroke-width="8"/><circle cx="148" cy="42" r="32" fill="#ffffff" fill-opacity=".2" stroke="${INK}" stroke-width="8"/><path d="M84 38 Q100 24 116 38" fill="none" stroke="${INK}" stroke-width="8"/><path d="M21 36 L4 28 M179 36 L196 28" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  },
  {
    id: "kacamata-hitam",
    name: "Kacamata Hitam",
    category: "kacamata",
    w: 200,
    h: 80,
    size: 0.34,
    body: `<path d="M8 18 H92 Q92 68 58 72 Q16 72 8 18Z" fill="${INK}"/><path d="M108 18 H192 Q184 72 142 72 Q108 68 108 18Z" fill="${INK}"/><rect x="86" y="16" width="28" height="9" rx="4" fill="${INK}"/><path d="M22 28 L40 28 L24 46Z" fill="#fff" fill-opacity=".35"/><path d="M122 28 L140 28 L124 46Z" fill="#fff" fill-opacity=".35"/>`,
  },
  {
    id: "kacamata-hati",
    name: "Kacamata Hati",
    category: "kacamata",
    w: 230,
    h: 96,
    size: 0.34,
    body: `<g transform="translate(5,6)"><path d="${HEART_PATH}" fill="${RED}" stroke="${DARK_RED}" stroke-width="6" stroke-linejoin="round"/><ellipse cx="26" cy="24" rx="9" ry="6" fill="#fff" fill-opacity=".5" transform="rotate(-30 26 24)"/></g><g transform="translate(125,6)"><path d="${HEART_PATH}" fill="${RED}" stroke="${DARK_RED}" stroke-width="6" stroke-linejoin="round"/><ellipse cx="26" cy="24" rx="9" ry="6" fill="#fff" fill-opacity=".5" transform="rotate(-30 26 24)"/></g><path d="M104 28 Q115 20 126 28" fill="none" stroke="${DARK_RED}" stroke-width="6"/>`,
  },
  {
    id: "kacamata-bintang",
    name: "Kacamata Bintang",
    category: "kacamata",
    w: 230,
    h: 100,
    size: 0.34,
    body: `<polygon points="${star(52, 52, 46, 22)}" fill="${GOLD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><polygon points="${star(178, 52, 46, 22)}" fill="${GOLD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M96 46 Q115 34 134 46" fill="none" stroke="${INK}" stroke-width="6"/>`,
  },

  /* ---------------- Topi & Mahkota ---------------- */
  {
    id: "mahkota",
    name: "Mahkota",
    category: "topi",
    w: 220,
    h: 130,
    size: 0.3,
    body: `<g transform="translate(10,6)"><path d="M10 108 L0 30 L50 68 L100 8 L150 68 L200 30 L190 108Z" fill="${GOLD}" stroke="#8a5200" stroke-width="6" stroke-linejoin="round"/><rect x="8" y="98" width="184" height="22" rx="7" fill="#fdb43a" stroke="#8a5200" stroke-width="6"/><circle cx="0" cy="28" r="10" fill="${RED}" stroke="#8a5200" stroke-width="4"/><circle cx="100" cy="8" r="10" fill="${RED}" stroke="#8a5200" stroke-width="4"/><circle cx="200" cy="28" r="10" fill="${RED}" stroke="#8a5200" stroke-width="4"/><circle cx="45" cy="109" r="6" fill="${NAVY}"/><circle cx="100" cy="109" r="6" fill="${RED}"/><circle cx="155" cy="109" r="6" fill="${NAVY}"/></g>`,
  },
  {
    id: "topi-ulang-tahun",
    name: "Topi Pesta",
    category: "topi",
    w: 140,
    h: 180,
    size: 0.22,
    body: `<path d="M70 6 L135 170 H5Z" fill="${RED}" stroke="${DARK_RED}" stroke-width="5" stroke-linejoin="round"/><polygon points="48.6,60 91.4,60 97.7,76 42.3,76" fill="${GOLD}"/><polygon points="30.8,105 109.2,105 115.6,121 24.4,121" fill="${GOLD}"/><rect x="5" y="162" width="130" height="14" rx="7" fill="${GOLD}" stroke="#8a5200" stroke-width="3"/><circle cx="70" cy="10" r="14" fill="${GOLD}" stroke="#8a5200" stroke-width="3"/>`,
  },
  {
    id: "telinga-kucing",
    name: "Telinga Kucing",
    category: "topi",
    w: 220,
    h: 110,
    size: 0.36,
    body: `<path d="M10 102 Q110 42 210 102" fill="none" stroke="${NAVY}" stroke-width="11" stroke-linecap="round"/><path d="M22 88 L34 20 L84 66Z" fill="${NAVY}" stroke="#0e0f4a" stroke-width="4" stroke-linejoin="round"/><path d="M38 70 L40 40 L64 62Z" fill="#ff9fb2"/><path d="M198 88 L186 20 L136 66Z" fill="${NAVY}" stroke="#0e0f4a" stroke-width="4" stroke-linejoin="round"/><path d="M182 70 L180 40 L156 62Z" fill="#ff9fb2"/>`,
  },
  {
    id: "telinga-kelinci",
    name: "Telinga Kelinci",
    category: "topi",
    w: 170,
    h: 200,
    size: 0.3,
    body: `<ellipse cx="55" cy="90" rx="26" ry="80" fill="#ffffff" stroke="#c9ced9" stroke-width="5" transform="rotate(-12 55 90)"/><ellipse cx="55" cy="95" rx="12" ry="55" fill="#ffb3c6" transform="rotate(-12 55 90)"/><ellipse cx="115" cy="90" rx="26" ry="80" fill="#ffffff" stroke="#c9ced9" stroke-width="5" transform="rotate(12 115 90)"/><ellipse cx="115" cy="95" rx="12" ry="55" fill="#ffb3c6" transform="rotate(12 115 90)"/><path d="M26 188 Q85 160 144 188" fill="none" stroke="${GOLD}" stroke-width="10" stroke-linecap="round"/>`,
  },
  {
    id: "mahkota-bunga",
    name: "Mahkota Bunga",
    category: "topi",
    w: 240,
    h: 80,
    size: 0.4,
    body: flowerCrown(),
  },
  {
    id: "topi-festival",
    name: "Topi Tribiz",
    category: "topi",
    w: 210,
    h: 124,
    size: 0.3,
    body: `<path d="M22 100 Q22 22 102 22 Q182 22 182 100Z" fill="${RED}" stroke="${DARK_RED}" stroke-width="5"/><rect x="6" y="98" width="198" height="18" rx="9" fill="${GOLD}" stroke="#8a5200" stroke-width="4"/><polygon points="${star(102, 64, 22, 9)}" fill="#fff"/><circle cx="102" cy="22" r="8" fill="${GOLD}" stroke="#8a5200" stroke-width="3"/>`,
  },

  /* ---------------- Wajah ---------------- */
  {
    id: "kumis",
    name: "Kumis",
    category: "wajah",
    w: 200,
    h: 70,
    size: 0.22,
    body: `<path d="M100 30 C85 8 50 6 25 18 C8 26 2 44 10 58 C20 42 42 38 62 44 C80 50 92 46 100 38 C108 46 120 50 138 44 C158 38 180 42 190 58 C198 44 192 26 175 18 C150 6 115 8 100 30Z" fill="#2b1b12" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: "bibir",
    name: "Bibir Merah",
    category: "wajah",
    w: 140,
    h: 72,
    size: 0.16,
    body: `<path d="M5 34 Q35 6 70 22 Q105 6 135 34 Q105 66 70 66 Q35 66 5 34Z" fill="#d6001c" stroke="#8a0014" stroke-width="4" stroke-linejoin="round"/><path d="M5 34 Q70 50 135 34" fill="none" stroke="#8a0014" stroke-width="4"/><ellipse cx="46" cy="22" rx="12" ry="4" fill="#fff" fill-opacity=".45"/>`,
  },
  {
    id: "pipi-merona",
    name: "Pipi Merona",
    category: "wajah",
    w: 220,
    h: 70,
    size: 0.32,
    body: `<defs><radialGradient id="blushg"><stop offset="0" stop-color="#ff4f7b" stop-opacity=".75"/><stop offset="1" stop-color="#ff4f7b" stop-opacity="0"/></radialGradient></defs><ellipse cx="42" cy="35" rx="40" ry="28" fill="url(#blushg)"/><ellipse cx="178" cy="35" rx="40" ry="28" fill="url(#blushg)"/>`,
  },
  {
    id: "hidung-badut",
    name: "Hidung Badut",
    category: "wajah",
    w: 80,
    h: 80,
    size: 0.1,
    body: `<circle cx="40" cy="40" r="36" fill="#e3001b" stroke="#8a0014" stroke-width="4"/><ellipse cx="28" cy="26" rx="10" ry="7" fill="#fff" fill-opacity=".6" transform="rotate(-30 28 26)"/>`,
  },
  {
    id: "topeng",
    name: "Topeng",
    category: "wajah",
    w: 220,
    h: 90,
    size: 0.36,
    body: `<path fill-rule="evenodd" d="M10 30 Q60 10 110 28 Q160 10 210 30 Q214 70 170 76 Q130 78 112 50 Q110 46 108 50 Q90 78 50 76 Q6 70 10 30Z M40 48 a24 14 0 1 0 48 0 a24 14 0 1 0 -48 0Z M132 48 a24 14 0 1 0 48 0 a24 14 0 1 0 -48 0Z" fill="${NAVY}" stroke="${GOLD}" stroke-width="5" stroke-linejoin="round"/><polygon points="${star(110, 24, 8, 3.5)}" fill="${GOLD}"/>`,
  },

  /* ---------------- Dekor ---------------- */
  {
    id: "bintang",
    name: "Bintang",
    category: "dekor",
    w: 100,
    h: 100,
    size: 0.15,
    body: `<polygon points="${star(50, 52, 46, 20)}" fill="${GOLD}" stroke="${RED}" stroke-width="6" stroke-linejoin="round"/>`,
  },
  {
    id: "hati",
    name: "Hati",
    category: "dekor",
    w: 100,
    h: 90,
    size: 0.15,
    body: `<path d="${HEART_PATH}" fill="${RED}" stroke="${DARK_RED}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="26" cy="24" rx="10" ry="6" fill="#fff" fill-opacity=".5" transform="rotate(-30 26 24)"/>`,
  },
  {
    id: "kilau",
    name: "Kilau",
    category: "dekor",
    w: 100,
    h: 100,
    size: 0.13,
    body: `<path d="M50 3 Q56 44 97 50 Q56 56 50 97 Q44 56 3 50 Q44 44 50 3Z" fill="#ffffff" stroke="${GOLD}" stroke-width="5" stroke-linejoin="round"/>`,
  },
  {
    id: "balon",
    name: "Balon",
    category: "dekor",
    w: 90,
    h: 160,
    size: 0.14,
    body: `<ellipse cx="45" cy="55" rx="38" ry="50" fill="${RED}" stroke="${DARK_RED}" stroke-width="4"/><polygon points="45,104 37,115 53,115" fill="${DARK_RED}"/><path d="M45 115 Q30 134 45 148 Q56 157 45 157" fill="none" stroke="#555" stroke-width="3" stroke-linecap="round"/><ellipse cx="29" cy="38" rx="8" ry="14" fill="#fff" fill-opacity=".45" transform="rotate(20 29 38)"/>`,
  },
  {
    id: "badge-tribiz",
    name: "Badge Tribiz",
    category: "dekor",
    w: 180,
    h: 180,
    size: 0.22,
    body: `<circle cx="90" cy="90" r="84" fill="${RED}" stroke="#ffffff" stroke-width="8"/><circle cx="90" cy="90" r="70" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="6 6"/><text x="90" y="92" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff">TRIBIZ</text><text x="90" y="122" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="22" fill="${GOLD}">FEST 2026</text><polygon points="${star(90, 40, 12, 5)}" fill="${GOLD}"/>`,
  },
];

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

export function getSticker(id: string): StickerDef | undefined {
  return BY_ID.get(id);
}

export function stickerSvg(def: StickerDef): string {
  // width/height attributes (2x) so Safari rasterises at a sensible size.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${def.w * 2}" height="${def.h * 2}" viewBox="0 0 ${def.w} ${def.h}">${def.body}</svg>`;
}

const SRC_CACHE = new Map<string, string>();

export function stickerSrc(def: StickerDef): string {
  let src = SRC_CACHE.get(def.id);
  if (!src) {
    src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(stickerSvg(def))}`;
    SRC_CACHE.set(def.id, src);
  }
  return src;
}
