import type { CategoryId, GeoTag, Region } from '../../src/types/news';

export interface EnrichInput {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string;
  /** Publisher-supplied feed description (may be empty). This is the ONLY source text the model sees. */
  excerpt: string;
  heuristic: { region: Region; categories: CategoryId[]; companies: string[] };
}

export interface EnrichOutput {
  id: string;
  relevant: boolean;
  region: Region;
  categories: CategoryId[];
  geo: GeoTag[];
  companies: string[];
  importance: number;
  dek: string;
  summary: string;
  keyFacts: string[];
  whyItMatters: string;
  implications: string;
  duplicateOf: string | null;
}

export interface EditionArticleInput {
  id: string;
  title: string;
  publisher: string;
  summary: string;
  categories: CategoryId[];
  geo: GeoTag[];
  importance: number;
}

export interface EditionInput {
  region: Region;
  date: string;
  articles: EditionArticleInput[];
  sections: { id: string; title: string; articleIds: string[] }[];
}

export interface EditionOutput {
  title: string;
  intro: string;
  featuredId: string | null;
  topIds: string[];
  marketOverview: string;
  sectionSummaries: { id: string; summary: string }[];
  analysis: string;
  watchNext: string[];
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  enrich(batch: EnrichInput[]): Promise<EnrichOutput[]>;
  writeEdition(input: EditionInput): Promise<EditionOutput>;
}

export const EDITORIAL_RULES = `You are the editorial desk of SteelScope, a serious daily publication on the Indian and global steel industry.

Non-negotiable rules:
- Use ONLY the information in the material provided to you. You have not read the full articles; you see headlines and short publisher excerpts.
- Never invent news, quotes, prices, volumes, percentages, financial figures, dates, statistics or company announcements. Every number you write must appear verbatim in the provided material.
- If the material is too thin to support a statement, say so plainly (for example: "The publisher's excerpt does not give price levels."). Do not fill gaps with general knowledge presented as fact.
- Keep analysis clearly framed as analysis ("This could...", "Readers should watch..."), grounded in widely understood industry dynamics, and never as reported fact.
- Write in clear, restrained British-Indian business English, like the Financial Times or The Economist. No hype, no exclamation marks, no emojis.
- Attribute reported facts to the publisher (for example: "according to The Economic Times").`;
