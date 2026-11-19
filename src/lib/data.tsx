import { useEffect, useState } from 'react';
import { dataUrl } from './site';

/**
 * Tiny data layer over the static JSON files in /data.
 *
 * - In the browser, files are fetched once and cached for the session.
 * - During static pre-rendering, a synchronous loader is installed so pages
 *   render with real content; every file used is recorded and embedded into
 *   the HTML so the client hydrates without refetching.
 */

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
let ssrLoader: ((path: string) => unknown) | null = null;
let ssrUsed: Map<string, unknown> | null = null;

export function installSsrLoader(loader: (path: string) => unknown): Map<string, unknown> {
  ssrLoader = loader;
  ssrUsed = new Map();
  cache.clear();
  return ssrUsed;
}

export function seedCache(entries: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(entries)) cache.set(k, v);
}

export class NotFoundError extends Error {}

function load(path: string, bust = false): Promise<unknown> {
  const key = bust ? `${path}#bust` : path;
  const existing = inflight.get(key);
  if (existing) return existing;
  const url = dataUrl(path) + (bust ? `?t=${Date.now()}` : '');
  const p = fetch(url, { cache: bust ? 'no-store' : 'default' })
    .then((res) => {
      if (res.status === 404) throw new NotFoundError(path);
      if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
      return res.json();
    })
    .then((json) => {
      cache.set(path, json);
      return json;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function fetchFresh<T>(path: string): Promise<T> {
  return load(path, true) as Promise<T>;
}

export interface DataState<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
}

export function useData<T>(path: string | null): DataState<T> {
  if (path && ssrLoader && !cache.has(path)) {
    let value: unknown = null;
    try {
      value = ssrLoader(path);
    } catch {
      value = null;
    }
    cache.set(path, value);
    ssrUsed?.set(path, value);
  } else if (path && ssrUsed && !ssrUsed.has(path)) {
    ssrUsed.set(path, cache.get(path) ?? null);
  }

  const cached = path ? (cache.get(path) as T | null | undefined) : undefined;
  const [state, setState] = useState<DataState<T>>(() => ({
    data: cached ?? undefined,
    error: cached === null ? new NotFoundError(path ?? '') : null,
    loading: Boolean(path) && cached === undefined,
  }));

  useEffect(() => {
    if (!path) return;
    const hit = cache.get(path) as T | null | undefined;
    if (hit) {
      setState({ data: hit, error: null, loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load(path)
      .then((d) => alive && setState({ data: d as T, error: null, loading: false }))
      .catch((e: Error) => alive && setState({ data: undefined, error: e, loading: false }));
    return () => {
      alive = false;
    };
  }, [path]);

  return state;
}
