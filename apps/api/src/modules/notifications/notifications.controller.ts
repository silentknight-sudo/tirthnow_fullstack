import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal, CurrentUser } from '../../core/auth';
import { definedFields } from '../../core/http';
import { ReqLang } from '../../core/i18n';
import { IdentityFacade } from '../identity';
import {
  AartiReminderResponse,
  CreateAartiReminderDto,
  NotificationPageResponse,
  NotificationPreferencesDto,
  NotificationQueryDto,
  NotificationResponse,
} from './dto/notifications.dto';
import { AartiRemindersService } from './services/aarti-reminders.service';
import { NotificationsService } from './services/notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly reminders: AartiRemindersService,
    private readonly identity: IdentityFacade,
  ) {}

  @Get('notifications')
  @ApiOkResponse({ type: NotificationPageResponse })
  list(
    @CurrentUser() u: AuthPrincipal,
    @Query() q: NotificationQueryDto,
  ): Promise<NotificationPageResponse> {
    return this.notifications.list(u.userId, q);
  }

  @Post('notifications/read-all')
  @HttpCode(200)
  readAll(@CurrentUser() u: AuthPrincipal): Promise<{ updated: number }> {
    return this.notifications.markAllRead(u.userId);
  }

  @Post('notifications/:id/read')
  @HttpCode(200)
  @ApiOkResponse({ type: NotificationResponse })
  read(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponse> {
    return this.notifications.markRead(u.userId, id);
  }

  @Get('notifications/preferences')
  @ApiOkResponse({ type: NotificationPreferencesDto })
  preferences(@CurrentUser() u: AuthPrincipal): Promise<Record<string, unknown>> {
    return this.identity.notificationPrefs(u.userId);
  }

  @Put('notifications/preferences')
  @ApiOkResponse({ type: NotificationPreferencesDto })
  updatePreferences(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: NotificationPreferencesDto,
  ): Promise<Record<string, unknown>> {
    return this.identity.updateNotificationPrefs(u.userId, definedFields(dto));
  }

  @Get('aarti-reminders')
  @ApiOkResponse({ type: [AartiReminderResponse] })
  reminderList(
    @CurrentUser() u: AuthPrincipal,
    @ReqLang() lang: Lang,
  ): Promise<AartiReminderResponse[]> {
    return this.reminders.list(u.userId, lang);
  }

  @Post('aarti-reminders')
  @ApiOkResponse({ type: AartiReminderResponse })
  createReminder(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreateAartiReminderDto,
    @ReqLang() lang: Lang,
  ): Promise<AartiReminderResponse> {
    return this.reminders.create(u.userId, dto, lang);
  }

  @Delete('aarti-reminders/:id')
  @HttpCode(204)
  async deleteReminder(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.reminders.remove(u.userId, id);
  }
}
