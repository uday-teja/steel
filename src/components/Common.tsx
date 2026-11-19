import { AlertTriangle, ArrowRight, Inbox } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../lib/site';

export function SectionHeader({ title, href, linkLabel = 'More', children, heavy = false, id }: { title: string; href?: string; linkLabel?: string; children?: ReactNode; heavy?: boolean; id?: string }) {
  return (
    <div className={`${heavy ? 'rule-heavy' : 'border-t border-rule-strong'} mb-5 flex items-baseline justify-between gap-4 pt-2.5`}>
      <h2 id={id} className="font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-ink">
        {title}
      </h2>
      <div className="flex items-center gap-4">
        {children}
        {href && (
          <Link to={href} className="group inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-muted hover:text-ink">
            {linkLabel}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, icon = 'inbox' }: { title: string; children?: ReactNode; icon?: 'inbox' | 'alert' }) {
  const Icon = icon === 'alert' ? AlertTriangle : Inbox;
  return (
    <div className="border-y border-rule py-10 text-center">
      <Icon className="mx-auto text-muted" size={22} strokeWidth={1.5} aria-hidden="true" />
      <p className="headline mt-3 text-[22px]">{title}</p>
      {children && <div className="dek mx-auto mt-2 max-w-xl text-[16px] leading-[1.55]">{children}</div>}
    </div>
  );
}

export function LoadingBlock({ lines = 6 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-4 py-6" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-4/5 bg-paper-2" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 bg-paper-2" style={{ width: `${90 - ((i * 13) % 40)}%` }} />
      ))}
    </div>
  );
}

export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (title) document.title = `${title} | ${SITE.name}`;
    else document.title = `${SITE.name} — ${SITE.tagline}`;
  }, [title]);
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-rule pb-6 pt-6 sm:pt-10">
      {eyebrow && <div className="kicker mb-2 text-accent">{eyebrow}</div>}
      <h1 className="headline text-[34px] leading-[1.05] sm:text-[48px]">{title}</h1>
      {children && <div className="dek mt-3 max-w-3xl text-[17px] leading-[1.55] sm:text-[19px]">{children}</div>}
    </header>
  );
}
