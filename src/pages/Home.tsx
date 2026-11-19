import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChangeBadge, rankCards } from '../components/Blocks';
import { EmptyState, LoadingBlock, useDocumentTitle } from '../components/Common';
import { articlePath } from '../components/Story';
import { useData } from '../lib/data';
import { Change } from './Static';
import { formatDateLong, formatDateShort, formatNumber, formatTime } from '../lib/format';
import { CATEGORIES, CATEGORY_MAP, REGION_LABEL } from '../lib/taxonomy';
import type { ArticleCard, CategoryId, EditionIndex, EditionIndexEntry, EquityData, EquityQuote, LatestFeed, MarketData, Region, SiteMeta } from '../types/news';

export function FirstRunNotice() {
  return (
    <EmptyState title="The first edition is being prepared">
      <p>
        SteelScope publishes automatically from GitHub Actions. News appears here after the first collection run completes. See{' '}
        <Link to="/status" className="underline underline-offset-2">
          refresh status
        </Link>{' '}
        for progress.
      </p>
    </EmptyState>
  );
}

const shortCat = (id: CategoryId) => CATEGORY_MAP[id].label;

export function SectionTitle({ title, href, linkLabel, sub }: { title: string; href?: string; linkLabel?: string; sub?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-serif text-[24px] font-medium tracking-[-0.02em] sm:text-[26px]">{title}</h2>
        {sub && <p className="mt-1 font-sans text-[13px] text-muted">{sub}</p>}
      </div>
      {href && (
        <Link to={href} className="inline-flex shrink-0 items-center gap-1 font-sans text-[13px] font-semibold text-accent hover:underline">
          {linkLabel} <ArrowRight size={13} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function BigStory({ card }: { card: ArticleCard }) {
  return (
    <article className="relative flex h-full flex-col justify-between rounded-[6px] bg-teal p-6 text-on-teal transition-colors hover:bg-teal-2 sm:p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.12em]">
          <span className="text-[#f0a37c]">The big story</span>
          <span className="text-on-teal/70">
            {REGION_LABEL[card.region]} / {shortCat(card.primaryCategory)}
          </span>
        </div>
        <h1 className="mt-4 font-serif text-[26px] font-medium leading-[1.15] tracking-[-0.025em] text-on-teal sm:mt-5 sm:text-[38px]" style={{ textWrap: 'balance' }}>
          <Link to={articlePath(card)} className="after:absolute after:inset-0">
            {card.title}
          </Link>
        </h1>
        {card.dek && <p className="mt-4 max-w-2xl font-sans text-[15px] leading-[1.6] text-on-teal/80">{card.dek}</p>}
      </div>
      <div className="mt-8 flex items-end justify-between gap-4 font-sans">
        <div className="text-[12px] leading-relaxed">
          <p className="font-semibold text-on-teal">{card.publisher}</p>
          <p className="text-on-teal/70">
            {formatDateShort(card.publishedAt)} · {formatTime(card.publishedAt)}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-on-teal">
          Read full story <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function Radar({ cards, date }: { cards: ArticleCard[]; date?: string }) {
  return (
    <section aria-labelledby="radar-h">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <h2 id="radar-h" className="font-serif text-[20px] font-medium tracking-[-0.015em]">
          Also on the radar
        </h2>
        {date && <span className="font-sans text-[11px] uppercase tracking-[0.08em] text-muted">{formatDateShort(date).replace(/ \d{4}$/, '')}</span>}
      </div>
      <ol>
        {cards.map((c, i) => (
          <li key={c.id} className="relative grid grid-cols-[2rem_1fr] gap-1 border-b border-rule py-4 transition-opacity last:border-b-0 active:opacity-70">
            <span className="pt-0.5 font-serif text-[15px] font-medium text-accent tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
                {shortCat(c.primaryCategory)} · {REGION_LABEL[c.region]}
              </p>
              <h3 className="mt-1.5 font-serif text-[16px] font-medium leading-[1.35] tracking-[-0.01em] text-ink">
                <Link to={articlePath(c)} className="after:absolute after:inset-0 hover:text-accent">
                  {c.title}
                </Link>
              </h3>
              <p className="mt-1.5 inline-flex items-center gap-1 font-sans text-[12px] text-muted">
                {c.publisher} <ArrowUpRight size={11} aria-hidden="true" />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IntelItem({ card }: { card: ArticleCard }) {
  return (
    <li className="relative border-t border-rule py-6 transition-opacity active:opacity-70">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.09em] text-accent">
            {shortCat(card.primaryCategory)} <span className="ml-1.5 font-medium normal-case tracking-normal text-muted">{REGION_LABEL[card.region]}</span>
          </p>
          <h3 className="mt-2 font-serif text-[19px] font-medium leading-[1.3] tracking-[-0.015em] text-ink sm:text-[21px]" style={{ textWrap: 'balance' }}>
            <Link to={articlePath(card)} className="after:absolute after:inset-0 hover:text-accent">
              {card.title}
            </Link>
          </h3>
          {card.dek && <p className="mt-2 line-clamp-2 font-sans text-[14px] leading-[1.55] text-ink-2">{card.dek}</p>}
          <p className="mt-2.5 font-sans text-[12px] text-muted">
            {card.publisher} <span aria-hidden="true">·</span> {formatTime(card.publishedAt)}
          </p>
        </div>
        <ArrowUpRight size={16} className="mt-7 shrink-0 text-muted" aria-hidden="true" />
      </div>
    </li>
  );
}

function LatestIntelligence({ all }: { all: ArticleCard[] }) {
  const [region, setRegion] = useState<'all' | Region>('all');
  const [topic, setTopic] = useState<'all' | CategoryId>('all');
  const list = all.filter((c) => (region === 'all' || c.region === region) && (topic === 'all' || c.categories.includes(topic))).slice(0, 6);
  const pill = (active: boolean) =>
    `h-9 rounded-[4px] border px-3.5 font-sans text-[12px] font-medium transition-colors ${active ? 'border-teal bg-teal text-on-teal' : 'border-rule-strong bg-surface text-ink-2 hover:border-ink-2'}`;
  return (
    <section aria-labelledby="latest-h">
      <SectionTitle title="Latest intelligence" href="/latest" linkLabel="View all news" />
      <div className="flex flex-wrap items-center gap-2 pb-5">
        {(['all', 'india', 'world'] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRegion(r)} aria-pressed={region === r} className={pill(region === r)}>
            {r === 'all' ? 'All regions' : REGION_LABEL[r]}
          </button>
        ))}
        <label className="relative ml-1 inline-flex items-center">
          <span className="sr-only">Topic</span>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as 'all' | CategoryId)}
            className="h-9 cursor-pointer appearance-none bg-transparent pl-1 pr-6 font-sans text-[12px] font-medium text-ink-2 outline-none"
          >
            <option value="all">Topic: All topics</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                Topic: {c.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-1 text-muted" aria-hidden="true" />
        </label>
      </div>
      {list.length ? (
        <ul className="border-b border-rule">
          {list.map((c) => (
            <IntelItem key={c.id} card={c} />
          ))}
        </ul>
      ) : (
        <p className="border-t border-rule py-8 font-sans text-[14px] text-muted">No stories match these filters this week.</p>
      )}
      <Link to="/latest" className="btn-outline mt-6 h-11 w-full">
        Explore all latest news <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}

function ExploreTopics() {
  return (
    <section className="rounded-[6px] bg-paper-2 p-6" aria-labelledby="topics-h">
      <h2 id="topics-h" className="font-serif text-[20px] font-medium tracking-[-0.015em]">
        Explore by topic
      </h2>
      <p className="mt-1 font-sans text-[12px] text-muted">Go deeper into the stories that matter to you.</p>
      <ul className="mt-4">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link to={`/category/${c.id}`} className="group flex items-center justify-between py-2.5 font-sans text-[14px] text-ink hover:text-accent">
              {c.label}
              <ArrowUpRight size={14} className="text-muted group-hover:text-accent" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MarketNote() {
  const { data } = useData<MarketData>('market/indicators.json');
  const { data: eq } = useData<EquityData>('market/equities.json');
  const pick = ['^CNXMETAL', 'TATASTEEL.NS', 'JSWSTEEL.NS', 'SAIL.NS', 'HRC=F'];
  const quotes = (eq?.groups ?? []).flatMap((g) => g.items);
  const rows: { key: string; name: string; sub: string; value: string; change: ReactNode }[] = [
    ...pick
      .map((sym) => quotes.find((q) => q.symbol === sym))
      .filter((q): q is EquityQuote => Boolean(q))
      .map((q) => ({
        key: q.symbol,
        name: q.name.replace(' futures (CME)', ' futures'),
        sub: q.kind === 'future' ? (q.unit ?? '') : q.kind === 'index' ? 'Index' : q.currency,
        value: formatNumber(q.price, q.price < 1000 ? 2 : 0),
        change: <Change value={q.change} pct={q.changePct} />,
      })),
    ...(data?.indicators ?? [])
      .filter((i) => i.status === 'available' && i.latest)
      .slice(0, 2)
      .map((i) => ({
        key: i.id,
        name: i.name,
        sub: `${i.unit} · ${formatDateShort(i.latest!.date)}`,
        value: formatNumber(i.latest!.value, i.latest!.value < 1000 ? 2 : 0),
        change: <ChangeBadge ind={i} />,
      })),
  ];
  if (!rows.length) {
    return (
      <section className="rounded-[6px] border border-rule-strong bg-surface p-6">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Markets</p>
        <p className="mt-2 font-sans text-[13px] text-muted">Market data appears after the next update.</p>
      </section>
    );
  }
  return (
    <section className="rounded-[6px] border border-rule-strong bg-surface p-6" aria-labelledby="snapshot-h">
      <p id="snapshot-h" className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        Market snapshot
      </p>
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
            <span className="min-w-0">
              <span className="block truncate font-sans text-[14px] font-medium text-ink">{r.name}</span>
              <span className="font-sans text-[11px] text-muted">{r.sub}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-serif text-[16px] font-medium tabular-nums">{r.value}</span>
              {r.change}
            </span>
          </li>
        ))}
      </ul>
      <Link to="/markets" className="mt-3 inline-flex items-center gap-1 font-sans text-[13px] font-semibold text-accent hover:underline">
        All market data <ArrowUpRight size={13} aria-hidden="true" />
      </Link>
      {eq && <p className="mt-2 font-sans text-[11px] text-muted">Delayed data. Not investment advice.</p>}
    </section>
  );
}

function Desk({ region, cards }: { region: Region; cards: ArticleCard[] }) {
  return (
    <section aria-labelledby={`desk-${region}`}>
      <div className="flex items-end justify-between border-b border-rule pb-3">
        <h2 id={`desk-${region}`} className="font-serif text-[22px] font-medium tracking-[-0.02em]">
          {REGION_LABEL[region]} desk
        </h2>
        <Link to={`/${region}`} className="inline-flex items-center gap-1 font-sans text-[13px] font-semibold text-accent hover:underline">
          All {region === 'india' ? 'India' : 'world'} news <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      <ul>
        {cards.map((c) => (
          <li key={c.id} className="relative border-b border-rule py-5 transition-opacity last:border-b-0 active:opacity-70">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.09em] text-accent">{shortCat(c.primaryCategory)}</p>
            <h3 className="mt-1.5 font-serif text-[17px] font-medium leading-[1.35] tracking-[-0.01em] text-ink">
              <Link to={articlePath(c)} className="after:absolute after:inset-0 hover:text-accent">
                {c.title}
              </Link>
            </h3>
            <p className="mt-1.5 inline-flex items-center gap-1 font-sans text-[12px] text-muted">
              {c.publisher} <ArrowUpRight size={11} aria-hidden="true" />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EditionCard({ region, entry }: { region: Region; entry?: EditionIndexEntry }) {
  const blurb = region === 'india' ? "A focused view of India's steel industry." : 'Global developments. Local implications.';
  return (
    <Link to={entry ? `/edition/${region}/${entry.date}` : '/editions'} className="group relative block rounded-[6px] bg-teal p-6 text-on-teal transition-colors hover:bg-teal-2">
      <ArrowUpRight size={20} className="absolute right-6 top-6 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-on-teal/70">
        {entry ? `${formatDateLong(entry.date).replace(/^\w+, /, '')} / No. ${entry.number}` : 'Next edition'}
      </p>
      <h3 className="mt-2 font-serif text-[24px] font-medium tracking-[-0.02em]">{REGION_LABEL[region]} edition</h3>
      <div className="mt-3 flex items-end justify-between gap-4 font-sans text-[12px] text-on-teal/75">
        <span>{blurb}</span>
        {entry && <span className="shrink-0">{entry.articleCount} developments</span>}
      </div>
    </Link>
  );
}

export function HomePage() {
  useDocumentTitle(null);
  const latest = useData<LatestFeed>('latest.json');
  const editions = useData<EditionIndex>('editions/index.json');
  const { data: meta } = useData<SiteMeta>('meta.json');

  if (latest.loading) return <LoadingBlock />;
  const all = [...(latest.data?.india ?? []), ...(latest.data?.world ?? [])];
  if (!all.length) {
    return (
      <div className="py-10">
        <FirstRunNotice />
      </div>
    );
  }

  // Every story appears at most once on the page.
  const used = new Set<string>();
  const take = (list: ArticleCard[], n: number) => {
    const out: ArticleCard[] = [];
    for (const c of list) {
      if (out.length >= n) break;
      if (used.has(c.id)) continue;
      used.add(c.id);
      out.push(c);
    }
    return out;
  };

  const ranked = rankCards(all);
  const chronological = [...all].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const [lead] = take(ranked, 1);
  const radar = take(ranked, 3);
  const latestPool = chronological.filter((c) => !used.has(c.id));
  for (const c of latestPool.slice(0, 6)) used.add(c.id);
  const india = take(rankCards(latest.data?.india ?? []), 3);
  const world = take(rankCards(latest.data?.world ?? []), 3);
  const indiaEd = editions.data?.editions.find((e) => e.region === 'india');
  const worldEd = editions.data?.editions.find((e) => e.region === 'world');
  const date = indiaEd?.date ?? worldEd?.date ?? lead.editionDate;

  return (
    <div>
      {/* Hero */}
      <section className="flex flex-col gap-3 pb-6 pt-7 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
        <div>
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{formatDateLong(date)}</p>
          <p className="mt-2 font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[36px]">The steel industry. In focus.</p>
        </div>
        <div className="font-sans text-[12px] text-muted sm:text-right">
          {meta?.lastSuccessfulRefresh && (
            <Link to="/status" className="font-semibold text-ink hover:text-accent">
              Updated {formatTime(meta.lastSuccessfulRefresh)}
            </Link>
          )}
          <p className="mt-1">India &amp; world / Source-linked reporting</p>
        </div>
      </section>

      {/* Big story + radar */}
      <section className="grid gap-8 pb-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <BigStory card={lead} />
        </div>
        <div className="lg:col-span-4">
          <Radar cards={radar} date={date} />
        </div>
      </section>

      {/* Latest + sidebar */}
      <div className="bleed border-t border-rule py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <LatestIntelligence all={latestPool} />
          </div>
          <aside className="space-y-6 lg:col-span-4">
            <ExploreTopics />
            <MarketNote />
          </aside>
        </div>
      </div>

      {/* Desks */}
      <div className="bleed bg-surface py-10 sm:py-12">
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <Desk region="india" cards={india} />
          <Desk region="world" cards={world} />
        </div>
      </div>

      {/* Daily briefing */}
      <section className="py-10 sm:py-12" aria-labelledby="briefing-h">
        <SectionTitle title="Your daily steel briefing" sub="A complete view of the day, organised into one edition." href="/editions" linkLabel="Browse all editions" />
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <EditionCard region="india" entry={indiaEd} />
          <EditionCard region="world" entry={worldEd} />
        </div>
      </section>
    </div>
  );
}
