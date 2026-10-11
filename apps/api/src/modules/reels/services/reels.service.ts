import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Prisma, type Reel } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { type Job, type Queue } from 'bullmq';
import { type AuthPrincipal, hasAnyRole } from '../../../core/auth';
import { CacheService } from '../../../core/cache';
import { AppException } from '../../../core/http';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { PrismaService } from '../../../core/prisma';
import {
  MODERATION_PROVIDER,
  type ModerationProvider,
  VIDEO_PROVIDER,
  type VideoPlayback,
  type VideoProvider,
} from '../../../core/providers';
import { QUEUES } from '../../../core/queue';
import { CatalogFacade } from '../../catalog';
import { FilesFacade } from '../../files';
import { IdentityFacade, type PublicProfile } from '../../identity';
import {
  type CreateReelDto,
  type FeedQueryDto,
  type ReelPageResponse,
  type ReelResponse,
} from '../dto/reels.dto';
import { REELS_EVENTS, type ReelPublishedEvent } from '../events';
import { decodeScoreCursor, encodeScoreCursor, hotScore, normalizeHashtags } from '../hashtags';
import { ModerationService } from './moderation.service';

export const TRANSCODE_JOB = 'transcode-reel';
const VIEW_DEDUPE_S = 6 * 3600;
const SCORE_WINDOW_DAYS = 30;

/** Publicly visible reels. */
export const LIVE: Prisma.ReelWhereInput = {
  status: 'published',
  moderationStatus: 'approved',
  deletedAt: null,
};

@Injectable()
export class ReelsService implements OnModuleInit {
  private readonly logger = new Logger(ReelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesFacade,
    private readonly catalog: CatalogFacade,
    private readonly identity: IdentityFacade,
    private readonly cache: CacheService,
    private readonly maintenance: MaintenanceRegistry,
    private readonly moderation: ModerationService,
    private readonly events: EventEmitter2,
    @Inject(VIDEO_PROVIDER) private readonly video: VideoProvider,
    @Inject(MODERATION_PROVIDER) private readonly moderator: ModerationProvider,
    @InjectQueue(QUEUES.media) private readonly mediaQueue: Queue,
  ) {}

  onModuleInit(): void {
    this.files.registerMediaHandler(TRANSCODE_JOB, (job: Job) =>
      this.transcode((job.data as { reelId: string }).reelId),
    );
    this.maintenance.registerRecurring('reel-scores', 10 * 60_000, () => this.recomputeScores());
  }

  // ───────────── create & processing ─────────────

  async create(user: AuthPrincipal, dto: CreateReelDto, lang: Lang): Promise<ReelResponse> {
    // Processing is fine: transcoding waits for the content check to finish.
    await this.files.requireReady(dto.videoMediaId, {
      ownerUserId: user.userId,
      purposes: ['reel_video'],
      allowProcessing: true,
    });
    if (dto.thumbnailMediaId)
      await this.files.requireReady(dto.thumbnailMediaId, {
        ownerUserId: user.userId,
        purposes: ['reel_thumbnail'],
      });
    if (dto.templeId && !(await this.catalog.templeExists(dto.templeId)))
      throw AppException.badRequest('Unknown templeId');
    if (dto.cityId && !(await this.catalog.cityExists(dto.cityId)))
      throw AppException.badRequest('Unknown cityId');
    const caption = dto.caption?.trim() || null;
    const check = caption ? await this.moderator.moderateText(caption) : null;
    const reel = await this.prisma.reel.create({
      data: {
        userId: user.userId,
        videoMediaId: dto.videoMediaId,
        thumbnailMediaId: dto.thumbnailMediaId ?? null,
        caption,
        hashtags: normalizeHashtags(dto.hashtags, caption ?? undefined),
        cityId: dto.cityId ?? null,
        templeId: dto.templeId ?? null,
        moderationStatus: check?.flagged ? 'flagged' : 'pending',
      },
    });
    if (check?.flagged) await this.moderation.autoReport('reel', reel.id, check);
    // If the upload is still being verified, the media-ready event starts transcoding instead.
    if ((await this.files.get(dto.videoMediaId))?.status === 'ready')
      await this.enqueueTranscode(reel.id);
    return this.toResponse(reel, user.userId, lang);
  }

  async enqueueTranscode(reelId: string): Promise<void> {
    await this.mediaQueue.add(
      TRANSCODE_JOB,
      { reelId },
      { jobId: `reel-${reelId}`, attempts: 6, backoff: { type: 'exponential', delay: 3_000 } },
    );
  }

  /** The reel's upload finished verification: start (or abandon) transcoding. */
  async onVideoChecked(mediaId: string, ok: boolean): Promise<void> {
    const reels = await this.prisma.reel.findMany({
      where: { videoMediaId: mediaId, status: 'processing', videoProviderId: null },
      select: { id: true },
    });
    for (const r of reels) {
      if (ok) await this.enqueueTranscode(r.id);
      else await this.prisma.reel.update({ where: { id: r.id }, data: { status: 'removed' } });
    }
  }

  /** media queue job: hand the verified upload to the video provider. */
  async transcode(reelId: string): Promise<string> {
    const reel = await this.prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel || reel.status !== 'processing' || reel.deletedAt) return 'skipped';
    if (reel.videoProviderId) return 'already-ingesting';
    const asset = await this.files.get(reel.videoMediaId);
    if (!asset || asset.status === 'failed') {
      await this.prisma.reel.update({ where: { id: reel.id }, data: { status: 'removed' } });
      this.logger.warn(
        { reelId, mediaId: reel.videoMediaId },
        'reel video rejected by upload checks',
      );
      return 'video-rejected';
    }
    // Content sniffing has not finished yet: retry with backoff.
    if (asset.status !== 'ready') throw new Error(`reel video ${asset.id} is ${asset.status}`);
    const res = await this.video.ingest({
      sourceUrl: await this.files.url(asset),
      externalId: reel.id,
    });
    await this.prisma.reel.update({
      where: { id: reel.id },
      data: { videoProviderId: res.providerAssetId },
    });
    if (res.status === 'ready' && res.playback)
      await this.markReady(res.providerAssetId, res.playback);
    return res.status;
  }

  /** Transcode finished (synchronously for the mock, by webhook otherwise). */
  async markReady(providerAssetId: string, playback: VideoPlayback): Promise<void> {
    const reel = await this.prisma.reel.findUnique({ where: { videoProviderId: providerAssetId } });
    if (reel?.status !== 'processing') return;
    const thumb = reel.thumbnailMediaId ? await this.files.get(reel.thumbnailMediaId) : null;
    const flagged = reel.moderationStatus === 'flagged';
    const updated = await this.prisma.reel.update({
      where: { id: reel.id },
      data: {
        playbackUrl: playback.playbackUrl,
        posterUrl:
          thumb?.status === 'ready' ? await this.files.url(thumb, 'medium') : playback.posterUrl,
        durationMs: playback.durationMs,
        // Flagged captions wait in the moderation queue instead of going live.
        status: flagged ? 'hidden' : 'published',
        moderationStatus: flagged ? 'flagged' : 'approved',
        score: hotScore(reel),
      },
    });
    if (updated.status === 'published') {
      const event: ReelPublishedEvent = { reelId: reel.id, userId: reel.userId };
      this.events.emit(REELS_EVENTS.published, event);
    }
  }

  async markFailed(providerAssetId: string, reason: string): Promise<void> {
    const res = await this.prisma.reel.updateMany({
      where: { videoProviderId: providerAssetId, status: 'processing' },
      data: { status: 'removed' },
    });
    if (res.count > 0) this.logger.warn({ providerAssetId, reason }, 'reel transcode failed');
  }

  // ───────────── reading ─────────────

  async get(viewer: AuthPrincipal, id: string, lang: Lang): Promise<ReelResponse> {
    const reel = await this.prisma.reel.findFirst({ where: { id, deletedAt: null } });
    const own = reel?.userId === viewer.userId;
    if (!reel || (!own && !this.isLive(reel) && !hasAnyRole(viewer.roles, ['admin'])))
      throw AppException.notFound('Reel not found');
    return this.toResponse(reel, viewer.userId, lang);
  }

  async feed(viewer: AuthPrincipal, q: FeedQueryDto, lang: Lang): Promise<ReelPageResponse> {
    const limit = q.limit ?? 10;
    const cityId = q.city ? await this.catalog.cityIdBySlug(q.city) : undefined;
    const filters: Prisma.ReelWhereInput = {
      ...LIVE,
      ...(cityId ? { cityId } : {}),
      ...(q.templeId ? { templeId: q.templeId } : {}),
      ...(q.hashtag ? { hashtags: { has: q.hashtag.toLowerCase() } } : {}),
    };
    if (q.following) {
      // Following: newest first (keyset on createdAt via the score cursor's slot).
      const followees = (
        await this.prisma.follow.findMany({
          where: { followerId: viewer.userId },
          select: { followeeId: true },
        })
      ).map((f) => f.followeeId);
      const after = decodeScoreCursor(q.cursor);
      const rows = await this.prisma.reel.findMany({
        where: {
          ...filters,
          userId: { in: followees },
          ...(after
            ? {
                OR: [
                  { createdAt: { lt: new Date(after.s) } },
                  { createdAt: new Date(after.s), id: { lt: after.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });
      return this.page(rows, limit, viewer.userId, lang, (r) =>
        encodeScoreCursor(r.createdAt.getTime(), r.id),
      );
    }
    const after = decodeScoreCursor(q.cursor);
    if (q.cursor && !after) throw AppException.badRequest('Invalid cursor');
    const rows = await this.prisma.reel.findMany({
      where: {
        ...filters,
        ...(after
          ? { OR: [{ score: { lt: after.s } }, { score: after.s, id: { lt: after.id } }] }
          : {}),
      },
      orderBy: [{ score: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    return this.page(rows, limit, viewer.userId, lang, (r) => encodeScoreCursor(r.score, r.id));
  }

  /** Creator page: everything for the owner, live reels for everyone else. */
  async byCreator(
    viewer: AuthPrincipal,
    userId: string,
    cursor: string | undefined,
    limit: number,
    lang: Lang,
  ): Promise<ReelPageResponse> {
    const own = viewer.userId === userId;
    const after = decodeScoreCursor(cursor);
    const rows = await this.prisma.reel.findMany({
      where: {
        userId,
        ...(own ? { deletedAt: null, status: { not: 'removed' } } : LIVE),
        ...(after
          ? {
              OR: [
                { createdAt: { lt: new Date(after.s) } },
                { createdAt: new Date(after.s), id: { lt: after.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    return this.page(rows, limit, viewer.userId, lang, (r) =>
      encodeScoreCursor(r.createdAt.getTime(), r.id),
    );
  }

  async liveCount(userId: string): Promise<number> {
    return this.prisma.reel.count({ where: { userId, ...LIVE } });
  }

  // ───────────── engagement ─────────────

  async remove(user: AuthPrincipal, id: string): Promise<void> {
    const reel = await this.prisma.reel.findFirst({
      where: { id, userId: user.userId, deletedAt: null },
    });
    if (!reel) throw AppException.notFound('Reel not found');
    await this.prisma.reel.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'removed' },
    });
    if (reel.videoProviderId) {
      await this.video.remove(reel.videoProviderId).catch((err: unknown) => {
        this.logger.warn({ err, reelId: id }, 'could not delete provider video');
      });
    }
  }

  async like(
    user: AuthPrincipal,
    id: string,
    on: boolean,
  ): Promise<{ liked: boolean; likeCount: number }> {
    await this.requireLive(id);
    const changed = on
      ? (
          await this.prisma.reelLike.createMany({
            data: [{ reelId: id, userId: user.userId }],
            skipDuplicates: true,
          })
        ).count
      : (await this.prisma.reelLike.deleteMany({ where: { reelId: id, userId: user.userId } }))
          .count;
    const reel = changed
      ? await this.prisma.reel.update({
          where: { id },
          data: { likeCount: { increment: on ? 1 : -1 } },
        })
      : await this.prisma.reel.findUniqueOrThrow({ where: { id } });
    return { liked: on, likeCount: reel.likeCount };
  }

  async save(
    user: AuthPrincipal,
    id: string,
    on: boolean,
  ): Promise<{ saved: boolean; saveCount: number }> {
    await this.requireLive(id);
    const changed = on
      ? (
          await this.prisma.reelSave.createMany({
            data: [{ reelId: id, userId: user.userId }],
            skipDuplicates: true,
          })
        ).count
      : (await this.prisma.reelSave.deleteMany({ where: { reelId: id, userId: user.userId } }))
          .count;
    const reel = changed
      ? await this.prisma.reel.update({
          where: { id },
          data: { saveCount: { increment: on ? 1 : -1 } },
        })
      : await this.prisma.reel.findUniqueOrThrow({ where: { id } });
    return { saved: on, saveCount: reel.saveCount };
  }

  async saved(
    user: AuthPrincipal,
    cursor: string | undefined,
    limit: number,
    lang: Lang,
  ): Promise<ReelPageResponse> {
    const after = decodeScoreCursor(cursor);
    const rows = await this.prisma.reelSave.findMany({
      where: {
        userId: user.userId,
        reel: LIVE,
        ...(after
          ? {
              OR: [
                { createdAt: { lt: new Date(after.s) } },
                { createdAt: new Date(after.s), reelId: { lt: after.id } },
              ],
            }
          : {}),
      },
      include: { reel: true },
      orderBy: [{ createdAt: 'desc' }, { reelId: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const last = slice.at(-1);
    return {
      data: await this.toResponses(
        slice.map((s) => s.reel),
        user.userId,
        lang,
      ),
      nextCursor: hasMore && last ? encodeScoreCursor(last.createdAt.getTime(), last.reelId) : null,
    };
  }

  /** Counted once per viewer per 6 hours. */
  async view(user: AuthPrincipal, id: string): Promise<{ viewCount: number }> {
    const reel = await this.requireLive(id);
    const fresh = await this.cache.setIfAbsent(`reel-view:${id}:${user.userId}`, VIEW_DEDUPE_S);
    if (!fresh) return { viewCount: reel.viewCount };
    const updated = await this.prisma.reel.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return { viewCount: updated.viewCount };
  }

  async recomputeScores(now = new Date()): Promise<number> {
    const since = new Date(now.getTime() - SCORE_WINDOW_DAYS * 86_400_000);
    return this.prisma.$executeRaw`
      UPDATE reels SET score = (1 + like_count * 3 + comment_count * 4 + save_count * 5 + view_count * 0.05)
        / power(GREATEST(EXTRACT(EPOCH FROM (${now}::timestamptz - created_at)) / 3600, 0) + 2, 1.5)
      WHERE status = 'published' AND deleted_at IS NULL AND created_at >= ${since}`;
  }

  async requireLive(id: string): Promise<Reel> {
    const reel = await this.prisma.reel.findFirst({ where: { id, ...LIVE } });
    if (!reel) throw AppException.notFound('Reel not found');
    return reel;
  }

  isLive(r: Reel): boolean {
    return r.status === 'published' && r.moderationStatus === 'approved' && !r.deletedAt;
  }

  // ───────────── responses ─────────────

  private async page(
    rows: Reel[],
    limit: number,
    viewerId: string,
    lang: Lang,
    cursorOf: (r: Reel) => string,
  ): Promise<ReelPageResponse> {
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const last = slice.at(-1);
    return {
      data: await this.toResponses(slice, viewerId, lang),
      nextCursor: hasMore && last ? cursorOf(last) : null,
    };
  }

  async toResponse(reel: Reel, viewerId: string, lang: Lang): Promise<ReelResponse> {
    const [r] = await this.toResponses([reel], viewerId, lang);
    if (!r) throw new Error('unreachable');
    return r;
  }

  async toResponses(reels: Reel[], viewerId: string, lang: Lang): Promise<ReelResponse[]> {
    if (reels.length === 0) return [];
    const ids = reels.map((r) => r.id);
    const templeIds = [...new Set(reels.flatMap((r) => (r.templeId ? [r.templeId] : [])))];
    const [creators, likes, saves, temples] = await Promise.all([
      this.identity.publicProfiles(reels.map((r) => r.userId)),
      this.prisma.reelLike.findMany({
        where: { userId: viewerId, reelId: { in: ids } },
        select: { reelId: true },
      }),
      this.prisma.reelSave.findMany({
        where: { userId: viewerId, reelId: { in: ids } },
        select: { reelId: true },
      }),
      templeIds.length ? this.catalog.templesByIds(templeIds, lang) : Promise.resolve([]),
    ]);
    const liked = new Set(likes.map((l) => l.reelId));
    const savedSet = new Set(saves.map((s) => s.reelId));
    const templeNames = new Map(temples.map((t) => [t.id, t.name]));
    return reels.map((r) => ({
      id: r.id,
      creator: creators.get(r.userId) ?? fallbackCreator(r.userId),
      caption: r.caption,
      hashtags: r.hashtags,
      cityId: r.cityId,
      templeId: r.templeId,
      templeName: r.templeId ? (templeNames.get(r.templeId) ?? null) : null,
      status: r.status,
      moderationStatus: r.moderationStatus,
      playbackUrl: r.playbackUrl,
      posterUrl: r.posterUrl,
      durationMs: r.durationMs,
      likeCount: r.likeCount,
      commentCount: r.commentCount,
      saveCount: r.saveCount,
      viewCount: r.viewCount,
      likedByMe: liked.has(r.id),
      savedByMe: savedSet.has(r.id),
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export const fallbackCreator = (id: string): PublicProfile => ({
  id,
  displayName: 'Yatri',
  avatarUrl: null,
});
