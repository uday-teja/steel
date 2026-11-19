import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EditionList } from '../components/Blocks';
import { EmptyState, LoadingBlock, PageTitle, SectionHeader, useDocumentTitle } from '../components/Common';
import { HeadlineRow, StoryItem } from '../components/Story';
import { useData } from '../lib/data';
import { formatDateLong, formatDateShort } from '../lib/format';
import { CATEGORY_MAP, isCategoryId, REGION_LABEL } from '../lib/taxonomy';
import type { ArticleCard, CategoryFeed, CompanyIndex, DatesIndex, DayIndex, EditionIndex, LatestFeed, Region } from '../types/news';
import { NotFoundPage } from './Static';

type Filter = 'all' | Region;

function RegionFilter({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  return (
    <div className="inline-flex border border-rule-strong p-0.5 font-sans text-[12px] font-semibold" role="tablist" aria-label="Filter by region">
      {(['all', 'india', 'world'] as Filter[]).map((r) => (
        <button key={r} type="button" role="tab" aria-selected={value === r} onClick={() => onChange(r)} className={`px-3 py-1 ${value === r ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>
          {r === 'all' ? 'All' : REGION_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

function useRegionParam(): [Filter, (v: Filter) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('region');
  const value: Filter = raw === 'india' || raw === 'world' ? raw : 'all';
  return [value, (v) => setParams(v === 'all' ? {} : { region: v }, { replace: true })];
}

function StoryGrid({ cards }: { cards: ArticleCard[] }) {
  if (!cards.length) return <EmptyState title="No stories yet">New stories appear here after the next collection run.</EmptyState>;
  const [first, ...rest] = cards;
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <StoryItem card={first} image size="lg" />
      </div>
      <ul className="lg:col-span-7">
        {rest.map((c) => (
          <li key={c.id} className="border-t border-rule py-4 first:border-t-0 first:pt-0">
            <StoryItem card={c} image="side" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryPage() {
  const { id = '' } = useParams();
  const valid = isCategoryId(id);
  const { data, loading } = useData<CategoryFeed>(valid ? `categories/${id}.json` : null);
  const [region, setRegion] = useRegionParam();
  useDocumentTitle(valid ? CATEGORY_MAP[id].label : null);
  if (!valid) return <NotFoundPage />;
  const cat = CATEGORY_MAP[id];
  const cards = (region === 'all' ? [...(data?.india ?? []), ...(data?.world ?? [])] : (data?.[region] ?? [])).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <div className="pb-6">
      <PageTitle eyebrow="Section" title={cat.label}>
        {cat.description}
      </PageTitle>
      <div className="flex items-center justify-between py-4">
        <p className="meta">{loading ? 'Loading…' : `${cards.length} recent stories`}</p>
        <RegionFilter value={region} onChange={setRegion} />
      </div>
      {loading ? <LoadingBlock /> : <StoryGrid cards={cards} />}
    </div>
  );
}

export function LatestPage() {
  useDocumentTitle('Latest steel news');
  const { data, loading } = useData<LatestFeed>('latest.json');
  const [region, setRegion] = useRegionParam();
  const cards = (region === 'all' ? [...(data?.india ?? []), ...(data?.world ?? [])] : (data?.[region] ?? [])).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <div className="pb-6">
      <PageTitle eyebrow="Latest News" title="All developments, newest first">
        Every steel-industry story collected in the past seven days, in order of publication.
      </PageTitle>
      <div className="flex items-center justify-between py-4">
        <p className="meta">{loading ? 'Loading…' : `${cards.length} stories`}</p>
        <RegionFilter value={region} onChange={setRegion} />
      </div>
      {loading ? (
        <LoadingBlock />
      ) : cards.length ? (
        <ul className="max-w-3xl">
          {cards.map((c) => (
            <HeadlineRow key={c.id} card={c} />
          ))}
        </ul>
      ) : (
        <EmptyState title="No stories yet">New stories appear here after the next collection run.</EmptyState>
      )}
    </div>
  );
}

export function EditionsPage() {
  useDocumentTitle('Daily editions');
  const { data, loading } = useData<EditionIndex>('editions/index.json');
  const eds = data?.editions ?? [];
  const byMonth = new Map<string, typeof eds>();
  for (const e of eds) {
    const k = e.date.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  return (
    <div className="pb-6">
      <PageTitle eyebrow="Daily Steel Intelligence" title="Edition archive">
        Two editions are published every morning — India and World — and updated through the day as new reports arrive.
      </PageTitle>
      {loading ? (
        <LoadingBlock />
      ) : !eds.length ? (
        <div className="py-8">
          <EmptyState title="No editions yet">The first editions are published after the first scheduled collection run.</EmptyState>
        </div>
      ) : (
        [...byMonth.entries()].map(([month, list]) => (
          <section key={month} className="mt-10">
            <SectionHeader title={new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} heavy />
            <div className="grid gap-x-12 md:grid-cols-2">
              <div>
                <p className="kicker mb-1 text-india">India</p>
                <EditionList entries={list.filter((e) => e.region === 'india')} />
              </div>
              <div>
                <p className="kicker mb-1 mt-6 text-world md:mt-0">World</p>
                <EditionList entries={list.filter((e) => e.region === 'world')} />
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export function ArchivePage() {
  useDocumentTitle('Archive');
  const dates = useData<DatesIndex>('indexes/dates.json');
  const companies = useData<CompanyIndex>('indexes/companies.json');
  const days = dates.data?.days ?? [];
  return (
    <div className="pb-6">
      <PageTitle eyebrow="Archive" title="News by date, company and section">
        Browse everything SteelScope has collected. Story pages are kept for 120 days; daily indexes and editions for two years.
      </PageTitle>
      <div className="mt-8 grid gap-12 lg:grid-cols-12">
        <section className="lg:col-span-7" aria-labelledby="by-date">
          <SectionHeader id="by-date" title="By date" heavy />
          {dates.loading ? (
            <LoadingBlock lines={3} />
          ) : days.length ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2">
              {days.map((d, i) => (
                <li key={d.date} className="border-t border-rule">
                  <Link to={`/archive/${d.date}`} className="flex items-baseline justify-between gap-3 py-2.5 pr-4 hover:text-accent">
                    <span className="font-serif text-[17px]">
                      {i === 0 ? 'Latest · ' : i === 1 ? 'Previous · ' : ''}
                      {formatDateShort(d.date)}
                    </span>
                    <span className="meta tabular-nums">
                      {d.india} India · {d.world} World
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dek text-[16px]">No archived days yet.</p>
          )}
        </section>
        <section className="lg:col-span-5" aria-labelledby="by-company">
          <SectionHeader id="by-company" title="By company" heavy />
          {companies.loading ? (
            <LoadingBlock lines={3} />
          ) : companies.data?.companies.length ? (
            <ul>
              {companies.data.companies.map((c) => (
                <li key={c.slug} className="border-t border-rule first:border-t-0">
                  <Link to={`/company/${c.slug}`} className="flex items-baseline justify-between py-2.5 hover:text-accent">
                    <span className="font-serif text-[17px] font-medium">{c.name}</span>
                    <span className="meta tabular-nums">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dek text-[16px]">No company coverage yet.</p>
          )}
          <SectionHeader title="By section" />
          <ul className="flex flex-wrap gap-2">
            {Object.values(CATEGORY_MAP).map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.id}`} className="inline-block border border-rule px-2.5 py-1 font-sans text-[12px] text-ink-2 hover:border-ink hover:text-ink">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function DayPage() {
  const { date = '' } = useParams();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const { data, loading } = useData<DayIndex>(valid ? `days/${date}.json` : null);
  useDocumentTitle(valid ? `Steel news, ${formatDateLong(date)}` : null);
  if (!valid) return <NotFoundPage />;
  return (
    <div className="pb-6">
      <PageTitle eyebrow="Archive" title={formatDateLong(date)}>
        <span>
          All stories collected on this day.{' '}
          <Link to={`/edition/india/${date}`} className="underline underline-offset-2">
            India Edition
          </Link>{' '}
          ·{' '}
          <Link to={`/edition/world/${date}`} className="underline underline-offset-2">
            World Edition
          </Link>
        </span>
      </PageTitle>
      {loading ? (
        <LoadingBlock />
      ) : !data ? (
        <div className="py-8">
          <EmptyState title="Nothing archived for this date" />
        </div>
      ) : (
        <div className="mt-8 grid gap-12 md:grid-cols-2">
          {(['india', 'world'] as Region[]).map((r) => (
            <section key={r}>
              <SectionHeader title={REGION_LABEL[r]} heavy />
              {data[r].length ? (
                <ul>
                  {data[r].map((c) => (
                    <HeadlineRow key={c.id} card={c} />
                  ))}
                </ul>
              ) : (
                <p className="dek text-[16px]">No stories.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompanyPage() {
  const { slug = '' } = useParams();
  const { data, loading } = useData<CompanyIndex>('indexes/companies.json');
  const company = data?.companies.find((c) => c.slug === slug);
  useDocumentTitle(company ? `${company.name} news` : null);
  if (loading) return <LoadingBlock />;
  if (!company) return <NotFoundPage />;
  return (
    <div className="pb-6">
      <PageTitle eyebrow="Company" title={company.name}>
        {company.count} {company.count === 1 ? 'story' : 'stories'} in the archive · latest {formatDateShort(company.latest)}
      </PageTitle>
      <div className="mt-8">
        <StoryGrid cards={company.articles} />
      </div>
    </div>
  );
}
