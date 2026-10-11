import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal, CurrentUser, NoGuests } from '../../../core/auth';
import { CursorQueryDto, type Page } from '../../../core/http';
import { ReqLang } from '../../../core/i18n';
import {
  CommentResponse,
  CreateCommentDto,
  CreatorPageResponse,
  CreateReelDto,
  CreateReportDto,
  FeedQueryDto,
  ReelPageResponse,
  ReelResponse,
} from '../dto/reels.dto';
import { ModerationService } from '../services/moderation.service';
import { ReelsService } from '../services/reels.service';
import { SocialService } from '../services/social.service';

const UUID = new ParseUUIDPipe();

@ApiTags('reels')
@ApiBearerAuth()
@Controller('reels')
export class ReelsController {
  constructor(
    private readonly reels: ReelsService,
    private readonly social: SocialService,
  ) {}

  @Post()
  @NoGuests()
  @ApiOperation({
    summary: 'Publish a reel from an uploaded reel_video (transcoded, then published)',
  })
  @ApiOkResponse({ type: ReelResponse })
  create(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreateReelDto,
    @ReqLang() lang: Lang,
  ): Promise<ReelResponse> {
    return this.reels.create(u, dto, lang);
  }

  @Get('feed')
  @ApiOkResponse({ type: ReelPageResponse })
  feed(
    @CurrentUser() u: AuthPrincipal,
    @Query() q: FeedQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<ReelPageResponse> {
    return this.reels.feed(u, q, lang);
  }

  @Get('saved')
  @ApiOkResponse({ type: ReelPageResponse })
  saved(
    @CurrentUser() u: AuthPrincipal,
    @Query() q: CursorQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<ReelPageResponse> {
    return this.reels.saved(u, q.cursor, q.limit ?? 20, lang);
  }

  @Get(':id')
  @ApiOkResponse({ type: ReelResponse })
  get(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @ReqLang() lang: Lang,
  ): Promise<ReelResponse> {
    return this.reels.get(u, id, lang);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string): Promise<void> {
    await this.reels.remove(u, id);
  }

  @Post(':id/like')
  @HttpCode(200)
  @NoGuests()
  like(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.reels.like(u, id, true);
  }

  @Delete(':id/like')
  unlike(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.reels.like(u, id, false);
  }

  @Post(':id/save')
  @HttpCode(200)
  @NoGuests()
  save(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.reels.save(u, id, true);
  }

  @Delete(':id/save')
  unsave(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.reels.save(u, id, false);
  }

  @Post(':id/view')
  @HttpCode(200)
  view(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.reels.view(u, id);
  }

  @Get(':id/comments')
  comments(
    @Param('id', UUID) id: string,
    @Query() q: CursorQueryDto,
  ): Promise<Page<CommentResponse>> {
    return this.social.comments(id, q);
  }

  @Post(':id/comments')
  @NoGuests()
  @ApiOkResponse({ type: CommentResponse })
  comment(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.social.comment(u, id, dto);
  }

  @Delete(':id/comments/:cid')
  @HttpCode(204)
  async deleteComment(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Param('cid', UUID) cid: string,
  ): Promise<void> {
    await this.social.deleteComment(u, id, cid);
  }
}

@ApiTags('reels')
@ApiBearerAuth()
@Controller('users/:id')
export class CreatorsController {
  constructor(
    private readonly reels: ReelsService,
    private readonly social: SocialService,
  ) {}

  @Get('reels')
  @ApiOkResponse({ type: CreatorPageResponse })
  async reelsOf(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Query() q: CursorQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<CreatorPageResponse> {
    const profile = await this.social.profile(u, id);
    const page = await this.reels.byCreator(u, id, q.cursor, q.limit ?? 20, lang);
    return { profile, data: page.data, nextCursor: page.nextCursor };
  }

  @Post('follow')
  @HttpCode(200)
  @NoGuests()
  follow(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.social.follow(u, id, true);
  }

  @Delete('follow')
  unfollow(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.social.follow(u, id, false);
  }
}

@ApiTags('reels')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post()
  @NoGuests()
  @ApiOperation({ summary: 'Report a reel, comment, review, user or vendor' })
  report(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateReportDto) {
    return this.moderation.report(u, dto);
  }
}
