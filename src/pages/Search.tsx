import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LoadingBlock, SectionHeader, useDocumentTitle } from '../components/Common';
import { HeadlineRow } from '../components/Story';
import { useData } from '../lib/data';
import { CATEGORIES, CATEGORY_MAP, REGION_LABEL } from '../lib/taxonomy';
import type { CompanyIndex, LatestFeed } from '../types/news';

const SUGGESTIONS = ['Tata Steel', 'JSW Steel', 'iron ore', 'anti-dumping', 'TMT', 'HR coil', 'green steel', 'China', 'tariffs', 'coking coal'];

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function SearchPage() {
  useDocumentTitle('Search');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const latest = useData<LatestFeed>('latest.json');
  const companies = useData<CompanyIndex>('indexes/companies.json');

  useEffect(() => {
    setQ(params.get('q') ?? '');
    input.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setParams(q.trim() ? { q: q.trim() } : {}, { replace: true }), 250);
    return () => clearTimeout(t);
  }, [q, setParams]);

  const terms = norm(q).split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    if (!terms.length || !latest.data) return [];
    const all = [...latest.data.india, ...latest.data.world];
    return all
      .map((c) => {
        const title = norm(c.title);
        const hay = `${title} ${norm(c.dek)} ${norm(c.publisher)} ${norm(c.companies.join(' '))} ${norm(c.categories.map((x) => CATEGORY_MAP[x].label).join(' '))} ${norm(REGION_LABEL[c.region])}`;
        if (!terms.every((t) => hay.includes(t))) return null;
        const score = terms.filter((t) => title.includes(t)).length * 3 + c.importance / 50;
        return { c, score };
      })
      .filter((x): x is { c: (typeof latest.data.india)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score || b.c.publishedAt.localeCompare(a.c.publishedAt))
      .slice(0, 60)
      .map((x) => x.c);
  }, [terms.join(' '), latest.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const companyHits = terms.length ? (companies.data?.companies ?? []).filter((co) => terms.every((t) => norm(co.name).includes(t))).slice(0, 6) : [];
  const sectionHits = terms.length ? CATEGORIES.filter((c) => terms.every((t) => norm(`${c.label} ${c.description}`).includes(t))).slice(0, 4) : [];

  return (
    <div className="mx-auto max-w-3xl pb-6 pt-6 sm:pt-10">
      <h1 className="sr-only">Search SteelScope</h1>
      <label className="flex items-center gap-3 border-b-2 border-rule-strong pb-2">
        <SearchIcon size={22} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, products, topics…"
          aria-label="Search stories"
          className="w-full bg-transparent font-serif text-[24px] text-ink outline-none placeholder:text-muted sm:text-[30px]"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="shrink-0 p-1 text-muted hover:text-ink" aria-label="Clear search">
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </label>

      {!terms.length ? (
        <div className="mt-8">
          <p className="kicker text-muted">Try</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => setQ(s)} className="border border-rule px-3 py-1.5 font-sans text-[14px] text-ink-2 hover:border-ink hover:text-ink">
                  {s}
                </button>
              </li>
            ))}
          </ul>
          <p className="meta mt-6">
            Search covers the past seven days. For older coverage, browse the{' '}
            <Link to="/archive" className="underline underline-offset-2">
              archive
            </Link>
            .
          </p>
        </div>
      ) : latest.loading ? (
        <LoadingBlock lines={4} />
      ) : (
        <div className="mt-6">
          {(companyHits.length > 0 || sectionHits.length > 0) && (
            <div className="mb-6 flex flex-wrap gap-2">
              {companyHits.map((co) => (
                <Link key={co.slug} to={`/company/${co.slug}`} className="border border-ink px-3 py-1.5 font-sans text-[13px] font-semibold text-ink rounded-[4px] hover:bg-teal hover:text-on-teal hover:border-teal">
                  {co.name} · {co.count}
                </Link>
              ))}
              {sectionHits.map((c) => (
                <Link key={c.id} to={`/category/${c.id}`} className="border border-rule px-3 py-1.5 font-sans text-[13px] text-ink-2 hover:border-ink hover:text-ink">
                  Section: {c.label}
                </Link>
              ))}
            </div>
          )}
          <SectionHeader title={`${results.length} ${results.length === 1 ? 'story' : 'stories'}`} />
          {results.length ? (
            <ul aria-live="polite">
              {results.map((c) => (
                <HeadlineRow key={c.id} card={c} />
              ))}
            </ul>
          ) : (
            <p className="dek text-[17px]">
              No stories this week match “{q.trim()}”. Try a company name or a product such as “HR coil”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
