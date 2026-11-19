import { promises as fs } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import type { CategoryId, Region } from '../../src/types/news';

/** Convert a WOFF 1.0 font to TTF/OTF so resvg can load it (fontsource ships WOFF/WOFF2 only). */
function woffToSfnt(woff: Buffer): Buffer {
  if (woff.readUInt32BE(0) !== 0x774f4646) throw new Error('not a WOFF file');
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);
  const tables: { tag: number; checksum: number; data: Buffer }[] = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = woff.readUInt32BE(o);
    const offset = woff.readUInt32BE(o + 4);
    const compLength = woff.readUInt32BE(o + 8);
    const origLength = woff.readUInt32BE(o + 12);
    const checksum = woff.readUInt32BE(o + 16);
    const raw = woff.subarray(offset, offset + compLength);
    tables.push({ tag, checksum, data: compLength < origLength ? inflateSync(raw) : Buffer.from(raw) });
  }
  let pow = 1;
  let log2 = 0;
  while (pow * 2 <= numTables) {
    pow *= 2;
    log2++;
  }
  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(log2, 8);
  header.writeUInt16BE(numTables * 16 - pow * 16, 10);
  let offset = header.length;
  const bodies: Buffer[] = [];
  tables.forEach((t, i) => {
    const o = 12 + i * 16;
    header.writeUInt32BE(t.tag, o);
    header.writeUInt32BE(t.checksum, o + 4);
    header.writeUInt32BE(offset, o + 8);
    header.writeUInt32BE(t.data.length, o + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    bodies.push(t.data, Buffer.alloc(pad));
    offset += t.data.length + pad;
  });
  return Buffer.concat([header, ...bodies]);
}

const FONTS = [
  ['@fontsource/newsreader/files/newsreader-latin-600-normal.woff', 'newsreader-600.ttf'],
  ['@fontsource/newsreader/files/newsreader-latin-700-normal.woff', 'newsreader-700.ttf'],
  ['@fontsource/inter/files/inter-latin-400-normal.woff', 'inter-400.ttf'],
  ['@fontsource/inter/files/inter-latin-600-normal.woff', 'inter-600.ttf'],
  // latin-ext carries the rupee sign (U+20B9) and other symbols; resvg falls back per glyph.
  ['@fontsource/inter/files/inter-latin-ext-400-normal.woff', 'inter-ext-400.ttf'],
  ['@fontsource/inter/files/inter-latin-ext-600-normal.woff', 'inter-ext-600.ttf'],
  ['@fontsource/newsreader/files/newsreader-latin-ext-600-normal.woff', 'newsreader-ext-600.ttf'],
];

export async function prepareFonts(root: string): Promise<string[]> {
  const dir = path.join(root, 'node_modules/.cache/steelscope-fonts');
  await fs.mkdir(dir, { recursive: true });
  const out: string[] = [];
  for (const [src, name] of FONTS) {
    const dest = path.join(dir, name);
    try {
      await fs.access(dest);
    } catch {
      await fs.writeFile(dest, woffToSfnt(await fs.readFile(path.join(root, 'node_modules', src))));
    }
    out.push(dest);
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function charWidth(ch: string): number {
  if (/[ilj.,:;'|!’‘ ]/.test(ch)) return 0.28;
  if (/[mwMW@—]/.test(ch)) return 0.88;
  if (/[A-Z₹%&]/.test(ch)) return 0.66;
  if (/[0-9]/.test(ch)) return 0.55;
  return 0.5;
}

function measure(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w * size;
}

function wrap(text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(next, size) > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const consumed = lines.join(' ').length;
  if (consumed < text.length && lines.length) {
    let last = lines[lines.length - 1];
    while (measure(`${last}…`, size) > maxWidth && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    lines[lines.length - 1] = `${last.replace(/[,;:.]$/, '')}…`;
  }
  return lines;
}

export interface CardInput {
  seed: string;
  category: CategoryId;
  region: Region;
  kicker: string;
  title: string;
  summary: string;
  footer: string;
}

const REGION_COLOR: Record<Region, string> = { india: '#A3311B', world: '#1F4A6E' };

export function cardSvg(c: CardInput): string {
  const W = 1200;
  const H = 630;
  const pad = 72;
  const textW = W - pad * 2;
  let size = 64;
  let lines = wrap(c.title, size, textW, 4);
  while ((lines.length > 3 || lines.some((l) => l.endsWith('…'))) && size > 46) {
    size -= 4;
    lines = wrap(c.title, size, textW, 4);
  }
  const lh = size * 1.1;
  const titleTop = 205;
  const summaryTop = titleTop + lines.length * lh + 26;
  const roomForSummary = Math.floor((H - 120 - summaryTop) / 34);
  const sumLines = c.summary && roomForSummary > 0 ? wrap(c.summary, 25, textW, Math.min(3, roomForSummary)) : [];
  const accent = REGION_COLOR[c.region];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#F8F6F1"/>
  <rect width="${W}" height="10" fill="${accent}"/>
  <text x="${pad}" y="98" font-family="Newsreader" font-weight="700" font-size="46" fill="#121212">Steel<tspan fill="#A3311B">Scope</tspan></text>
  <text x="${W - pad}" y="96" text-anchor="end" font-family="Inter" font-weight="600" font-size="17" letter-spacing="2.4" fill="${accent}">${esc(c.kicker.toUpperCase())}</text>
  <rect x="${pad}" y="122" width="${textW}" height="3" fill="#121212"/>
  <rect x="${pad}" y="128" width="${textW}" height="1" fill="#121212"/>
  ${lines.map((l, i) => `<text x="${pad}" y="${f(titleTop + (i + 0.8) * lh)}" font-family="Newsreader" font-weight="600" font-size="${size}" fill="#121212">${esc(l)}</text>`).join('\n  ')}
  ${sumLines.map((l, i) => `<text x="${pad}" y="${f(summaryTop + (i + 0.8) * 34)}" font-family="Inter" font-weight="400" font-size="25" fill="#4A4743">${esc(l)}</text>`).join('\n  ')}
  <rect x="${pad}" y="${H - 84}" width="${textW}" height="1" fill="#DCD7CD"/>
  <text x="${pad}" y="${H - 46}" font-family="Inter" font-weight="600" font-size="19" fill="#121212">${esc(c.footer)}</text>
  ${measure(c.footer, 19) + measure('Daily steel intelligence', 18) + 40 < textW ? `<text x="${W - pad}" y="${H - 46}" text-anchor="end" font-family="Inter" font-weight="400" font-size="18" fill="#6C6862">Daily steel intelligence</text>` : ''}
</svg>`;
}

function f(n: number): number {
  return Math.round(n * 10) / 10;
}

export function renderPng(svg: string, fontFiles: string[]): Buffer {
  const r = new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' },
    fitTo: { mode: 'width', value: 1200 },
  });
  return r.render().asPng();
}
