import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const TZ = 'Asia/Kolkata';

export function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

/** YYYY-MM-DD for a Date in Asia/Kolkata. */
export function istDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts; // en-CA formats as YYYY-MM-DD
}

export function slugify(input: string, max = 72): string {
  const s = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf('-') > 20 ? cut.lastIndexOf('-') : max);
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', hellip: '…', rupee: '₹', middot: '·', bull: '•', trade: '™', copy: '©', reg: '®',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export function stripHtml(input: string): string {
  return decodeEntities(
    input
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '));
  return `${cut.slice(0, end > max * 0.6 ? end : max).trim()}…`;
}

/** Remove tracking parameters and fragments so the same story URL compares equal. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|cmpid|from|src|ocid|mc_)/i.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.toLowerCase();
    return u.toString().replace(/\/$/, '');
  } catch {
    return raw.trim();
  }
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown, pretty = false): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, pretty ? 2 : 0)}\n`);
}

export function log(scope: string, ...msg: unknown[]): void {
  console.log(`[${new Date().toISOString().slice(11, 19)}] [${scope}]`, ...msg);
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function hoursBetween(a: string | Date, b: string | Date): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

/** Monday–Sunday (IST dates) of the week before the one containing `date`. */
export function previousWeek(date: string): { from: string; to: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(d.getTime() - (dow + 7) * 864e5);
  const sunday = new Date(monday.getTime() + 6 * 864e5);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}
