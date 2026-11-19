import type { CategoryId, Region } from '../types/news';

/**
 * Generated editorial cover art. SteelScope does not hotlink or republish
 * publishers' photographs (they are copyrighted), so every story gets a
 * deterministic, category-specific engraving-style illustration instead.
 * Pure string output so it renders identically in the browser, in
 * server-side pre-rendering and in share-card PNG generation.
 */

const W = 1200;
const H = 675;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;

export const ACCENT: Record<Region, string> = { india: '#D2643F', world: '#78A6CF' };
const GREEN = '#7DAA86';
const LINE = '#C9D2DB';

type Painter = (r: () => number, accent: string) => string;

const coil: Painter = (r, accent) => {
  let out = '';
  const coils = 2 + Math.floor(r() * 2);
  for (let c = 0; c < coils; c++) {
    const cx = 620 + c * 260 + r() * 80;
    const cy = 300 + r() * 160;
    const outer = 170 + r() * 90;
    const inner = outer * (0.28 + r() * 0.1);
    for (let rad = inner; rad < outer; rad += 7 + r() * 3) {
      out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="none" stroke="${LINE}" stroke-opacity="${f(0.12 + r() * 0.22)}" stroke-width="1.2"/>`;
    }
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(outer)}" fill="none" stroke="${c === 0 ? accent : LINE}" stroke-opacity="${c === 0 ? 0.9 : 0.5}" stroke-width="${c === 0 ? 3 : 1.5}"/>`;
  }
  return out;
};

const chart: Painter = (r, accent) => {
  let out = '';
  for (let x = 80; x < W; x += 80) out += `<line x1="${x}" y1="60" x2="${x}" y2="${H - 60}" stroke="${LINE}" stroke-opacity="0.08"/>`;
  for (let y = 100; y < H; y += 70) out += `<line x1="40" y1="${y}" x2="${W - 40}" y2="${y}" stroke="${LINE}" stroke-opacity="0.1"/>`;
  const series = (offset: number, vol: number) => {
    let y = 380 + offset;
    const pts: string[] = [];
    for (let x = 40; x <= W - 40; x += 24) {
      y += (r() - 0.5) * vol;
      y = Math.max(110, Math.min(H - 90, y));
      pts.push(`${x},${f(y)}`);
    }
    return pts.join(' ');
  };
  out += `<polyline points="${series(60, 40)}" fill="none" stroke="${LINE}" stroke-opacity="0.35" stroke-width="1.5"/>`;
  out += `<polyline points="${series(-30, 55)}" fill="none" stroke="${accent}" stroke-width="3"/>`;
  return out;
};

const ore: Painter = (r, accent) => {
  let out = '';
  const pts: [number, number][] = [];
  for (let i = 0; i < 70; i++) pts.push([r() * W, 260 + Math.pow(r(), 0.7) * (H - 260)]);
  pts.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < pts.length - 2; i++) {
    const [a, b, c] = [pts[i], pts[i + 1], pts[i + 2]];
    const hl = r() < 0.08;
    out += `<polygon points="${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(c[0])},${f(c[1])}" fill="${hl ? accent : LINE}" fill-opacity="${hl ? 0.35 : f(0.02 + r() * 0.06)}" stroke="${LINE}" stroke-opacity="0.25"/>`;
  }
  out += `<path d="M0 ${H - 40} Q ${W / 2} 230 ${W} ${H - 60}" fill="none" stroke="${accent}" stroke-opacity="0.8" stroke-width="2"/>`;
  return out;
};

const beams: Painter = (r, accent) => {
  let out = '';
  const rows = 4;
  for (let row = 0; row < rows; row++) {
    const scale = 0.5 + row * 0.25;
    const y = 120 + row * 130;
    for (let x = -40 + r() * 60; x < W; x += 150 * scale) {
      const w = 90 * scale;
      const h = 100 * scale;
      const t = 10 * scale;
      const hl = row === rows - 1 && r() < 0.18;
      const stroke = hl ? accent : LINE;
      out += `<path d="M${f(x)} ${f(y)}h${f(w)}v${f(t)}h${f(-(w - t) / 2)}v${f(h - 2 * t)}h${f((w - t) / 2)}v${f(t)}h${f(-w)}v${f(-t)}h${f((w - t) / 2)}v${f(-(h - 2 * t))}h${f(-(w - t) / 2)}z" fill="none" stroke="${stroke}" stroke-opacity="${hl ? 0.95 : f(0.18 + row * 0.08)}" stroke-width="${hl ? 2.5 : 1.2}"/>`;
    }
  }
  return out;
};

const columns: Painter = (r, accent) => {
  let out = '';
  const n = 7;
  const left = 260 + r() * 60;
  const span = 760;
  out += `<path d="M${left - 40} 210 L${left + span / 2} ${110 + r() * 20} L${left + span + 40} 210 Z" fill="none" stroke="${accent}" stroke-width="2.5"/>`;
  out += `<line x1="${left - 50}" y1="225" x2="${left + span + 50}" y2="225" stroke="${LINE}" stroke-opacity="0.6" stroke-width="2"/>`;
  for (let i = 0; i < n; i++) {
    const x = left + (span / (n - 1)) * i;
    for (let k = -2; k <= 2; k++) out += `<line x1="${f(x + k * 7)}" y1="240" x2="${f(x + k * 7)}" y2="560" stroke="${LINE}" stroke-opacity="${k === 0 ? 0.5 : 0.22}"/>`;
  }
  out += `<line x1="${left - 70}" y1="575" x2="${left + span + 70}" y2="575" stroke="${LINE}" stroke-opacity="0.6" stroke-width="2"/>`;
  out += `<line x1="${left - 100}" y1="600" x2="${left + span + 100}" y2="600" stroke="${LINE}" stroke-opacity="0.35"/>`;
  return out;
};

const containers: Painter = (r, accent) => {
  let out = '';
  const cw = 120;
  const ch = 52;
  for (let row = 0; row < 7; row++) {
    const cols = 3 + Math.floor(r() * 6);
    const start = 560 + (r() - 0.5) * 120;
    for (let c = 0; c < cols; c++) {
      const x = start + c * (cw + 6) - (cols * cw) / 3;
      const y = H - 90 - row * (ch + 6);
      if (y < 80) continue;
      const hl = r() < 0.09;
      out += `<rect x="${f(x)}" y="${f(y)}" width="${cw}" height="${ch}" fill="${hl ? accent : LINE}" fill-opacity="${hl ? 0.55 : 0.04}" stroke="${LINE}" stroke-opacity="0.35"/>`;
      for (let k = 12; k < cw; k += 12) out += `<line x1="${f(x + k)}" y1="${f(y + 6)}" x2="${f(x + k)}" y2="${f(y + ch - 6)}" stroke="${LINE}" stroke-opacity="0.12"/>`;
    }
  }
  out += `<path d="M40 120 C 400 60, 800 200, 1160 110" fill="none" stroke="${accent}" stroke-dasharray="6 8" stroke-width="2"/>`;
  return out;
};

const truss: Painter = (r, accent) => {
  let out = '';
  const top = 230 + r() * 40;
  const bottom = 430 + r() * 30;
  const step = 90;
  out += `<line x1="0" y1="${f(top)}" x2="${W}" y2="${f(top)}" stroke="${LINE}" stroke-opacity="0.7" stroke-width="3"/>`;
  out += `<line x1="0" y1="${f(bottom)}" x2="${W}" y2="${f(bottom)}" stroke="${accent}" stroke-width="3"/>`;
  for (let x = 0; x < W; x += step) {
    out += `<line x1="${x}" y1="${f(bottom)}" x2="${x + step / 2}" y2="${f(top)}" stroke="${LINE}" stroke-opacity="0.45" stroke-width="1.5"/>`;
    out += `<line x1="${x + step / 2}" y1="${f(top)}" x2="${x + step}" y2="${f(bottom)}" stroke="${LINE}" stroke-opacity="0.45" stroke-width="1.5"/>`;
    out += `<line x1="${x + step / 2}" y1="${f(top)}" x2="${x + step / 2}" y2="${f(bottom)}" stroke="${LINE}" stroke-opacity="0.15"/>`;
  }
  for (let x = 150; x < W; x += 300) out += `<rect x="${x}" y="${f(bottom)}" width="40" height="${f(H - bottom)}" fill="${LINE}" fill-opacity="0.06" stroke="${LINE}" stroke-opacity="0.3"/>`;
  return out;
};

const circuit: Painter = (r, accent) => {
  let out = '';
  const g = 60;
  for (let x = g; x < W; x += g) for (let y = g; y < H; y += g) out += `<circle cx="${x}" cy="${y}" r="1.4" fill="${LINE}" fill-opacity="0.25"/>`;
  for (let i = 0; i < 26; i++) {
    let x = Math.round((r() * W) / g) * g;
    let y = Math.round((r() * H) / g) * g;
    let d = `M${x} ${y}`;
    for (let s = 0; s < 4; s++) {
      if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * g * (1 + Math.floor(r() * 3));
      else y += (r() < 0.5 ? -1 : 1) * g * (1 + Math.floor(r() * 2));
      d += ` L${x} ${y}`;
    }
    const hl = i < 3;
    out += `<path d="${d}" fill="none" stroke="${hl ? accent : LINE}" stroke-opacity="${hl ? 0.9 : 0.3}" stroke-width="${hl ? 2.5 : 1.3}"/><circle cx="${x}" cy="${y}" r="${hl ? 6 : 4}" fill="none" stroke="${hl ? accent : LINE}" stroke-opacity="0.8"/>`;
  }
  return out;
};

const waves: Painter = (r) => {
  let out = '';
  for (let i = 0; i < 22; i++) {
    const amp = 30 + r() * 60;
    const y0 = 140 + i * 22;
    const ph = r() * Math.PI * 2;
    let d = `M0 ${f(y0)}`;
    for (let x = 0; x <= W; x += 30) d += ` L${x} ${f(y0 + Math.sin(x / 160 + ph + i * 0.25) * amp * 0.5)}`;
    out += `<path d="${d}" fill="none" stroke="${i % 7 === 3 ? GREEN : LINE}" stroke-opacity="${i % 7 === 3 ? 0.9 : f(0.08 + (i / 22) * 0.25)}" stroke-width="${i % 7 === 3 ? 2.5 : 1.2}"/>`;
  }
  return out;
};

const bars: Painter = (r, accent) => {
  let out = '';
  const n = 22;
  const bw = 32;
  let h = 180 + r() * 100;
  for (let i = 0; i < n; i++) {
    h = Math.max(60, Math.min(440, h + (r() - 0.45) * 70));
    const x = 120 + i * (bw + 12);
    const hl = i === n - 1;
    out += `<rect x="${x}" y="${f(H - 90 - h)}" width="${bw}" height="${f(h)}" fill="${hl ? accent : LINE}" fill-opacity="${hl ? 0.85 : 0.08}" stroke="${hl ? accent : LINE}" stroke-opacity="${hl ? 1 : 0.35}"/>`;
  }
  out += `<line x1="80" y1="${H - 90}" x2="${W - 80}" y2="${H - 90}" stroke="${LINE}" stroke-opacity="0.6" stroke-width="1.5"/>`;
  return out;
};

const PAINTERS: Record<CategoryId, Painter> = {
  'market-prices': chart,
  'raw-materials': ore,
  manufacturing: coil,
  'company-updates': beams,
  'government-policy': columns,
  'trade-exports': containers,
  'infrastructure-automotive': truss,
  'technology-innovation': circuit,
  'green-steel': waves,
  'market-analysis': bars,
};

export interface CoverOptions {
  seed: string;
  category: CategoryId;
  region: Region;
  /** Include the outer <svg> element (default true). */
  standalone?: boolean;
  /** Optional id prefix to keep gradient ids unique when several covers are inlined. */
  idPrefix?: string;
}

export function coverSvg({ seed, category, region, standalone = true, idPrefix = 'c' }: CoverOptions): string {
  const r = rng(`${seed}:${category}`);
  const id = `${idPrefix}${hash(seed).toString(36)}`;
  const accent = ACCENT[region];
  const body =
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#20252B"/><stop offset="1" stop-color="#14171B"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#${id})"/>` +
    (PAINTERS[category] ?? bars)(r, accent);
  if (!standalone) return body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">${body}</svg>`;
}

export const COVER_SIZE = { width: W, height: H };
