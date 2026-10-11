export type ModerationCategory = 'abuse' | 'hate' | 'sexual' | 'violence' | 'spam' | 'self_harm';

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategory[];
  /** 0..1 per category, for the admin queue. */
  scores: Partial<Record<ModerationCategory, number>>;
}

/** Text moderation for user content (captions, comments, reviews). LLM-backed in production. */
export interface ModerationProvider {
  readonly name: string;
  moderateText(text: string): Promise<ModerationResult>;
}

export const MODERATION_PROVIDER = Symbol('MODERATION_PROVIDER');
