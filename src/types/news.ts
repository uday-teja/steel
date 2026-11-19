// Shared data contracts between the ingestion pipeline (scripts/) and the website (src/).
// All dates are ISO-8601 strings. Edition dates are YYYY-MM-DD in Asia/Kolkata.

export type Region = 'india' | 'world';

export type CategoryId =
  | 'market-prices'
  | 'raw-materials'
  | 'manufacturing'
  | 'company-updates'
  | 'government-policy'
  | 'trade-exports'
  | 'infrastructure-automotive'
  | 'technology-innovation'
  | 'green-steel'
  | 'market-analysis';

export type GeoTag =
  | 'india'
  | 'china'
  | 'europe'
  | 'united-states'
  | 'japan'
  | 'south-korea'
  | 'middle-east'
  | 'russia-cis'
  | 'southeast-asia'
  | 'australia'
  | 'brazil'
  | 'global';

/** Provenance of the analytical text attached to an article or edition. */
export interface AiProvenance {
  provider: string;
  model: string;
  generatedAt: string;
}

/** Lightweight article representation used in lists, editions and indexes. */
export interface ArticleCard {
  id: string;
  slug: string;
  title: string;
  /** One- or two-sentence standfirst. AI-written when `aiSummary` is true, otherwise publisher excerpt. */
  dek: string;
  aiSummary: boolean;
  region: Region;
  geo: GeoTag[];
  categories: CategoryId[];
  primaryCategory: CategoryId;
  companies: string[];
  publisher: string;
  sourceId: string;
  url: string;
  /** Original publication timestamp from the publisher feed. */
  publishedAt: string;
  /** When SteelScope first collected the story. */
  collectedAt: string;
  /** Edition (IST date) the story belongs to. */
  editionDate: string;
  importance: number;
}

export interface Article extends ArticleCard {
  /** AI-generated summary (null when AI processing was unavailable). */
  summary: string | null;
  keyFacts: string[];
  whyItMatters: string | null;
  implications: string | null;
  /** Verbatim short excerpt from the publisher's feed description, if provided. */
  publisherExcerpt: string | null;
  ai: AiProvenance | null;
  related: ArticleCard[];
}

export interface EditionSection {
  id: string;
  title: string;
  /** AI-written synthesis for the section; null when unavailable. */
  summary: string | null;
  articles: ArticleCard[];
}

export interface Edition {
  region: Region;
  /** 'daily' editions are keyed by date; 'weekly' reports by the Monday that starts the week. */
  kind?: 'daily' | 'weekly';
  date: string;
  /** Last day covered (weekly reports only). */
  periodEnd?: string;
  number: number;
  title: string;
  generatedAt: string;
  updatedAt: string;
  intro: string;
  introIsAi: boolean;
  featured: ArticleCard | null;
  topStories: ArticleCard[];
  marketOverview: string | null;
  sections: EditionSection[];
  analysis: string | null;
  watchNext: string[];
  ai: AiProvenance | null;
  articleCount: number;
  sources: { name: string; count: number }[];
}

export interface EditionIndexEntry {
  region: Region;
  date: string;
  periodEnd?: string;
  number: number;
  title: string;
  headline: string | null;
  articleCount: number;
  updatedAt: string;
}

export interface EditionIndex {
  generatedAt: string;
  editions: EditionIndexEntry[];
}

export interface LatestFeed {
  generatedAt: string;
  india: ArticleCard[];
  world: ArticleCard[];
}

export interface DayIndex {
  date: string;
  india: ArticleCard[];
  world: ArticleCard[];
}

export interface DatesIndex {
  generatedAt: string;
  days: { date: string; india: number; world: number }[];
}

export interface CategoryFeed {
  id: CategoryId;
  generatedAt: string;
  india: ArticleCard[];
  world: ArticleCard[];
}

export interface CompanyIndex {
  generatedAt: string;
  companies: { slug: string; name: string; count: number; latest: string; articles: ArticleCard[] }[];
}

export type SourceStatus = 'ok' | 'empty' | 'error' | 'disabled';

export interface SourceHealth {
  id: string;
  name: string;
  status: SourceStatus;
  items: number;
  relevant: number;
  error?: string;
  checkedAt: string;
}

export interface RunReport {
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'partial' | 'failed';
  trigger: string;
  newArticles: number;
  aiProvider: string;
  aiModel: string | null;
  aiErrors: number;
  notes: string[];
}

export interface SiteMeta {
  generatedAt: string;
  lastRun: RunReport | null;
  lastSuccessfulRefresh: string | null;
  latestEditions: { india: string | null; world: string | null };
  totals: { articles: number; editions: number };
  sources: SourceHealth[];
}

export interface MarketIndicator {
  id: string;
  name: string;
  group: 'india-long' | 'india-flat' | 'engineering' | 'raw-materials' | 'international';
  unit: string;
  description: string;
  status: 'available' | 'unavailable';
  latest: { value: number; date: string } | null;
  previous: { value: number; date: string } | null;
  source: { name: string; url?: string } | null;
  updatedAt: string | null;
  history: { date: string; value: number }[];
}

export interface MarketData {
  generatedAt: string;
  note: string;
  indicators: MarketIndicator[];
}

export interface EquityQuote {
  symbol: string;
  name: string;
  kind: 'stock' | 'index' | 'future';
  unit?: string;
  company?: string;
  currency: string;
  exchange: string;
  price: number;
  change: number;
  changePct: number;
  asOf: string;
  history: { date: string; close: number }[];
}

export interface EquityData {
  generatedAt: string;
  source: { name: string; url: string };
  groups: { id: string; title: string; items: EquityQuote[] }[];
}
