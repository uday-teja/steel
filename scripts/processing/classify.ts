import type { CategoryId, GeoTag, Region } from '../../src/types/news';
import { COMPANIES } from '../../src/lib/taxonomy';
import type { RawItem } from '../ingestion/feeds';

const wb = (term: string) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+')}(?=$|[^a-z0-9])`, 'i');

function countMatches(text: string, terms: RegExp[]): number {
  let n = 0;
  for (const t of terms) if (t.test(text)) n++;
  return n;
}

// ---------------------------------------------------------------- relevance

const STRONG = [
  'steel', 'steelmaker', 'steelmakers', 'steel mill', 'iron ore', 'coking coal', 'met coal', 'metallurgical coal',
  'hrc', 'hr coil', 'hot-rolled', 'hot rolled', 'cold-rolled', 'cold rolled', 'crc', 'tmt', 'tmt bar', 'tmt bars', 'rebar',
  'galvanised', 'galvanized', 'gp coil', 'gi coil', 'billet', 'billets', 'sponge iron', 'pig iron', 'dri',
  'blast furnace', 'electric arc furnace', 'ferro alloy', 'ferro alloys', 'ferroalloy', 'iron ore pellets', 'pellet plant',
  'stainless', 'worldsteel', 'eurofer', 'ministry of steel', 'en8', 'en19', 'c45', 'mild steel', 'structural steel',
  'wire rod', 'h-beam', 'scrap steel', 'steel scrap', 'ferrous scrap', 'coke oven', 'hbi',
  ...COMPANIES.filter((c) => !['vale', 'bhp', 'anglo-american', 'coal-india', 'rio-tinto'].includes(c.slug)).flatMap((c) => c.patterns),
].map(wb);

const WEAK = ['iron', 'metal', 'metals', 'mining', 'ore', 'coal', 'tariff', 'anti-dumping', 'safeguard duty', 'infrastructure', 'capex', 'smelter', 'alloy'].map(wb);

const NEGATIVE = ['nerves of steel', 'man of steel', 'steel magnolias', 'steelers', 'steely', 'steel guitar', 'steel band', 'stainless steel bottle', 'steel cut oats'].map(wb);

export function relevanceScore(item: Pick<RawItem, 'title' | 'description' | 'focus'>): number {
  const t = `${item.title} ${item.description}`;
  if (countMatches(t, NEGATIVE) > 0) return 0;
  const strongTitle = countMatches(item.title, STRONG);
  const strongBody = countMatches(item.description, STRONG);
  const weak = countMatches(t, WEAK);
  let score = strongTitle * 4 + strongBody * 2 + weak;
  if (item.focus === 'steel') score += 3;
  if (item.focus === 'metals') score += 1;
  return score;
}

/** Minimum score for a story to be considered steel-industry news. */
export function isRelevant(item: Pick<RawItem, 'title' | 'description' | 'focus'>): boolean {
  const s = relevanceScore(item);
  // General-business feeds must mention a strong steel term in the headline.
  if (item.focus === 'business' || item.focus === 'general') return countMatches(item.title, STRONG) > 0 && s >= 4;
  return s >= 4;
}

// ---------------------------------------------------------------- geography

const GEO_TERMS: Record<Exclude<GeoTag, 'global'>, string[]> = {
  india: ['india', 'indian', 'odisha', 'jharkhand', 'chhattisgarh', 'karnataka', 'gujarat', 'maharashtra', 'andhra pradesh', 'telangana', 'west bengal', 'tamil nadu', 'goa', 'new delhi', 'mumbai', 'kolkata', 'rupee', 'crore', 'lakh', 'ministry of steel', 'bis', 'dgtr', 'niti aayog', 'pli scheme', 'modi', 'kumaraswamy'],
  china: ['china', 'chinese', 'beijing', 'shanghai', 'hebei', 'tangshan', 'baowu', 'ansteel', 'hbis', 'shagang', 'dalian', 'yuan'],
  europe: ['europe', 'european', 'eu', 'eurofer', 'germany', 'german', 'france', 'italy', 'spain', 'uk', 'britain', 'british', 'sweden', 'netherlands', 'poland', 'austria', 'belgium', 'thyssenkrupp', 'salzgitter', 'ssab', 'voestalpine', 'cbam', 'brussels'],
  'united-states': ['united states', 'u.s.', 'usa', 'american', 'america', 'washington', 'section 232', 'nucor', 'cleveland-cliffs', 'steel dynamics', 'u.s. steel', 'trump'],
  japan: ['japan', 'japanese', 'tokyo', 'nippon steel', 'jfe'],
  'south-korea': ['south korea', 'korea', 'korean', 'seoul', 'posco', 'hyundai steel'],
  'middle-east': ['middle east', 'gulf', 'uae', 'saudi', 'oman', 'qatar', 'bahrain', 'kuwait', 'iran', 'turkey', 'turkish', 'egypt', 'emirates steel', 'hadeed'],
  'russia-cis': ['russia', 'russian', 'ukraine', 'ukrainian', 'kazakhstan', 'severstal', 'nlmk', 'mmk', 'evraz'],
  'southeast-asia': ['vietnam', 'vietnamese', 'indonesia', 'malaysia', 'thailand', 'philippines', 'asean'],
  australia: ['australia', 'australian', 'pilbara', 'fortescue', 'bhp', 'rio tinto'],
  brazil: ['brazil', 'brazilian', 'vale', 'gerdau', 'csn', 'usiminas'],
};

const GEO_RE = Object.fromEntries(Object.entries(GEO_TERMS).map(([k, v]) => [k, v.map(wb)])) as Record<Exclude<GeoTag, 'global'>, RegExp[]>;

export function geoTags(text: string): GeoTag[] {
  const tags: GeoTag[] = [];
  for (const [tag, res] of Object.entries(GEO_RE) as [Exclude<GeoTag, 'global'>, RegExp[]][]) {
    if (countMatches(text, res) > 0) tags.push(tag);
  }
  return tags.length ? tags : ['global'];
}

export function classifyRegion(item: RawItem, companies: string[]): Region {
  const t = `${item.title} ${item.description}`;
  const indiaScore = countMatches(t, GEO_RE.india) + companies.filter((c) => COMPANIES.find((d) => d.name === c)?.region === 'india').length * 2;
  const foreign = (Object.keys(GEO_RE) as (keyof typeof GEO_RE)[]).filter((k) => k !== 'india').reduce((n, k) => n + countMatches(t, GEO_RE[k]), 0);
  const foreignCo = companies.filter((c) => COMPANIES.find((d) => d.name === c)?.region === 'world').length * 2;
  if (indiaScore === 0) return item.regionHint === 'india' && foreign + foreignCo === 0 ? 'india' : 'world';
  if (item.regionHint === 'india') return indiaScore >= (foreign + foreignCo) / 2 ? 'india' : 'world';
  return indiaScore >= foreign + foreignCo ? 'india' : 'world';
}

// ---------------------------------------------------------------- companies

const COMPANY_RE = COMPANIES.map((c) => ({ name: c.name, res: c.patterns.map(wb) }));

export function detectCompanies(text: string): string[] {
  const found = COMPANY_RE.filter((c) => countMatches(text, c.res) > 0).map((c) => c.name);
  // "SAIL" also matches "NMDC Steel" style false positives rarely; prefer the more specific NMDC Steel over NMDC.
  return found.includes('NMDC Steel') ? found.filter((n) => n !== 'NMDC') : found;
}

// ---------------------------------------------------------------- categories

const CATEGORY_TERMS: Record<CategoryId, string[]> = {
  'market-prices': ['price', 'prices', 'priced', 'per tonne', 'per ton', 'rate', 'rates', 'rally', 'slump', 'spread', 'benchmark', 'futures', 'index', 'hrc', 'tmt', 'rebar', 'crc', 'billet', 'premium', 'discount'],
  'raw-materials': ['iron ore', 'coking coal', 'met coal', 'scrap', 'pellet', 'pellets', 'sponge iron', 'dri', 'hbi', 'ferro alloy', 'ferroalloy', 'manganese', 'chrome', 'limestone', 'coke', 'mine', 'mines', 'mining', 'nmdc', 'vale', 'fortescue'],
  manufacturing: ['plant', 'capacity', 'blast furnace', 'production', 'output', 'commission', 'commissioned', 'expansion', 'mill', 'furnace', 'mtpa', 'tonnes per annum', 'facility', 'shutdown', 'restart'],
  'company-updates': ['results', 'earnings', 'quarterly', 'profit', 'net profit', 'revenue', 'ebitda', 'quarter', 'q1', 'q2', 'q3', 'q4', 'acquisition', 'acquire', 'merger', 'stake', 'ceo', 'appoints', 'appointed', 'shares', 'dividend', 'ipo', 'board', 'deal', 'order', 'contract'],
  'government-policy': ['ministry', 'government', 'policy', 'pli', 'bis', 'quality control order', 'qco', 'regulation', 'scheme', 'budget', 'minister', 'notification', 'cabinet', 'parliament', 'licence', 'license', 'auction', 'royalty', 'standard', 'standards'],
  'trade-exports': ['export', 'exports', 'import', 'imports', 'anti-dumping', 'countervailing', 'duty', 'duties', 'tariff', 'tariffs', 'safeguard', 'dgtr', 'trade', 'quota', 'cbam', 'section 232', 'dumping'],
  'infrastructure-automotive': ['infrastructure', 'construction', 'railway', 'railways', 'highway', 'bridge', 'housing', 'real estate', 'automotive', 'auto', 'vehicle', 'vehicles', 'ev', 'car', 'cars', 'shipbuilding', 'pipeline', 'metro'],
  'technology-innovation': ['technology', 'digital', 'ai', 'automation', 'innovation', 'research', 'patent', 'r&d', 'pilot', 'new grade', 'electrical steel', 'crgo', 'process'],
  'green-steel': ['green steel', 'hydrogen', 'decarbonisation', 'decarbonization', 'decarbonise', 'emission', 'emissions', 'carbon', 'net zero', 'net-zero', 'low-carbon', 'cbam', 'electric arc', 'eaf', 'renewable', 'ccus', 'climate'],
  'market-analysis': ['outlook', 'forecast', 'analysis', 'demand', 'consumption', 'report', 'survey', 'estimate', 'estimates', 'crisil', 'icra', 'fitch', 'moody', 'worldsteel', 'data', 'growth', 'year-on-year', 'y-o-y', 'monthly'],
};

const CATEGORY_RE = Object.fromEntries(Object.entries(CATEGORY_TERMS).map(([k, v]) => [k, v.map(wb)])) as Record<CategoryId, RegExp[]>;

export function classifyCategories(item: Pick<RawItem, 'title' | 'description'>, companies: string[]): { categories: CategoryId[]; primary: CategoryId } {
  const scores: [CategoryId, number][] = (Object.keys(CATEGORY_RE) as CategoryId[]).map((id) => {
    const title = countMatches(item.title, CATEGORY_RE[id]) * 2;
    const body = countMatches(item.description, CATEGORY_RE[id]);
    let s = title + body;
    if (id === 'company-updates' && companies.length) s += 1;
    return [id, s];
  });
  scores.sort((a, b) => b[1] - a[1]);
  const top = scores.filter(([, s]) => s > 0);
  if (!top.length) return { categories: [companies.length ? 'company-updates' : 'market-analysis'], primary: companies.length ? 'company-updates' : 'market-analysis' };
  const max = top[0][1];
  const categories = top.filter(([, s]) => s >= Math.max(2, max * 0.5)).slice(0, 3).map(([id]) => id);
  return { categories: categories.length ? categories : [top[0][0]], primary: top[0][0] };
}

// ---------------------------------------------------------------- importance

const HIGH_IMPACT = ['anti-dumping', 'safeguard', 'duty', 'tariff', 'ban', 'policy', 'ministry of steel', 'results', 'profit', 'acquisition', 'merger', 'capacity', 'price hike', 'price cut', 'record', 'production', 'exports', 'imports', 'cbam', 'quality control order', 'shutdown'].map(wb);

/** Heuristic 0–100 importance used for ranking when AI scoring is unavailable. */
export function heuristicImportance(item: RawItem, companies: string[], categories: CategoryId[]): number {
  const t = `${item.title} ${item.description}`;
  let s = 30;
  s += Math.min(20, relevanceScore(item) * 2);
  s += Math.min(15, countMatches(t, HIGH_IMPACT) * 5);
  s += Math.min(12, companies.length * 6);
  if (categories.includes('government-policy') || categories.includes('trade-exports')) s += 5;
  if (item.tier === 1) s += 8;
  if (item.focus === 'steel') s += 5;
  const ageH = (Date.now() - new Date(item.publishedAt).getTime()) / 36e5;
  if (ageH > 36) s -= 10;
  return Math.max(1, Math.min(95, Math.round(s)));
}
