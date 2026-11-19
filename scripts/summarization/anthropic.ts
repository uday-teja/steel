import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';
import { CATEGORIES } from '../../src/lib/taxonomy';
import type { CategoryId } from '../../src/types/news';
import { log } from '../lib/util';
import { EDITORIAL_RULES, type AiProvider, type EditionInput, type EditionOutput, type EnrichInput, type EnrichOutput } from './provider';

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
const GEO = ['india', 'china', 'europe', 'united-states', 'japan', 'south-korea', 'middle-east', 'russia-cis', 'southeast-asia', 'australia', 'brazil', 'global'] as const;

const EnrichSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      relevant: z.boolean().describe('false if the story is not about the steel industry or its inputs/demand'),
      region: z.enum(['india', 'world']).describe('india if the story is primarily about the Indian steel industry, otherwise world'),
      categories: z.array(z.enum(CATEGORY_IDS)).describe('1-3 categories, most relevant first'),
      geo: z.array(z.enum(GEO)),
      companies: z.array(z.string()).describe('steel/mining companies explicitly named in the material'),
      importance: z.number().int().describe('0-100 importance to steel industry professionals'),
      dek: z.string().describe('one-sentence standfirst, max 220 characters, facts from the material only'),
      summary: z.string().describe('2-4 sentence neutral summary using only the material'),
      keyFacts: z.array(z.string()).describe('0-4 short facts stated in the material; empty if none'),
      whyItMatters: z.string().describe('1-2 sentences of analysis on significance for the steel industry'),
      implications: z.string().describe('1-2 sentences on implications for producers, buyers or traders'),
      duplicateOf: z.string().nullable().describe('id of another item in this batch reporting the same event, else null'),
    }),
  ),
});

const EditionSchema = z.object({
  title: z.string().describe('edition headline, max 90 characters, based on the leading story'),
  intro: z.string().describe('editorial introduction, 80-140 words'),
  featuredId: z.string().nullable(),
  topIds: z.array(z.string()).describe('up to 10 article ids, most important first'),
  marketOverview: z.string().describe('60-120 words on market conditions using only the material; say if price data is absent'),
  sectionSummaries: z.array(z.object({ id: z.string(), summary: z.string().describe('40-90 words; empty string if section has no articles') })),
  analysis: z.string().describe('industry analysis, 120-200 words, clearly framed as analysis'),
  watchNext: z.array(z.string()).describe('3-5 short items to watch, grounded in the material'),
});

/**
 * Anthropic provider. Uses structured outputs so responses are schema-validated,
 * and server-side refusal fallbacks so a declined request is retried on a fallback model.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(readonly model: string) {
    this.client = new Anthropic({ maxRetries: 3, timeout: 180_000 });
  }

  private async call<T>(schema: z.ZodType<T>, system: string, user: string, maxTokens: number): Promise<T> {
    const res = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') throw new Error('model declined the request');
    if (res.stop_reason === 'max_tokens') throw new Error('response truncated (max_tokens)');
    if (!res.parsed_output) throw new Error('no parsed output');
    return res.parsed_output as T;
  }

  async enrich(batch: EnrichInput[]): Promise<EnrichOutput[]> {
    const material = batch
      .map(
        (b) =>
          `<item id="${b.id}">\n<headline>${b.title}</headline>\n<publisher>${b.publisher}</publisher>\n<published>${b.publishedAt}</published>\n<excerpt>${b.excerpt || '(no excerpt provided by publisher)'}</excerpt>\n<heuristic_tags region="${b.heuristic.region}" categories="${b.heuristic.categories.join(',')}" companies="${b.heuristic.companies.join(',')}"/>\n</item>`,
      )
      .join('\n');
    const user = `Process each news item below for SteelScope. Return one entry per item id.

Category ids: ${CATEGORIES.map((c) => `${c.id} (${c.label})`).join('; ')}.
Importance guide: 80+ major policy/trade action, large M&A, major price shock, results of a top-5 producer; 50-79 notable company, market or policy news; below 30 marginal or tangential.
When an item has only a headline, keep the summary to what the headline states and set keyFacts to [] or facts directly in the headline.

<material>
${material}
</material>`;
    const out = await this.call(EnrichSchema, EDITORIAL_RULES, user, 16000);
    return out.items.map((i) => ({ ...i, importance: Math.max(0, Math.min(100, i.importance)) }));
  }

  async writeEdition(input: EditionInput): Promise<EditionOutput> {
    const regionName = input.region === 'india' ? 'India Edition (Indian steel industry)' : 'World Edition (global steel industry)';
    const articles = input.articles
      .map((a) => `<article id="${a.id}" publisher="${a.publisher}" categories="${a.categories.join(',')}" geo="${a.geo.join(',')}" importance="${a.importance}">\n<headline>${a.title}</headline>\n<summary>${a.summary}</summary>\n</article>`)
      .join('\n');
    const sections = input.sections.map((s) => `- ${s.id} "${s.title}": ${s.articleIds.join(', ') || '(no articles)'}`).join('\n');
    const what = input.period ? `weekly report ("The Week in Steel") of the ${regionName} covering ${input.period.from} to ${input.period.to}. Synthesise the week's main themes rather than listing stories one by one` : `${regionName} for ${input.date}`;
    const user = `Write the SteelScope ${what}.

You receive the day's articles (with SteelScope summaries derived from publisher excerpts) and the edition sections with their assigned article ids. Write only about these articles.

Sections:
${sections}

<articles>
${articles}
</articles>`;
    log('ai', `edition ${input.region} ${input.date}: ${input.articles.length} articles`);
    return this.call(EditionSchema, EDITORIAL_RULES, user, 16000);
  }
}
