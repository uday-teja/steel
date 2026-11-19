import { Link } from 'react-router-dom';
import { EditionList, EditionPromo, rankCards } from '../components/Blocks';
import { LoadingBlock, SectionHeader, useDocumentTitle } from '../components/Common';
import { HeadlineRow, LeadStory, NumberedItem, StoryItem } from '../components/Story';
import { useData } from '../lib/data';
import { CATEGORIES, REGION_LABEL } from '../lib/taxonomy';
import type { EditionIndex, LatestFeed, Region } from '../types/news';
import { FirstRunNotice } from './Home';

const INTRO: Record<Region, string> = {
  india: 'Producers, prices, raw materials, policy and demand across the Indian steel industry — from HR coil and TMT to EN8, EN19 and C45 engineering steels.',
  world: 'China, Europe, the United States, Japan, Korea and the Middle East: global prices, trade measures, raw materials, producers and the green steel transition.',
};

export function RegionSwitch({ region }: { region: Region }) {
  return (
    <div className="inline-flex border border-rule-strong p-0.5 font-sans text-[13px] font-semibold" role="tablist" aria-label="Edition region">
      {(['india', 'world'] as Region[]).map((r) => (
        <Link key={r} to={`/${r}`} role="tab" aria-selected={r === region} className={`px-4 py-1.5 ${r === region ? 'bg-teal text-on-teal' : 'text-ink-2 hover:text-ink'}`}>
          {REGION_LABEL[r]}
        </Link>
      ))}
    </div>
  );
}

export function RegionPage({ region }: { region: Region }) {
  useDocumentTitle(`${REGION_LABEL[region]} steel industry news`);
  const latest = useData<LatestFeed>('latest.json');
  const editions = useData<EditionIndex>('editions/index.json');
  const cards = latest.data?.[region] ?? [];
  const edition = editions.data?.editions.find((e) => e.region === region);

  const header = (
    <header className="flex flex-col gap-3 border-b border-rule pb-4 pt-5 sm:flex-row sm:items-end sm:justify-between sm:pt-8">
      <div>
        <p className={`kicker ${region === 'india' ? 'text-india' : 'text-world'}`}>{region === 'india' ? 'Indian steel industry' : 'Global steel industry'}</p>
        <h1 className="headline mt-1 text-[34px] leading-none sm:text-[48px]">{REGION_LABEL[region]}</h1>
        <p className="dek mt-2 hidden max-w-2xl text-[17px] leading-[1.5] sm:block">{INTRO[region]}</p>
      </div>
      <RegionSwitch region={region} />
    </header>
  );

  if (latest.loading) return <>{header}<LoadingBlock /></>;
  if (!cards.length) return <>{header}<div className="py-8"><FirstRunNotice /></div></>;

  const ranked = rankCards(cards);
  const [lead, ...rest] = ranked;
  const side = rest.slice(0, 4);
  const chronological = [...cards].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="pb-6">
      {header}
      <section className="grid gap-8 pt-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <LeadStory card={lead} />
        </div>
        <aside className="space-y-6 lg:col-span-4 lg:border-l lg:border-rule lg:pl-8">
          <EditionPromo region={region} entry={edition} tone={region === 'india' ? 'inverse' : 'default'} />
          <div>
            <SectionHeader title="Headlines" />
            <ol>
              {side.map((c, i) => (
                <NumberedItem key={c.id} card={c} n={i + 1} />
              ))}
            </ol>
          </div>
        </aside>
      </section>

      <section className="mt-10 grid gap-8 border-t border-rule pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {rest.slice(4, 8).map((c) => (
          <StoryItem key={c.id} card={c} image showRegion={false} />
        ))}
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SectionHeader title="Latest" heavy />
          <ul>
            {chronological.slice(0, 14).map((c) => (
              <HeadlineRow key={c.id} card={c} />
            ))}
          </ul>
        </div>
        <aside className="lg:col-span-4">
          <SectionHeader title={`${REGION_LABEL[region]} editions`} href="/editions" linkLabel="Archive" />
          <EditionList entries={(editions.data?.editions ?? []).filter((e) => e.region === region).slice(0, 6)} />
        </aside>
      </section>

      <section className="mt-12">
        <SectionHeader title="Sections" heavy />
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const items = chronological.filter((c) => c.categories.includes(cat.id)).slice(0, 4);
            if (!items.length) return null;
            return (
              <div key={cat.id}>
                <Link to={`/category/${cat.id}?region=${region}`} className="block border-t border-rule-strong pt-2">
                  <h3 className="font-serif text-[20px] font-medium hover:text-accent">{cat.label}</h3>
                </Link>
                <ul className="mt-2">
                  {items.map((c) => (
                    <li key={c.id} className="border-t border-rule py-2.5 first:border-t-0">
                      <StoryItem card={c} dek={false} showRegion={false} size="sm" />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
