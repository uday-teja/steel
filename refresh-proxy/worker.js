/**
 * SteelScope refresh relay — a tiny Cloudflare Worker (free tier) that lets the public
 * "Refresh news" button start the manual-refresh workflow WITHOUT exposing any token
 * in the website. The GitHub token lives only in the Worker's encrypted secrets.
 *
 * Protections:
 *  - only POST from ALLOWED_ORIGIN (the GitHub Pages site)
 *  - refuses while a pipeline run is queued or in progress
 *  - server-side cooldown: at most one manual refresh every COOLDOWN_MINUTES
 *  - the token is a fine-grained PAT limited to this one repository with "Actions: read & write"
 *
 * Secrets / vars (see README.md): GITHUB_TOKEN (secret), GITHUB_OWNER, GITHUB_REPO,
 * WORKFLOW_FILE, REF, ALLOWED_ORIGIN, COOLDOWN_MINUTES.
 */
const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      vary: 'origin',
    },
  });

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN;
    if (request.method === 'OPTIONS') return json({}, 204, origin);
    if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405, origin);
    if (request.headers.get('origin') !== origin) return json({ message: 'Forbidden' }, 403, origin);

    const api = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
    const headers = {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'steelscope-refresh-relay',
      'x-github-api-version': '2022-11-28',
    };

    const runsRes = await fetch(`${api}/actions/runs?per_page=10`, { headers });
    if (!runsRes.ok) return json({ message: 'Could not read workflow status' }, 502, origin);
    const { workflow_runs: runs = [] } = await runsRes.json();
    const pipeline = runs.filter((r) => /\/(manual-refresh|daily-news)\.yml$/.test(r.path));

    if (pipeline.some((r) => r.status !== 'completed')) return json({ status: 'already-running' }, 200, origin);

    const cooldownMs = Number(env.COOLDOWN_MINUTES || 20) * 60_000;
    const lastManual = pipeline.find((r) => r.path.endsWith(env.WORKFLOW_FILE));
    if (lastManual) {
      const elapsed = Date.now() - new Date(lastManual.created_at).getTime();
      if (elapsed < cooldownMs) return json({ status: 'cooldown', retryAfterMinutes: Math.ceil((cooldownMs - elapsed) / 60_000) }, 429, origin);
    }

    const dispatch = await fetch(`${api}/actions/workflows/${env.WORKFLOW_FILE}/dispatches`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ ref: env.REF || 'main' }),
    });
    if (dispatch.status !== 204) return json({ message: `GitHub refused the dispatch (${dispatch.status})` }, 502, origin);
    return json({ status: 'dispatched' }, 202, origin);
  },
};
