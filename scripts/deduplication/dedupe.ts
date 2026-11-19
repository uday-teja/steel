import { canonicalUrl } from '../lib/util';

const STOP = new Set(
  'a an and are as at be by for from has have in into is it its of on or over says say said than that the their this to under up was were will with after amid new its india indian steel'.split(' '),
);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9%₹$ ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)),
  );
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  // Overlap coefficient is more robust than Jaccard for headline rewrites of different lengths.
  return inter / Math.min(a.size, b.size);
}

export interface Dedupable {
  title: string;
  url: string;
}

/** Optional key (e.g. detected company names) that lets near-rewrites of the same company story match. */
export type EntityFn = (title: string) => string[];

/**
 * Identifies duplicates by canonical URL and by headline similarity.
 * Items are assumed to be pre-sorted by preference (best version first).
 */
export class Deduper {
  private urls = new Set<string>();
  private titles: { tokens: Set<string>; entities: string[] }[] = [];

  /**
   * @param threshold overlap needed for any two headlines to count as the same story
   * @param entityThreshold lower overlap accepted when both headlines name the same company
   */
  constructor(
    private threshold = 0.72,
    private entities: EntityFn = () => [],
    private entityThreshold = 0.5,
  ) {}

  seed(items: Dedupable[]): void {
    for (const i of items) this.add(i);
  }

  isDuplicate(item: Dedupable): boolean {
    if (this.urls.has(canonicalUrl(item.url))) return true;
    const tokens = titleTokens(item.title);
    if (tokens.size < 3) return false;
    const ents = this.entities(item.title);
    return this.titles.some((t) => {
      if (t.tokens.size < 3) return false;
      const sim = similarity(tokens, t.tokens);
      if (sim >= this.threshold) return true;
      return sim >= this.entityThreshold && ents.some((e) => t.entities.includes(e));
    });
  }

  add(item: Dedupable): void {
    this.urls.add(canonicalUrl(item.url));
    this.titles.push({ tokens: titleTokens(item.title), entities: this.entities(item.title) });
  }
}
