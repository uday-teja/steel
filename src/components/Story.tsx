import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coverSvg } from '../lib/cover';
import { formatDayMonth, formatTime } from '../lib/format';
import { CATEGORY_MAP, REGION_LABEL } from '../lib/taxonomy';
import type { ArticleCard, Region } from '../types/news';

export function articlePath(a: Pick<ArticleCard, 'slug'>): string {
  return `/article/${a.slug}`;
}

export function Cover({ card, className = '', priority = false }: { card: Pick<ArticleCard, 'id' | 'primaryCategory' | 'region'>; className?: string; priority?: boolean }) {
  return (
    <div
      className={`cover relative overflow-hidden bg-[#171a1e] ${className}`}
      data-priority={priority || undefined}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: coverSvg({ seed: card.id, category: card.primaryCategory, region: card.region, idPrefix: 'g' }) }}
    />
  );
}

export function RegionTag({ region, className = '' }: { region: Region; className?: string }) {
  return <span className={`kicker ${region === 'india' ? 'text-india' : 'text-world'} ${className}`}>{REGION_LABEL[region]}</span>;
}

export function Kicker({ card, showRegion = true }: { card: ArticleCard; showRegion?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {showRegion && <RegionTag region={card.region} />}
      {showRegion && <span className="text-rule" aria-hidden="true">/</span>}
      <Link to={`/category/${card.primaryCategory}`} className="kicker text-muted hover:text-ink">
        {CATEGORY_MAP[card.primaryCategory]?.label}
      </Link>
    </div>
  );
}

export function Meta({ card, withDate = false }: { card: ArticleCard; withDate?: boolean }) {
  return (
    <p className="meta">
      <span className="font-medium text-ink-2">{card.publisher}</span>
      <span aria-hidden="true"> · </span>
      <time dateTime={card.publishedAt}>{withDate ? `${formatDayMonth(card.publishedAt)}, ` : ''}{formatTime(card.publishedAt)}</time>
    </p>
  );
}

export function AiMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-muted ${className}`} title="Summary written by AI from the publisher's headline and excerpt">
      <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
      AI summary
    </span>
  );
}

/** Front-page lead story: large cover, big headline, standfirst. */
export function LeadStory({ card, compact = false }: { card: ArticleCard; compact?: boolean }) {
  return (
    <article className="group">
      <Link to={articlePath(card)} className="block">
        <Cover card={card} className="aspect-[16/9] w-full" priority />
      </Link>
      <div className="mt-4">
        <Kicker card={card} />
        <h2 className={`headline mt-2 ${compact ? 'text-[28px] leading-[1.1] sm:text-[34px]' : 'text-[30px] leading-[1.08] sm:text-[40px] lg:text-[46px]'}`}>
          <Link to={articlePath(card)}>
            <span className="headline-link">{card.title}</span>
          </Link>
        </h2>
        {card.dek && <p className="dek mt-3 text-[18px] leading-[1.5] sm:text-[20px]">{card.dek}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Meta card={card} />
          {card.aiSummary && <AiMark />}
        </div>
      </div>
    </article>
  );
}

/** Standard story with optional thumbnail. */
export function StoryItem({ card, image = false, dek = true, showRegion = true, size = 'md' }: { card: ArticleCard; image?: boolean | 'side'; dek?: boolean; showRegion?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 'text-[24px] leading-[1.15]' : size === 'sm' ? 'text-[17px] leading-[1.25]' : 'text-[20px] leading-[1.2]';
  if (image === 'side') {
    return (
      <article className="grid grid-cols-[1fr_96px] gap-4 sm:grid-cols-[1fr_140px]">
        <div className="min-w-0">
          <Kicker card={card} showRegion={showRegion} />
          <h3 className={`headline mt-1.5 ${h}`}>
            <Link to={articlePath(card)}>
              <span className="headline-link">{card.title}</span>
            </Link>
          </h3>
          {dek && card.dek && <p className="dek mt-1.5 line-clamp-2 text-[15px] leading-[1.45]">{card.dek}</p>}
          <div className="mt-2">
            <Meta card={card} />
          </div>
        </div>
        <Link to={articlePath(card)} tabIndex={-1} aria-hidden="true">
          <Cover card={card} className="aspect-square w-full sm:aspect-[4/3]" />
        </Link>
      </article>
    );
  }
  return (
    <article>
      {image && (
        <Link to={articlePath(card)} tabIndex={-1} aria-hidden="true" className="mb-3 block">
          <Cover card={card} className="aspect-[16/9] w-full" />
        </Link>
      )}
      <Kicker card={card} showRegion={showRegion} />
      <h3 className={`headline mt-1.5 ${h}`}>
        <Link to={articlePath(card)}>
          <span className="headline-link">{card.title}</span>
        </Link>
      </h3>
      {dek && card.dek && <p className="dek mt-2 line-clamp-3 text-[16px] leading-[1.5]">{card.dek}</p>}
      <div className="mt-2">
        <Meta card={card} />
      </div>
    </article>
  );
}

export function NumberedItem({ card, n }: { card: ArticleCard; n: number }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-2 border-t border-rule py-3 first:border-t-0 first:pt-0">
      <span className="font-serif text-[26px] font-semibold leading-none text-accent tabular-nums">{n}</span>
      <div className="min-w-0">
        <h3 className="headline text-[17px] leading-[1.25]">
          <Link to={articlePath(card)}>
            <span className="headline-link">{card.title}</span>
          </Link>
        </h3>
        <p className="meta mt-1">
          <RegionTag region={card.region} className="mr-1.5 !text-[10px]" />
          {card.publisher}
        </p>
      </div>
    </li>
  );
}

export function HeadlineRow({ card, showTime = true }: { card: ArticleCard; showTime?: boolean }) {
  return (
    <li className="grid grid-cols-[4.25rem_1fr] gap-3 border-t border-rule py-3 first:border-t-0">
      {showTime ? (
        <time className="meta pt-0.5 tabular-nums" dateTime={card.publishedAt}>
          {formatTime(card.publishedAt).replace(' IST', '')}
          <span className="block text-[11px]">{formatDayMonth(card.publishedAt)}</span>
        </time>
      ) : (
        <span />
      )}
      <div className="min-w-0">
        <Kicker card={card} />
        <h3 className="headline mt-1 text-[17px] leading-[1.25]">
          <Link to={articlePath(card)}>
            <span className="headline-link">{card.title}</span>
          </Link>
        </h3>
        <p className="meta mt-1">{card.publisher}</p>
      </div>
    </li>
  );
}
