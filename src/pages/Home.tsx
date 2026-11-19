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

/** Today's date, freshness and one-tap access to both daily editions. */
export function BriefingBar({ editions }: { editions?: EditionIndex }) {
  const { data: meta } = useData<SiteMeta>('meta.json');
  const india = editions?.editions.find((e) => e.region === 'india');
  const world = editions?.editions.find((e) => e.region === 'world');
  const date = india?.date ?? world?.date;
  const pill = 'inline-flex items-center gap-1.5 border px-3 py-1.5 font-sans text-[12px] font-semibold transition-colors';
  return (
    <div className="flex flex-col gap-3 border-b border-rule py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-sans text-[12px] text-muted">
        <span className="font-semibold text-ink">{date ? formatDateLong(date) : 'Daily steel intelligence'}</span>
        {meta?.lastSuccessfulRefresh && (
          <>
            <span aria-hidden="true"> · </span>
            <Link to="/status" className="hover:text-ink">
              Updated {formatTime(meta.lastSuccessfulRefresh)}
            </Link>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Link to={india ? `/edition/india/${india.date}` : '/editions'} className={`${pill} border-ink bg-ink text-paper hover:bg-accent hover:border-accent`}>
          Today's India Edition <ArrowRight size={13} aria-hidden="true" />
        </Link>
        <Link to={world ? `/edition/world/${world.date}` : '/editions'} className={`${pill} border-rule-strong text-ink hover:bg-ink hover:text-paper`}>
          World Edition <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
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
  const latestDev = take(chronological, 8);
  const sections = CATEGORIES.map((cat) => ({ cat, items: take(chronological.filter((c) => c.categories.includes(cat.id)), 2) })).filter((s) => s.items.length);
  const pricesAvailable = market.data?.indicators.some((i) => i.status === 'available') ?? false;

  return (
    <div className="pb-6">
      <BriefingBar editions={editions.data} />

      {/* Lead package */}
      <section className="grid gap-8 pt-5 lg:grid-cols-12 lg:gap-10 lg:pt-8" aria-label="Top story">
        <div className="lg:col-span-8">
          <LeadStory card={lead} />
          {secondary.length > 0 && (
            <div className="mt-8 grid gap-x-8 gap-y-6 border-t border-rule pt-6 sm:grid-cols-2" aria-label="More top stories">
              {secondary.map((c) => (
                <StoryItem key={c.id} card={c} image="side" />
              ))}
            </div>
          )}
        </div>
        <aside className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-8" aria-labelledby="top-stories">
          <SectionHeader id="top-stories" title="Top Stories" heavy />
          <ol>
            {top.map((c, i) => (
              <NumberedItem key={c.id} card={c} n={i + 1} />
            ))}
          </ol>
        </aside>
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
      <section className="mt-12" aria-labelledby="sections-h">
        <SectionHeader id="sections-h" title="By Section" heavy />
        {sections.length > 0 && (
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map(({ cat, items }) => (
              <div key={cat.id}>
                <Link to={`/category/${cat.id}`} className="group flex items-baseline justify-between border-t border-rule-strong pt-2">
                  <h3 className="font-serif text-[20px] font-semibold group-hover:text-accent">{cat.label}</h3>
                  <ArrowRight size={14} className="text-muted group-hover:text-accent" aria-hidden="true" />
                </Link>
                <ul className="mt-1">
                  {items.map((c) => (
                    <li key={c.id} className="border-t border-rule py-2.5 first:border-t-0">
                      <StoryItem card={c} dek={false} size="sm" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <ul className="mt-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link to={`/category/${c.id}`} className="inline-block border border-rule px-3 py-1.5 font-sans text-[13px] text-ink-2 hover:border-ink hover:text-ink">
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
