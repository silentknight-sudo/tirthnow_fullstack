import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import {
  AppException,
  afterCursor,
  NEWEST_FIRST,
  type Page,
  pageSize,
  toPage,
} from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { InventoryFacade } from '../../inventory';
import { NotificationsFacade } from '../../notifications';
import { VendorsFacade } from '../../vendors';
import { type ReviewResponse, type VendorReviewQueryDto } from '../dto/reviews.dto';
import { ReviewsService } from './reviews.service';

/** Reviews of a vendor and its listings, and the vendor's public reply. */
@Injectable()
export class VendorReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryFacade,
    private readonly vendors: VendorsFacade,
    private readonly notifications: NotificationsFacade,
    private readonly reviews: ReviewsService,
  ) {}

  private async scope(vendorId: string): Promise<Prisma.ReviewWhereInput> {
    const ids = await this.inventory.vendorListingIds(vendorId);
    return {
      deletedAt: null,
      moderationStatus: 'approved',
      OR: [
        { targetType: 'vendor', targetId: vendorId },
        { targetType: 'hotel', targetId: { in: ids.hotel } },
        { targetType: 'restaurant', targetId: { in: ids.restaurant } },
        { targetType: 'experience', targetId: { in: ids.experience } },
      ],
    };
  }

  /** Average and 1–5 star distribution across the vendor and all its listings. */
  async ratingSummary(vendorId: string) {
    const rows = await this.prisma.review.groupBy({
      by: ['rating'],
      where: await this.scope(vendorId),
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

  async list(vendorId: string, q: VendorReviewQueryDto): Promise<Page<ReviewResponse>> {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.review.findMany({
      where: {
        AND: [
          await this.scope(vendorId),
          q.unanswered === 'true' ? { vendorReply: null } : {},
          afterCursor(q.cursor),
        ],
      },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    const page = toPage(rows, limit);
    return { data: await this.reviews.toResponses(page.data), nextCursor: page.nextCursor };
  }

  async reply(vendorId: string, reviewId: string, reply: string): Promise<ReviewResponse> {
    const review = await this.prisma.review.findFirst({
      where: { AND: [{ id: reviewId }, await this.scope(vendorId)] },
    });
    if (!review) throw AppException.notFound('Review not found');
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { vendorReply: reply.trim(), vendorRepliedAt: new Date() },
    });
    const vendor = await this.vendors.get(vendorId);
    await this.notifications.notifyUsers({
      userIds: [review.userId],
      key: 'review_reply',
      vars: {
        business: vendor?.displayName ?? 'The host',
        reply: reply.length > 140 ? `${reply.slice(0, 137)}…` : reply,
      },
      payload: { type: 'review', reviewId },
    });
    return this.reviews.toResponse(updated);
  }
}
