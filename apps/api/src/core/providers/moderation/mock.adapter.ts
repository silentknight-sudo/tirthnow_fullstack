import { Injectable } from '@nestjs/common';
import {
  type ModerationCategory,
  type ModerationProvider,
  type ModerationResult,
} from './moderation.provider';

/** Small fixture blocklist; words are deliberately mild placeholders plus obvious spam patterns. */
const BLOCKLIST: Record<string, ModerationCategory> = {
  idiot: 'abuse',
  stupid: 'abuse',
  scumbag: 'abuse',
  kill: 'violence',
  nsfw: 'sexual',
  'buy followers': 'spam',
};
const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{9}/;
const LINKS = /https?:\/\/\S+/g;

/** Deterministic moderation for development and tests (docs/INTEGRATIONS.md). */
@Injectable()
export class MockModerationAdapter implements ModerationProvider {
  readonly name = 'mock';

  moderateText(text: string): Promise<ModerationResult> {
    const lower = text.toLowerCase();
    const categories = new Set<ModerationCategory>();
    for (const [word, category] of Object.entries(BLOCKLIST)) {
      if (new RegExp(`\\b${word}\\b`).test(lower)) categories.add(category);
    }
    // Contact details and link farms in public content are treated as spam.
    if (PHONE.test(text) || (text.match(LINKS)?.length ?? 0) >= 2) categories.add('spam');
    const list = [...categories];
    return Promise.resolve({
      flagged: list.length > 0,
      categories: list,
      scores: Object.fromEntries(list.map((c) => [c, 0.9])),
    });
  }
}
