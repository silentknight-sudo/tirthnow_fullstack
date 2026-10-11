import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER, type LlmProvider } from '../llm/llm.provider';
import {
  type ModerationCategory,
  type ModerationProvider,
  type ModerationResult,
} from './moderation.provider';

const CATEGORIES: ModerationCategory[] = [
  'abuse',
  'hate',
  'sexual',
  'violence',
  'spam',
  'self_harm',
];
const SCHEMA = {
  type: 'object',
  properties: {
    flagged: { type: 'boolean' },
    categories: { type: 'array', items: { type: 'string', enum: CATEGORIES } },
  },
  required: ['flagged', 'categories'],
  additionalProperties: false,
};
const SYSTEM = `[task:moderate]
You moderate user posts on a Hindu pilgrimage travel app for Mathura-Vrindavan (captions, comments, reviews), in English, Hindi or Hinglish.
Flag only clear violations: abuse or harassment, hate against any group or faith, sexual content, threats or glorified violence, self-harm, and spam (phone numbers, touts, paid "VIP darshan" offers, link farms).
Honest negative reviews, devotional language and complaints about crowds or prices are allowed.
Reply with JSON only.`;

/** Text moderation with the cheap model; fails open to "not flagged" when the model is unavailable. */
@Injectable()
export class LlmModerationAdapter implements ModerationProvider {
  readonly name = 'llm';
  private readonly logger = new Logger(LlmModerationAdapter.name);

  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  async moderateText(text: string): Promise<ModerationResult> {
    try {
      const r = await this.llm.complete({
        tier: 'cheap',
        system: SYSTEM,
        messages: [{ role: 'user', text }],
        jsonSchema: SCHEMA,
        maxTokens: 300,
        effort: 'low',
      });
      const parsed = JSON.parse(r.text) as { flagged?: unknown; categories?: unknown };
      const categories = Array.isArray(parsed.categories)
        ? parsed.categories.filter((c): c is ModerationCategory =>
            CATEGORIES.includes(c as ModerationCategory),
          )
        : [];
      const flagged = parsed.flagged === true;
      return { flagged, categories, scores: Object.fromEntries(categories.map((c) => [c, 0.8])) };
    } catch (err) {
      // User reports remain the backstop; never block posting on a moderation outage.
      this.logger.warn({ err }, 'LLM moderation unavailable; content allowed');
      return { flagged: false, categories: [], scores: {} };
    }
  }
}
