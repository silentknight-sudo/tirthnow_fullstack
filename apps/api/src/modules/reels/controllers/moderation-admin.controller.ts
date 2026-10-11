import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import { ModerationActionDto, ModerationQueueQueryDto } from '../dto/reels.dto';
import { ModerationService } from '../services/moderation.service';

@ApiTags('admin · moderation')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/moderation')
export class ModerationAdminController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('queue')
  queue(@Query() q: ModerationQueueQueryDto) {
    return this.moderation.queue(q);
  }

  @Post(':reportId/action')
  @HttpCode(200)
  act(
    @CurrentUser() u: AuthPrincipal,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.moderation.act(u, reportId, dto);
  }
}
