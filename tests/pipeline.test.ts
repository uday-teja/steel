import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { Edition, LatestFeed, SiteMeta } from '../src/types/news';
import { fixtureFeeds } from './fixtures';

test('pipeline end-to-end on fixture feeds (no network, no AI)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'steelscope-'));
  const feeds = path.join(dir, 'feeds');
  const data = path.join(dir, 'data');
  execFileSync('mkdir', ['-p', feeds]);
  for (const [id, xml] of Object.entries(fixtureFeeds())) writeFileSync(path.join(feeds, `${id}.xml`), xml);
  const env = { ...process.env, ANTHROPIC_API_KEY: '', AI_PROVIDER: 'none' };
  execFileSync('npx', ['tsx', 'scripts/pipeline.ts', '--data-dir', data, '--fixtures', feeds, '--trigger', 'test'], { env, stdio: 'pipe' });
  const read = <T>(p: string) => JSON.parse(readFileSync(path.join(data, p), 'utf8')) as T;

  const latest = read<LatestFeed>('latest.json');
  const titles = [...latest.india, ...latest.world].map((c) => c.title);
  assert.ok(!titles.some((t) => /Cricket|Gold|rural roads/.test(t)), 'irrelevant items filtered');
  assert.equal(titles.filter((t) => t.startsWith('Tata Steel commissions')).length, 1, 'duplicate removed');
  assert.ok(latest.india.length >= 4 && latest.world.length >= 2);
  assert.ok(latest.india.every((c) => c.publisher && c.url.startsWith('https://example.com/')));

  const meta = read<SiteMeta>('meta.json');
  assert.equal(meta.lastRun?.newArticles, titles.length);
  assert.ok(meta.lastSuccessfulRefresh);
  const ed = read<Edition>(`editions/india/${meta.latestEditions.india}.json`);
  assert.ok(ed.featured && ed.topStories.length > 0);
  assert.equal(ed.introIsAi, false);
  assert.equal(ed.analysis, null, 'no fabricated analysis without AI');
  assert.equal(readdirSync(path.join(data, 'articles')).length, titles.length);

  // Second run with identical feeds adds nothing.
  execFileSync('npx', ['tsx', 'scripts/pipeline.ts', '--data-dir', data, '--fixtures', feeds, '--trigger', 'test'], { env, stdio: 'pipe' });
  assert.equal(read<SiteMeta>('meta.json').lastRun?.newArticles, 0);
});
