import { ArrowUpRight, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatDateLong, formatTime } from '../lib/format';
import { SITE } from '../lib/site';
import type { EditionIndex, SiteMeta } from '../types/news';

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('ss-theme', next);
  } catch {
    /* storage unavailable */
  }
}

function ThemeToggle({ className = '' }: { className?: string }) {
  return (
    <button type="button" onClick={toggleTheme} className={`inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-ink-2 hover:bg-paper-2 hover:text-ink ${className}`} aria-label="Toggle dark mode">
      <Moon size={17} strokeWidth={1.75} className="dark:hidden" aria-hidden="true" />
      <Sun size={17} strokeWidth={1.75} className="hidden dark:block" aria-hidden="true" />
    </button>
  );
}

export function Wordmark({ className = 'text-[24px] sm:text-[28px]', tagline = false }: { className?: string; tagline?: boolean }) {
  return (
    <Link to="/" className="inline-block leading-none" aria-label={`${SITE.name} home`}>
      <span className={`font-serif font-semibold tracking-[-0.03em] text-ink ${className}`}>
        SteelScope<span className="text-accent">•</span>
      </span>
      {tagline && <span className="mt-1.5 block whitespace-nowrap font-sans text-[9px] font-medium uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.16em]">Intelligence for the steel industry</span>}
    </Link>
  );
}

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/india', label: 'India' },
  { to: '/world', label: 'World' },
  { to: '/markets', label: 'Markets' },
  { to: '/editions', label: 'Daily editions' },
  { to: '/archive', label: 'Archive' },
];

function useEditionsLink(): string {
  const { data } = useData<EditionIndex>('editions/index.json');
  const india = data?.editions.find((e) => e.region === 'india');
  return india ? `/edition/india/${india.date}` : '/editions';
}

/** Search looks like an input but opens the search page; ⌘K / Ctrl+K works anywhere. */
function SearchBox({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  return (
    <Link to="/search" className={`flex h-11 items-center gap-2.5 rounded-[4px] border border-rule-strong bg-surface px-3.5 font-sans text-[13px] text-muted transition-colors hover:border-ink-2 ${className}`}>
      <Search size={15} strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1 truncate">Search news, companies or topics</span>
      <kbd className="hidden font-sans text-[11px] text-muted sm:inline">⌘K</kbd>
    </Link>
  );
}

/** Compact bar that slides in when the reader scrolls back up past the masthead. */
function useCompactBar(): boolean {
  const [show, setShow] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last.current;
      if (y < 220) setShow(false);
      else if (dy < -6) setShow(true);
      else if (dy > 6) setShow(false);
      last.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return show;
}

function navClass(isActive: boolean, mobile = false): string {
  const base = mobile ? 'block py-2.5 font-sans text-[14px]' : 'relative inline-block py-4 font-sans text-[14px]';
  const active = mobile
    ? 'font-semibold text-accent underline decoration-2 underline-offset-[10px]'
    : "font-semibold text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-accent after:content-['']";
  return `${base} ${isActive ? active : 'font-medium text-ink hover:text-accent'}`;
}

const SECTION_MATCH: Record<string, (p: string) => boolean> = {
  '/editions': (p) => p.startsWith('/edition') || p.startsWith('/weekly'),
  '/archive': (p) => p.startsWith('/archive') || p.startsWith('/company'),
  '/latest': (p) => p.startsWith('/latest') || p.startsWith('/category'),
};

function Masthead() {
  const editions = useEditionsLink();
  const { pathname } = useLocation();
  const on = (to: string, isActive: boolean) => isActive || (SECTION_MATCH[to]?.(pathname) ?? false);
  const compact = useCompactBar();
  return (
    <header className="no-print">
      {/* Compact bar on scroll-up */}
      <div className={`fixed inset-x-0 top-0 z-50 border-b border-rule bg-paper/95 backdrop-blur transition-transform duration-200 supports-[backdrop-filter]:bg-paper/85 ${compact ? 'translate-y-0' : '-translate-y-full'}`} aria-hidden={!compact}>
        <div className="wrap flex h-14 items-center justify-between gap-4">
          <Wordmark className="text-[22px]" />
          <div className="flex items-center gap-2">
            <Link to="/search" tabIndex={compact ? 0 : -1} className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-ink-2 hover:bg-paper-2" aria-label="Search">
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link to={editions} tabIndex={compact ? 0 : -1} className="btn-teal h-9 px-3.5 text-[12px]">
              Editions <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Top row */}
      <div className="wrap flex items-center justify-between gap-6 py-5 sm:py-7">
        <Wordmark tagline />
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchBox className="hidden w-[300px] md:flex" />
          <Link to={editions} className="btn-teal h-10 sm:h-11">
            <span className="hidden sm:inline">Today's editions</span>
            <span className="sm:hidden">Editions</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <span className="hidden md:block">
            <ThemeToggle />
          </span>
        </div>
      </div>
      <div className="wrap pb-3 md:hidden">
        <SearchBox />
      </div>

      {/* Navigation */}
      <nav className="border-y border-rule" aria-label="Primary">
        <div className="wrap">
          <ul className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => navClass(on(n.to, isActive))}>
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li className="ml-auto">
              <Link to="/about" className="inline-flex items-center gap-1 font-sans text-[12px] text-muted hover:text-ink">
                About SteelScope <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </li>
          </ul>
          <ul className="grid grid-cols-3 gap-x-4 py-1.5 md:hidden">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => navClass(on(n.to, isActive), true)}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}

function Footer({ meta }: { meta?: SiteMeta }) {
  const links = [
    { to: '/about', label: 'About & methodology' },
    { to: '/about#ai', label: 'AI policy' },
    { href: `${import.meta.env.BASE_URL}feed.xml`, label: 'RSS feed' },
    { to: '/archive', label: 'Archive' },
    { to: '/status', label: 'Status' },
  ];
  return (
    <footer className="no-print mt-16 border-t border-rule">
      <div className="wrap py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Wordmark className="text-[24px]" />
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[13px] text-ink-2">
            {links.map((l) => (
              <li key={l.label}>
                {'href' in l ? (
                  <a href={l.href} className="hover:text-ink">
                    {l.label}
                  </a>
                ) : (
                  <Link to={l.to!} className="hover:text-ink">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Moon size={13} className="dark:hidden" aria-hidden="true" />
                <Sun size={13} className="hidden dark:block" aria-hidden="true" />
                <span className="dark:hidden">Dark mode</span>
                <span className="hidden dark:inline">Light mode</span>
              </button>
            </li>
          </ul>
        </div>
        <p className="mt-6 font-sans text-[13px] leading-relaxed text-muted">
          Headlines and excerpts belong to their publishers. Every story links to its original source. AI-assisted summaries may contain errors. SteelScope never estimates prices.
        </p>
        <div className="mt-4 flex flex-col gap-1 font-sans text-[12px] text-muted sm:flex-row sm:justify-between">
          <span>© {new Date(meta?.generatedAt ?? '2026-01-01').getFullYear()} {SITE.name}</span>
          {meta?.lastSuccessfulRefresh && (
            <span>
              Last updated {formatDateLong(meta.lastSuccessfulRefresh).replace(/^\w+, /, '')}, {formatTime(meta.lastSuccessfulRefresh)}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { data: meta } = useData<SiteMeta>('meta.json');
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Masthead />
      <main id="main" className="wrap">
        {children}
      </main>
      <Footer meta={meta} />
    </div>
  );
}
