import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type ModAction, type Report, type ReportTarget } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { AppException, afterCursor, NEWEST_FIRST, pageSize, toPage } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { type ModerationResult } from '../../../core/providers';
import { IdentityFacade } from '../../identity';
import { NotificationsFacade } from '../../notifications';
import { ReviewsFacade } from '../../reviews';
import { VendorsFacade } from '../../vendors';
import {
  type CreateReportDto,
  type ModerationActionDto,
  type ModerationQueueQueryDto,
} from '../dto/reels.dto';
import { REELS_EVENTS, type ReportedEvent } from '../events';

/** Distinct open user reports that hide content until a moderator looks at it. */
export const AUTO_HIDE_REPORTS = 3;

const invalid = (message: string) =>
  new AppException(ERROR_CODES.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);

export interface TargetPreview {
  exists: boolean;
  authorId: string | null;
  summary: Record<string, unknown>;
}

/** Reports, automatic flags and moderator actions across reels, comments, reviews, users and vendors. */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly reviews: ReviewsFacade,
    private readonly vendors: VendorsFacade,
    private readonly notifications: NotificationsFacade,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  // ───────────── reports ─────────────

  async report(user: AuthPrincipal, dto: CreateReportDto): Promise<{ id: string; status: string }> {
    const target = await this.preview(dto.targetType, dto.targetId);
    if (!target.exists) throw AppException.notFound('Nothing to report there');
    if (target.authorId === user.userId) throw invalid('You cannot report your own content');
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId: user.userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'open',
      },
    });
    if (existing) return { id: existing.id, status: existing.status };
    const report = await this.prisma.report.create({
      data: {
        reporterId: user.userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reasonCode: dto.reasonCode,
        details: dto.details ?? null,
      },
    });
    this.announce(report, false);
    const reporters = await this.prisma.report.findMany({
      where: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'open',
        reporterId: { not: null },
      },
      distinct: ['reporterId'],
      select: { reporterId: true },
    });
    if (reporters.length >= AUTO_HIDE_REPORTS)
      await this.hidePendingReview(dto.targetType, dto.targetId);
    return { id: report.id, status: report.status };
  }

  /** Automatic flag from content moderation (reporter = null). */
  async autoReport(
    targetType: ReportTarget,
    targetId: string,
    result: Pick<ModerationResult, 'categories' | 'scores'>,
  ): Promise<void> {
    const report = await this.prisma.report.create({
      data: {
        reporterId: null,
        targetType,
        targetId,
        reasonCode: `auto:${result.categories[0] ?? 'flagged'}`,
        aiScores: result.scores,
      },
    });
    this.announce(report, true);
  }

  private announce(report: Report, automatic: boolean): void {
    const event: ReportedEvent = {
      reportId: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reasonCode: report.reasonCode,
      automatic,
    };
    this.events.emit(REELS_EVENTS.reported, event);
  }

  /** Enough people reported it: take it out of public view until a moderator decides. */
  private async hidePendingReview(targetType: ReportTarget, targetId: string): Promise<void> {
    switch (targetType) {
      case 'reel':
        await this.prisma.reel.updateMany({
          where: { id: targetId, status: 'published' },
          data: { status: 'hidden', moderationStatus: 'flagged' },
        });
        break;
      case 'comment':
        await this.prisma.reelComment.updateMany({
          where: { id: targetId, moderationStatus: 'approved' },
          data: { moderationStatus: 'flagged' },
        });
        await this.recountComments(targetId);
        break;
      case 'review':
        await this.reviews.setModeration(targetId, 'flagged');
        break;
      default:
        // Users and vendors are never auto-suspended; they wait for a moderator.
        return;
    }
    this.logger.warn({ targetType, targetId }, 'content hidden pending moderation');
  }

  // ───────────── admin queue ─────────────

  async queue(q: ModerationQueueQueryDto) {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.report.findMany({
      where: {
        status: q.status ?? 'open',
        ...(q.targetType ? { targetType: q.targetType } : {}),
        ...afterCursor(q.cursor),
      },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    const page = toPage(rows, limit);
    const openCounts = await this.prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      where: { status: 'open', targetId: { in: [...new Set(page.data.map((r) => r.targetId))] } },
      _count: { _all: true },
    });
    const counts = new Map(openCounts.map((c) => [`${c.targetType}:${c.targetId}`, c._count._all]));
    const data = await Promise.all(
      page.data.map(async (r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reasonCode: r.reasonCode,
        details: r.details,
        automatic: r.reporterId === null,
        aiScores: r.aiScores,
        status: r.status,
        openReportsOnTarget: counts.get(`${r.targetType}:${r.targetId}`) ?? 0,
        target: await this.preview(r.targetType, r.targetId),
        createdAt: r.createdAt.toISOString(),
      })),
    );
    return { data, nextCursor: page.nextCursor };
  }

  async act(admin: AuthPrincipal, reportId: string, dto: ModerationActionDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw AppException.notFound('Report not found');
    const target = await this.preview(report.targetType, report.targetId);
    await this.apply(report.targetType, report.targetId, dto.action, target.authorId);
    const dismiss = dto.action === 'approve' || dto.action === 'restore';
    await this.prisma.$transaction([
      this.prisma.moderationAction.create({
        data: {
          reportId,
          targetType: report.targetType,
          targetId: report.targetId,
          action: dto.action,
          actorId: admin.userId,
          note: dto.note ?? null,
        },
      }),
      // One decision closes every open report on the same target.
      this.prisma.report.updateMany({
        where: { targetType: report.targetType, targetId: report.targetId, status: 'open' },
        data: { status: dismiss ? 'dismissed' : 'actioned' },
      }),
    ]);
    await this.audit.record({
      actor: admin,
      action: `moderation.${dto.action}`,
      entityType: report.targetType,
      entityId: report.targetId,
      after: { reportId, note: dto.note ?? null },
    });
    return {
      reportId,
      action: dto.action,
      target: await this.preview(report.targetType, report.targetId),
    };
  }

  private async apply(
    type: ReportTarget,
    id: string,
    action: ModAction,
    authorId: string | null,
  ): Promise<void> {
    if (action === 'warn_user' || action === 'suspend_user') {
      if (!authorId) throw invalid('This target has no author to act on');
      if (action === 'suspend_user') {
        await this.identity.setStatus(authorId, 'suspended');
        if (type !== 'user' && type !== 'vendor') await this.applyContent(type, id, 'remove');
      } else {
        await this.notifications.notifyUsers({
          userIds: [authorId],
          key: 'content_warning',
          vars: {
            outcome: type === 'user' || type === 'vendor' ? 'reviewed' : 'kept with a warning',
          },
        });
      }
      return;
    }
    if (type === 'user' || type === 'vendor') {
      if (action !== 'approve' && action !== 'restore')
        throw invalid(`Use warn_user or suspend_user for ${type} reports`);
      return;
    }
    await this.applyContent(type, id, action);
    if ((action === 'hide' || action === 'remove') && authorId) {
      await this.notifications.notifyUsers({
        userIds: [authorId],
        key: 'content_warning',
        vars: { outcome: action === 'hide' ? 'hidden' : 'removed' },
      });
    }
  }

  private async applyContent(
    type: 'reel' | 'comment' | 'review',
    id: string,
    action: 'approve' | 'restore' | 'hide' | 'remove',
  ): Promise<void> {
    const visible = action === 'approve' || action === 'restore';
    switch (type) {
      case 'reel': {
        const reel = await this.prisma.reel.findUnique({ where: { id } });
        if (!reel) return;
        await this.prisma.reel.update({
          where: { id },
          data: visible
            ? { moderationStatus: 'approved', status: reel.playbackUrl ? 'published' : reel.status }
            : action === 'hide'
              ? { status: 'hidden' }
              : { status: 'removed', moderationStatus: 'removed' },
        });
        return;
      }
      case 'comment':
        await this.prisma.reelComment.update({
          where: { id },
          data: { moderationStatus: visible ? 'approved' : 'removed' },
        });
        await this.recountComments(id);
        return;
      case 'review':
        await this.reviews.setModeration(
          id,
          visible ? 'approved' : action === 'hide' ? 'flagged' : 'removed',
        );
        return;
    }
  }

  /** comment_count counts approved, undeleted comments only. */
  async recountComments(commentId: string): Promise<void> {
    const c = await this.prisma.reelComment.findUnique({
      where: { id: commentId },
      select: { reelId: true },
    });
    if (!c) return;
    const count = await this.prisma.reelComment.count({
      where: { reelId: c.reelId, moderationStatus: 'approved', deletedAt: null },
    });
    await this.prisma.reel.update({ where: { id: c.reelId }, data: { commentCount: count } });
  }

  async preview(type: ReportTarget, id: string): Promise<TargetPreview> {
    switch (type) {
      case 'reel': {
        const r = await this.prisma.reel.findFirst({ where: { id, deletedAt: null } });
        return r
          ? {
              exists: true,
              authorId: r.userId,
              summary: {
                caption: r.caption,
                playbackUrl: r.playbackUrl,
                status: r.status,
                moderationStatus: r.moderationStatus,
              },
            }
          : { exists: false, authorId: null, summary: {} };
      }
      case 'comment': {
        const c = await this.prisma.reelComment.findFirst({ where: { id, deletedAt: null } });
        return c
          ? {
              exists: true,
              authorId: c.userId,
              summary: { reelId: c.reelId, body: c.body, moderationStatus: c.moderationStatus },
            }
          : { exists: false, authorId: null, summary: {} };
      }
      case 'review': {
        const r = await this.reviews.preview(id);
        return r
          ? {
              exists: true,
              authorId: r.userId,
              summary: { rating: r.rating, body: r.body, moderationStatus: r.moderationStatus },
            }
          : { exists: false, authorId: null, summary: {} };
      }
      case 'user': {
        const status = await this.identity.userStatus(id);
        if (!status || status === 'deleted') return { exists: false, authorId: null, summary: {} };
        const profile = (await this.identity.publicProfiles([id])).get(id);
        return {
          exists: true,
          authorId: id,
          summary: { displayName: profile?.displayName ?? null, status },
        };
      }
      case 'vendor': {
        const v = await this.vendors.get(id);
        return v
          ? {
              exists: true,
              authorId: v.ownerUserId,
              summary: { displayName: v.displayName, status: v.status },
            }
          : { exists: false, authorId: null, summary: {} };
      }
    }
  }
}
