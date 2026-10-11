import { type ModerationCategory } from '../../core/providers';

export const REVIEW_EVENTS = {
  flagged: 'review.flagged',
} as const;

/** Raised when automatic moderation holds a review back; reels/moderation opens a report. */
export interface ReviewFlaggedEvent {
  reviewId: string;
  userId: string;
  categories: ModerationCategory[];
  scores: Partial<Record<ModerationCategory, number>>;
}
