import { Injectable } from '@nestjs/common';
import { type ModerationStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma';
import { ReviewsService } from './services/reviews.service';

/** Public surface of the reviews module (moderation acts through it). */
@Injectable()
export class ReviewsFacade {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Author and text for the moderation queue; null when missing or deleted. */
  async preview(reviewId: string): Promise<{
    id: string;
    userId: string;
    rating: number;
    body: string | null;
    moderationStatus: ModerationStatus;
  } | null> {
    return this.prisma.review.findFirst({
      where: { id: reviewId, deletedAt: null },
      select: { id: true, userId: true, rating: true, body: true, moderationStatus: true },
    });
  }

  async setModeration(reviewId: string, status: ModerationStatus): Promise<boolean> {
    return (await this.reviews.setModeration(reviewId, status)) !== null;
  }
}
