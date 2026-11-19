/**
 * Free, openly licensed market data. Each source is public data that may be
 * republished with attribution. Nothing here is estimated.
 *
 *  - Iron ore, CFR China (monthly average, US$/dry metric tonne):
 *    IMF Primary Commodity Prices, distributed by FRED (series PIORECRUSDM).
 */
import type { DataStore } from '../publishing/store';
import { log } from '../lib/util';

export interface Observation {
  date: string;
  value: number;
  source: { name: string; url?: string };
}

export type Observations = Record<string, Observation[]>;

interface FreeSeries {
  indicator: string;
  csvUrl: string;
  source: { name: string; url: string };
  decimals: number;
}

const SERIES: FreeSeries[] = [
  {
    indicator: 'iron-ore-fines',
    csvUrl: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PIORECRUSDM',
    source: { name: 'IMF Primary Commodity Prices via FRED', url: 'https://fred.stlouisfed.org/series/PIORECRUSDM' },
    decimals: 2,
  },
];

/** Parse a FRED graph CSV ("observation_date,SERIES" or "DATE,SERIES"). Skips missing values ("."). */
export function parseFredCsv(csv: string, decimals = 2): { date: string; value: number }[] {
  const rows = csv.trim().split(/\r?\n/).slice(1);
  const out: { date: string; value: number }[] = [];
  for (const row of rows) {
    const [date, raw] = row.split(',');
    const value = Number(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !raw || raw.trim() === '.' || !Number.isFinite(value) || value <= 0) continue;
    out.push({ date, value: Number(value.toFixed(decimals)) });
  }
  return out;
}

/** Merge observations, replacing any existing value for the same date. */
export function mergeObservations(list: Observation[], incoming: Observation[]): { list: Observation[]; added: number } {
  const byDate = new Map(list.map((o) => [o.date, o]));
  let added = 0;
  for (const o of incoming) {
    const prev = byDate.get(o.date);
    if (!prev || prev.value !== o.value) added++;
    byDate.set(o.date, o);
  }
  return { list: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), added };
}

export async function fetchFreeMarketData(store: DataStore, fetchImpl: typeof fetch = fetch): Promise<number> {
  const obs = await store.read<Observations>('market/observations.json', {});
  let total = 0;
  for (const s of SERIES) {
    try {
      const res = await fetchImpl(s.csvUrl, { headers: { 'user-agent': 'SteelScopeBot/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const points = parseFredCsv(await res.text(), s.decimals).slice(-36);
      const { list, added } = mergeObservations(obs[s.indicator] ?? [], points.map((p) => ({ ...p, source: s.source })));
      obs[s.indicator] = list;
      total += added;
    } catch (err) {
      log('market', `${s.indicator}: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }
  await store.write('market/observations.json', obs);
  return total;
}
