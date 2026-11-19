import { BarChart3, Globe2, Home, Landmark, Moon, Newspaper, RefreshCw, Sun } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatDateLong, formatTime } from '../lib/format';
import { githubRepoUrl, SITE } from '../lib/site';
import { CATEGORIES } from '../lib/taxonomy';
import type { SiteMeta } from '../types/news';

function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('ss-theme', next);
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <button type="button" onClick={toggle} className="inline-flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink" aria-label="Toggle dark mode">
      <Moon size={17} strokeWidth={1.75} className="dark:hidden" aria-hidden="true" />
      <Sun size={17} strokeWidth={1.75} className="hidden dark:block" aria-hidden="true" />
    </button>
  );
}

function Wordmark({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <Link to="/" className="inline-block leading-none" aria-label={`${SITE.name} home`}>
      <span className={`font-serif font-bold tracking-[-0.02em] text-ink ${size === 'lg' ? 'text-[44px] sm:text-[64px] lg:text-[76px]' : 'text-[26px]'}`} style={{ fontVariationSettings: '"opsz" 72' }}>
        Steel<span className="text-accent">Scope</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/india', label: 'India' },
  { to: '/world', label: 'World' },
  { to: '/markets', label: 'Markets' },
  { to: '/editions', label: 'Daily Editions' },
  { to: '/archive', label: 'Archive' },
  { to: '/about', label: 'About' },
];

function StatusChip({ meta }: { meta?: SiteMeta }) {
  const run = meta?.lastRun;
  const tone = !run ? 'bg-muted' : run.status === 'success' ? 'bg-positive' : run.status === 'partial' ? 'bg-amber-500' : 'bg-negative';
  return (
    <Link to="/status" className="inline-flex items-center gap-1.5 hover:text-ink">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden="true" />
      {meta?.lastSuccessfulRefresh ? <>Updated {formatTime(meta.lastSuccessfulRefresh)}</> : 'Awaiting first update'}
    </Link>
  );
}

function Masthead({ meta }: { meta?: SiteMeta }) {
  const editionDate = meta?.latestEditions.india ?? meta?.latestEditions.world ?? null;
  return (
    <header className="no-print">
      {/* Mobile compact bar */}
      <div className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85 md:hidden">
        <div className="wrap flex h-14 items-center justify-between">
          <Wordmark size="sm" />
          <div className="flex items-center">
            <Link to="/status" className="inline-flex h-9 w-9 items-center justify-center text-ink-2" aria-label="Refresh status">
              <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Desktop masthead */}
      <div className="hidden md:block">
        <div className="wrap flex h-10 items-center justify-between font-sans text-[12px] text-muted">
          <span>{editionDate ? formatDateLong(editionDate) : 'Daily steel industry intelligence'}</span>
          <div className="flex items-center gap-5">
            <StatusChip meta={meta} />
            <ThemeToggle />
          </div>
        </div>
        <div className="wrap border-t border-rule pb-4 pt-5 text-center">
          <Wordmark />
          <p className="mt-2 font-serif text-[16px] italic text-ink-2">{SITE.tagline}</p>
        </div>
        <nav className="wrap" aria-label="Primary">
          <div className="rule-double" />
          <ul className="flex items-center justify-center gap-1 border-b border-rule py-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => `inline-block px-3.5 py-2.5 font-sans text-[13px] font-semibold tracking-[0.02em] ${isActive ? 'text-accent' : 'text-ink hover:text-accent'}`}
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Category rail (all sizes) */}
      <nav className="wrap" aria-label="Categories">
        <ul className="scrollbar-none -mx-4 flex gap-0.5 overflow-x-auto border-b border-rule px-4 py-1.5 sm:mx-0 sm:px-0 md:flex-wrap md:justify-center md:overflow-visible">
          <li className="shrink-0">
            <NavLink to="/latest" className={({ isActive }) => `inline-block whitespace-nowrap px-2.5 py-1.5 font-sans text-[12px] ${isActive ? 'font-semibold text-accent' : 'text-ink-2 hover:text-ink'}`}>
              Latest News
            </NavLink>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.id} className="shrink-0">
              <NavLink to={`/category/${c.id}`} className={({ isActive }) => `inline-block whitespace-nowrap px-2.5 py-1.5 font-sans text-[12px] ${isActive ? 'font-semibold text-accent' : 'text-ink-2 hover:text-ink'}`}>
                {c.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

const BOTTOM = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/india', label: 'India', icon: Landmark },
  { to: '/world', label: 'World', icon: Globe2 },
  { to: '/editions', label: 'Editions', icon: Newspaper },
  { to: '/markets', label: 'Markets', icon: BarChart3 },
];

function BottomNav() {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-paper/90 md:hidden" aria-label="Quick navigation">
      <ul className="grid grid-cols-5">
        {BOTTOM.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => `flex h-14 flex-col items-center justify-center gap-0.5 font-sans text-[10.5px] font-medium ${isActive ? 'text-accent' : 'text-ink-2'}`}>
              <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer({ meta }: { meta?: SiteMeta }) {
  return (
    <footer className="no-print mt-16 bg-paper-2">
      <div className="wrap pb-28 pt-10 md:pb-12">
        <div className="rule-heavy pt-6" />
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size="sm" />
            <p className="dek mt-3 max-w-sm text-[15px] leading-[1.55]">{SITE.description}</p>
          </div>
          <div>
            <h3 className="kicker text-ink">Sections</h3>
            <ul className="mt-3 space-y-2 font-sans text-[14px] text-ink-2">
              <li><Link to="/india" className="hover:text-ink">India</Link></li>
              <li><Link to="/world" className="hover:text-ink">World</Link></li>
              <li><Link to="/markets" className="hover:text-ink">Steel Markets</Link></li>
              <li><Link to="/latest" className="hover:text-ink">Latest News</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="kicker text-ink">Editions</h3>
            <ul className="mt-3 space-y-2 font-sans text-[14px] text-ink-2">
              <li><Link to="/edition/india" className="hover:text-ink">Today's India Edition</Link></li>
              <li><Link to="/edition/world" className="hover:text-ink">Today's World Edition</Link></li>
              <li><Link to="/editions" className="hover:text-ink">All editions</Link></li>
              <li><Link to="/archive" className="hover:text-ink">Archive by date & company</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="kicker text-ink">About</h3>
            <ul className="mt-3 space-y-2 font-sans text-[14px] text-ink-2">
              <li><Link to="/about" className="hover:text-ink">Methodology & AI policy</Link></li>
              <li><Link to="/status" className="hover:text-ink">Refresh status</Link></li>
              <li><a href={`${import.meta.env.BASE_URL}feed.xml`} className="hover:text-ink">RSS feed</a></li>
              <li><a href={githubRepoUrl} className="hover:text-ink" rel="noopener">Source code</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-rule pt-4 font-sans text-[12px] leading-relaxed text-muted">
          <p>
            Headlines and excerpts belong to their publishers; every story links to the original. Summaries marked “AI summary” are machine-generated from publisher headlines and excerpts and may contain errors. SteelScope does not publish prices it cannot verify.
          </p>
          <p className="mt-2">
            © {SITE.name}.{meta?.lastSuccessfulRefresh ? ` Last updated ${formatDateLong(meta.lastSuccessfulRefresh)}, ${formatTime(meta.lastSuccessfulRefresh)}.` : ''}
          </p>
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
      <Masthead meta={meta} />
      <main id="main" className="wrap">
        {children}
      </main>
      <Footer meta={meta} />
      <BottomNav />
    </div>
  );
}
