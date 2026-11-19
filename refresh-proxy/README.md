# SteelScope refresh relay (optional)

GitHub Pages is static hosting, so the website cannot hold a GitHub token. This Cloudflare Worker
holds the token server-side and lets the public **Refresh news** button start `manual-refresh.yml`
safely. Without it, the site shows a link to run the workflow from GitHub (maintainer only), and the
two daily scheduled runs continue as normal.

## Deploy (about 5 minutes, free tier)

1. Create a **fine-grained personal access token** on GitHub:
   - Repository access: *Only select repositories* → `steel`
   - Permissions: **Actions: Read and write** (nothing else)
2. Deploy the Worker:
   ```bash
   cd refresh-proxy
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN   # paste the token
   npx wrangler deploy
   ```
   Wrangler prints a URL such as `https://steelscope-refresh.<you>.workers.dev`.
3. In the GitHub repository: **Settings → Secrets and variables → Actions → Variables**, add
   `REFRESH_ENDPOINT` = that URL. The next deploy enables the button.

If you use a custom domain, update `ALLOWED_ORIGIN` in `wrangler.toml`.

## Behaviour

| Situation | Response | Website shows |
|---|---|---|
| A pipeline run is already queued/running | `200 already-running` | Tracks the existing run |
| Manual refresh within the cooldown window | `429` + minutes remaining | "Refreshed recently" |
| Otherwise | `202 dispatched` | Queued → running → publishing → **Published** (only once new `meta.json` is live) |
