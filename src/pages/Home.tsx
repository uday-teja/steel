import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EditionList, EditionPromo, MarketStrip, rankCards } from '../components/Blocks';
import { EmptyState, LoadingBlock, SectionHeader, useDocumentTitle } from '../components/Common';
import { HeadlineRow, LeadStory, NumberedItem, StoryItem } from '../components/Story';
import { useData } from '../lib/data';
import { formatDateLong, formatTime } from '../lib/format';
import { CATEGORIES } from '../lib/taxonomy';
import type { ArticleCard, EditionIndex, LatestFeed, MarketData, Region, SiteMeta } from '../types/news';

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

/** One quiet line: today's date, freshness, and both daily editions. */
export function BriefingBar({ editions }: { editions?: EditionIndex }) {
  const { data: meta } = useData<SiteMeta>('meta.json');
  const india = editions?.editions.find((e) => e.region === 'india');
  const world = editions?.editions.find((e) => e.region === 'world');
  const date = india?.date ?? world?.date;
  const link = 'inline-flex items-center gap-1 font-semibold text-ink hover:text-accent';
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 pt-4 font-sans text-[13px] text-muted">
      <p>
        <span className="text-ink-2">{date ? formatDateLong(date) : 'Daily steel intelligence'}</span>
        {meta?.lastSuccessfulRefresh && (
          <Link to="/status" className="hover:text-ink">
            {' '}
            · Updated {formatTime(meta.lastSuccessfulRefresh)}
          </Link>
        )}
      </p>
      <p className="flex gap-4">
        <span className="hidden sm:inline">Today's editions:</span>
        <Link to={india ? `/edition/india/${india.date}` : '/editions'} className={link}>
          India <ArrowRight size={13} aria-hidden="true" />
        </Link>
        <Link to={world ? `/edition/world/${world.date}` : '/editions'} className={link}>
          World <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}

function MoreTop({ cards, className }: { cards: ArticleCard[]; className: string }) {
  return (
    <div className={`mt-2 gap-x-8 gap-y-6 border-t border-rule pt-6 sm:grid-cols-2 lg:mt-8 ${className}`} aria-label="More top stories">
      {cards.map((c) => (
        <StoryItem key={c.id} card={c} image="side" />
      ))}
    </div>
  );
}

function RegionColumn({ region, cards }: { region: Region; cards: ArticleCard[] }) {
  return (
    <section aria-labelledby={`col-${region}`}>
      <SectionHeader id={`col-${region}`} title={region === 'india' ? 'India' : 'World'} href={`/${region}`} linkLabel={`All ${region === 'india' ? 'India' : 'World'} news`} />
      {cards.length ? (
        <div className="space-y-5">
          <StoryItem card={cards[0]} image showRegion={false} size="lg" />
          <ul>
            {cards.slice(1).map((c) => (
              <li key={c.id} className="border-t border-rule py-3.5">
                <StoryItem card={c} dek={false} showRegion={false} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="dek text-[16px]">More {region === 'india' ? 'India' : 'World'} stories appear after the next update.</p>
      )}
    </section>
  );
}

export function HomePage() {
  useDocumentTitle(null);
  const latest = useData<LatestFeed>('latest.json');
  const editions = useData<EditionIndex>('editions/index.json');
  const market = useData<MarketData>('market/indicators.json');

  if (latest.loading) return <LoadingBlock />;
  const all = [...(latest.data?.india ?? []), ...(latest.data?.world ?? [])];
  if (!all.length) {
    return (
      <div className="py-10">
        <FirstRunNotice />
      </div>
    );
  }

  // Every story appears at most once on the front page.
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
  const top = take(ranked, 6);
  const secondary = take(ranked, 4);
  const priceNews = take(chronological.filter((c) => c.categories.includes('market-prices') || c.categories.includes('raw-materials')), 4);
  const indiaCol = take(rankCards(latest.data?.india ?? []), 5);
  const worldCol = take(rankCards(latest.data?.world ?? []), 5);
  const latestDev = take(chronological, 10);
  const pricesAvailable = market.data?.indicators.some((i) => i.status === 'available') ?? false;

  return (
    <div className="pb-6">
      <BriefingBar editions={editions.data} />

      {/* Lead package */}
      <section className="grid gap-8 pt-6 lg:grid-cols-12 lg:gap-10 lg:pt-8" aria-label="Top story">
        <div className="lg:col-span-8">
          <LeadStory card={lead} />
          {secondary.length > 0 && <MoreTop cards={secondary} className="hidden lg:grid" />}
        </div>
        <aside className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-8" aria-labelledby="top-stories">
          <SectionHeader id="top-stories" title="Top Stories" heavy />
          <ol>
            {top.map((c, i) => (
              <NumberedItem key={c.id} card={c} n={i + 1} />
            ))}
          </ol>
        </aside>
        {secondary.length > 0 && <MoreTop cards={secondary} className="grid lg:hidden" />}
      </section>

      {/* Daily intelligence */}
      <section className="mt-12" aria-labelledby="daily-h">
        <SectionHeader id="daily-h" title="Daily Steel Intelligence" href="/editions" linkLabel="All editions" heavy />
        <div className="grid gap-5 md:grid-cols-2">
          <EditionPromo region="india" entry={editions.data?.editions.find((e) => e.region === 'india')} tone="inverse" />
          <EditionPromo region="world" entry={editions.data?.editions.find((e) => e.region === 'world')} />
        </div>
      </section>

      {/* India / World */}
      <section className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
        <RegionColumn region="india" cards={indiaCol} />
        <RegionColumn region="world" cards={worldCol} />
      </section>

      {/* Market highlights */}
      {(priceNews.length > 0 || pricesAvailable) && (
        <section className="mt-12" aria-labelledby="markets-h">
          <SectionHeader id="markets-h" title="Market Highlights" href="/markets" linkLabel="Steel markets" heavy />
          <div className={pricesAvailable ? 'grid gap-8 lg:grid-cols-12' : ''}>
            {pricesAvailable && (
              <div className="lg:col-span-7">
                <MarketStrip market={market.data} />
              </div>
            )}
            <ul className={pricesAvailable ? 'lg:col-span-5' : 'grid gap-x-10 md:grid-cols-2 md:[&>li:nth-child(2)]:border-t-0'}>
              {priceNews.map((c) => (
                <HeadlineRow key={c.id} card={c} />
              ))}
            </ul>
          </div>
          {!pricesAvailable && (
            <p className="meta mt-3">
              Verified price data is not connected yet; SteelScope never estimates prices.{' '}
              <Link to="/markets" className="underline underline-offset-2 hover:text-ink">
                About market data
              </Link>
            </p>
          )}
        </section>
      )}

      {/* Latest */}
      {latestDev.length > 0 && (
        <section className="mt-12 max-w-4xl" aria-labelledby="latest-h">
          <SectionHeader id="latest-h" title="Latest Developments" href="/latest" linkLabel="All latest news" />
          <ul>
            {latestDev.map((c) => (
              <HeadlineRow key={c.id} card={c} />
            ))}
          </ul>
        </section>
      )}

      {/* Sections */}
      <section className="mt-12" aria-label="Browse sections">
        <p className="kicker text-muted">Browse sections</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link to={`/category/${c.id}`} className="inline-block border border-rule px-3 py-1.5 font-sans text-[13px] text-ink-2 hover:border-ink hover:text-ink active:bg-paper-2">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Previous editions */}
      {editions.data && editions.data.editions.length > 2 && (
        <section className="mt-12" aria-labelledby="prev-h">
          <SectionHeader id="prev-h" title="Previous Editions" href="/editions" linkLabel="Edition archive" />
          <div className="grid gap-x-10 md:grid-cols-2">
            <EditionList entries={editions.data.editions.filter((e) => e.region === 'india').slice(1, 4)} />
            <EditionList entries={editions.data.editions.filter((e) => e.region === 'world').slice(1, 4)} />
          </div>
        </section>
      )}
    </div>
  );
}
