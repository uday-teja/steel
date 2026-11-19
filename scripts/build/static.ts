/**
 * Static site generation for GitHub Pages:
 *   1. copy the data directory into dist/data
 *   2. pre-render every route (home, sections, editions, every article…) to real HTML
 *      with per-page SEO metadata (canonical, Open Graph, Twitter, JSON-LD)
 *   3. render branded share-card PNGs for articles and editions
 *   4. write sitemap.xml, robots.txt, feed.xml and the SPA 404 fallback
 */
import { existsSync, readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import site from '../../config/site.json';
import { CATEGORIES, CATEGORY_MAP, REGION_LABEL } from '../../src/lib/taxonomy';
import type { Article, CompanyIndex, DatesIndex, Edition, EditionIndex, LatestFeed } from '../../src/types/news';
import { cardSvg, prepareFonts, renderPng } from './sharecard';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist');
const DATA_SRC = path.resolve(ROOT, process.env.DATA_DIR || 'data');
const SITE_URL = (process.env.VITE_SITE_URL || site.siteUrl).replace(/\/$/, '');
const BASE = process.env.SITE_BASE || site.basePath;
const SHARE_CARD_DAYS = 45;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (route: string) => `${SITE_URL}${route === '/' ? '/' : route.replace(/\/?$/, '/')}`;
const longDate = (d: string) =>
  new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

function readData<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(DIST, 'data', rel), 'utf8')) as T;
}
function tryData<T>(rel: string): T | null {
  try {
    return readData<T>(rel);
  } catch {
    return null;
  }
}

interface Head {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
  published?: string;
  modified?: string;
  noindex?: boolean;
}

function headHtml(route: string, h: Head): string {
  const url = abs(route);
  const image = h.image ?? `${SITE_URL}/share/default.png`;
  const tags = [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${site.name}" href="${SITE_URL}/feed.xml" />`,
    `<meta property="og:site_name" content="${site.name}" />`,
    `<meta property="og:type" content="${h.type ?? 'website'}" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  if (h.published) tags.push(`<meta property="article:published_time" content="${h.published}" />`);
  if (h.modified) tags.push(`<meta property="article:modified_time" content="${h.modified}" />`);
  if (h.noindex) tags.push(`<meta name="robots" content="noindex" />`);
  if (h.jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(h.jsonLd).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n    ');
}

const publisherLd = { '@type': 'Organization', name: site.name, url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` } };

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else if (e.name.endsWith('.json')) await fs.copyFile(s, d);
  }
}

async function main(): Promise<void> {
  const t0 = Date.now();
  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html missing - run vite build first');

  // 1. data
  await fs.rm(path.join(DIST, 'data'), { recursive: true, force: true });
  if (existsSync(DATA_SRC)) await copyDir(DATA_SRC, path.join(DIST, 'data'));
  else await fs.mkdir(path.join(DIST, 'data'), { recursive: true });

  // 2. pre-render
  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  const ssrEntry = path.join(ROOT, 'dist-ssr/entry-server.js');
  const { render } = (await import(pathToFileURL(ssrEntry).href)) as { render: (url: string, loader: (p: string) => unknown) => { html: string; data: Record<string, unknown> } };

  const latest = tryData<LatestFeed>('latest.json');
  const editionIndex = tryData<EditionIndex>('editions/index.json');
  const dates = tryData<DatesIndex>('indexes/dates.json');
  const companies = tryData<CompanyIndex>('indexes/companies.json');
  const articleFiles = existsSync(path.join(DIST, 'data/articles')) ? (await fs.readdir(path.join(DIST, 'data/articles'))).filter((f) => f.endsWith('.json')) : [];
  const articles = articleFiles.map((f) => readData<Article>(`articles/${f}`));
  const lead = latest ? [...latest.india, ...latest.world].sort((a, b) => b.importance - a.importance)[0] : undefined;

  const routes: { route: string; head: Head; changefreq?: string; lastmod?: string }[] = [
    { route: '/', head: { title: `${site.name} — ${site.tagline}`, description: site.description, image: lead ? `${SITE_URL}/share/article/${lead.slug}.png` : undefined, jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: `${SITE_URL}/`, publisher: publisherLd } }, changefreq: 'hourly' },
    { route: '/india', head: { title: `India steel industry news | ${site.name}`, description: 'Indian steel industry news: producers, HR/CR/GI/TMT prices, iron ore, coking coal, policy, BIS standards, trade and demand.' }, changefreq: 'hourly' },
    { route: '/world', head: { title: `Global steel industry news | ${site.name}`, description: 'Global steel news: China, Europe, US, Japan, Korea and the Middle East — prices, tariffs, raw materials, producers and green steel.' }, changefreq: 'hourly' },
    { route: '/latest', head: { title: `Latest steel news | ${site.name}`, description: 'Every steel-industry story collected in the past seven days, newest first.' }, changefreq: 'hourly' },
    { route: '/editions', head: { title: `Daily editions | ${site.name}`, description: 'Archive of SteelScope India and World daily steel intelligence editions.' }, changefreq: 'daily' },
    { route: '/markets', head: { title: `Steel markets | ${site.name}`, description: 'Steel and raw-material price indicators for India and international markets, from verified sources only.' }, changefreq: 'daily' },
    { route: '/archive', head: { title: `Archive | ${site.name}`, description: 'Steel industry news archive by date, company and section.' }, changefreq: 'daily' },
    { route: '/about', head: { title: `About & methodology | ${site.name}`, description: 'How SteelScope collects, summarises and publishes steel industry news, and how AI is used.' }, changefreq: 'monthly' },
    { route: '/search', head: { title: `Search | ${site.name}`, description: 'Search the past week of steel industry news.', noindex: true } },
    { route: '/status', head: { title: `Refresh status | ${site.name}`, description: 'Pipeline and publication status for SteelScope.', noindex: true } },
  ];
  for (const c of CATEGORIES) routes.push({ route: `/category/${c.id}`, head: { title: `${c.label} | ${site.name}`, description: c.description }, changefreq: 'daily' });
  for (const e of editionIndex?.editions ?? []) {
    const ed = tryData<Edition>(`editions/${e.region}/${e.date}.json`);
    routes.push({
      route: `/edition/${e.region}/${e.date}`,
      head: {
        title: `${REGION_LABEL[e.region]} Edition, ${longDate(e.date)}: ${e.title} | ${site.name}`,
        description: ed?.intro.slice(0, 200) ?? `${e.articleCount} steel industry developments.`,
        image: `${SITE_URL}/share/edition/${e.region}-${e.date}.png`,
        type: 'article',
        published: ed?.generatedAt,
        modified: ed?.updatedAt,
        jsonLd: { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: `${REGION_LABEL[e.region]} Edition — ${e.title}`.slice(0, 110), datePublished: ed?.generatedAt, dateModified: ed?.updatedAt, image: [`${SITE_URL}/share/edition/${e.region}-${e.date}.png`], publisher: publisherLd, author: publisherLd, mainEntityOfPage: abs(`/edition/${e.region}/${e.date}`) },
      },
      lastmod: e.updatedAt,
    });
  }
  const weeklyIndex = tryData<EditionIndex>('weekly/index.json');
  for (const w of weeklyIndex?.editions ?? []) {
    const ed = tryData<Edition>(`weekly/${w.region}/${w.date}.json`);
    routes.push({
      route: `/weekly/${w.region}/${w.date}`,
      head: {
        title: `${REGION_LABEL[w.region]} Weekly Report, week of ${longDate(w.date)}: ${w.title} | ${site.name}`,
        description: ed?.intro.slice(0, 200) ?? `${w.articleCount} steel industry developments this week.`,
        image: `${SITE_URL}/share/edition/weekly-${w.region}-${w.date}.png`,
        type: 'article',
        published: ed?.generatedAt,
        modified: ed?.updatedAt,
      },
      lastmod: w.updatedAt,
    });
  }
  for (const a of articles) {
    routes.push({
      route: `/article/${a.slug}`,
      head: {
        title: `${a.title} | ${site.name}`,
        description: (a.dek || a.summary || `${CATEGORY_MAP[a.primaryCategory].label} — reported by ${a.publisher}.`).slice(0, 200),
        image: `${SITE_URL}/share/article/${a.slug}.png`,
        type: 'article',
        published: a.publishedAt,
        modified: a.ai?.generatedAt ?? a.collectedAt,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: a.title.slice(0, 110),
          description: a.dek || undefined,
          datePublished: a.publishedAt,
          dateModified: a.ai?.generatedAt ?? a.collectedAt,
          image: [`${SITE_URL}/share/article/${a.slug}.png`],
          articleSection: CATEGORY_MAP[a.primaryCategory].label,
          keywords: [...a.companies, ...a.categories.map((c) => CATEGORY_MAP[c].label)].join(', '),
          isBasedOn: a.url,
          author: { '@type': 'Organization', name: a.publisher },
          publisher: publisherLd,
          mainEntityOfPage: abs(`/article/${a.slug}`),
        },
      },
      lastmod: a.ai?.generatedAt ?? a.collectedAt,
    });
  }
  for (const d of dates?.days ?? []) routes.push({ route: `/archive/${d.date}`, head: { title: `Steel news, ${longDate(d.date)} | ${site.name}`, description: `${d.india} India and ${d.world} World steel industry stories collected on ${longDate(d.date)}.` } });
  for (const c of companies?.companies ?? []) routes.push({ route: `/company/${c.slug}`, head: { title: `${c.name} news | ${site.name}`, description: `Latest news about ${c.name} from the steel industry press.` } });

  const loader = (p: string) => readData<unknown>(p);
  for (const r of routes) {
    const { html, data } = render(r.route, loader);
    const page = template
      .replace('<!--head-->', headHtml(r.route, r.head))
      .replace('<!--app-->', html)
      .replace('<!--data-->', `<script>window.__SS_DATA__=${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
    const out = r.route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, r.route.slice(1), 'index.html');
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, page);
  }

  // Latest-edition shortcuts (/edition/india, /edition/world) redirect statically.
  for (const region of ['india', 'world'] as const) {
    const e = editionIndex?.editions.find((x) => x.region === region);
    const target = e ? `${BASE}edition/${region}/${e.date}/` : `${BASE}editions/`;
    const page = template
      .replace('<!--head-->', `<title>${REGION_LABEL[region]} Edition | ${site.name}</title><meta http-equiv="refresh" content="0; url=${target}" /><link rel="canonical" href="${SITE_URL}${target.slice(BASE.length - 1)}" />`)
      .replace('<!--app-->', '')
      .replace('<!--data-->', '');
    await fs.mkdir(path.join(DIST, 'edition', region), { recursive: true });
    await fs.writeFile(path.join(DIST, 'edition', region, 'index.html'), page);
  }

  // SPA fallback for any route not pre-rendered.
  await fs.writeFile(
    path.join(DIST, '404.html'),
    template.replace('<!--head-->', `<title>${site.name}</title><meta name="robots" content="noindex" />`).replace('<!--app-->', '').replace('<!--data-->', ''),
  );

  // 3. share cards
  const fonts = await prepareFonts(ROOT);
  const shareDir = path.join(DIST, 'share');
  await fs.mkdir(path.join(shareDir, 'article'), { recursive: true });
  await fs.mkdir(path.join(shareDir, 'edition'), { recursive: true });
  const domain = SITE_URL.replace(/^https?:\/\//, '');
  await fs.writeFile(
    path.join(shareDir, 'default.png'),
    renderPng(cardSvg({ seed: 'steelscope', category: 'manufacturing', region: 'india', kicker: 'India · World · Daily editions', title: site.tagline, summary: 'Prices, raw materials, policy, trade, companies and green steel — every morning.', footer: domain }), fonts),
  );
  const cardCutoff = new Date(Date.now() - SHARE_CARD_DAYS * 864e5).toISOString();
  let cards = 0;
  for (const a of articles) {
    if (a.collectedAt < cardCutoff) continue;
    const svg = cardSvg({ seed: a.id, category: a.primaryCategory, region: a.region, kicker: `${REGION_LABEL[a.region]} · ${CATEGORY_MAP[a.primaryCategory].label}`, title: a.title, summary: a.dek, footer: `${domain} · via ${a.publisher}` });
    await fs.writeFile(path.join(shareDir, 'article', `${a.slug}.png`), renderPng(svg, fonts));
    cards++;
  }
  for (const e of editionIndex?.editions ?? []) {
    if (e.date < cardCutoff.slice(0, 10)) continue;
    const ed = tryData<Edition>(`editions/${e.region}/${e.date}.json`);
    if (!ed) continue;
    const svg = cardSvg({
      seed: `${e.region}-${e.date}`,
      category: ed.featured?.primaryCategory ?? 'market-analysis',
      region: e.region,
      kicker: `${REGION_LABEL[e.region]} Edition · No. ${e.number} · ${longDate(e.date)}`,
      title: ed.title,
      summary: `${ed.articleCount} developments from ${ed.sources.length} publishers: ${ed.topStories.slice(0, 2).map((s) => s.title).join(' · ')}`,
      footer: domain,
    });
    await fs.writeFile(path.join(shareDir, 'edition', `${e.region}-${e.date}.png`), renderPng(svg, fonts));
    cards++;
  }

  for (const w of weeklyIndex?.editions ?? []) {
    if (w.date < cardCutoff.slice(0, 10)) continue;
    const ed = tryData<Edition>(`weekly/${w.region}/${w.date}.json`);
    if (!ed) continue;
    const svg = cardSvg({
      seed: `weekly-${w.region}-${w.date}`,
      category: ed.featured?.primaryCategory ?? 'market-analysis',
      region: w.region,
      kicker: `Week in Steel · ${REGION_LABEL[w.region]} · ${new Date(`${w.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      title: ed.title,
      summary: `${ed.articleCount} developments from ${ed.sources.length} publishers.`,
      footer: domain,
    });
    await fs.writeFile(path.join(shareDir, 'edition', `weekly-${w.region}-${w.date}.png`), renderPng(svg, fonts));
    cards++;
  }

  // 4. sitemap, robots, feed
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .filter((r) => !r.head.noindex)
    .map((r) => `  <url><loc>${abs(r.route)}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}${r.changefreq ? `<changefreq>${r.changefreq}</changefreq>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: ${BASE}status/\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  const feedItems = latest ? [...latest.india, ...latest.world].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 60) : [];
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${site.name}</title>
  <link>${SITE_URL}/</link>
  <description>${esc(site.description)}</description>
  <language>en-in</language>
  <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${feedItems
  .map(
    (c) => `  <item>
    <title>${esc(c.title)}</title>
    <link>${abs(`/article/${c.slug}`)}</link>
    <guid isPermaLink="true">${abs(`/article/${c.slug}`)}</guid>
    <pubDate>${new Date(c.publishedAt).toUTCString()}</pubDate>
    <category>${esc(REGION_LABEL[c.region])}</category>
    <category>${esc(CATEGORY_MAP[c.primaryCategory].label)}</category>
    <description>${esc(`${c.dek ? `${c.dek} ` : ''}(Source: ${c.publisher})`)}</description>
  </item>`,
  )
  .join('\n')}
</channel>
</rss>
`;
  await fs.writeFile(path.join(DIST, 'feed.xml'), feed);
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');

  console.log(`[static] ${routes.length} pages, ${cards} share cards in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
