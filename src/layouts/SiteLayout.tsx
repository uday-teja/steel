import { BarChart3, ChevronDown, Globe2, Home, Landmark, Menu, Moon, Newspaper, Search, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatDateLong, formatTime } from '../lib/format';
import { githubRepoUrl, SITE } from '../lib/site';
import { CATEGORIES } from '../lib/taxonomy';
import type { SiteMeta } from '../types/news';

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

function ThemeToggle() {
  return (
    <button type="button" onClick={toggleTheme} className="inline-flex h-10 w-10 items-center justify-center text-ink-2 hover:text-ink" aria-label="Toggle dark mode">
      <Moon size={18} strokeWidth={1.75} className="dark:hidden" aria-hidden="true" />
      <Sun size={18} strokeWidth={1.75} className="hidden dark:block" aria-hidden="true" />
    </button>
  );
}

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-block leading-none ${className}`} aria-label={`${SITE.name} home`}>
      <span className="font-serif font-bold tracking-[-0.02em] text-ink" style={{ fontVariationSettings: '"opsz" 72' }}>
        Steel<span className="text-accent">Scope</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: '/india', label: 'India' },
  { to: '/world', label: 'World' },
  { to: '/markets', label: 'Markets' },
  { to: '/editions', label: 'Editions' },
  { to: '/latest', label: 'Latest' },
];

/** Hide the sticky header while scrolling down; reveal it on any scroll up. */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last.current;
      if (y < 80) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      last.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

function SectionsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`inline-flex items-center gap-1 px-3 py-2 font-sans text-[14px] font-medium ${pathname.startsWith('/category') ? 'text-accent' : 'text-ink hover:text-accent'}`}>
        Sections <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[440px] border border-rule-strong bg-paper p-2 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]">
          <ul className="grid grid-cols-2">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.id}`} className="block px-3 py-2.5 hover:bg-paper-2">
                  <span className="block font-sans text-[14px] font-semibold text-ink">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-4 border-t border-rule px-3 pb-1 pt-3 font-sans text-[13px] text-ink-2">
            <Link to="/archive" className="hover:text-ink">Archive</Link>
            <Link to="/about" className="hover:text-ink">About</Link>
            <Link to="/status" className="hover:text-ink">Refresh status</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, onClose, meta }: { open: boolean; onClose: () => void; meta?: SiteMeta }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);
  if (!open) return null;
  const item = 'flex items-center justify-between border-b border-rule py-3.5 font-serif text-[20px] text-ink active:opacity-60';
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-paper md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="wrap flex h-12 items-center justify-between border-b border-rule">
        <Wordmark className="text-[22px]" />
        <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center text-ink" aria-label="Close menu">
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <nav className="wrap pb-24 pt-2" aria-label="Menu">
        <ul>
          {[{ to: '/', label: 'Home' }, ...NAV, { to: '/archive', label: 'Archive' }].map((n) => (
            <li key={n.to}>
              <Link to={n.to} className={item}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="kicker mt-7 text-muted">Sections</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link to={`/category/${c.id}`} className="inline-block border border-rule px-3 py-2 font-sans text-[14px] text-ink-2 active:bg-paper-2">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex items-center justify-between border-t border-rule pt-4 font-sans text-[14px] text-ink-2">
          <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-2">
            <Moon size={16} className="dark:hidden" aria-hidden="true" />
            <Sun size={16} className="hidden dark:block" aria-hidden="true" />
            <span className="dark:hidden">Dark mode</span>
            <span className="hidden dark:inline">Light mode</span>
          </button>
          <Link to="/status">{meta?.lastSuccessfulRefresh ? `Updated ${formatTime(meta.lastSuccessfulRefresh)}` : 'Status'}</Link>
        </div>
        <div className="mt-3 flex gap-4 font-sans text-[14px] text-ink-2">
          <Link to="/about">About & AI policy</Link>
        </div>
      </nav>
    </div>
  );
}

function Masthead({ meta }: { meta?: SiteMeta }) {
  const hidden = useHideOnScroll();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);
  return (
    <>
      <header className={`no-print sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur transition-transform duration-200 supports-[backdrop-filter]:bg-paper/85 ${hidden && !menu ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="wrap flex h-12 items-center justify-between md:h-16">
          <Wordmark className="text-[24px] md:text-[32px]" />
          <nav className="hidden items-center md:flex" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `px-3 py-2 font-sans text-[14px] font-medium ${isActive ? 'text-accent' : 'text-ink hover:text-accent'}`}>
                {n.label}
              </NavLink>
            ))}
            <SectionsDropdown />
          </nav>
          <div className="flex items-center">
            <Link to="/search" className="inline-flex h-10 w-10 items-center justify-center text-ink-2 hover:text-ink" aria-label="Search">
              <Search size={19} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <span className="hidden md:inline-flex">
              <ThemeToggle />
            </span>
            <button type="button" onClick={() => setMenu(true)} className="inline-flex h-10 w-10 items-center justify-center text-ink md:hidden" aria-label="Open menu" aria-expanded={menu}>
              <Menu size={21} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menu} onClose={() => setMenu(false)} meta={meta} />
    </>
  );
}

const BOTTOM = [
  { to: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { to: '/india', label: 'India', icon: Landmark, match: (p: string) => p.startsWith('/india') || p.startsWith('/edition/india') },
  { to: '/world', label: 'World', icon: Globe2, match: (p: string) => p.startsWith('/world') || p.startsWith('/edition/world') },
  { to: '/editions', label: 'Editions', icon: Newspaper, match: (p: string) => p.startsWith('/editions') || p.startsWith('/weekly') || p.startsWith('/archive') },
  { to: '/markets', label: 'Markets', icon: BarChart3, match: (p: string) => p.startsWith('/markets') },
];

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-paper/90 md:hidden" aria-label="Quick navigation">
      <ul className="grid grid-cols-5">
        {BOTTOM.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link to={to} aria-current={active ? 'page' : undefined} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 font-sans text-[10.5px] font-medium transition-colors active:opacity-60 ${active ? 'text-accent' : 'text-ink-2'}`}>
                {active && <span className="absolute inset-x-5 top-0 h-0.5 bg-accent" aria-hidden="true" />}
                <Icon size={20} strokeWidth={active ? 2.1 : 1.75} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
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
            <Wordmark className="text-[26px]" />
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
