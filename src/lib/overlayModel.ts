// Datenmodell des Overlay-Studios wie im Web (src/components/overlay/model.ts + templates.ts).
// Koordinaten leben in einem Entwurfsraster mit fester Breite DISPLAY_W; gespeichert wird als PNG in
// der echten Formatauflösung. Schriften: solche, die auf jedem iPhone vorhanden sind.

export const DISPLAY_W = 900;

type Base = { id: string; x: number; y: number; opacity: number; rotation: number; hidden?: boolean; locked?: boolean };

export type TextEl = Base & {
  type: 'text';
  text: string;
  fontSize: number;
  fill: string;
  fontFamily: string;
  fontWeight: 400 | 700 | 900;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  shadow: boolean;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string | null;
  bgPadding: number;
  /** Nur aus Vorlagen: x ist Mitte bzw. rechte Kante; nach dem ersten Messen in eine linke Kante umgerechnet. */
  autoAnchor?: 'center' | 'right';
};
export type ImageEl = Base & { type: 'image'; width: number; height: number; src: string; radius: number; flipX: boolean };
export type GradientDir = 'down' | 'up' | 'right' | 'left';
export type RectEl = Base & { type: 'rect'; width: number; height: number; fill: string; stroke: string; strokeWidth: number; radius: number; gradientTo: string | null; gradientDir: GradientDir };
export type EllipseEl = Base & { type: 'ellipse'; width: number; height: number; fill: string; stroke: string; strokeWidth: number };
export type TriangleEl = Base & { type: 'triangle'; width: number; height: number; fill: string };
export type StarEl = Base & { type: 'star'; width: number; height: number; fill: string };
export type LineEl = Base & { type: 'line'; width: number; stroke: string; strokeWidth: number };
export type FrameEl = Base & { type: 'frame'; width: number; height: number; stroke: string; strokeWidth: number; radius: number };
export type El = TextEl | ImageEl | RectEl | EllipseEl | TriangleEl | StarEl | LineEl | FrameEl;

export type Format = { id: string; label: string; w: number; h: number };
// 4:3 in der Auflösung, die der Automat für Foto-Overlays erwartet.
export const FORMATS: Format[] = [
  { id: '4:3', label: 'Foto-Overlay 4:3', w: 2362, h: 1772 },
  { id: '3:2', label: '3:2', w: 1620, h: 1080 },
  { id: '16:9', label: 'Breit 16:9', w: 1920, h: 1080 },
  { id: '1:1', label: 'Quadrat 1:1', w: 1080, h: 1080 },
  { id: '3:4', label: 'Hochformat 3:4', w: 1200, h: 1600 },
  { id: '9:16', label: 'Story 9:16', w: 1080, h: 1920 },
];
export const displayHeight = (f: Format) => Math.round(DISPLAY_W * (f.h / f.w));

export const FONTS = ['Avenir Next', 'Helvetica Neue', 'Futura', 'Gill Sans', 'Georgia', 'Didot', 'American Typewriter', 'Marker Felt', 'Chalkboard SE', 'Courier New', 'Trebuchet MS', 'Verdana'];
export const SWATCHES = ['#ffffff', '#000000', '#1f2933', '#c2410c', '#f97316', '#facc15', '#16a34a', '#0ea5e9', '#7c3aed', '#e11d48'];

export const uid = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const base = (x: number, y: number) => ({ id: uid(), x, y, opacity: 1, rotation: 0 });

export function makeText(x: number, y: number, text: string, fontSize: number, extra: Partial<TextEl> = {}): TextEl {
  return { ...base(x, y), type: 'text', text, fontSize, fill: '#ffffff', fontFamily: 'Avenir Next', fontWeight: 700, italic: false, align: 'left', letterSpacing: 0, shadow: true, strokeColor: '#000000', strokeWidth: 0, bgColor: null, bgPadding: 12, ...extra };
}
export function makeRect(x: number, y: number, width: number, height: number, extra: Partial<RectEl> = {}): RectEl {
  return { ...base(x, y), type: 'rect', width, height, fill: '#c2410c', stroke: '#ffffff', strokeWidth: 0, radius: 8, gradientTo: null, gradientDir: 'down', ...extra };
}
export function makeEllipse(x: number, y: number, size: number, extra: Partial<EllipseEl> = {}): EllipseEl {
  return { ...base(x, y), type: 'ellipse', width: size, height: size, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 0, ...extra };
}
export const makeTriangle = (x: number, y: number, size: number): TriangleEl => ({ ...base(x, y), type: 'triangle', width: size, height: Math.round(size * 0.87), fill: '#facc15' });
export const makeStar = (x: number, y: number, size: number): StarEl => ({ ...base(x, y), type: 'star', width: size, height: size, fill: '#facc15' });
export function makeLine(x: number, y: number, width: number, extra: Partial<LineEl> = {}): LineEl {
  return { ...base(x, y), type: 'line', width, stroke: '#ffffff', strokeWidth: 6, ...extra };
}
export function makeFrame(inset: number, w: number, h: number, extra: Partial<FrameEl> = {}): FrameEl {
  return { ...base(inset, inset), type: 'frame', width: w - inset * 2, height: h - inset * 2, stroke: '#ffffff', strokeWidth: 8, radius: 0, ...extra };
}
export const makeImage = (x: number, y: number, width: number, height: number, src: string): ImageEl => ({ ...base(x, y), type: 'image', width, height, src, radius: 0, flipX: false });

export function starPoints(w: number, h: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 0.5 : 0.2;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([w / 2 + Math.cos(a) * r * w, h / 2 + Math.sin(a) * r * h * 1.05]);
  }
  return pts;
}

const W = DISPLAY_W;
export type Template = { id: string; label: string; build: (h: number, title: string, tagline: string) => El[] };
export const TEMPLATES: Template[] = [
  { id: 'frame', label: 'Rahmen', build: (h, title) => [makeFrame(24, W, h, { strokeWidth: 6 }), makeText(W - 48, h - 84, title, 30, { align: 'right', autoAnchor: 'right' })] },
  {
    id: 'banner',
    label: 'Banner unten',
    build: (h, title, tagline) => [
      makeRect(0, h - 190, W, 190, { fill: 'rgba(0,0,0,0)', gradientTo: '#000000', gradientDir: 'down', radius: 0, opacity: 0.85 }),
      makeText(40, h - 128, title, 48, { fontWeight: 900 }),
      makeText(42, h - 66, tagline, 22, { fontWeight: 400, shadow: false }),
    ],
  },
  { id: 'badge', label: 'Abzeichen', build: (_h, title) => [makeText(32, 32, title, 26, { bgColor: '#c2410c', bgPadding: 14, shadow: false })] },
  {
    id: 'polaroid',
    label: 'Polaroid',
    build: (h, title) => [
      makeFrame(0, W, h, { strokeWidth: 28 }),
      makeRect(0, h - 110, W, 110, { fill: '#ffffff', radius: 0 }),
      makeText(W / 2, h - 82, title, 40, { fill: '#1f2933', shadow: false, align: 'center', autoAnchor: 'center' }),
    ],
  },
  {
    id: 'double',
    label: 'Doppelrahmen',
    build: (h, title) => [
      makeFrame(20, W, h, { strokeWidth: 4 }),
      makeFrame(36, W, h, { strokeWidth: 2, opacity: 0.8 }),
      makeLine(W / 2 - 90, h - 92, 180, { strokeWidth: 3 }),
      makeText(W / 2, h - 78, title, 26, { align: 'center', fontWeight: 400, letterSpacing: 4, autoAnchor: 'center' }),
    ],
  },
  {
    id: 'circle',
    label: 'Kreis-Stempel',
    build: (h, title) => [
      makeEllipse(W - 200, h - 200, 160, { fill: '#c2410c', stroke: '#ffffff', strokeWidth: 4 }),
      makeText(W - 120, h - 136, title.slice(0, 14), 22, { shadow: false, align: 'center', fontWeight: 900, autoAnchor: 'center' }),
    ],
  },
];

export const TEXT_LINE = 1.2;

/** Ungefähre Textgröße, bis die echte Messung da ist (und für Vorschau-Kacheln). */
export function estimateText(el: TextEl) {
  const lines = el.text.split('\n');
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const factor = el.fontWeight === 900 ? 0.62 : el.fontWeight === 700 ? 0.58 : 0.52;
  return { w: longest * el.fontSize * factor + longest * el.letterSpacing, h: lines.length * el.fontSize * TEXT_LINE };
}

/** Farbe für SVG zerlegen: rgba(…) in Farbe und Deckkraft. */
export function splitColor(c: string): { color: string; opacity: number } {
  const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (!m) return { color: c, opacity: 1 };
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return { color: `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`, opacity: m[4] !== undefined ? Number(m[4]) : 1 };
}
