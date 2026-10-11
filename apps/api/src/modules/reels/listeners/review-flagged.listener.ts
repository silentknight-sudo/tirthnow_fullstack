import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { REVIEW_EVENTS, type ReviewFlaggedEvent } from '../../reviews';
import { ModerationService } from '../services/moderation.service';

/** Reviews held back by automatic moderation land in the same queue as user reports. */
@Injectable()
export class ReviewFlaggedListener {
  private readonly logger = new Logger(ReviewFlaggedListener.name);

  constructor(private readonly moderation: ModerationService) {}

  @OnEvent(REVIEW_EVENTS.flagged, { async: true, promisify: true })
  async onFlagged(e: ReviewFlaggedEvent): Promise<void> {
    try {
      await this.moderation.autoReport('review', e.reviewId, {
        categories: e.categories,
        scores: e.scores,
      });
    } catch (err) {
      this.logger.error(
        { err, reviewId: e.reviewId },
        'could not open a report for a flagged review',
      );
    }
  }
}
