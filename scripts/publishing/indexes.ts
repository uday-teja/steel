import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CATEGORIES, COMPANY_BY_NAME } from '../../src/lib/taxonomy';
import type {
  Article,
  ArticleCard,
  CategoryFeed,
  CompanyIndex,
  DatesIndex,
  DayIndex,
  Edition,
  EditionIndex,
  LatestFeed,
  MarketData,
  MarketIndicator,
} from '../../src/types/news';
import { readJson, slugify } from '../lib/util';
import { byRecency, DataStore, toCard } from './store';

const CATEGORY_LIMIT = 60;
const COMPANY_LIMIT = 40;

export async function writeIndexes(store: DataStore, articles: Article[], now: string, latestDays: number): Promise<void> {
  const cards = articles.map(toCard).sort(byRecency);
  const cutoff = new Date(Date.now() - latestDays * 864e5).toISOString();
  const recent = cards.filter((c) => c.publishedAt >= cutoff || c.collectedAt >= cutoff);

  const latest: LatestFeed = {
    generatedAt: now,
    india: recent.filter((c) => c.region === 'india').slice(0, 150),
    world: recent.filter((c) => c.region === 'world').slice(0, 150),
  };
  await store.write('latest.json', latest);

  // Categories
  for (const cat of CATEGORIES) {
    const inCat = cards.filter((c) => c.categories.includes(cat.id));
    const feed: CategoryFeed = {
      id: cat.id,
      generatedAt: now,
      india: inCat.filter((c) => c.region === 'india').slice(0, CATEGORY_LIMIT),
      world: inCat.filter((c) => c.region === 'world').slice(0, CATEGORY_LIMIT),
    };
    await store.write(`categories/${cat.id}.json`, feed);
  }

  // Companies
  const byCompany = new Map<string, ArticleCard[]>();
  for (const c of cards) for (const name of c.companies) byCompany.set(name, [...(byCompany.get(name) ?? []), c]);
  const companies: CompanyIndex = {
    generatedAt: now,
    companies: [...byCompany.entries()]
      .map(([name, list]) => ({
        name,
        slug: COMPANY_BY_NAME[name]?.slug ?? slugify(name),
        count: list.length,
        latest: list[0].publishedAt,
        articles: list.slice(0, COMPANY_LIMIT),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
  await store.write('indexes/companies.json', companies);

  // Days: merge with existing day files so history survives article retention.
  const byDay = new Map<string, ArticleCard[]>();
  for (const c of cards) byDay.set(c.editionDate, [...(byDay.get(c.editionDate) ?? []), c]);
  for (const [date, list] of byDay) {
    const existing = await store.read<DayIndex | null>(`days/${date}.json`, null);
    const merged = new Map<string, ArticleCard>();
    for (const c of [...(existing?.india ?? []), ...(existing?.world ?? []), ...list]) merged.set(c.id, c);
    const all = [...merged.values()].sort(byRecency);
    const day: DayIndex = { date, india: all.filter((c) => c.region === 'india'), world: all.filter((c) => c.region === 'world') };
    await store.write(`days/${date}.json`, day);
  }
  const dayFiles = (await store.listDir('days')).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  const days: DatesIndex['days'] = [];
  for (const f of dayFiles.sort().reverse()) {
    const d = await store.read<DayIndex | null>(`days/${f}`, null);
    if (d) days.push({ date: d.date, india: d.india.length, world: d.world.length });
  }
  await store.write('indexes/dates.json', { generatedAt: now, days } satisfies DatesIndex);
}

export async function writeEditionIndex(store: DataStore, now: string, folder: 'editions' | 'weekly' = 'editions'): Promise<EditionIndex> {
  const files = await store.listEditionFiles(folder);
  const editions: EditionIndex['editions'] = [];
  for (const f of files) {
    const e = await store.loadEdition(f.region, f.date, folder);
    if (!e) continue;
    editions.push({ region: e.region, date: e.date, ...(e.periodEnd ? { periodEnd: e.periodEnd } : {}), number: e.number, title: e.title, headline: e.featured?.title ?? null, articleCount: e.articleCount, updatedAt: e.updatedAt });
  }
  editions.sort((a, b) => b.date.localeCompare(a.date) || a.region.localeCompare(b.region));
  const index: EditionIndex = { generatedAt: now, editions };
  await store.write(`${folder}/index.json`, index);
  return index;
}

interface Observation {
  date: string;
  value: number;
  source: { name: string; url?: string };
}

/** Build market indicators strictly from verified observations; never estimates. */
export async function writeMarket(store: DataStore, configDir: string, now: string): Promise<void> {
  const cfg = await readJson<{ note: string; indicators: Omit<MarketIndicator, 'status' | 'latest' | 'previous' | 'source' | 'updatedAt' | 'history'>[] }>(
    path.join(configDir, 'market-indicators.json'),
    { note: '', indicators: [] },
  );
  const obs = await store.read<Record<string, Observation[]>>('market/observations.json', {});
  const indicators: MarketIndicator[] = cfg.indicators.map((def) => {
    const list = (obs[def.id] ?? []).filter((o) => Number.isFinite(o.value) && o.source?.name).sort((a, b) => b.date.localeCompare(a.date));
    const [latest, previous] = list;
    return {
      ...def,
      status: latest ? 'available' : 'unavailable',
      latest: latest ? { value: latest.value, date: latest.date } : null,
      previous: previous ? { value: previous.value, date: previous.date } : null,
      source: latest ? latest.source : null,
      updatedAt: latest ? latest.date : null,
      history: list.slice(0, 90).reverse().map((o) => ({ date: o.date, value: o.value })),
    };
  });
  const data: MarketData = { generatedAt: now, note: cfg.note, indicators };
  await store.write('market/indicators.json', data);
  try {
    await fs.access(store.p('market/observations.json'));
  } catch {
    await store.write('market/observations.json', {});
  }
}

export async function pruneEditions(store: DataStore, keepDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - keepDays * 864e5).toISOString().slice(0, 10);
  let n = 0;
  for (const folder of ['editions', 'weekly'] as const) {
    for (const f of await store.listEditionFiles(folder)) {
      if (f.date < cutoff) {
        await store.removeFile(folder, f.region, `${f.date}.json`);
        n++;
      }
    }
  }
  for (const f of await store.listDir('days')) {
    if (f.slice(0, 10) < cutoff) {
      await store.removeFile('days', f);
      n++;
    }
  }
  return n;
}

export type { Edition };
