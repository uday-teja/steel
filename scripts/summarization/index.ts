import { log } from '../lib/util';
import { AnthropicProvider } from './anthropic';
import type { AiProvider } from './provider';

/**
 * Select the AI provider from environment configuration (GitHub Actions variables/secrets).
 *
 *   AI_PROVIDER = anthropic | none        (default: anthropic when ANTHROPIC_API_KEY is set, else none)
 *   AI_MODEL    = model id                (default: claude-opus-5-5)
 *
 * To add a provider, implement `AiProvider` in this folder and register it below.
 */
export function createProvider(): AiProvider | null {
  const requested = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const provider = requested || (hasAnthropic ? 'anthropic' : 'none');

  if (provider === 'none') {
    log('ai', 'AI disabled - publishing publisher excerpts with heuristic classification only');
    return null;
  }
  if (provider === 'anthropic') {
    if (!hasAnthropic) {
      log('ai', 'AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set - continuing without AI');
      return null;
    }
    const model = process.env.AI_MODEL?.trim() || 'claude-opus-5-5';
    log('ai', `provider anthropic, model ${model}`);
    return new AnthropicProvider(model);
  }
  log('ai', `Unknown AI_PROVIDER "${provider}" - continuing without AI`);
  return null;
}
