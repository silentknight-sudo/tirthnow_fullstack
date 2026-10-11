import { type ReportTarget } from '@prisma/client';

export const REELS_EVENTS = {
  published: 'reel.published',
  reported: 'moderation.reported',
} as const;

export interface ReelPublishedEvent {
  reelId: string;
  userId: string;
}

/** A report was opened (by a user, or automatically by content moderation). */
export interface ReportedEvent {
  reportId: string;
  targetType: ReportTarget;
  targetId: string;
  reasonCode: string;
  automatic: boolean;
}
