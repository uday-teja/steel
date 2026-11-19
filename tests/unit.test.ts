import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Deduper } from '../scripts/deduplication/dedupe';
import { parseFeed, type SourceConfig } from '../scripts/ingestion/feeds';
import { canonicalUrl, previousWeek, slugify } from '../scripts/lib/util';
import { classifyCategories, classifyRegion, detectCompanies, isRelevant } from '../scripts/processing/classify';
import { guardList, guardText } from '../scripts/summarization/guard';

const src: SourceConfig = { id: 's', name: 'Src', homepage: '', feedUrl: '', regionHint: 'india', focus: 'discovery', tier: 2, access: 'aggregator-rss', enabled: true, verified: false, notes: '' };

test('numeric guard removes sentences with figures absent from the source', () => {
  const source = 'JSW Steel reported net profit of ₹1,200 crore, with production up 5% year-on-year.';
  const r = guardText('Profit was ₹1,200 crore. Margins rose to 18%. Output grew 5%. Demand may stay firm in 2026.', source);
  assert.equal(r.removed, 1);
  assert.ok(!r.text.includes('18%'));
  assert.ok(r.text.includes('₹1,200') && r.text.includes('5%'));
  assert.deepEqual(guardList(['Prices rose ₹2,000 per tonne', 'Mills raised prices'], 'Mills raised prices').items, ['Mills raised prices']);
});

test('dedupe matches canonical URLs and rewritten headlines', () => {
  const d = new Deduper();
  d.add({ title: 'Tata Steel commissions new blast furnace unit at Kalinganagar plant', url: 'https://a.com/x?utm_source=rss' });
  assert.ok(d.isDuplicate({ title: 'Something else entirely', url: 'https://a.com/x' }));
  assert.ok(d.isDuplicate({ title: 'Tata Steel commissions new blast furnace at Kalinganagar', url: 'https://b.com/y' }));
  assert.ok(!d.isDuplicate({ title: 'JSW Steel reports quarterly profit rise', url: 'https://b.com/z' }));
});

test('relevance filter keeps steel news and drops unrelated items', () => {
  assert.ok(isRelevant({ title: 'HR coil prices rise as mills hike rates', description: '', focus: 'discovery' }));
  assert.ok(!isRelevant({ title: 'India beat Australia in second Test', description: '', focus: 'discovery' }));
  assert.ok(!isRelevant({ title: 'Pittsburgh Steelers win again', description: '', focus: 'discovery' }));
  assert.ok(!isRelevant({ title: 'Markets close higher on bank rally', description: 'steel stocks gained', focus: 'business' }));
});

test('region, companies and categories classification', () => {
  const india = { ...src, title: 'JSW Steel reports Q2 net profit rise', description: 'Consolidated profit in crore', url: '', publisher: '', sourceName: '', publishedAt: new Date().toISOString() };
  const companies = detectCompanies(india.title);
  assert.deepEqual(companies, ['JSW Steel']);
  assert.equal(classifyRegion({ ...india, sourceId: 's' }, companies), 'india');
  assert.equal(classifyCategories(india, companies).primary, 'company-updates');
  const world = { ...india, title: 'China steel output falls as Hebei mills cut production', description: '', regionHint: 'india' as const };
  assert.equal(classifyRegion({ ...world, sourceId: 's' }, []), 'world');
  assert.equal(classifyCategories({ title: 'DGTR recommends anti-dumping duty on steel imports', description: '' }, []).primary, 'trade-exports');
});

test('aggregator feed parsing strips publisher suffix and keeps attribution', () => {
  const xml = `<rss><channel><item><title>Steel prices rise - Example Daily</title><link>https://news.example/a?utm_medium=x</link><pubDate>Thu, 19 Nov 2026 03:00:00 GMT</pubDate><source url="https://ex.com">Example Daily</source></item></channel></rss>`;
  const [i] = parseFeed(xml, src);
  assert.equal(i.title, 'Steel prices rise');
  assert.equal(i.publisher, 'Example Daily');
  assert.equal(i.url, 'https://news.example/a');
  assert.equal(i.publishedAt, '2026-11-19T03:00:00.000Z');
});

test('utilities', () => {
  assert.equal(canonicalUrl('https://X.com/a/?utm_source=1&id=2#top'), 'https://x.com/a/?id=2');
  assert.equal(slugify('Tata Steel’s Q2: ₹1,200 crore & more'), 'tata-steel-s-q2-1-200-crore-and-more');
  assert.deepEqual(previousWeek('2026-11-19'), { from: '2026-11-09', to: '2026-11-15' });
  assert.deepEqual(previousWeek('2026-11-16'), { from: '2026-11-09', to: '2026-11-15' });
});

test('numeric guard does not mistake amounts for years', () => {
  assert.equal(guardText('Prices rose ₹2,000 per tonne.', 'Mills raised prices').removed, 1);
  assert.equal(guardText('Output reached 2000 tonnes.', 'Output rose').removed, 1);
  assert.equal(guardText('The plan runs to 2030.', 'Expansion plan').removed, 0);
});

test('numeric guard catches small invented percentages and amounts', () => {
  assert.equal(guardText('Output grew 7% in the quarter.', 'Output grew in the quarter').removed, 1);
  assert.equal(guardText('Prices fell $5 per tonne.', 'Prices fell').removed, 1);
  assert.equal(guardText('The top 10 mills agreed.', 'Mills agreed').removed, 0);
});

test('company-aware dedupe merges rewrites of the same company story', () => {
  const d = new Deduper(0.72, detectCompanies);
  d.add({ title: "Tata Steel plans 10-tonne hydrogen production facility in Odisha's Kalinganagar", url: 'https://a.com/1' });
  assert.ok(d.isDuplicate({ title: 'Tata Steel Starts 10-Tonne Hydrogen Plant Project for Green Steel', url: 'https://b.com/2' }));
  assert.ok(!d.isDuplicate({ title: 'JSW Steel starts 10-tonne hydrogen plant project', url: 'https://b.com/3' }));
  assert.ok(!d.isDuplicate({ title: 'Tata Steel reports quarterly results with lower margins', url: 'https://b.com/4' }));
});

test('guard keeps domain names intact and titles lose wrapping brackets', async () => {
  assert.equal(guardText('According to scanx.trade, JSW Steel grew. More text.', 'JSW Steel').text, 'According to scanx.trade, JSW Steel grew. More text.');
  const { cleanTitle } = await import('../scripts/ingestion/feeds');
  assert.equal(cleanTitle('[Tata Steel plans hydrogen project]'), 'Tata Steel plans hydrogen project');
  assert.equal(cleanTitle('Steel (HRC) prices rise'), 'Steel (HRC) prices rise');
});
