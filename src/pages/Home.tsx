import { Link } from 'react-router-dom';
import { EditionList, EditionPromo, MarketStrip, rankCards } from '../components/Blocks';
import { EmptyState, LoadingBlock, SectionHeader, useDocumentTitle } from '../components/Common';
import { HeadlineRow, LeadStory, NumberedItem, StoryItem } from '../components/Story';
import { useData } from '../lib/data';
import { CATEGORIES } from '../lib/taxonomy';
import type { ArticleCard, EditionIndex, LatestFeed, MarketData, Region } from '../types/news';

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

function RegionColumn({ region, cards }: { region: Region; cards: ArticleCard[] }) {
  const ranked = rankCards(cards).slice(0, 5);
  return (
    <section aria-labelledby={`col-${region}`}>
      <SectionHeader id={`col-${region}`} title={region === 'india' ? 'India' : 'World'} href={`/${region}`} linkLabel={`All ${region === 'india' ? 'India' : 'World'} news`} />
      {ranked.length ? (
        <div className="space-y-5">
          <StoryItem card={ranked[0]} image showRegion={false} size="lg" />
          <ul>
            {ranked.slice(1).map((c) => (
              <li key={c.id} className="border-t border-rule py-3.5">
                <StoryItem card={c} dek={false} showRegion={false} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="dek text-[16px]">No {region === 'india' ? 'India' : 'World'} stories in the last seven days.</p>
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

  const ranked = rankCards(all);
  const [lead, ...rest] = ranked;
  const top = rest.slice(0, 6);
  const used = new Set([lead.id, ...top.map((c) => c.id)]);
  const secondary = rest.filter((c) => !used.has(c.id)).slice(0, 3);
  secondary.forEach((c) => used.add(c.id));
  const chronological = [...all].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const priceNews = chronological.filter((c) => c.categories.includes('market-prices') || c.categories.includes('raw-materials')).slice(0, 4);
  const latestIndia = editions.data?.editions.find((e) => e.region === 'india');
  const latestWorld = editions.data?.editions.find((e) => e.region === 'world');
  const trending = [...all].sort((a, b) => b.importance - a.importance).slice(0, 6);

  return (
    <div className="pb-6">
      {/* Lead package */}
      <section className="grid gap-8 pt-6 lg:grid-cols-12 lg:gap-10 lg:pt-8" aria-label="Top story">
        <div className="lg:col-span-8">
          <LeadStory card={lead} />
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

      {secondary.length > 0 && (
        <section className="mt-10 grid gap-8 border-t border-rule pt-6 sm:grid-cols-3" aria-label="More top stories">
          {secondary.map((c) => (
            <StoryItem key={c.id} card={c} image />
          ))}
        </section>
      )}

      {/* Market highlights */}
      <section className="mt-12" aria-labelledby="markets-h">
        <SectionHeader id="markets-h" title="Market Highlights" href="/markets" linkLabel="Steel markets" heavy />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <MarketStrip market={market.data} />
          </div>
          <div className="lg:col-span-5">
            <p className="kicker mb-1 text-muted">Price & raw-material news</p>
            {priceNews.length ? (
              <ul>
                {priceNews.map((c) => (
                  <HeadlineRow key={c.id} card={c} />
                ))}
              </ul>
            ) : (
              <p className="dek text-[15px]">No price or raw-material stories this week.</p>
            )}
          </div>
        </div>
      </section>

      {/* India / World */}
      <section className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
        <RegionColumn region="india" cards={latest.data?.india ?? []} />
        <RegionColumn region="world" cards={latest.data?.world ?? []} />
      </section>

      {/* Daily intelligence */}
      <section className="mt-14" aria-labelledby="daily-h">
        <SectionHeader id="daily-h" title="Daily Steel Intelligence" href="/editions" linkLabel="All editions" heavy />
        <div className="grid gap-5 md:grid-cols-2">
          <EditionPromo region="india" entry={latestIndia} tone="inverse" />
          <EditionPromo region="world" entry={latestWorld} />
        </div>
      </section>

      {/* Latest + trending */}
      <section className="mt-14 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8" aria-labelledby="latest-h">
          <SectionHeader id="latest-h" title="Latest Developments" href="/latest" linkLabel="All latest" />
          <ul>
            {chronological.slice(0, 10).map((c) => (
              <HeadlineRow key={c.id} card={c} />
            ))}
          </ul>
        </div>
        <aside className="lg:col-span-4" aria-labelledby="trending-h">
          <SectionHeader id="trending-h" title="Most Significant This Week" />
          <ol>
            {trending.map((c, i) => (
              <NumberedItem key={c.id} card={c} n={i + 1} />
            ))}
          </ol>
        </aside>
      </section>

      {/* Category sections */}
      <section className="mt-14" aria-labelledby="sections-h">
        <SectionHeader id="sections-h" title="By Section" heavy />
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const items = chronological.filter((c) => c.categories.includes(cat.id)).slice(0, 3);
            if (!items.length) return null;
            return (
              <div key={cat.id}>
                <Link to={`/category/${cat.id}`} className="group flex items-baseline justify-between border-t border-rule-strong pt-2">
                  <h3 className="font-serif text-[20px] font-semibold group-hover:text-accent">{cat.label}</h3>
                </Link>
                <ul className="mt-2">
                  {items.map((c) => (
                    <li key={c.id} className="border-t border-rule py-2.5 first:border-t-0">
                      <StoryItem card={c} dek={false} size="sm" />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Previous editions */}
      {editions.data && editions.data.editions.length > 2 && (
        <section className="mt-14" aria-labelledby="prev-h">
          <SectionHeader id="prev-h" title="Previous Editions" href="/editions" linkLabel="Edition archive" />
          <div className="grid gap-x-10 md:grid-cols-2">
            <EditionList entries={editions.data.editions.filter((e) => e.region === 'india').slice(1, 5)} />
            <EditionList entries={editions.data.editions.filter((e) => e.region === 'world').slice(1, 5)} />
          </div>
        </section>
      )}
    </div>
  );
}
