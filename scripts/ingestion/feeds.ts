import { promises as fs } from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { Region, SourceHealth } from '../../src/types/news';
import { canonicalUrl, log, mapLimit, stripHtml } from '../lib/util';

export interface SourceConfig {
  id: string;
  name: string;
  homepage: string;
  feedUrl: string;
  regionHint: Region | 'auto';
  focus: 'steel' | 'metals' | 'business' | 'general' | 'discovery';
  tier: number;
  access: string;
  enabled: boolean;
  verified: boolean;
  notes: string;
}

export interface RawItem {
  sourceId: string;
  sourceName: string;
  /** Original publisher (differs from source for aggregator feeds). */
  publisher: string;
  focus: SourceConfig['focus'];
  tier: number;
  regionHint: SourceConfig['regionHint'];
  title: string;
  url: string;
  description: string;
  publishedAt: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
});

type Node = Record<string, unknown> | string | undefined;

function text(node: Node): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === 'object' && '#text' in node) return String(node['#text']);
  return '';
}

function asArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Parse RSS 2.0 or Atom into raw items. */
export function parseFeed(xml: string, source: SourceConfig): RawItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const out: RawItem[] = [];
  const isAggregator = source.access === 'aggregator-rss';

  const rssItems = asArray(doc?.rss?.channel?.item ?? doc?.['rdf:RDF']?.item);
  for (const it of rssItems) {
    let title = stripHtml(text(it.title));
    const link = text(it.link) || text(it.guid);
    let publisher = source.name;
    if (isAggregator) {
      const src = it.source;
      const srcName = typeof src === 'object' ? text(src) : String(src ?? '');
      if (srcName) publisher = srcName.trim();
      // Google News appends " - Publisher" to titles.
      if (srcName && title.endsWith(` - ${srcName}`)) title = title.slice(0, -(srcName.length + 3)).trim();
      else {
        const m = title.match(/^(.*) - ([^-]{2,60})$/);
        if (m) {
          title = m[1].trim();
          if (!srcName) publisher = m[2].trim();
        }
      }
    }
    let description = stripHtml(text(it.description) || text(it['content:encoded']));
    // Aggregator descriptions usually repeat the headline + publisher; drop them.
    if (isAggregator) description = '';
    const date = text(it.pubDate) || text(it['dc:date']) || text(it.published);
    if (!title || !link) continue;
    out.push({
      sourceId: source.id,
      sourceName: source.name,
      publisher,
      focus: source.focus,
      tier: source.tier,
      regionHint: source.regionHint,
      title,
      url: canonicalUrl(link),
      description,
      publishedAt: normaliseDate(date),
    });
  }

  const atomEntries = asArray(doc?.feed?.entry);
  for (const e of atomEntries) {
    const links = asArray(e.link as any);
    const alt = links.find((l: any) => !l['@_rel'] || l['@_rel'] === 'alternate') ?? links[0];
    const link = typeof alt === 'string' ? alt : alt?.['@_href'] ?? '';
    const title = stripHtml(text(e.title));
    if (!title || !link) continue;
    out.push({
      sourceId: source.id,
      sourceName: source.name,
      publisher: source.name,
      focus: source.focus,
      tier: source.tier,
      regionHint: source.regionHint,
      title,
      url: canonicalUrl(link),
      description: stripHtml(text(e.summary) || text(e.content)),
      publishedAt: normaliseDate(text(e.published) || text(e.updated)),
    });
  }

  return out.map((i) => ({ ...i, publisher: i.publisher || hostnameLabel(i.url) || source.name }));
}

function normaliseDate(raw: string): string {
  const d = raw ? new Date(raw) : new Date(NaN);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export interface FetchResult {
  items: RawItem[];
  health: SourceHealth[];
}

async function fetchText(url: string, userAgent: string, timeoutMs = 20000): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'user-agent': userAgent, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Collect items from every enabled source. A failing source never fails the run;
 * its error is recorded in source health. `fixtureDir` (testing only) reads
 * `<sourceId>.xml` files instead of the network.
 */
export async function collect(sources: SourceConfig[], userAgent: string, fixtureDir?: string): Promise<FetchResult> {
  const checkedAt = new Date().toISOString();
  const health: SourceHealth[] = [];
  const enabled = sources.filter((s) => s.enabled && s.feedUrl);
  for (const s of sources.filter((x) => !x.enabled || !x.feedUrl)) {
    health.push({ id: s.id, name: s.name, status: 'disabled', items: 0, relevant: 0, checkedAt, error: s.notes });
  }

  const results = await mapLimit(enabled, 4, async (source) => {
    try {
      const xml = fixtureDir
        ? await fs.readFile(path.join(fixtureDir, `${source.id}.xml`), 'utf8').catch(() => '')
        : await fetchText(source.feedUrl, userAgent);
      const items = xml ? parseFeed(xml, source) : [];
      log('ingest', `${source.id}: ${items.length} items`);
      health.push({ id: source.id, name: source.name, status: items.length ? 'ok' : 'empty', items: items.length, relevant: 0, checkedAt });
      return items;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log('ingest', `${source.id}: FAILED ${message}`);
      health.push({ id: source.id, name: source.name, status: 'error', items: 0, relevant: 0, error: message, checkedAt });
      return [] as RawItem[];
    }
  });

  return { items: results.flat(), health };
}
