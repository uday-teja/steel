import type { CategoryId, GeoTag, Region } from '../types/news';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  short: string;
  description: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'market-prices', label: 'Market & Prices', short: 'Prices', description: 'Steel product prices, spreads and market movements across long and flat products.' },
  { id: 'raw-materials', label: 'Raw Materials', short: 'Raw Materials', description: 'Iron ore, coking coal, scrap, pellets, DRI and ferro-alloys.' },
  { id: 'manufacturing', label: 'Manufacturing', short: 'Manufacturing', description: 'Plants, capacity additions, production and operations.' },
  { id: 'company-updates', label: 'Company Updates', short: 'Companies', description: 'Results, deals, leadership changes and corporate announcements.' },
  { id: 'government-policy', label: 'Government & Policies', short: 'Policy', description: 'Ministry of Steel, BIS standards, quality control orders, regulation and schemes.' },
  { id: 'trade-exports', label: 'Trade & Exports', short: 'Trade', description: 'Imports, exports, tariffs, anti-dumping and safeguard duties.' },
  { id: 'infrastructure-automotive', label: 'Infrastructure & Automotive', short: 'Demand', description: 'Construction, infrastructure and automotive demand for steel.' },
  { id: 'technology-innovation', label: 'Technology & Innovation', short: 'Technology', description: 'Process technology, digitalisation and new products.' },
  { id: 'green-steel', label: 'Green Steel', short: 'Green Steel', description: 'Decarbonisation, hydrogen, EAF transition and carbon border measures.' },
  { id: 'market-analysis', label: 'Market Analysis', short: 'Analysis', description: 'Outlooks, demand forecasts, industry data and research.' },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;

export const isCategoryId = (v: string): v is CategoryId => v in CATEGORY_MAP;

export const REGION_LABEL: Record<Region, string> = { india: 'India', world: 'World' };

export const GEO_LABEL: Record<GeoTag, string> = {
  india: 'India',
  china: 'China',
  europe: 'Europe',
  'united-states': 'United States',
  japan: 'Japan',
  'south-korea': 'South Korea',
  'middle-east': 'Middle East',
  'russia-cis': 'Russia & CIS',
  'southeast-asia': 'Southeast Asia',
  australia: 'Australia',
  brazil: 'Brazil',
  global: 'Global',
};

export interface CompanyDef {
  name: string;
  slug: string;
  region: Region;
  patterns: string[];
}

/** Known companies for tagging. Patterns are matched case-insensitively on word boundaries. */
export const COMPANIES: CompanyDef[] = [
  { name: 'Tata Steel', slug: 'tata-steel', region: 'india', patterns: ['tata steel'] },
  { name: 'JSW Steel', slug: 'jsw-steel', region: 'india', patterns: ['jsw steel', 'jsw group'] },
  { name: 'SAIL', slug: 'sail', region: 'india', patterns: ['steel authority of india', 'sail'] },
  { name: 'Jindal Steel', slug: 'jindal-steel', region: 'india', patterns: ['jindal steel', 'jspl', 'jindal steel and power', 'jindal steel & power'] },
  { name: 'Jindal Stainless', slug: 'jindal-stainless', region: 'india', patterns: ['jindal stainless'] },
  { name: 'AM/NS India', slug: 'amns-india', region: 'india', patterns: ['am/ns india', 'am/ns', 'arcelormittal nippon steel india'] },
  { name: 'RINL', slug: 'rinl', region: 'india', patterns: ['rinl', 'rashtriya ispat', 'vizag steel', 'visakhapatnam steel'] },
  { name: 'NMDC', slug: 'nmdc', region: 'india', patterns: ['nmdc'] },
  { name: 'NMDC Steel', slug: 'nmdc-steel', region: 'india', patterns: ['nmdc steel'] },
  { name: 'Shyam Metalics', slug: 'shyam-metalics', region: 'india', patterns: ['shyam metalics'] },
  { name: 'APL Apollo', slug: 'apl-apollo', region: 'india', patterns: ['apl apollo'] },
  { name: 'Lloyds Metals', slug: 'lloyds-metals', region: 'india', patterns: ['lloyds metals'] },
  { name: 'Godawari Power', slug: 'godawari-power', region: 'india', patterns: ['godawari power', 'gpil'] },
  { name: 'Kalyani Steels', slug: 'kalyani-steels', region: 'india', patterns: ['kalyani steels'] },
  { name: 'Sunflag Iron', slug: 'sunflag-iron', region: 'india', patterns: ['sunflag'] },
  { name: 'Coal India', slug: 'coal-india', region: 'india', patterns: ['coal india'] },
  { name: 'ArcelorMittal', slug: 'arcelormittal', region: 'world', patterns: ['arcelormittal'] },
  { name: 'Nippon Steel', slug: 'nippon-steel', region: 'world', patterns: ['nippon steel'] },
  { name: 'JFE Steel', slug: 'jfe-steel', region: 'world', patterns: ['jfe steel', 'jfe holdings'] },
  { name: 'POSCO', slug: 'posco', region: 'world', patterns: ['posco'] },
  { name: 'Hyundai Steel', slug: 'hyundai-steel', region: 'world', patterns: ['hyundai steel'] },
  { name: 'China Baowu', slug: 'china-baowu', region: 'world', patterns: ['baowu', 'baosteel'] },
  { name: 'Ansteel', slug: 'ansteel', region: 'world', patterns: ['ansteel', 'angang'] },
  { name: 'HBIS', slug: 'hbis', region: 'world', patterns: ['hbis', 'hesteel'] },
  { name: 'Shagang', slug: 'shagang', region: 'world', patterns: ['shagang'] },
  { name: 'Nucor', slug: 'nucor', region: 'world', patterns: ['nucor'] },
  { name: 'U.S. Steel', slug: 'us-steel', region: 'world', patterns: ['u.s. steel', 'united states steel', 'us steel corp'] },
  { name: 'Cleveland-Cliffs', slug: 'cleveland-cliffs', region: 'world', patterns: ['cleveland-cliffs', 'cleveland cliffs'] },
  { name: 'Steel Dynamics', slug: 'steel-dynamics', region: 'world', patterns: ['steel dynamics'] },
  { name: 'thyssenkrupp', slug: 'thyssenkrupp', region: 'world', patterns: ['thyssenkrupp'] },
  { name: 'Salzgitter', slug: 'salzgitter', region: 'world', patterns: ['salzgitter'] },
  { name: 'SSAB', slug: 'ssab', region: 'world', patterns: ['ssab'] },
  { name: 'voestalpine', slug: 'voestalpine', region: 'world', patterns: ['voestalpine'] },
  { name: 'Tenaris', slug: 'tenaris', region: 'world', patterns: ['tenaris'] },
  { name: 'Gerdau', slug: 'gerdau', region: 'world', patterns: ['gerdau'] },
  { name: 'Emirates Steel', slug: 'emirates-steel', region: 'world', patterns: ['emirates steel', 'emsteel'] },
  { name: 'Hadeed', slug: 'hadeed', region: 'world', patterns: ['hadeed'] },
  { name: 'Vale', slug: 'vale', region: 'world', patterns: ['vale'] },
  { name: 'Rio Tinto', slug: 'rio-tinto', region: 'world', patterns: ['rio tinto'] },
  { name: 'BHP', slug: 'bhp', region: 'world', patterns: ['bhp'] },
  { name: 'Fortescue', slug: 'fortescue', region: 'world', patterns: ['fortescue'] },
  { name: 'Anglo American', slug: 'anglo-american', region: 'world', patterns: ['anglo american'] },
  { name: 'Stegra', slug: 'stegra', region: 'world', patterns: ['stegra', 'h2 green steel'] },
];

export const COMPANY_BY_NAME = Object.fromEntries(COMPANIES.map((c) => [c.name, c]));
