/**
 * Applies an "Add market prices" GitHub issue form to data/market/observations.json.
 * Input: ISSUE_BODY env var (the issue form body). Prints a Markdown summary to stdout.
 * Usage: tsx scripts/market/add-prices.ts [--data-dir data]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { istDate, readJson } from '../lib/util';
import { DataStore } from '../publishing/store';
import { writeMarket } from '../publishing/indexes';
import { mergeObservations, type Observations } from './free-sources';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Parse "### Label [key]\n\nvalue" sections produced by GitHub issue forms. */
export function parseIssueForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = body.split(/^### /m).slice(1);
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n');
    const key = heading.match(/\[([a-z0-9_-]+)\]\s*$/i)?.[1];
    if (!key) continue;
    const value = rest.join('\n').trim();
    if (value && value !== '_No response_') out[key] = value;
  }
  return out;
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[₹$€,\s]|rs\.?|inr|usd/gi, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 && n < 1e8 ? n : null;
}

export interface ApplyResult {
  date: string;
  applied: { id: string; name: string; value: number; unit: string }[];
  errors: string[];
}

export function applyForm(fields: Record<string, string>, indicators: { id: string; name: string; unit: string }[], obs: Observations, today: string): ApplyResult {
  const errors: string[] = [];
  const date = (fields.date ?? today).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push(`Invalid date “${date}” (use YYYY-MM-DD).`);
  else if (date > today) errors.push(`Date ${date} is in the future.`);
  const sourceName = fields.source?.trim();
  if (!sourceName) errors.push('A source is required.');
  const url = fields.source_url?.trim();
  if (url && !/^https?:\/\/\S+$/.test(url)) errors.push('Source link must start with http:// or https://');
  const applied: ApplyResult['applied'] = [];
  if (errors.length) return { date, applied, errors };
  for (const ind of indicators) {
    const raw = fields[ind.id];
    if (!raw) continue;
    const value = parsePrice(raw);
    if (value === null) {
      errors.push(`${ind.name}: “${raw}” is not a valid number.`);
      continue;
    }
    obs[ind.id] = mergeObservations(obs[ind.id] ?? [], [{ date, value, source: { name: sourceName!, ...(url ? { url } : {}) } }]).list;
    applied.push({ id: ind.id, name: ind.name, value, unit: ind.unit });
  }
  if (!applied.length && !errors.length) errors.push('No prices were filled in.');
  return { date, applied, errors };
}

async function main(): Promise<void> {
  const i = process.argv.indexOf('--data-dir');
  const dataDir = path.resolve(ROOT, i >= 0 ? process.argv[i + 1] : 'data');
  const cfg = await readJson<{ indicators: { id: string; name: string; unit: string }[] }>(path.join(ROOT, 'config/market-indicators.json'), { indicators: [] });
  const store = new DataStore(dataDir);
  const obs = await store.read<Observations>('market/observations.json', {});
  const result = applyForm(parseIssueForm(process.env.ISSUE_BODY ?? ''), cfg.indicators, obs, istDate());
  if (result.applied.length) {
    await store.write('market/observations.json', obs);
    await writeMarket(store, path.join(ROOT, 'config'), new Date().toISOString());
  }
  const lines = [
    result.applied.length ? `Published ${result.applied.length} price(s) for **${result.date}**:` : 'No prices were published.',
    ...result.applied.map((a) => `- ${a.name}: ${a.value.toLocaleString('en-IN')} ${a.unit}`),
    ...(result.errors.length ? ['', 'Problems:', ...result.errors.map((e) => `- ${e}`)] : []),
  ];
  console.log(lines.join('\n'));
  if (!result.applied.length) process.exitCode = 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
