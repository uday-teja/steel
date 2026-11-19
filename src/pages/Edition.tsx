import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { EmptyState, LoadingBlock, SectionHeader, useDocumentTitle } from '../components/Common';
import { ShareBar } from '../components/ShareBar';
import { AiMark, articlePath, LeadStory, StoryItem } from '../components/Story';
import { useData } from '../lib/data';
import { formatDateLong, formatTime } from '../lib/format';
import { absoluteUrl, shareImageUrl, SITE } from '../lib/site';
import { REGION_LABEL } from '../lib/taxonomy';
import type { Edition, EditionIndex, Region } from '../types/news';

function isRegion(r: string | undefined): r is Region {
  return r === 'india' || r === 'world';
}

export function LatestEditionRedirect() {
  const { region } = useParams();
  const { data, loading } = useData<EditionIndex>('editions/index.json');
  if (!isRegion(region)) return <Navigate to="/editions" replace />;
  if (loading) return <LoadingBlock />;
  const latest = data?.editions.find((e) => e.region === region);
  if (!latest) {
    return (
      <div className="py-10">
        <EmptyState title={`No ${REGION_LABEL[region]} Edition yet`}>
          <p>The first edition is published after the next scheduled collection run.</p>
        </EmptyState>
      </div>
    );
  }
  return <Navigate to={`/edition/${region}/${latest.date}`} replace />;
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-[14px] italic leading-relaxed text-muted">{children}</p>;
}

export function EditionPage() {
  const { region, date = '' } = useParams();
  const valid = isRegion(region) && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const { data: e, loading } = useData<Edition>(valid ? `editions/${region}/${date}.json` : null);
  const index = useData<EditionIndex>('editions/index.json');
  useDocumentTitle(e ? `${REGION_LABEL[e.region]} Edition, ${formatDateLong(e.date)}` : null);

  if (!valid) return <Navigate to="/editions" replace />;
  if (loading) return <LoadingBlock />;
  if (!e) {
    return (
      <div className="py-10">
        <EmptyState title="Edition not found" icon="alert">
          <p>
            There is no {REGION_LABEL[region]} Edition for {formatDateLong(date)}.{' '}
            <Link to="/editions" className="underline underline-offset-2">
              Browse all editions
            </Link>
            .
          </p>
        </EmptyState>
      </div>
    );
  }

  const same = (index.data?.editions ?? []).filter((x) => x.region === e.region);
  const pos = same.findIndex((x) => x.date === e.date);
  const newer = pos > 0 ? same[pos - 1] : null;
  const older = pos >= 0 && pos < same.length - 1 ? same[pos + 1] : null;
  const url = absoluteUrl(`/edition/${e.region}/${e.date}`);
  const regionColor = e.region === 'india' ? 'text-india' : 'text-world';

  return (
    <article className="mx-auto max-w-[1080px] pb-6">
      {/* Edition masthead */}
      <header className="pt-8 text-center sm:pt-12">
        <p className={`kicker ${regionColor}`}>Daily Steel Intelligence</p>
        <h1 className="mt-2 font-serif text-[40px] font-bold leading-none tracking-[-0.02em] sm:text-[64px]">
          {REGION_LABEL[e.region]} Edition
        </h1>
        <div className="rule-double mt-5" />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b border-rule py-2 font-sans text-[12px] uppercase tracking-[0.08em] text-ink-2">
          <span>No. {e.number}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={e.date}>{formatDateLong(e.date)}</time>
          <span aria-hidden="true">·</span>
          <span>
            {e.articleCount} developments · {e.sources.length} publishers
          </span>
        </div>
        <p className="meta mt-2">Updated {formatTime(e.updatedAt)}</p>
      </header>

      <section className="mx-auto mt-8 max-w-[720px]">
        <h2 className="headline text-center text-[28px] leading-[1.12] sm:text-[38px]">{e.title}</h2>
        <div className="mt-6">
          {e.introIsAi ? <AiMark /> : <p className="kicker text-muted">Editor's note (automated)</p>}
          <div className="prose-article mt-2">
            <p className="drop-cap">{e.intro}</p>
          </div>
        </div>
      </section>

      {e.featured && (
        <section className="mt-10 border-t-2 border-rule-strong pt-6" aria-label="Featured story">
          <p className="kicker mb-3 text-accent">Featured</p>
          <LeadStory card={e.featured} compact />
        </section>
      )}

      {e.topStories.length > 0 && (
        <section className="mt-12" aria-labelledby="top10-h">
          <SectionHeader id="top10-h" title={e.region === 'india' ? 'Top developments' : 'Global top stories'} heavy />
          <ol className="grid gap-x-10 md:grid-cols-2">
            {e.topStories.map((c, i) => (
              <li key={c.id} className="grid grid-cols-[2.25rem_1fr] gap-2 border-t border-rule py-4">
                <span className="font-serif text-[28px] font-semibold leading-none text-accent tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="headline text-[18px] leading-[1.25]">
                    <Link to={articlePath(c)}>
                      <span className="headline-link">{c.title}</span>
                    </Link>
                  </h3>
                  {c.dek && <p className="dek mt-1.5 line-clamp-3 text-[15px] leading-[1.45]">{c.dek}</p>}
                  <p className="meta mt-1.5">
                    {c.publisher} ·{' '}
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline">
                      Source <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-12 grid gap-8 border-y-2 border-rule-strong bg-paper-2 px-5 py-6 sm:px-8 md:grid-cols-[200px_1fr]">
        <div>
          <h2 className="font-serif text-[24px] font-semibold leading-tight">{e.region === 'india' ? 'Market overview' : 'Global market outlook'}</h2>
          {e.marketOverview && <AiMark className="mt-2" />}
        </div>
        <div className="prose-article">
          {e.marketOverview ? (
            <p>{e.marketOverview}</p>
          ) : (
            <Unavailable>A market overview is not available for this edition. It is written only when AI processing is enabled and today's reports contain enough market detail. SteelScope does not estimate prices.</Unavailable>
          )}
        </div>
      </section>

      <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-2">
        {e.sections.map((s) => (
          <section key={s.id} aria-labelledby={`sec-${s.id}`}>
            <SectionHeader id={`sec-${s.id}`} title={s.title} />
            {s.articles.length === 0 ? (
              <Unavailable>No {s.title.toLowerCase()} developments were reported in today's sources.</Unavailable>
            ) : (
              <>
                {s.summary && (
                  <div className="mb-4">
                    <p className="font-serif text-[17px] leading-[1.6] text-ink">{s.summary}</p>
                  </div>
                )}
                <ul>
                  {s.articles.map((c) => (
                    <li key={c.id} className="border-t border-rule py-3.5 first:border-t-0 first:pt-0">
                      <StoryItem card={c} image="side" dek={!s.summary} showRegion={false} size="sm" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>

      <section className="mx-auto mt-14 max-w-[720px]" aria-labelledby="analysis-h">
        <SectionHeader id="analysis-h" title="Industry analysis" heavy />
        {e.analysis ? (
          <>
            <AiMark />
            <div className="prose-article mt-2">
              {e.analysis.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </>
        ) : (
          <Unavailable>Industry analysis is not available for this edition (AI processing was not enabled or did not complete).</Unavailable>
        )}
      </section>

      <section className="mx-auto mt-10 max-w-[720px]" aria-labelledby="watch-h">
        <SectionHeader id="watch-h" title="What to watch next" />
        {e.watchNext.length ? (
          <ul className="space-y-3">
            {e.watchNext.map((w, i) => (
              <li key={i} className="grid grid-cols-[1.25rem_1fr] font-serif text-[18px] leading-[1.5]">
                <span className="text-accent" aria-hidden="true">→</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable>Not available for this edition.</Unavailable>
        )}
      </section>

      <section className="mx-auto mt-12 max-w-[720px] border-t border-rule pt-6">
        <ShareBar url={url} title={`${SITE.name} ${REGION_LABEL[e.region]} Edition — ${formatDateLong(e.date)}: ${e.title}`} imageUrl={shareImageUrl('edition', `${e.region}-${e.date}`)} label="Share this edition" />
        <div className="mt-8">
          <p className="kicker text-muted">Sources in this edition</p>
          <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-2">{e.sources.map((s) => `${s.name} (${s.count})`).join(' · ')}</p>
          <p className="meta mt-3 leading-relaxed">
            {e.ai ? `Edition text marked “AI summary” was generated by ${e.ai.model} from publisher headlines and excerpts. ` : ''}
            All headlines and excerpts belong to their publishers. Follow each story's source link for the original report.
          </p>
        </div>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-4 border-t-2 border-rule-strong pt-4 font-sans text-[13px]" aria-label="Edition navigation">
        <div>
          {older && (
            <Link to={`/edition/${older.region}/${older.date}`} className="group inline-flex items-start gap-1 text-ink-2 hover:text-ink">
              <ChevronLeft size={16} className="mt-0.5" aria-hidden="true" />
              <span>
                <span className="block text-muted">Previous</span>
                {formatDateLong(older.date)}
              </span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {newer && (
            <Link to={`/edition/${newer.region}/${newer.date}`} className="group inline-flex items-start gap-1 text-ink-2 hover:text-ink">
              <span>
                <span className="block text-muted">Next</span>
                {formatDateLong(newer.date)}
              </span>
              <ChevronRight size={16} className="mt-0.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
