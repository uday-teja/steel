/**
 * Factual guard for AI output. Any sentence containing a number that does not
 * appear in the source material is removed, so a model can never introduce a
 * price, volume, percentage or financial figure the publisher did not state.
 */

const NUM_RE = /(?:₹|rs\.?|\$|€|£|us\$)?\s?\d[\d,]*(?:\.\d+)?\s?(?:%|per cent|percent|mt|mtpa|bn|billion|million|mn|crore|lakh|tonnes?|tons?|t\b|k\b)?/gi;

function normaliseNumber(token: string): string | null {
  const digits = token.replace(/[^\d.]/g, '').replace(/^\.+|\.+$/g, '');
  if (!digits) return null;
  // Ignore bare small integers (1-12) used in prose ("Q2", "10 stories"); never percentages or amounts.
  const n = Number(digits);
  if (Number.isFinite(n) && Number.isInteger(n) && n <= 12 && /^\d+$/.test(token.trim())) return null;
  // Bare years ("in 2026") are allowed; amounts like "2,000", "₹2000" or "2000 tonnes" are not.
  if (/^(19|20)\d{2}$/.test(token.trim()) && n >= 1990 && n <= 2039) return null;
  return digits.replace(/\.0+$/, '');
}

function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.match(NUM_RE) ?? []) {
    const n = normaliseNumber(m);
    if (n) out.add(n);
  }
  return out;
}

export function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+(?:[.!?](?!\d)|$)+/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

export interface GuardResult {
  text: string;
  removed: number;
}

export function guardText(text: string, source: string): GuardResult {
  if (!text) return { text: '', removed: 0 };
  const allowed = numbersIn(source);
  let removed = 0;
  const kept = splitSentences(text).filter((s) => {
    for (const n of numbersIn(s)) {
      if (!allowed.has(n)) {
        removed++;
        return false;
      }
    }
    return true;
  });
  return { text: kept.join(' ').trim(), removed };
}

export function guardList(items: string[], source: string): { items: string[]; removed: number } {
  let removed = 0;
  const out = items
    .map((i) => {
      const r = guardText(i, source);
      removed += r.removed;
      return r.text;
    })
    .filter(Boolean);
  return { items: out, removed };
}
