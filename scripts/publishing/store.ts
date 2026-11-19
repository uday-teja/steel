import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Article, ArticleCard, Edition } from '../../src/types/news';
import { readJson, writeJson } from '../lib/util';

export class DataStore {
  constructor(readonly root: string) {}

  p(...parts: string[]): string {
    return path.join(this.root, ...parts);
  }

  async loadArticles(): Promise<Article[]> {
    const dir = this.p('articles');
    const files = await fs.readdir(dir).catch(() => [] as string[]);
    const out: Article[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const a = await readJson<Article | null>(path.join(dir, f), null);
      if (a?.id) out.push(a);
    }
    return out;
  }

  async saveArticle(a: Article): Promise<void> {
    await writeJson(this.p('articles', `${a.slug}.json`), a);
  }

  async deleteArticle(slug: string): Promise<void> {
    await fs.rm(this.p('articles', `${slug}.json`), { force: true });
  }

  async loadEdition(region: string, date: string): Promise<Edition | null> {
    return readJson<Edition | null>(this.p('editions', region, `${date}.json`), null);
  }

  async saveEdition(e: Edition): Promise<void> {
    await writeJson(this.p('editions', e.region, `${e.date}.json`), e);
  }

  async listEditionFiles(): Promise<{ region: string; date: string }[]> {
    const out: { region: string; date: string }[] = [];
    for (const region of ['india', 'world']) {
      const files = await fs.readdir(this.p('editions', region)).catch(() => [] as string[]);
      for (const f of files) if (/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) out.push({ region, date: f.slice(0, 10) });
    }
    return out;
  }

  async removeFile(...parts: string[]): Promise<void> {
    await fs.rm(this.p(...parts), { force: true });
  }

  async listDir(...parts: string[]): Promise<string[]> {
    return fs.readdir(this.p(...parts)).catch(() => [] as string[]);
  }

  write(rel: string, data: unknown): Promise<void> {
    return writeJson(this.p(rel), data);
  }

  read<T>(rel: string, fallback: T): Promise<T> {
    return readJson<T>(this.p(rel), fallback);
  }
}

export function toCard(a: Article): ArticleCard {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    aiSummary: a.aiSummary,
    region: a.region,
    geo: a.geo,
    categories: a.categories,
    primaryCategory: a.primaryCategory,
    companies: a.companies,
    publisher: a.publisher,
    sourceId: a.sourceId,
    url: a.url,
    publishedAt: a.publishedAt,
    collectedAt: a.collectedAt,
    editionDate: a.editionDate,
    importance: a.importance,
  };
}

export function byRecency(a: ArticleCard, b: ArticleCard): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

/** Rank by importance with a recency decay (half-life ~30h). */
export function rankScore(a: ArticleCard, now = Date.now()): number {
  const ageH = Math.max(0, (now - new Date(a.publishedAt).getTime()) / 36e5);
  return a.importance * Math.pow(0.5, ageH / 30);
}
