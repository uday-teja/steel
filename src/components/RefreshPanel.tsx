import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFresh } from '../lib/data';
import { formatDateTime, timeAgo } from '../lib/format';
import { SITE, workflowUrl } from '../lib/site';
import type { SiteMeta } from '../types/news';

interface Run {
  id: number;
  name: string;
  path: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  event: string;
}

type Phase =
  | { k: 'idle' }
  | { k: 'requesting' }
  | { k: 'waiting-run'; since: string }
  | { k: 'running'; run: Run }
  | { k: 'publishing'; run: Run }
  | { k: 'published'; at: string }
  | { k: 'failed'; message: string; url?: string }
  | { k: 'cooldown'; until: number }
  | { k: 'timeout'; url?: string };

const PIPELINE_FILES = [SITE.github.refreshWorkflow, SITE.github.dailyWorkflow];
const COOLDOWN_MS = SITE.refresh.cooldownMinutes * 60_000;
const LS_KEY = 'ss-refresh-requested-at';

async function fetchRuns(): Promise<Run[]> {
  const res = await fetch(`https://api.github.com/repos/${SITE.github.owner}/${SITE.github.repo}/actions/runs?per_page=10`, {
    headers: { accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const json = (await res.json()) as { workflow_runs: Run[] };
  return json.workflow_runs.filter((r) => PIPELINE_FILES.some((f) => r.path.endsWith(f)));
}

const isActive = (r: Run) => r.status !== 'completed';

export function RefreshPanel({ meta }: { meta?: SiteMeta }) {
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef<number>(0);
  const endpoint = SITE.refreshEndpoint;

  const loadRuns = useCallback(async () => {
    try {
      const r = await fetchRuns();
      setRuns(r);
      setRunsError(null);
      return r;
    } catch (e) {
      setRunsError(e instanceof Error ? e.message : 'Unavailable');
      return null;
    }
  }, []);

  // Initial: pick up cooldown and any run already in progress.
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    let requested = 0;
    try {
      requested = Number(localStorage.getItem(LS_KEY) || 0);
    } catch {
      /* ignore */
    }
    loadRuns().then((r) => {
      const active = r?.find(isActive);
      if (active) {
        startedAt.current = Date.now();
        setPhase({ k: 'running', run: active });
      } else if (requested && Date.now() - requested < COOLDOWN_MS) {
        setPhase({ k: 'cooldown', until: requested + COOLDOWN_MS });
      }
    });
    return () => clearInterval(tick);
  }, [loadRuns]);

  // Polling state machine.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const schedule = (fn: () => void, ms: number) => {
      timer.current = setTimeout(fn, ms);
    };
    if (Date.now() - startedAt.current > 25 * 60_000 && ['waiting-run', 'running', 'publishing'].includes(phase.k)) {
      setPhase({ k: 'timeout', url: phase.k === 'running' || phase.k === 'publishing' ? phase.run.html_url : undefined });
      return;
    }
    if (phase.k === 'waiting-run') {
      schedule(async () => {
        const r = await loadRuns();
        const run = r?.find((x) => x.created_at >= new Date(new Date(phase.since).getTime() - 60_000).toISOString());
        setPhase(run ? { k: 'running', run } : { ...phase });
      }, 8_000);
    } else if (phase.k === 'running') {
      schedule(async () => {
        const r = await loadRuns();
        const run = r?.find((x) => x.id === phase.run.id) ?? phase.run;
        if (run.status !== 'completed') setPhase({ k: 'running', run });
        else if (run.conclusion === 'success') setPhase({ k: 'publishing', run });
        else setPhase({ k: 'failed', message: `The refresh run ended with status “${run.conclusion}”. The previous edition remains published.`, url: run.html_url });
      }, 15_000);
    } else if (phase.k === 'publishing') {
      schedule(async () => {
        try {
          const m = await fetchFresh<SiteMeta>('meta.json');
          if (m.lastSuccessfulRefresh && m.lastSuccessfulRefresh >= phase.run.created_at) {
            setPhase({ k: 'published', at: m.lastSuccessfulRefresh });
            return;
          }
        } catch {
          /* keep waiting */
        }
        setPhase({ ...phase });
      }, 15_000);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, loadRuns]);

  const request = async () => {
    if (!endpoint) return;
    setPhase({ k: 'requesting' });
    const r = await loadRuns();
    const active = r?.find(isActive);
    startedAt.current = Date.now();
    if (active) {
      setPhase({ k: 'running', run: active });
      return;
    }
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'website' }) });
      const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; retryAfterMinutes?: number };
      if (res.status === 429) {
        const until = Date.now() + (body.retryAfterMinutes ?? SITE.refresh.cooldownMinutes) * 60_000;
        setPhase({ k: 'cooldown', until });
        return;
      }
      if (!res.ok) throw new Error(body.message || `Refresh service returned ${res.status}`);
      if (body.status === 'already-running') {
        const current = (await loadRuns())?.find(isActive);
        setPhase(current ? { k: 'running', run: current } : { k: 'waiting-run', since: new Date(Date.now() - 10 * 60_000).toISOString() });
        return;
      }
      const since = new Date().toISOString();
      try {
        localStorage.setItem(LS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      setPhase({ k: 'waiting-run', since });
    } catch (e) {
      setPhase({ k: 'failed', message: e instanceof Error ? e.message : 'The refresh request could not be sent.' });
    }
  };

  const busy = ['requesting', 'waiting-run', 'running', 'publishing'].includes(phase.k);
  const lastRun = runs?.[0];

  return (
    <div className="border border-rule-strong">
      <div className="grid gap-px bg-rule sm:grid-cols-3">
        <Stat label="Last successful refresh" value={meta?.lastSuccessfulRefresh ? formatDateTime(meta.lastSuccessfulRefresh) : 'Not yet'} sub={meta?.lastSuccessfulRefresh && now ? timeAgo(meta.lastSuccessfulRefresh, now) : undefined} />
        <Stat
          label="Last published editions"
          value={meta?.latestEditions.india || meta?.latestEditions.world ? `India ${meta?.latestEditions.india ?? '—'}` : 'None yet'}
          sub={meta?.latestEditions.world ? `World ${meta.latestEditions.world}` : undefined}
        />
        <Stat
          label="Last run"
          value={meta?.lastRun ? meta.lastRun.status[0].toUpperCase() + meta.lastRun.status.slice(1) : '—'}
          sub={meta?.lastRun ? `${meta.lastRun.newArticles} new stories · ${meta.lastRun.trigger}` : undefined}
        />
      </div>

      <div className="border-t border-rule-strong p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-serif text-[20px] font-semibold">Refresh news</p>
            <PhaseText phase={phase} endpoint={Boolean(endpoint)} />
          </div>
          {endpoint ? (
            <button
              type="button"
              onClick={request}
              disabled={busy || phase.k === 'cooldown'}
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-ink px-5 py-3 font-sans text-[14px] font-semibold text-paper hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
              {busy ? 'Refreshing…' : 'Refresh news'}
            </button>
          ) : (
            <a href={workflowUrl(SITE.github.refreshWorkflow)} target="_blank" rel="noopener" className="inline-flex shrink-0 items-center justify-center gap-2 border border-ink px-5 py-3 font-sans text-[14px] font-semibold text-ink hover:bg-ink hover:text-paper">
              Open refresh workflow <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
        {phase.k === 'published' && (
          <button type="button" onClick={() => window.location.reload()} className="mt-4 font-sans text-[14px] font-semibold text-accent underline underline-offset-2">
            Reload to see the latest news
          </button>
        )}
      </div>

      <div className="border-t border-rule p-5">
        <p className="kicker text-muted">Recent pipeline runs</p>
        {runsError ? (
          <p className="meta mt-2">Live run status is unavailable ({runsError}). The figures above come from the published data.</p>
        ) : !runs ? (
          <p className="meta mt-2">Loading…</p>
        ) : !runs.length ? (
          <p className="meta mt-2">No runs recorded yet.</p>
        ) : (
          <ul className="mt-2">
            {runs.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-t border-rule py-2 font-sans text-[13px] first:border-t-0">
                <span className="flex min-w-0 items-center gap-2">
                  {r.status !== 'completed' ? (
                    <Loader2 size={14} className="shrink-0 animate-spin text-muted" aria-label="In progress" />
                  ) : r.conclusion === 'success' ? (
                    <CheckCircle2 size={14} className="shrink-0 text-positive" aria-label="Succeeded" />
                  ) : (
                    <XCircle size={14} className="shrink-0 text-negative" aria-label="Failed" />
                  )}
                  <span className="truncate">{r.path.endsWith(SITE.github.refreshWorkflow) ? 'Manual refresh' : 'Scheduled update'}</span>
                </span>
                <a href={r.html_url} target="_blank" rel="noopener" className="meta shrink-0 hover:text-ink">
                  {formatDateTime(r.created_at)}
                </a>
              </li>
            ))}
          </ul>
        )}
        {lastRun && isActive(lastRun) && phase.k === 'idle' && <p className="meta mt-2">An update is currently running.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-paper p-4">
      <p className="kicker text-muted">{label}</p>
      <p className="mt-1.5 font-serif text-[19px] font-semibold leading-tight">{value}</p>
      {sub && <p className="meta mt-1">{sub}</p>}
    </div>
  );
}

function PhaseText({ phase, endpoint }: { phase: Phase; endpoint: boolean }) {
  const cls = 'mt-1 font-sans text-[14px] leading-relaxed text-ink-2';
  switch (phase.k) {
    case 'requesting':
      return <p className={cls}>Checking for running updates and sending the request…</p>;
    case 'waiting-run':
      return <p className={cls}>Request accepted. Waiting for GitHub Actions to start the refresh run…</p>;
    case 'running':
      return <p className={cls}>Collecting and processing news ({phase.run.status === 'queued' ? 'queued' : 'in progress'}). This usually takes 3–8 minutes. You can leave this page open.</p>;
    case 'publishing':
      return <p className={cls}>Processing finished. Waiting for the new data to go live on the site…</p>;
    case 'published':
      return <p className={`${cls} text-positive`}>Published. New data has been live since {formatDateTime(phase.at)}.</p>;
    case 'failed':
      return (
        <p className={`${cls} text-negative`}>
          {phase.message}{' '}
          {phase.url && (
            <a href={phase.url} target="_blank" rel="noopener" className="underline">
              View run
            </a>
          )}
        </p>
      );
    case 'cooldown':
      return <p className={cls}>News was refreshed recently. To avoid unnecessary load on publishers, manual refreshes are limited to one every {SITE.refresh.cooldownMinutes} minutes.</p>;
    case 'timeout':
      return (
        <p className={cls}>
          This refresh is taking longer than expected.{' '}
          {phase.url && (
            <a href={phase.url} target="_blank" rel="noopener" className="underline">
              Check the run on GitHub
            </a>
          )}
        </p>
      );
    default:
      return endpoint ? (
        <p className={cls}>Collect newly published stories now instead of waiting for the next scheduled update (about 05:40 and 15:40 IST daily). The page reports progress and confirms only once new data is live.</p>
      ) : (
        <p className={cls}>
          News updates automatically twice a day (about 05:40 and 15:40 IST). A one-click public refresh needs a small secure relay that has not been configured for this site, so the maintainer can run the refresh workflow from GitHub. Progress of any run appears below.
        </p>
      );
  }
}
