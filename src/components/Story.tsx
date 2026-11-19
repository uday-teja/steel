import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDayMonth, formatTime } from '../lib/format';
import { CATEGORY_MAP, REGION_LABEL } from '../lib/taxonomy';
import type { ArticleCard, Region } from '../types/news';

export function articlePath(a: Pick<ArticleCard, 'slug'>): string {
  return `/article/${a.slug}`;
}

export function RegionTag({ region, className = '' }: { region: Region; className?: string }) {
  return <span className={`kicker ${region === 'india' ? 'text-india' : 'text-world'} ${className}`}>{REGION_LABEL[region]}</span>;
}

export function Kicker({ card, showRegion = true }: { card: ArticleCard; showRegion?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {showRegion && <RegionTag region={card.region} />}
      {showRegion && <span className="text-rule" aria-hidden="true">/</span>}
      <Link to={`/category/${card.primaryCategory}`} className="kicker relative z-10 text-muted hover:text-ink">
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

/** Front-page lead story: text-led, large headline and standfirst (no imagery by design). */
export function LeadStory({ card, compact = false }: { card: ArticleCard; compact?: boolean }) {
  return (
    <article className="group relative transition-opacity active:opacity-80">
      <Kicker card={card} />
      <h2 className={`headline mt-3 ${compact ? 'text-[30px] leading-[1.08] sm:text-[38px]' : 'text-[34px] leading-[1.04] sm:text-[48px] lg:text-[58px]'}`}>
        <Link to={articlePath(card)} className="after:absolute after:inset-0">
          <span className="headline-link">{card.title}</span>
        </Link>
      </h2>
      {card.dek && <p className={`dek mt-4 max-w-3xl leading-[1.5] ${compact ? 'text-[18px] sm:text-[20px]' : 'text-[19px] sm:text-[22px]'}`}>{card.dek}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Meta card={card} />
        {card.aiSummary && <AiMark />}
      </div>
    </article>
  );
}

/**
 * Standard story. `image` is kept for call-site compatibility and now only
 * controls emphasis: `true` shows a fuller standfirst, `'side'` a compact one.
 */
export function StoryItem({ card, image = false, dek = true, showRegion = true, size = 'md' }: { card: ArticleCard; image?: boolean | 'side'; dek?: boolean; showRegion?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 'text-[24px] leading-[1.15] sm:text-[26px]' : size === 'sm' ? 'text-[17px] leading-[1.25]' : 'text-[20px] leading-[1.2]';
  const clamp = image === 'side' ? 'line-clamp-2 text-[15px] leading-[1.45] mt-1.5' : image ? 'line-clamp-4 text-[16px] leading-[1.5] mt-2' : 'line-clamp-3 text-[16px] leading-[1.5] mt-2';
  return (
    <article className="relative transition-opacity active:opacity-70">
      <Kicker card={card} showRegion={showRegion} />
      <h3 className={`headline mt-1.5 ${h}`}>
        <Link to={articlePath(card)} className="after:absolute after:inset-0">
          <span className="headline-link">{card.title}</span>
        </Link>
      </h3>
      {dek && card.dek && <p className={`dek ${clamp}`}>{card.dek}</p>}
      <div className="mt-2">
        <Meta card={card} />
      </div>
    </article>
  );
}

export function NumberedItem({ card, n }: { card: ArticleCard; n: number }) {
  return (
    <li className="relative grid grid-cols-[2rem_1fr] gap-2 border-t border-rule py-3 transition-opacity first:border-t-0 first:pt-0 active:opacity-70">
      <span className="font-serif text-[26px] font-medium leading-none text-accent tabular-nums">{n}</span>
      <div className="min-w-0">
        <h3 className="headline text-[17px] leading-[1.25]">
          <Link to={articlePath(card)} className="after:absolute after:inset-0">
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
    <li className="relative grid grid-cols-[4.25rem_1fr] gap-3 border-t border-rule py-3 transition-opacity first:border-t-0 active:opacity-70">
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
          <Link to={articlePath(card)} className="after:absolute after:inset-0">
            <span className="headline-link">{card.title}</span>
          </Link>
        </h3>
        <p className="meta mt-1">{card.publisher}</p>
      </div>
    </li>
  );
}
