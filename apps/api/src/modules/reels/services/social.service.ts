import { HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { IdentityFacade } from '../../identity';
import {
  type CommentResponse,
  type CreateCommentDto,
  type CreatorProfileResponse,
} from '../dto/reels.dto';
import { ModerationService } from './moderation.service';
import { fallbackCreator, ReelsService } from './reels.service';

/** Comments and follows. */
@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reels: ReelsService,
    private readonly identity: IdentityFacade,
    private readonly moderation: ModerationService,
    @Inject(MODERATION_PROVIDER) private readonly moderator: ModerationProvider,
  ) {}

  async comments(
    reelId: string,
    q: { cursor?: string; limit?: number },
  ): Promise<Page<CommentResponse>> {
    await this.reels.requireLive(reelId);
    const limit = pageSize(q.limit);
    const rows = await this.prisma.reelComment.findMany({
      where: { reelId, moderationStatus: 'approved', deletedAt: null, ...afterCursor(q.cursor) },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    const page = toPage(rows, limit);
    const authors = await this.identity.publicProfiles(page.data.map((c) => c.userId));
    return {
      nextCursor: page.nextCursor,
      data: page.data.map((c) => ({
        id: c.id,
        reelId: c.reelId,
        parentId: c.parentId,
        author: authors.get(c.userId) ?? fallbackCreator(c.userId),
        body: c.body,
        moderationStatus: c.moderationStatus,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async comment(
    user: AuthPrincipal,
    reelId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    await this.reels.requireLive(reelId);
    if (dto.parentId) {
      const parent = await this.prisma.reelComment.findFirst({
        where: { id: dto.parentId, reelId, deletedAt: null },
      });
      if (!parent) throw AppException.notFound('Comment not found');
      if (parent.parentId)
        throw AppException.badRequest('Replies are one level deep; reply to the top comment');
    }
    const body = dto.body.trim();
    const check = await this.moderator.moderateText(body);
    const c = await this.prisma.reelComment.create({
      data: {
        reelId,
        userId: user.userId,
        parentId: dto.parentId ?? null,
        body,
        moderationStatus: check.flagged ? 'flagged' : 'approved',
      },
    });
    if (check.flagged) await this.moderation.autoReport('comment', c.id, check);
    await this.moderation.recountComments(c.id);
    const author =
      (await this.identity.publicProfiles([user.userId])).get(user.userId) ??
      fallbackCreator(user.userId);
    return {
      id: c.id,
      reelId,
      parentId: c.parentId,
      author,
      body: c.body,
      moderationStatus: c.moderationStatus,
      createdAt: c.createdAt.toISOString(),
    };
  }

  /** The author or the reel's creator may delete a comment. */
  async deleteComment(user: AuthPrincipal, reelId: string, commentId: string): Promise<void> {
    const c = await this.prisma.reelComment.findFirst({
      where: { id: commentId, reelId, deletedAt: null },
      include: { reel: { select: { userId: true } } },
    });
    if (!c || (c.userId !== user.userId && c.reel.userId !== user.userId))
      throw AppException.notFound('Comment not found');
    await this.prisma.reelComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    await this.moderation.recountComments(commentId);
  }

  async follow(
    user: AuthPrincipal,
    targetId: string,
    on: boolean,
  ): Promise<{ following: boolean; followerCount: number }> {
    if (targetId === user.userId)
      throw new AppException(
        ERROR_CODES.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'You cannot follow yourself',
      );
    if (on) {
      if ((await this.identity.userStatus(targetId)) !== 'active')
        throw AppException.notFound('User not found');
      await this.prisma.follow.createMany({
        data: [{ followerId: user.userId, followeeId: targetId }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.follow.deleteMany({
        where: { followerId: user.userId, followeeId: targetId },
      });
    }
    return {
      following: on,
      followerCount: await this.prisma.follow.count({ where: { followeeId: targetId } }),
    };
  }

  async profile(viewer: AuthPrincipal, userId: string): Promise<CreatorProfileResponse> {
    const status = await this.identity.userStatus(userId);
    if (!status || status === 'deleted') throw AppException.notFound('User not found');
    const [card, followerCount, followingCount, reelCount, isFollowing] = await Promise.all([
      this.identity.publicProfiles([userId]),
      this.prisma.follow.count({ where: { followeeId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.reels.liveCount(userId),
      this.prisma.follow.count({ where: { followerId: viewer.userId, followeeId: userId } }),
    ]);
    return {
      ...(card.get(userId) ?? fallbackCreator(userId)),
      followerCount,
      followingCount,
      reelCount,
      isFollowing: isFollowing > 0,
      isMe: viewer.userId === userId,
    };
  }
}
