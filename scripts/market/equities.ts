/**
 * Steel equities and futures: end-of-day/delayed quotes from Yahoo Finance's
 * public chart endpoint. Informational only; failures never fail a run.
 */
import path from 'node:path';
import type { EquityData, EquityQuote } from '../../src/types/news';
import { log, mapLimit, readJson } from '../lib/util';
import type { DataStore } from '../publishing/store';

interface EquityConfig {
  source: { name: string; url: string };
  groups: { id: string; title: string; items: { symbol: string; name: string; kind?: 'index' | 'future'; unit?: string; company?: string }[] }[];
}

interface ChartJson {
  chart?: {
    result?: {
      meta?: { currency?: string; exchangeName?: string; regularMarketPrice?: number; regularMarketTime?: number; chartPreviousClose?: number; previousClose?: number };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
    error?: unknown;
  };
}

/** Turn a Yahoo chart response into a quote with ~3 months of daily closes. */
export function parseChart(json: ChartJson): Omit<EquityQuote, 'symbol' | 'name' | 'kind' | 'unit' | 'company'> | null {
  const r = json.chart?.result?.[0];
  if (!r?.timestamp || !r.indicators?.quote?.[0]?.close) return null;
  const closes = r.indicators.quote[0].close;
  const history: { date: string; close: number }[] = [];
  r.timestamp.forEach((t, i) => {
    const c = closes[i];
    if (typeof c === 'number' && Number.isFinite(c)) history.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: Number(c.toFixed(2)) });
  });
  // Keep one point per date (the last).
  const byDate = new Map(history.map((h) => [h.date, h]));
  const series = [...byDate.values()];
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const price = typeof r.meta?.regularMarketPrice === 'number' ? Number(r.meta.regularMarketPrice.toFixed(2)) : last.close;
  const prevClose = price === last.close ? prev.close : last.close;
  const change = Number((price - prevClose).toFixed(2));
  return {
    currency: r.meta?.currency ?? '',
    exchange: r.meta?.exchangeName ?? '',
    price,
    change,
    changePct: prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0,
    asOf: r.meta?.regularMarketTime ? new Date(r.meta.regularMarketTime * 1000).toISOString() : `${last.date}T00:00:00.000Z`,
    history: series.slice(-66),
  };
}

async function fetchChart(symbol: string): Promise<ChartJson> {
  let lastErr: unknown;
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const res = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; SteelScopeBot/1.0)', accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ChartJson;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchEquities(store: DataStore, configDir: string): Promise<{ ok: number; failed: number }> {
  const cfg = await readJson<EquityConfig>(path.join(configDir, 'equities.json'), { source: { name: '', url: '' }, groups: [] });
  const previous = await store.read<EquityData | null>('market/equities.json', null);
  const prevBySymbol = new Map((previous?.groups ?? []).flatMap((g) => g.items).map((q) => [q.symbol, q]));
  let ok = 0;
  let failed = 0;
  const groups: EquityData['groups'] = [];
  for (const g of cfg.groups) {
    const items = await mapLimit(g.items, 3, async (it) => {
      try {
        const q = parseChart(await fetchChart(it.symbol));
        if (!q) throw new Error('no data');
        ok++;
        return { symbol: it.symbol, name: it.name, kind: it.kind ?? 'stock', unit: it.unit, company: it.company, ...q } as EquityQuote;
      } catch (err) {
        failed++;
        log('equities', `${it.symbol}: ${err instanceof Error ? err.message : err}`);
        return prevBySymbol.get(it.symbol) ?? null; // keep last good quote
      }
    });
    groups.push({ id: g.id, title: g.title, items: items.filter((x): x is EquityQuote => x !== null) });
  }
  const data: EquityData = { generatedAt: new Date().toISOString(), source: cfg.source, groups };
  await store.write('market/equities.json', data);
  return { ok, failed };
}
