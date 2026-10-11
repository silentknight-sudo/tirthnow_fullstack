import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type ModerationStatus, type Review, type ReviewTarget } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import {
  AppException,
  afterCursor,
  NEWEST_FIRST,
  type Page,
  pageSize,
  toPage,
} from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { MODERATION_PROVIDER, type ModerationProvider } from '../../../core/providers';
import { CatalogFacade } from '../../catalog';
import { FilesFacade } from '../../files';
import { IdentityFacade } from '../../identity';
import { InventoryFacade } from '../../inventory';
import { OrdersFacade } from '../../orders';
import {
  type CreateReviewDto,
  type RatingSummaryResponse,
  type ReviewPageResponse,
  type ReviewQueryDto,
  type ReviewResponse,
  type UpdateReviewDto,
} from '../dto/reviews.dto';
import { REVIEW_EVENTS, type ReviewFlaggedEvent } from '../events';

const notAllowed = (message: string) =>
  new AppException(ERROR_CODES.REVIEW_NOT_ALLOWED, HttpStatus.FORBIDDEN, message);
const VISIBLE = { deletedAt: null, moderationStatus: 'approved' as const };

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersFacade,
    private readonly catalog: CatalogFacade,
    private readonly inventory: InventoryFacade,
    private readonly files: FilesFacade,
    private readonly identity: IdentityFacade,
    private readonly events: EventEmitter2,
    @Inject(MODERATION_PROVIDER) private readonly moderation: ModerationProvider,
  ) {}

  /** Verified reviews: listings and vendors need the reviewer's completed order; temples are open to all. */
  async create(user: AuthPrincipal, dto: CreateReviewDto): Promise<ReviewResponse> {
    if (dto.targetType === 'temple') {
      if (!(await this.catalog.templeExists(dto.targetId)))
        throw AppException.notFound('Temple not found');
      const existing = await this.prisma.review.count({
        where: {
          userId: user.userId,
          targetType: 'temple',
          targetId: dto.targetId,
          deletedAt: null,
        },
      });
      if (existing > 0)
        throw new AppException(
          ERROR_CODES.CONFLICT,
          HttpStatus.CONFLICT,
          'You already reviewed this temple; edit that review instead',
        );
    } else {
      if (!dto.orderId) throw notAllowed('Reviews of bookings need the completed order');
      await this.assertOrderMatches(user.userId, dto.orderId, dto.targetType, dto.targetId);
    }
    if (dto.mediaIds?.length)
      await this.files.requireAllReady(dto.mediaIds, {
        ownerUserId: user.userId,
        purposes: ['review_image'],
      });
    const status = await this.moderate(dto.body);
    const review = await this.prisma.review.create({
      data: {
        userId: user.userId,
        orderId: dto.targetType === 'temple' ? null : (dto.orderId ?? null),
        targetType: dto.targetType,
        targetId: dto.targetId,
        rating: dto.rating,
        body: dto.body?.trim() || null,
        mediaIds: dto.mediaIds ?? [],
        moderationStatus: status.status,
      },
    });
    await this.afterChange(review, status);
    return this.toResponse(review);
  }

  async update(user: AuthPrincipal, id: string, dto: UpdateReviewDto): Promise<ReviewResponse> {
    const review = await this.owned(user, id);
    if (review.moderationStatus === 'removed')
      throw notAllowed('This review was removed by moderators');
    if (dto.mediaIds?.length)
      await this.files.requireAllReady(dto.mediaIds, {
        ownerUserId: user.userId,
        purposes: ['review_image'],
      });
    const bodyChanged = dto.body !== undefined && dto.body !== review.body;
    const status = bodyChanged ? await this.moderate(dto.body) : null;
    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() || null } : {}),
        ...(dto.mediaIds !== undefined ? { mediaIds: dto.mediaIds } : {}),
        ...(status ? { moderationStatus: status.status } : {}),
      },
    });
    await this.afterChange(updated, status);
    return this.toResponse(updated);
  }

  async remove(user: AuthPrincipal, id: string): Promise<void> {
    const review = await this.owned(user, id);
    const deleted = await this.prisma.review.update({
      where: { id: review.id },
      data: { deletedAt: new Date() },
    });
    await this.afterChange(deleted, null);
  }

  async list(q: ReviewQueryDto): Promise<ReviewPageResponse> {
    const limit = pageSize(q.limit);
    const where = { targetType: q.targetType, targetId: q.targetId, ...VISIBLE };
    const [rows, summary] = await Promise.all([
      this.prisma.review.findMany({
        where: { ...where, ...(q.rating ? { rating: q.rating } : {}), ...afterCursor(q.cursor) },
        orderBy: NEWEST_FIRST,
        take: limit + 1,
      }),
      this.summary(q.targetType, q.targetId),
    ]);
    const page = toPage(rows, limit);
    return { summary, data: await this.toResponses(page.data), nextCursor: page.nextCursor };
  }

  async mine(
    user: AuthPrincipal,
    q: { cursor?: string; limit?: number },
  ): Promise<Page<ReviewResponse>> {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.review.findMany({
      where: { userId: user.userId, deletedAt: null, ...afterCursor(q.cursor) },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    const page = toPage(rows, limit);
    return { data: await this.toResponses(page.data), nextCursor: page.nextCursor };
  }

  async summary(targetType: ReviewTarget, targetId: string): Promise<RatingSummaryResponse> {
    const rows = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { targetType, targetId, ...VISIBLE },
      _count: { _all: true },
    });
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let count = 0;
    let total = 0;
    for (const r of rows) {
      distribution[String(r.rating)] = r._count._all;
      count += r._count._all;
      total += r.rating * r._count._all;
    }
    return { average: count ? Math.round((total / count) * 10) / 10 : 0, count, distribution };
  }

  // ───────────── used by moderation (facade) ─────────────

  async setModeration(id: string, status: ModerationStatus): Promise<Review | null> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) return null;
    const updated = await this.prisma.review.update({
      where: { id },
      data: { moderationStatus: status },
    });
    await this.refreshListingRating(updated);
    return updated;
  }

  // ───────────── internals ─────────────

  private async assertOrderMatches(
    userId: string,
    orderId: string,
    targetType: ReviewTarget,
    targetId: string,
  ): Promise<void> {
    const order = await this.orders.completedOrderFor(userId, orderId);
    if (!order) throw notAllowed('You can review a booking once it is completed');
    const d = order.parsed;
    const matches =
      targetType === 'vendor'
        ? order.vendorId === targetId
        : targetType === 'hotel'
          ? d.hotel?.hotelId === targetId
          : targetType === 'restaurant'
            ? d.food?.restaurantId === targetId
            : d.experience?.experienceId === targetId;
    if (!matches) throw notAllowed('This order is not for that listing');
  }

  private async moderate(body: string | undefined): Promise<{
    status: ModerationStatus;
    flagged: ReviewFlaggedEvent['categories'];
    scores: ReviewFlaggedEvent['scores'];
  }> {
    if (!body?.trim()) return { status: 'approved', flagged: [], scores: {} };
    const r = await this.moderation.moderateText(body);
    return { status: r.flagged ? 'flagged' : 'approved', flagged: r.categories, scores: r.scores };
  }

  private async afterChange(
    review: Review,
    moderation: Awaited<ReturnType<ReviewsService['moderate']>> | null,
  ): Promise<void> {
    await this.refreshListingRating(review);
    if (moderation?.status === 'flagged') {
      const event: ReviewFlaggedEvent = {
        reviewId: review.id,
        userId: review.userId,
        categories: moderation.flagged,
        scores: moderation.scores,
      };
      await this.events.emitAsync(REVIEW_EVENTS.flagged, event).catch((err: unknown) => {
        this.logger.error({ err, reviewId: review.id }, 'review.flagged listener failed');
      });
    }
  }

  /** Hotels keep a denormalised rating for search sorting. */
  private async refreshListingRating(review: Review): Promise<void> {
    if (review.targetType !== 'hotel') return;
    const s = await this.summary('hotel', review.targetId);
    await this.inventory.setHotelRating(review.targetId, s.average, s.count);
  }

  private async owned(user: AuthPrincipal, id: string): Promise<Review> {
    const review = await this.prisma.review.findFirst({
      where: { id, userId: user.userId, deletedAt: null },
    });
    if (!review) throw AppException.notFound('Review not found');
    return review;
  }

  async toResponses(rows: Review[]): Promise<ReviewResponse[]> {
    const authors = await this.identity.publicProfiles(rows.map((r) => r.userId));
    return Promise.all(rows.map((r) => this.toResponse(r, authors)));
  }

  async toResponse(
    r: Review,
    authors?: Map<string, { id: string; displayName: string; avatarUrl: string | null }>,
  ): Promise<ReviewResponse> {
    const author = (authors ?? (await this.identity.publicProfiles([r.userId]))).get(r.userId) ?? {
      id: r.userId,
      displayName: 'Yatri',
      avatarUrl: null,
    };
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      rating: r.rating,
      body: r.body,
      photoUrls: await this.files.urls(r.mediaIds, 'medium'),
      verifiedStay: r.orderId !== null,
      author,
      vendorReply: r.vendorReply,
      vendorRepliedAt: r.vendorRepliedAt?.toISOString() ?? null,
      moderationStatus: r.moderationStatus,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
