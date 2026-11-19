# SteelScope

A premium, public daily newspaper for the **Indian and global steel industry**: automatically
collected news, AI-assisted editorial summaries, and two daily editions (India and World),
published as a static site on GitHub Pages.

- No login, accounts, database or servers. GitHub stores the code and data, GitHub Actions runs the collection and AI work, and GitHub Pages serves the site.
- Every story credits its publisher and links to the original article. SteelScope never copies full
  articles, bypasses paywalls or publishes prices it cannot verify.
- Text written by AI is labelled. Any AI sentence containing a number the publisher did not state is
  removed automatically.

The full design is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Go live (one-time setup)

1. **Default branch.** Make sure the code is on `main`: merge this branch, or rename it to `main`.
2. **Pages.** Go to Settings → Pages → Build and deployment and set Source to **GitHub Actions**.
3. **AI (optional but recommended).** Go to Settings → Secrets and variables → Actions:
   - Under Secrets, add `ANTHROPIC_API_KEY`.
   - Under Variables (optional), add `AI_MODEL` (default `claude-opus-5-5`) and `AI_PROVIDER` (`anthropic` or `none`).
   - Without a key the site still works. Stories are shown with publisher excerpts and keyword-based classification.
4. **First run.** Go to Actions → **Manual refresh** → Run workflow. When it finishes, the site is at
   `https://uday-teja.github.io/steel/`.
5. **Check sources.** Open `/status` on the site. Any feed showing `error` should be fixed or disabled in
   `config/sources.json`.
6. **Public Refresh button (optional).** Deploy the relay in [`refresh-proxy/`](refresh-proxy/README.md)
   and set the Actions variable `REFRESH_ENDPOINT`.

After that, news updates automatically at about **05:40 and 15:40 IST** every day.

### Custom domain

Set the Actions variables `SITE_URL` (for example `https://steelscope.in`) and `SITE_BASE=/`, and
configure the domain under Settings → Pages.

## Local development

```bash
npm install
npm run pipeline          # collect news into ./data (needs internet; AI if ANTHROPIC_API_KEY is set)
npm run dev               # http://localhost:5173/steel/
npm run build             # dist/: pre-rendered pages, share cards, sitemap, feed
npm run typecheck
npm test                  # unit tests + end-to-end pipeline test on fictional fixture feeds
```

`npm run pipeline -- --data-dir /tmp/test --fixtures path/to/xml` runs the pipeline against local
`<sourceId>.xml` files. This is for testing only.

## Adding a source

Append an entry to `config/sources.json`:

```json
{ "id": "my-source", "name": "Publisher", "homepage": "https://…", "feedUrl": "https://…/rss",
  "regionHint": "india", "focus": "steel", "tier": 1, "access": "public-rss",
  "enabled": true, "verified": false, "notes": "Terms checked on …" }
```

Before enabling a source, check that its terms allow automated feed access.

## Market prices

`data/market/observations.json` holds verified observations only. Each one needs a `source.name` and a
`source.url` from a provider you are licensed to republish:

```json
{ "in-hrc": [{ "date": "2026-11-19", "value": 51500, "source": { "name": "…", "url": "https://…" } }] }
```

Until data is added, the Markets page says plainly that verified prices are unavailable.
