import type { Article, ArticleCard, CategoryId, Edition, EditionSection, GeoTag, Region } from '../../src/types/news';
import { log } from '../lib/util';
import { guardList, guardText } from '../summarization/guard';
import type { AiProvider, EditionOutput } from '../summarization/provider';
import { toCard } from './store';

interface SectionDef {
  id: string;
  title: string;
  categories?: CategoryId[];
  geo?: GeoTag[];
}

export const EDITION_SECTIONS: Record<Region, SectionDef[]> = {
  india: [
    { id: 'prices', title: 'Steel Price Developments', categories: ['market-prices'] },
    { id: 'raw-materials', title: 'Raw Materials', categories: ['raw-materials'] },
    { id: 'policy', title: 'Government & Policy', categories: ['government-policy', 'trade-exports'] },
    { id: 'companies', title: 'Company Announcements', categories: ['company-updates'] },
    { id: 'manufacturing', title: 'Manufacturing & Demand', categories: ['manufacturing', 'infrastructure-automotive', 'technology-innovation', 'green-steel'] },
  ],
  world: [
    { id: 'china', title: 'China', geo: ['china'] },
    { id: 'europe', title: 'Europe', geo: ['europe'] },
    { id: 'united-states', title: 'United States', geo: ['united-states'] },
    { id: 'commodities', title: 'Global Commodities', categories: ['raw-materials', 'market-prices'] },
    { id: 'trade', title: 'Trade & Tariffs', categories: ['trade-exports', 'government-policy'] },
    { id: 'companies', title: 'Company Announcements', categories: ['company-updates'] },
    { id: 'green', title: 'Green Steel & Technology', categories: ['green-steel', 'technology-innovation'] },
  ],
};

const SECTION_CAP = 6;

function assignSections(region: Region, ranked: Article[]): { def: SectionDef; articles: Article[] }[] {
  return EDITION_SECTIONS[region].map((def) => ({
    def,
    articles: ranked
      .filter((a) => (def.categories ? def.categories.some((c) => a.categories.includes(c)) : false) || (def.geo ? def.geo.some((g) => a.geo.includes(g)) : false))
      .slice(0, SECTION_CAP),
  }));
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function heuristicIntro(region: Region, date: string, articles: Article[], period?: { from: string; to: string }): string {
  const publishers = new Set(articles.map((a) => a.publisher)).size;
  const label = region === 'india' ? 'the Indian steel industry' : 'the global steel industry';
  if (period) {
    return `This weekly report brings together the ${articles.length} most significant ${articles.length === 1 ? 'development' : 'developments'} covering ${label} from ${formatDate(period.from)} to ${formatDate(period.to)}, drawn from ${publishers} ${publishers === 1 ? 'publisher' : 'publishers'} and ranked by importance. AI editorial commentary was not available, so summaries are the publishers' own excerpts.`;
  }
  if (!articles.length) return `No qualifying developments covering ${label} were collected for ${formatDate(date)}. This edition will update automatically when new reports are published.`;
  return `This edition brings together ${articles.length} ${articles.length === 1 ? 'development' : 'developments'} covering ${label}, collected from ${publishers} ${publishers === 1 ? 'publisher' : 'publishers'} for ${formatDate(date)}. Stories are ranked by relevance and importance. AI editorial commentary was not available for this edition, so summaries are the publishers' own excerpts.`;
}

export async function buildEdition(opts: {
  region: Region;
  date: string;
  articles: Article[];
  previous: Edition | null;
  number: number;
  ai: AiProvider | null;
  now: string;
  period?: { from: string; to: string };
}): Promise<{ edition: Edition; aiError: boolean }> {
  const { region, date, previous, number, ai, now, period } = opts;
  const ranked = [...opts.articles].sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt));
  const sections = assignSections(region, ranked);
  const byId = new Map(ranked.map((a) => [a.id, a]));

  let out: EditionOutput | null = null;
  let aiError = false;
  if (ai && ranked.length) {
    try {
      const pool = ranked.slice(0, 40);
      out = await ai.writeEdition({
        region,
        date,
        period,
        articles: pool.map((a) => ({
          id: a.id,
          title: a.title,
          publisher: a.publisher,
          summary: a.summary ?? a.dek,
          categories: a.categories,
          geo: a.geo,
          importance: a.importance,
        })),
        sections: sections.map((s) => ({ id: s.def.id, title: s.def.title, articleIds: s.articles.filter((a) => pool.includes(a)).map((a) => a.id) })),
      });
    } catch (err) {
      aiError = true;
      log('edition', `AI edition writing failed for ${region} ${date}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Source material for the numeric guard: everything the model was shown.
  const source = ranked.map((a) => `${a.title} ${a.publisherExcerpt ?? ''} ${a.summary ?? ''} ${a.dek}`).join(' ');
  const g = (t: string | null | undefined) => (t ? guardText(t, source).text || null : null);

  const featuredArticle = (out?.featuredId && byId.get(out.featuredId)) || ranked[0] || null;
  const topIds = out?.topIds?.filter((id) => byId.has(id)) ?? [];
  const top = [...new Set([...topIds, ...ranked.map((a) => a.id)])]
    .filter((id) => id !== featuredArticle?.id)
    .slice(0, 10)
    .map((id) => toCard(byId.get(id)!));

  const sectionOut: EditionSection[] = sections.map((s) => ({
    id: s.def.id,
    title: s.def.title,
    summary: s.articles.length ? g(out?.sectionSummaries?.find((x) => x.id === s.def.id)?.summary) : null,
    articles: s.articles.map(toCard),
  }));

  const sourceCounts = new Map<string, number>();
  for (const a of ranked) sourceCounts.set(a.publisher, (sourceCounts.get(a.publisher) ?? 0) + 1);

  const aiIntro = g(out?.intro);
  const edition: Edition = {
    region,
    kind: period ? 'weekly' : 'daily',
    date,
    ...(period ? { periodEnd: period.to } : {}),
    number,
    title: (out?.title && g(out.title)) || featuredArticle?.title || `${region === 'india' ? 'India' : 'World'} Edition`,
    generatedAt: previous?.generatedAt ?? now,
    updatedAt: now,
    intro: aiIntro ?? heuristicIntro(region, date, ranked, period),
    introIsAi: Boolean(aiIntro),
    featured: featuredArticle ? toCard(featuredArticle) : null,
    topStories: top,
    marketOverview: g(out?.marketOverview),
    sections: sectionOut,
    analysis: g(out?.analysis),
    watchNext: out?.watchNext ? guardList(out.watchNext, source).items : [],
    ai: out && ai ? { provider: ai.name, model: ai.model, generatedAt: now } : null,
    articleCount: ranked.length,
    sources: [...sourceCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
  return { edition, aiError };
}

export function editionHeadline(e: Edition): string | null {
  return e.featured?.title ?? null;
}

export type { ArticleCard };
