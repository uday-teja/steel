# SteelScope — Architecture

SteelScope is a public, static-first digital newspaper for the Indian and global steel industry. There is no
login, no database, and no server to run: GitHub stores the code **and** the published data,
GitHub Actions does the collection and AI work, and GitHub Pages serves the result.

```
            ┌──────────────── GitHub Actions (server-side, holds secrets) ───────────────┐
 schedule ─►│ collect RSS ─► relevance ─► de-dup ─► classify ─► AI enrich ─► numeric guard │
 manual  ──►│     ─► related ─► India/World editions ─► indexes ─► meta.json             │
            │     ─► git commit data/ ─► vite build ─► pre-render HTML + share cards     │
            └───────────────────────────────┬─────────────────────────────────────────────┘
                                            ▼
                          GitHub Pages (static HTML + JSON + PNG)
                                            ▼
                           Readers (mobile-first React site, no login)
```

## 1. Recommended architecture

| Layer | Choice | Why |
|---|---|---|
| UI | React 18 + TypeScript + Vite + Tailwind v4 + Lucide | Fast, typed, small bundle; Tailwind tokens give a disciplined editorial design system |
| Rendering | **Pre-rendered HTML for every route** (SSR at build time) + hydration | Real HTML for SEO and social crawlers; direct URLs work on Pages without hacks |
| Data | Static JSON in `data/`, committed by the pipeline | Free, versioned, auditable, no backend |
| Automation | GitHub Actions (cron + `workflow_dispatch`) | Free for public repos, secrets stay server-side |
| AI | Pluggable provider (`scripts/summarization/`), Anthropic by default | Keys only in Actions secrets |
| Hosting | GitHub Pages via `actions/deploy-pages` | Free CDN, HTTPS |
| Manual refresh | Optional Cloudflare Worker relay (`refresh-proxy/`) | The only way to trigger Actions from a static page without exposing a token |

## 2. GitHub Pages deployment strategy

- Pages source: **GitHub Actions** (not a branch). The pipeline uploads `dist/` with
  `actions/upload-pages-artifact` and deploys with `actions/deploy-pages`.
- The site lives under `/steel/` (`config/site.json → basePath`). For a custom domain set the
  Actions variables `SITE_URL` and `SITE_BASE=/`.
- `scripts/build/static.ts` pre-renders every route to `route/index.html` with its own `<title>`,
  description, canonical URL, Open Graph/Twitter tags and JSON-LD (`NewsArticle`, `WebSite`).
  The data each page used is embedded so React hydrates without refetching.
- `404.html` is an SPA fallback for anything not pre-rendered. `sitemap.xml`, `robots.txt`,
  `feed.xml` (RSS) and `.nojekyll` are generated.
- Commits made by the pipeline with `GITHUB_TOKEN` do not trigger other workflows, so the pipeline
  builds and deploys in the same run. `deploy.yml` handles code-only pushes.

## 3. GitHub Actions automation design

| Workflow | Trigger | Does |
|---|---|---|
| `daily-news.yml` | cron 00:07 & 10:07 UTC (05:37 & 15:37 IST), manual | calls `pipeline.yml` |
| `manual-refresh.yml` | `workflow_dispatch`, `repository_dispatch: refresh-news` | calls `pipeline.yml` |
| `pipeline.yml` | `workflow_call` | collect → process → commit `data/` → build → deploy |
| `deploy.yml` | push to `main` (non-data) | typecheck → tests → build → deploy |
| `ci.yml` | pull requests, other branches | typecheck → tests → build |

All share the concurrency group `steelscope-publish`, so runs never overlap or race on `data/`.
Failure handling: a failing source never fails the run (it is recorded in source health); if
**every** source fails the run is marked `failed`, `lastSuccessfulRefresh` is not advanced and the
previous editions stay online. AI failures fall back to publisher excerpts and are noted in
`meta.json → lastRun.notes`.

## 4. News source integration

- `config/sources.json` is the registry: id, feed URL, region hint, focus, tier, access type,
  `enabled`, `verified`, and licensing notes. Adding a publication = adding one entry.
- Only **public RSS/Atom and official press feeds** are enabled. Licensed services (BigMint/SteelMint,
  SteelOrbis, Fastmarkets, Argus, S&P Global Platts, Reuters) are listed but disabled with the reason.
- Discovery feeds (Google News search RSS) widen coverage; each item keeps the original publisher
  (from the feed's `<source>` element) and links to the publisher's article.
- Stored per story: headline, the publisher's own short feed excerpt (≤420 chars), URL, timestamps.
  Never full text; no scraping, no paywall bypass.
- Feed URLs could not be tested from the development sandbox (outbound news hosts were blocked), so
  every source starts `verified: false`. The status page shows per-source health after each run;
  fix or disable any that error.

## 5. AI processing architecture

```
EnrichInput (headline + excerpt + heuristic tags) ──► provider.enrich()  [batches of 10, 2 in parallel]
   relevance · region · categories · geography · companies · importance · dek · summary
   key facts · why it matters · implications · in-batch duplicate detection
EditionInput (day's ranked stories + sections)    ──► provider.writeEdition()
   title · intro · featured · top 10 · market overview · section summaries · analysis · watch next
```

- Structured outputs (Zod schemas) so responses are validated JSON. Server-side refusal fallback is enabled.
- **Heuristics run first** (keyword relevance, region, categories, companies, importance), so the
  site is fully functional with `AI_PROVIDER=none` or when the API is down.
- **Numeric guard** (`scripts/summarization/guard.ts`): any AI sentence containing a number that does
  not appear in the source text is deleted before publishing. Company names suggested by the model are
  kept only if they literally appear in the source.
- Every AI-written block is labelled "AI summary", with model and time on the article page.
- Configure with Actions secret `ANTHROPIC_API_KEY` and optional variables `AI_PROVIDER`
  (`anthropic` | `none`) and `AI_MODEL` (default `claude-opus-5-5`). New providers implement the
  `AiProvider` interface in `scripts/summarization/provider.ts`.

## 6. Repository structure

```
config/            site.json · sources.json · market-indicators.json
data/              generated, committed by the pipeline (served at /data)
  articles/        one JSON per story (retained 120 days)
  editions/        index.json · india/YYYY-MM-DD.json · world/YYYY-MM-DD.json (2 years)
  weekly/          index.json · india|world/<Monday>.json — weekly reports (2 years)
  days/            per-day story index (2 years)
  categories/      per-category feeds
  indexes/         companies.json · dates.json
  market/          indicators.json (published) · observations.json (verified inputs only)
  latest.json · meta.json
scripts/
  ingestion/       feeds.ts — fetch + parse RSS/Atom, source health
  processing/      classify.ts — relevance, region, geography, categories, companies, importance
  deduplication/   dedupe.ts — canonical URL + headline similarity
  summarization/   provider interface, Anthropic provider, numeric guard
  publishing/      store, editions, indexes, market, retention
  build/           static.ts (pre-render, sitemap, feed), sharecard.ts (PNG cards)
  pipeline.ts      orchestrator
src/
  components/ layouts/ pages/ lib/ styles/ types/
  entry-server.tsx (build-time SSR) · main.tsx (client)
.github/workflows/ pipeline.yml · daily-news.yml · manual-refresh.yml · deploy.yml
refresh-proxy/     optional Cloudflare Worker for the public Refresh button
```

## 7. UI/UX design system

- **Type**: Newsreader (variable, optical sizes) for headlines and reading text; Inter for UI,
  kickers and metadata. Headline scale 17 → 50px with balanced wrapping; body 19–20px at 1.65.
- **Colour**: warm newsprint paper `#F8F6F1`, ink `#121212`, one oxide-red accent `#A3311B` (also
  India), steel blue `#1F4A6E` for World. Dark mode is a full token swap, saved per reader.
- **Structure**: hairline rules, heavy and double rules for section breaks, small-caps section
  labels, numbered lists, no rounded cards, no gradients in the UI, no decorative motion.
- **Imagery**: publishers' photographs are copyrighted, so each story gets a deterministic,
  category-specific engraving-style illustration (coils, beams, ore, trusses, containers…) rendered
  as inline SVG. The same art drives the share cards.
- **Mobile**: sticky compact masthead, sticky bottom navigation (Home · India · World · Editions ·
  Markets), India/World switch, scrollable category rail, 16px gutters, no horizontal page scroll.
- **Sharing**: WhatsApp, LinkedIn, X, Facebook, native share sheet, copy link, and a downloadable
  branded 1200×630 card per story and per edition (also used as the `og:image`).

## 8. Milestones

| # | Milestone | Status |
|---|---|---|
| 1 | Data contracts, source registry, ingestion, relevance, de-dup, classification | Done |
| 2 | AI enrichment + numeric guard + editions + indexes + retention | Done |
| 3 | Editorial UI: home, India, World, article, edition, archive, categories, companies, markets, status | Done |
| 4 | Pre-rendering, SEO metadata, sitemap, RSS, share cards | Done |
| 5 | Actions workflows, Pages deploy, manual refresh relay | Done |
| 6 | First live runs: verify each feed, tune relevance keywords and source list | Next (needs live network) |
| 7 | Licensed price feed integration into `data/market/observations.json` | Needs a data licence |
| 8 | Weekly reports (“The Week in Steel”, India and World, published after each Mon–Sun week) | Done |
| 9 | Unit + end-to-end pipeline tests in CI | Done |
| 10 | Company pages with more context, email/WhatsApp digest | Future |
