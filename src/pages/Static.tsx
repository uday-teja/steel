import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import sources from '../../config/sources.json';
import { ChangeBadge } from '../components/Blocks';
import { EmptyState, LoadingBlock, PageTitle, SectionHeader, useDocumentTitle } from '../components/Common';
import { RefreshPanel } from '../components/RefreshPanel';
import { HeadlineRow } from '../components/Story';
import { useData } from '../lib/data';
import { formatDateShort, formatDateTime, formatNumber } from '../lib/format';
import { githubRepoUrl, SITE } from '../lib/site';
import type { CategoryFeed, EquityData, EquityQuote, MarketData, MarketIndicator, SiteMeta } from '../types/news';

const GROUPS: { id: MarketIndicator['group']; title: string }[] = [
  { id: 'india-flat', title: 'India · Flat products' },
  { id: 'india-long', title: 'India · Long products' },
  { id: 'engineering', title: 'India · Engineering steels' },
  { id: 'raw-materials', title: 'Raw materials' },
  { id: 'international', title: 'International benchmarks' },
];

export function Sparkline({ points, className = 'h-7 w-24' }: { points: { value: number }[]; className?: string }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${max === min ? 15 : 28 - ((v - min) / (max - min)) * 26}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" className={className} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const money = (v: number) => formatNumber(v, v < 1000 ? 2 : 0);

export function Change({ value, pct }: { value: number; pct: number }) {
  const tone = value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-muted';
  return (
    <span className={`font-sans text-[13px] font-semibold tabular-nums ${tone}`}>
      {value > 0 ? '+' : ''}
      {pct.toFixed(2)}%
    </span>
  );
}

function EquityTable({ title, items }: { title: string; items: EquityQuote[] }) {
  return (
    <section className="mt-8">
      <h2 className="border-b border-rule pb-2 font-serif text-[20px] font-medium tracking-[-0.015em]">{title}</h2>
      <table className="w-full table-fixed border-collapse font-sans text-[14px]">
        <thead>
          <tr className="border-b border-rule text-left text-[11px] uppercase tracking-[0.08em] text-muted">
            <th className="w-[44%] py-2 pr-2 font-semibold sm:w-[34%]">Name</th>
            <th className="py-2 pr-2 text-right font-semibold">Price</th>
            <th className="py-2 pr-2 text-right font-semibold">Day</th>
            <th className="hidden py-2 pl-4 font-semibold sm:table-cell">3 months</th>
            <th className="hidden py-2 text-right font-semibold md:table-cell">As of</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => {
            const up = q.history.length > 1 && q.history[q.history.length - 1].close >= q.history[0].close;
            return (
              <tr key={q.symbol} className="border-b border-rule">
                <td className="py-3 pr-2">
                  <p className="font-medium text-ink">{q.name}</p>
                  <p className="meta">
                    {q.kind === 'future' ? q.unit : q.symbol.replace(/\.(NS|T|KS)$/, '')}
                    {q.exchange ? ` · ${q.exchange}` : ''}
                  </p>
                </td>
                <td className="py-3 pr-2 text-right tabular-nums">
                  <span className="font-medium">{money(q.price)}</span>
                  <span className="meta block">{q.currency}</span>
                </td>
                <td className="py-3 pr-2 text-right">
                  <Change value={q.change} pct={q.changePct} />
                </td>
                <td className={`hidden py-3 pl-4 sm:table-cell ${up ? 'text-positive' : 'text-negative'}`}>
                  <Sparkline points={q.history.map((h) => ({ value: h.close }))} className="h-7 w-28" />
                </td>
                <td className="meta hidden py-3 text-right md:table-cell">{formatDateShort(q.asOf)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function MarketsPage() {
  useDocumentTitle('Steel markets');
  const { data, loading } = useData<MarketData>('market/indicators.json');
  const eq = useData<EquityData>('market/equities.json');
  const news = useData<CategoryFeed>('categories/market-prices.json');
  const priceNews = [...(news.data?.india ?? []), ...(news.data?.world ?? [])].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 10);
  const available = (data?.indicators ?? []).filter((i) => i.status === 'available');
  const awaiting = (data?.indicators ?? []).filter((i) => i.status !== 'available');

  return (
    <div className="pb-6">
      <PageTitle eyebrow="Market intelligence" title="Steel markets">
        Steel stocks, futures and verified prices.
      </PageTitle>

      {loading || eq.loading ? (
        <LoadingBlock />
      ) : (
        <>
          {eq.data?.groups.filter((g) => g.items.length).map((g) => <EquityTable key={g.id} title={g.title} items={g.items} />)}
          {eq.data && (
            <p className="meta mt-3">
              Delayed data via{' '}
              <a href={eq.data.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {eq.data.source.name}
              </a>
              . For information only, not investment advice.
            </p>
          )}

          {available.length > 0 && (
            <section className="mt-10">
              <h2 className="border-b border-rule pb-2 font-serif text-[20px] font-medium tracking-[-0.015em]">Physical prices</h2>
              <table className="w-full table-fixed border-collapse font-sans text-[14px]">
                <thead>
                  <tr className="border-b border-rule text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                    <th className="w-[44%] py-2 pr-2 font-semibold sm:w-[34%]">Indicator</th>
                    <th className="py-2 pr-2 text-right font-semibold">Latest</th>
                    <th className="py-2 pr-2 text-right font-semibold">Change</th>
                    <th className="hidden py-2 pl-4 font-semibold sm:table-cell">Trend</th>
                    <th className="hidden py-2 text-right font-semibold md:table-cell">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {available.map((i) => (
                    <tr key={i.id} className="border-b border-rule align-top">
                      <td className="py-3 pr-2">
                        <p className="font-medium">{i.name}</p>
                        <p className="meta">
                          {i.unit} · {GROUPS.find((g) => g.id === i.group)?.title}
                        </p>
                      </td>
                      <td className="py-3 pr-2 text-right tabular-nums">
                        <span className="font-medium">{money(i.latest!.value)}</span>
                        <span className="meta block">{formatDateShort(i.latest!.date)}</span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <ChangeBadge ind={i} />
                      </td>
                      <td className="hidden py-3 pl-4 text-ink-2 sm:table-cell">{i.history.length > 1 ? <Sparkline points={i.history} className="h-7 w-28" /> : <span className="meta">—</span>}</td>
                      <td className="meta hidden py-3 text-right md:table-cell">
                        {i.source?.url ? (
                          <a href={i.source.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                            {i.source.name}
                          </a>
                        ) : (
                          i.source?.name
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {awaiting.length > 0 && (
            <p className="meta mt-4 leading-relaxed">
              Awaiting verified prices: {awaiting.map((i) => i.name).join(', ')}.{' '}
              <a href={`${githubRepoUrl}/issues/new?template=add-prices.yml`} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">
                Add prices
              </a>
            </p>
          )}
        </>
      )}

      <section className="mt-12 max-w-3xl">
        <SectionHeader title="Price and market news" href="/category/market-prices" linkLabel="Market & Prices" heavy />
        {priceNews.length ? (
          <ul>
            {priceNews.map((c) => (
              <HeadlineRow key={c.id} card={c} />
            ))}
          </ul>
        ) : (
          <p className="dek text-[16px]">No recent price stories.</p>
        )}
      </section>
    </div>
  );
}

export function StatusPage() {
  useDocumentTitle('Refresh status');
  const { data: meta } = useData<SiteMeta>('meta.json');
  return (
    <div className="mx-auto max-w-4xl pb-6">
      <PageTitle eyebrow="Operations" title="Refresh status">
        SteelScope is published by an automated pipeline on GitHub Actions. This page shows what was last published and whether an update is running.
      </PageTitle>
      <div className="mt-8">
        <RefreshPanel meta={meta} />
      </div>
      {meta?.lastRun?.notes.length ? (
        <section className="mt-10">
          <SectionHeader title="Notes from the last run" />
          <ul className="list-disc space-y-1.5 pl-5 font-sans text-[14px] text-ink-2">
            {meta.lastRun.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mt-10">
        <SectionHeader title="Source health (last run)" />
        {meta?.sources.length ? (
          <table className="w-full table-fixed font-sans text-[13px]">
            <thead>
              <tr className="border-b border-rule text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                <th className="py-2 font-semibold">Source</th>
                <th className="w-24 py-2 font-semibold">Status</th>
                <th className="w-20 py-2 text-right font-semibold">Items</th>
                <th className="w-20 py-2 text-right font-semibold">Steel</th>
              </tr>
            </thead>
            <tbody>
              {meta.sources.map((s) => (
                <tr key={s.id} className="border-b border-rule align-top">
                  <td className="py-2 pr-2">
                    {s.name}
                    {s.status === 'error' && s.error && <span className="meta block">{s.error}</span>}
                  </td>
                  <td className={`py-2 ${s.status === 'ok' ? 'text-positive' : s.status === 'error' ? 'text-negative' : 'text-muted'}`}>{s.status === 'disabled' ? 'not enabled' : s.status}</td>
                  <td className="py-2 text-right tabular-nums">{s.items}</td>
                  <td className="py-2 text-right tabular-nums">{s.relevant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="dek text-[16px]">Source health appears after the first run.</p>
        )}
        {meta && <p className="meta mt-3">Data generated {formatDateTime(meta.generatedAt)}.</p>}
      </section>
    </div>
  );
}

export function AboutPage() {
  useDocumentTitle('About & methodology');
  const enabled = sources.sources.filter((s) => s.enabled);
  const unavailable = sources.sources.filter((s) => !s.enabled);
  const h2 = 'font-serif text-[26px] font-medium leading-tight mt-12';
  const p = 'font-serif text-[18px] leading-[1.65] text-ink mt-4';
  return (
    <div className="mx-auto max-w-[760px] pb-6">
      <PageTitle eyebrow="About" title="How SteelScope works">
        A daily digital newspaper for people who make, buy, trade and analyse steel — in India and around the world.
      </PageTitle>

      <h2 className={h2}>What we publish</h2>
      <p className={p}>
        Every morning SteelScope publishes two editions: an <Link to="/edition/india" className="underline underline-offset-2">India Edition</Link> and a{' '}
        <Link to="/edition/world" className="underline underline-offset-2">World Edition</Link>. Each brings together the day's steel-industry reports from public sources, ranked by relevance and importance, with short summaries, a market overview, industry analysis and what to watch next. Editions update through the day as new reports arrive.
      </p>

      <h2 className={h2}>Where the news comes from</h2>
      <p className={p}>
        An automated pipeline on GitHub Actions reads public RSS feeds and official press-release feeds. It stores only headlines, the short excerpts publishers put in their feeds, and links. It never copies full articles, bypasses paywalls or scrapes sites that do not allow it. Every story credits its publisher and links to the original report.
      </p>
      <ul className="mt-5 divide-y divide-rule border-y border-rule font-sans text-[14px]">
        {enabled.map((s) => (
          <li key={s.id} className="py-2.5">
            <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:text-accent">
              {s.name} <ExternalLink size={12} aria-hidden="true" />
            </a>
            <p className="meta mt-0.5">{s.notes}</p>
          </li>
        ))}
      </ul>
      <p className={p}>Some important steel publications are deliberately not ingested, because their content or price data is licensed:</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-[14px] text-ink-2">
        {unavailable.map((s) => (
          <li key={s.id}>
            <span className="font-semibold text-ink">{s.name}</span> — {s.notes}
          </li>
        ))}
      </ul>

      <h2 id="ai" className={h2}>How AI is used</h2>
      <p className={p}>
        When enabled, a large language model reads each story's headline and publisher excerpt and writes a short summary, key facts, why it matters and industry implications. It also helps classify stories, spot duplicates, score importance, and write each edition's introduction and analysis. Everything machine-written is labelled <em>AI summary</em>.
      </p>
      <p className={p}>
        The model is told to use only the material it is given and never to invent news, quotes, prices, financial figures or statistics. As a safeguard, any AI-written sentence containing a number that does not appear in the publisher's own text is automatically removed before publication. When information is unavailable, SteelScope says so.
      </p>

      <h2 className={h2}>Prices</h2>
      <p className={p}>
        Steel benchmark prices are published by licensed price-reporting agencies. SteelScope shows a price only when it comes from a verified, legally usable source, with that source and the date named. Until such a source is connected, the <Link to="/markets" className="underline underline-offset-2">Markets</Link> page says plainly that no data is available. It never estimates prices.
      </p>

      <h2 className={h2}>Updates and corrections</h2>
      <p className={p}>
        News is collected automatically twice a day, and can be refreshed on demand (see <Link to="/status" className="underline underline-offset-2">refresh status</Link>). Story pages stay online for 120 days; daily indexes and editions for two years. The full source code, data and history of every update are public on{' '}
        <a href={githubRepoUrl} className="underline underline-offset-2" rel="noopener">
          GitHub
        </a>
        .
      </p>
      <p className="meta mt-10">{SITE.name} is an independent publication and is not affiliated with any of the publishers it links to.</p>
    </div>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="py-12">
      <EmptyState title="Page not found" icon="alert">
        <p>
          The page you were looking for doesn't exist or has been archived. Go to the{' '}
          <Link to="/" className="underline underline-offset-2">
            front page
          </Link>
          .
        </p>
      </EmptyState>
    </div>
  );
}
