import { ExternalLink, Info } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState, LoadingBlock, SectionHeader, useDocumentTitle } from '../components/Common';
import { ShareBar } from '../components/ShareBar';
import { AiMark, Cover, Kicker, StoryItem } from '../components/Story';
import { useData } from '../lib/data';
import { formatDateLong, formatDateTime, formatTime } from '../lib/format';
import { absoluteUrl, shareImageUrl } from '../lib/site';
import { CATEGORY_MAP, COMPANY_BY_NAME, GEO_LABEL } from '../lib/taxonomy';
import type { Article } from '../types/news';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export function ArticlePage() {
  const { slug = '' } = useParams();
  const { data: a, loading, error } = useData<Article>(`articles/${slug}.json`);
  useDocumentTitle(a?.title ?? (error ? 'Story not found' : null));

  if (loading) return <LoadingBlock />;
  if (!a) {
    return (
      <div className="py-10">
        <EmptyState title="This story is no longer available" icon="alert">
          <p>
            Article pages are kept for a limited period. Browse the{' '}
            <Link to="/editions" className="underline underline-offset-2">
              edition archive
            </Link>{' '}
            or the{' '}
            <Link to="/latest" className="underline underline-offset-2">
              latest news
            </Link>
            .
          </p>
        </EmptyState>
      </div>
    );
  }

  const url = absoluteUrl(`/article/${a.slug}`);
  const hasAi = Boolean(a.ai && (a.summary || a.whyItMatters || a.implications));

  return (
    <article className="pb-6">
      <div className="mx-auto max-w-[760px] pt-6 sm:pt-10">
        <Kicker card={a} />
        <h1 className="headline mt-3 text-[32px] leading-[1.08] sm:text-[44px] lg:text-[50px]">{a.title}</h1>
        {a.dek && <p className="dek mt-4 text-[19px] leading-[1.5] sm:text-[22px]">{a.dek}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-rule py-3 font-sans text-[13px] text-muted">
          <span>
            Source: <span className="font-semibold text-ink">{a.publisher}</span>
          </span>
          <span>
            Published <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt)}</time>
          </span>
          <span className="hidden sm:inline">
            In the{' '}
            <Link to={`/edition/${a.region}/${a.editionDate}`} className="underline underline-offset-2 hover:text-ink">
              {formatDateLong(a.editionDate)} edition
            </Link>
          </span>
        </div>
      </div>

      <figure className="mx-auto mt-6 max-w-[1040px]">
        <Cover card={a} className="aspect-[16/9] w-full" priority />
        <figcaption className="meta mt-2 px-0">
          Illustration: SteelScope ({CATEGORY_MAP[a.primaryCategory].label}). SteelScope does not republish publishers' photographs.
        </figcaption>
      </figure>

      <div className="mx-auto max-w-[760px]">
        <div className="mt-6">
          <ShareBar url={url} title={a.title} text={a.dek || undefined} imageUrl={shareImageUrl('article', a.slug)} />
        </div>

        {hasAi ? (
          <div className="mt-8 border-l-2 border-accent pl-5">
            <div className="flex items-center justify-between gap-3">
              <AiMark />
            </div>
            {a.summary && (
              <div className="prose-article mt-3">
                <p>{a.summary}</p>
              </div>
            )}
          </div>
        ) : null}

        {a.keyFacts.length > 0 && (
          <Block title="Key facts">
            <ul className="space-y-2.5">
              {a.keyFacts.map((f, i) => (
                <li key={i} className="grid grid-cols-[1rem_1fr] font-serif text-[18px] leading-[1.5]">
                  <span className="mt-[0.6em] h-1.5 w-1.5 bg-accent" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {a.whyItMatters && (
          <Block title="Why this matters">
            <div className="prose-article">
              <p>{a.whyItMatters}</p>
            </div>
          </Block>
        )}

        {a.implications && (
          <Block title="Industry implications">
            <div className="prose-article">
              <p>{a.implications}</p>
            </div>
          </Block>
        )}

        {a.publisherExcerpt && (
          <Block title={`From ${a.publisher}`}>
            <blockquote className="border-l border-rule pl-5 font-serif text-[18px] italic leading-[1.6] text-ink-2">“{a.publisherExcerpt}”</blockquote>
            <p className="meta mt-2">Excerpt as published in {a.publisher}’s feed.</p>
          </Block>
        )}

        {!hasAi && !a.publisherExcerpt && (
          <div className="mt-8 flex gap-3 border border-rule bg-paper-2 p-4 font-sans text-[14px] leading-relaxed text-ink-2">
            <Info size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
            <p>The publisher's feed provided a headline only, and no AI summary is available for this story. Read the full report at the source.</p>
          </div>
        )}

        <div className="mt-8">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-sans text-[14px] font-semibold text-paper hover:bg-accent">
            Read the full story at {a.publisher}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>

        <div className="mt-8 space-y-3 border-t border-rule pt-5">
          <div className="flex flex-wrap gap-2">
            {a.categories.map((c) => (
              <Link key={c} to={`/category/${c}`} className="border border-rule px-2.5 py-1 font-sans text-[12px] text-ink-2 hover:border-ink hover:text-ink">
                {CATEGORY_MAP[c].label}
              </Link>
            ))}
            {a.companies.map((c) => (
              <Link key={c} to={`/company/${COMPANY_BY_NAME[c]?.slug ?? encodeURIComponent(c)}`} className="border border-rule px-2.5 py-1 font-sans text-[12px] font-medium text-ink hover:border-ink">
                {c}
              </Link>
            ))}
            {a.geo
              .filter((g) => g !== 'global')
              .map((g) => (
                <span key={g} className="px-1 py-1 font-sans text-[12px] text-muted">
                  {GEO_LABEL[g]}
                </span>
              ))}
          </div>
          <p className="meta leading-relaxed">
            {a.ai ? (
              <>
                AI-generated text above was written by {a.ai.model} ({a.ai.provider}) at {formatTime(a.ai.generatedAt)} on {formatDateLong(a.ai.generatedAt)}, using only the publisher's headline and excerpt. It may contain errors and is not a substitute for the original reporting. Figures not present in the source material are automatically removed.
              </>
            ) : (
              <>This story was collected automatically from {a.publisher}'s public feed. No AI-generated text appears on this page.</>
            )}
          </p>
        </div>
      </div>

      {a.related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-h">
          <SectionHeader id="related-h" title="Related coverage" heavy />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {a.related.map((r) => (
              <StoryItem key={r.id} card={r} image />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
