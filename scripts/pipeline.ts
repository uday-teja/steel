/**
 * SteelScope news pipeline.
 *
 *   collect → filter relevance → de-duplicate → classify → AI enrich (optional)
 *   → numeric guard → related → daily editions → indexes → meta
 *
 * Usage: tsx scripts/pipeline.ts [--trigger scheduled|manual|local] [--data-dir data] [--fixtures dir] [--max-new 60]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANIES } from '../src/lib/taxonomy';
import type { Article, Region, RunReport, SiteMeta } from '../src/types/news';
import { Deduper } from './deduplication/dedupe';
import { collect, type RawItem, type SourceConfig } from './ingestion/feeds';
import { canonicalUrl, istDate, previousWeek, log, mapLimit, readJson, sha1, slugify, truncate } from './lib/util';
import { classifyCategories, classifyRegion, detectCompanies, geoTags, heuristicImportance, isRelevant } from './processing/classify';
import { buildEdition } from './publishing/editions';
import { pruneEditions, writeEditionIndex, writeIndexes, writeMarket } from './publishing/indexes';
import { DataStore, toCard } from './publishing/store';
import { guardList, guardText } from './summarization/guard';
import { createProvider } from './summarization/index';
import type { EnrichOutput } from './summarization/provider';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

interface SiteConfig {
  retention: { articleDays: number; editionDays: number; latestDays: number };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const trigger = arg('trigger', process.env.PIPELINE_TRIGGER || 'local')!;
  const dataDir = path.resolve(ROOT, arg('data-dir', process.env.DATA_DIR || 'data')!);
  const fixtures = arg('fixtures');
  const maxNew = Number(arg('max-new', '80'));
  const configDir = path.join(ROOT, 'config');

  const site = await readJson<SiteConfig>(path.join(configDir, 'site.json'), { retention: { articleDays: 120, editionDays: 730, latestDays: 7 } });
  const registry = await readJson<{ userAgent: string; sources: SourceConfig[] }>(path.join(configDir, 'sources.json'), { userAgent: 'SteelScopeBot/1.0', sources: [] });
  const store = new DataStore(dataDir);
  const notes: string[] = [];
  log('pipeline', `trigger=${trigger} data=${dataDir}${fixtures ? ` fixtures=${fixtures}` : ''}`);

  // ------------------------------------------------------------ load + retention
  let existing = await store.loadArticles();
  const articleCutoff = new Date(Date.now() - site.retention.articleDays * 864e5).toISOString();
  const expired = existing.filter((a) => a.collectedAt < articleCutoff);
  for (const a of expired) await store.deleteArticle(a.slug);
  existing = existing.filter((a) => a.collectedAt >= articleCutoff);
  if (expired.length) notes.push(`Retention removed ${expired.length} article pages older than ${site.retention.articleDays} days.`);

  const deduper = new Deduper(0.72, detectCompanies);
  const recentCutoff = new Date(Date.now() - 21 * 864e5).toISOString();
  deduper.seed(existing.filter((a) => a.collectedAt >= recentCutoff));
  const knownUrls = new Set(existing.map((a) => canonicalUrl(a.url)));

  // ------------------------------------------------------------ collect
  const { items, health } = await collect(registry.sources, registry.userAgent, fixtures ? path.resolve(fixtures) : undefined);
  const healthById = new Map(health.map((h) => [h.id, h]));
  const lookbackH = existing.length ? 48 : 72;
  const now = new Date();
  const nowIso = now.toISOString();
  const editionDate = istDate(now);

  const sorted = [...items].sort(
    (a, b) => a.tier - b.tier || Number(b.focus === 'steel') - Number(a.focus === 'steel') || b.publishedAt.localeCompare(a.publishedAt),
  );

  type Candidate = { raw: RawItem; article: Article };
  const candidates: Candidate[] = [];
  for (const raw of sorted) {
    if (new Date(raw.publishedAt).getTime() > now.getTime() + 36e5) raw.publishedAt = nowIso;
    if (now.getTime() - new Date(raw.publishedAt).getTime() > lookbackH * 36e5) continue;
    if (!isRelevant(raw)) continue;
    const h = healthById.get(raw.sourceId);
    if (h) h.relevant++;
    if (knownUrls.has(raw.url) || deduper.isDuplicate(raw)) continue;
    deduper.add(raw);

    const text = `${raw.title} ${raw.description}`;
    const companies = detectCompanies(text);
    const region = classifyRegion(raw, companies);
    const { categories, primary } = classifyCategories(raw, companies);
    const excerpt = raw.description && raw.description.toLowerCase() !== raw.title.toLowerCase() ? truncate(raw.description, 420) : null;
    const id = sha1(raw.url).slice(0, 12);
    candidates.push({
      raw,
      article: {
        id,
        slug: `${editionDate}-${slugify(raw.title, 64)}-${id.slice(0, 5)}`,
        title: raw.title,
        dek: excerpt ? truncate(excerpt, 220) : '',
        aiSummary: false,
        region,
        geo: geoTags(text),
        categories,
        primaryCategory: primary,
        companies,
        publisher: raw.publisher,
        sourceId: raw.sourceId,
        url: raw.url,
        publishedAt: raw.publishedAt,
        collectedAt: nowIso,
        editionDate,
        importance: heuristicImportance(raw, companies, categories),
        summary: null,
        keyFacts: [],
        whyItMatters: null,
        implications: null,
        publisherExcerpt: excerpt,
        ai: null,
        related: [],
      },
    });
  }

  // Per-region quota so one region's volume never crowds out the other.
  candidates.sort((a, b) => b.article.importance - a.article.importance);
  const perRegion = Math.ceil(maxNew / 2);
  const india = candidates.filter((c) => c.article.region === 'india');
  const world = candidates.filter((c) => c.article.region === 'world');
  const takeIndia = Math.min(india.length, Math.max(perRegion, maxNew - Math.min(world.length, perRegion)));
  const takeWorld = Math.min(world.length, maxNew - takeIndia);
  const selected = [...india.slice(0, takeIndia), ...world.slice(0, takeWorld)];
  if (candidates.length > selected.length) notes.push(`${candidates.length - selected.length} lower-ranked stories skipped (per-run cap ${maxNew}, split between India and World).`);
  log('pipeline', `${items.length} items collected, ${candidates.length} new relevant, ${selected.length} selected`);

  // ------------------------------------------------------------ AI enrichment
  const ai = createProvider();
  let aiErrors = 0;
  const dropped = new Set<string>();
  if (ai && selected.length) {
    const batches: Candidate[][] = [];
    for (let i = 0; i < selected.length; i += 10) batches.push(selected.slice(i, i + 10));
    await mapLimit(batches, 2, async (batch) => {
      let results: EnrichOutput[] = [];
      try {
        results = await ai.enrich(
          batch.map(({ article: a }) => ({
            id: a.id,
            title: a.title,
            publisher: a.publisher,
            publishedAt: a.publishedAt,
            excerpt: a.publisherExcerpt ?? '',
            heuristic: { region: a.region, categories: a.categories, companies: a.companies },
          })),
        );
      } catch (err) {
        aiErrors++;
        log('ai', `enrichment batch failed: ${err instanceof Error ? err.message : err}`);
        return;
      }
      const ids = new Set(batch.map((b) => b.article.id));
      for (const r of results) {
        const c = batch.find((b) => b.article.id === r.id);
        if (!c) continue;
        const a = c.article;
        if (!r.relevant) {
          dropped.add(a.id);
          continue;
        }
        if (r.duplicateOf && r.duplicateOf !== a.id && ids.has(r.duplicateOf) && !dropped.has(r.duplicateOf)) {
          dropped.add(a.id);
          continue;
        }
        const source = `${a.title} ${a.publisherExcerpt ?? ''}`;
        const lowerSource = source.toLowerCase();
        a.region = r.region;
        if (r.categories.length) {
          a.categories = [...new Set(r.categories)].slice(0, 3);
          a.primaryCategory = a.categories[0];
        }
        if (r.geo.length) a.geo = [...new Set(r.geo)];
        // Only keep company names that literally appear in the source text; map to canonical names.
        const aiCompanies = r.companies
          .map((n) => COMPANIES.find((c) => c.name.toLowerCase() === n.toLowerCase() || c.patterns.includes(n.toLowerCase()))?.name ?? n)
          .filter((n) => {
            const def = COMPANIES.find((c) => c.name === n);
            return def ? def.patterns.some((p) => lowerSource.includes(p)) || lowerSource.includes(n.toLowerCase()) : lowerSource.includes(n.toLowerCase());
          });
        a.companies = [...new Set([...a.companies, ...aiCompanies])];
        a.importance = Math.round(r.importance * 0.7 + a.importance * 0.3);
        const summary = guardText(r.summary, source).text;
        const dek = guardText(r.dek, source).text;
        a.summary = summary || null;
        if (dek) {
          a.dek = truncate(dek, 240);
          a.aiSummary = true;
        }
        a.keyFacts = guardList(r.keyFacts, source).items.slice(0, 4);
        a.whyItMatters = guardText(r.whyItMatters, source).text || null;
        a.implications = guardText(r.implications, source).text || null;
        a.ai = { provider: ai.name, model: ai.model, generatedAt: nowIso };
      }
    });
    if (aiErrors) notes.push(`${aiErrors} AI enrichment batch(es) failed; affected stories use publisher excerpts.`);
  }

  const fresh = selected.map((c) => c.article).filter((a) => !dropped.has(a.id));
  for (const a of fresh) {
    if (a.region === 'india' && !a.geo.includes('india')) a.geo = ['india', ...a.geo.filter((g) => g !== 'global')];
  }
  if (dropped.size) notes.push(`${dropped.size} stories removed by AI review as off-topic or duplicate.`);

  // ------------------------------------------------------------ related articles
  const all = [...existing, ...fresh];
  const pool = all.filter((a) => a.collectedAt >= recentCutoff);
  const touched = new Set<string>(fresh.map((a) => a.id));
  const relatedFor = (a: Article) =>
    pool
      .filter((b) => b.id !== a.id)
      .map((b) => {
        let s = 0;
        s += a.companies.filter((c) => b.companies.includes(c)).length * 4;
        s += a.categories.filter((c) => b.categories.includes(c)).length * 1.5;
        s += a.geo.filter((g) => g !== 'global' && b.geo.includes(g)).length;
        if (a.region === b.region) s += 1;
        s -= Math.abs(new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()) / (864e5 * 4);
        return { b, s };
      })
      .filter((x) => x.s >= 3)
      .sort((x, y) => y.s - x.s)
      .slice(0, 4)
      .map((x) => toCard(x.b));

  for (const a of fresh) a.related = relatedFor(a);
  // Refresh related lists for the last three days so older pages link to new coverage.
  const recent3 = new Date(Date.now() - 3 * 864e5).toISOString();
  for (const a of existing) {
    if (a.collectedAt < recent3) continue;
    const next = relatedFor(a);
    if (next.map((r) => r.id).join() !== a.related.map((r) => r.id).join()) {
      a.related = next;
      touched.add(a.id);
    }
  }
  for (const a of all) if (touched.has(a.id)) await store.saveArticle(a);

  // ------------------------------------------------------------ editions
  const editionIndexBefore = await store.listEditionFiles();
  for (const region of ['india', 'world'] as Region[]) {
    const todays = all.filter((a) => a.region === region && a.editionDate === editionDate);
    const hasNew = fresh.some((a) => a.region === region);
    const previous = await store.loadEdition(region, editionDate);
    if (!todays.length || (!hasNew && previous)) continue;
    const number = previous?.number ?? editionIndexBefore.filter((e) => e.region === region && e.date < editionDate).length + 1;
    const { edition, aiError } = await buildEdition({ region, date: editionDate, articles: todays, previous, number, ai, now: nowIso });
    if (aiError) {
      aiErrors++;
      notes.push(`AI editorial for the ${region} edition failed; edition published with publisher excerpts.`);
    }
    await store.saveEdition(edition);
    log('edition', `${region} ${editionDate}: ${edition.articleCount} articles, #${edition.number}`);
  }

  // ------------------------------------------------------------ weekly reports
  // After each week ends (Mon–Sun, IST), publish one "Week in Steel" report per region, once.
  const { from: weekFrom, to: weekTo } = previousWeek(editionDate);
  const weeklyBefore = await store.listEditionFiles('weekly');
  for (const region of ['india', 'world'] as Region[]) {
    if (weeklyBefore.some((w) => w.region === region && w.date === weekFrom)) continue;
    const weekArticles = all
      .filter((a) => a.region === region && a.editionDate >= weekFrom && a.editionDate <= weekTo)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 60);
    if (weekArticles.length < 3) continue;
    const number = weeklyBefore.filter((w) => w.region === region).length + 1;
    const { edition, aiError } = await buildEdition({ region, date: weekFrom, articles: weekArticles, previous: null, number, ai, now: nowIso, period: { from: weekFrom, to: weekTo } });
    if (aiError) {
      aiErrors++;
      notes.push(`AI editorial for the ${region} weekly report failed; report published with publisher excerpts.`);
    }
    await store.saveEdition(edition);
    log('weekly', `${region} ${weekFrom}…${weekTo}: ${edition.articleCount} articles, #${number}`);
  }

  // ------------------------------------------------------------ indexes + retention
  const removed = await pruneEditions(store, site.retention.editionDays);
  if (removed) notes.push(`Retention removed ${removed} edition/day files.`);
  await writeIndexes(store, all, nowIso, site.retention.latestDays);
  const editionIndex = await writeEditionIndex(store, nowIso);
  await writeEditionIndex(store, nowIso, 'weekly');
  await writeMarket(store, configDir, nowIso);

  // ------------------------------------------------------------ meta
  const prevMeta = await store.read<SiteMeta | null>('meta.json', null);
  const live = health.filter((h) => h.status !== 'disabled');
  const failedSources = live.filter((h) => h.status === 'error').length;
  const status: RunReport['status'] = live.length > 0 && failedSources === live.length ? 'failed' : failedSources || aiErrors ? 'partial' : 'success';
  if (failedSources) notes.push(`${failedSources} of ${live.length} sources failed to respond.`);
  const report: RunReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    trigger,
    newArticles: fresh.length,
    aiProvider: ai?.name ?? 'none',
    aiModel: ai?.model ?? null,
    aiErrors,
    notes,
  };
  const meta: SiteMeta = {
    generatedAt: nowIso,
    lastRun: report,
    lastSuccessfulRefresh: status === 'failed' ? (prevMeta?.lastSuccessfulRefresh ?? null) : report.finishedAt,
    latestEditions: {
      india: editionIndex.editions.find((e) => e.region === 'india')?.date ?? null,
      world: editionIndex.editions.find((e) => e.region === 'world')?.date ?? null,
    },
    totals: { articles: all.length, editions: editionIndex.editions.length },
    sources: health.sort((a, b) => a.name.localeCompare(b.name)),
  };
  await store.write('meta.json', meta);
  log('pipeline', `done: ${status}, ${fresh.length} new articles, ${aiErrors} AI errors`);
  for (const n of notes) log('pipeline', `note: ${n}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
