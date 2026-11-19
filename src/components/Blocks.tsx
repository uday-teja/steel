import { ArrowRight, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateLong, formatDateShort, formatNumber } from '../lib/format';
import { REGION_LABEL } from '../lib/taxonomy';
import type { ArticleCard, EditionIndexEntry, MarketData, MarketIndicator, Region } from '../types/news';

export function rankScore(a: ArticleCard, now: number): number {
  const ageH = Math.max(0, (now - new Date(a.publishedAt).getTime()) / 36e5);
  return a.importance * Math.pow(0.5, ageH / 30);
}

/** Deterministic ranking relative to the newest story (so pre-render and client agree). */
export function rankCards(cards: ArticleCard[]): ArticleCard[] {
  const ref = cards.reduce((m, c) => Math.max(m, new Date(c.publishedAt).getTime()), 0);
  return [...cards].sort((a, b) => rankScore(b, ref) - rankScore(a, ref));
}

export function EditionPromo({ entry, region, tone = 'default' }: { entry?: EditionIndexEntry; region: Region; tone?: 'default' | 'inverse' }) {
  const inverse = tone === 'inverse';
  return (
    <Link
      to={entry ? `/edition/${region}/${entry.date}` : `/edition/${region}`}
      className={`group block border ${inverse ? 'rounded-[6px] border-teal bg-teal text-on-teal' : 'rounded-[6px] border-rule-strong bg-surface'} p-5 sm:p-6`}
    >
      <div className={`flex items-center justify-between border-b pb-2 ${inverse ? 'border-on-teal/25' : 'border-rule'}`}>
        <span className={`kicker ${inverse ? 'text-on-teal/80' : region === 'india' ? 'text-india' : 'text-world'}`}>{REGION_LABEL[region]} Edition</span>
        {entry && <span className={`font-sans text-[11px] tabular-nums ${inverse ? 'text-on-teal/70' : 'text-muted'}`}>No. {entry.number}</span>}
      </div>
      <p className={`mt-3 font-sans text-[12px] ${inverse ? 'text-on-teal/70' : 'text-muted'}`}>{entry ? formatDateLong(entry.date) : 'Not yet published'}</p>
      <h3 className={`mt-1 font-serif text-[22px] font-medium leading-[1.15] sm:text-[24px] ${inverse ? 'text-on-teal' : 'text-ink'}`} style={{ textWrap: 'balance' }}>
        {entry?.headline ?? `The ${REGION_LABEL[region]} Edition will appear after the next scheduled update.`}
      </h3>
      <span className={`mt-4 inline-flex items-center gap-1.5 font-sans text-[13px] font-semibold ${inverse ? 'text-on-teal' : 'text-ink'}`}>
        {entry ? `Read today's ${entry.articleCount} developments` : 'About editions'}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function priceChange(ind: MarketIndicator): { abs: number; pct: number } | null {
  if (!ind.latest || !ind.previous || !ind.previous.value) return null;
  const abs = ind.latest.value - ind.previous.value;
  return { abs, pct: (abs / ind.previous.value) * 100 };
}

export function ChangeBadge({ ind }: { ind: MarketIndicator }) {
  const ch = priceChange(ind);
  if (!ch) return <span className="meta">—</span>;
  const up = ch.abs > 0;
  const flat = ch.abs === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-sans text-[12px] font-semibold tabular-nums ${flat ? 'text-muted' : up ? 'text-positive' : 'text-negative'}`}>
      <Icon size={13} aria-hidden="true" />
      {formatNumber(Math.abs(ch.abs), Math.abs(ch.abs) < 100 ? 2 : 0)} ({ch.pct > 0 ? '+' : ''}
      {ch.pct.toFixed(1)}%)
    </span>
  );
}

export function MarketStrip({ market }: { market?: MarketData }) {
  if (!market) return null;
  const keys = ['in-hrc', 'in-tmt', 'in-crc', 'iron-ore-fines', 'coking-coal', 'scrap-hms'];
  const items = keys.map((k) => market.indicators.find((i) => i.id === k)).filter(Boolean) as MarketIndicator[];
  const anyAvailable = items.some((i) => i.status === 'available');
  return (
    <div>
      <ul className="grid grid-cols-2 border-l border-t border-rule sm:grid-cols-3 lg:grid-cols-6">
        {items.map((ind) => (
          <li key={ind.id} className="border-b border-r border-rule px-3 py-3">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{ind.name}</p>
            {ind.status === 'available' && ind.latest ? (
              <>
                <p className="mt-1 font-serif text-[22px] font-medium tabular-nums leading-none">{formatNumber(ind.latest.value)}</p>
                <p className="mt-1 flex items-center justify-between gap-2">
                  <span className="meta">{ind.unit}</span>
                  <ChangeBadge ind={ind} />
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-serif text-[22px] leading-none text-muted">—</p>
                <p className="meta mt-1">No verified source</p>
              </>
            )}
          </li>
        ))}
      </ul>
      {!anyAvailable && (
        <p className="meta mt-2">
          Verified price feeds are not connected yet; SteelScope never estimates prices.{' '}
          <Link to="/markets" className="underline underline-offset-2 hover:text-ink">
            Why
          </Link>
        </p>
      )}
    </div>
  );
}

export function EditionList({ entries }: { entries: EditionIndexEntry[] }) {
  return (
    <ul>
      {entries.map((e) => (
        <li key={`${e.region}-${e.date}`} className="border-t border-rule first:border-t-0">
          <Link to={`/edition/${e.region}/${e.date}`} className="group grid grid-cols-[5.5rem_1fr] gap-3 py-3">
            <div>
              <p className={`kicker ${e.region === 'india' ? 'text-india' : 'text-world'}`}>{REGION_LABEL[e.region]}</p>
              <p className="meta mt-1 tabular-nums">{formatDateShort(e.date)}</p>
            </div>
            <div className="min-w-0">
              <p className="headline text-[17px] leading-[1.25]">
                <span className="headline-link">{e.headline ?? e.title}</span>
              </p>
              <p className="meta mt-1">
                No. {e.number} · {e.articleCount} stories
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
