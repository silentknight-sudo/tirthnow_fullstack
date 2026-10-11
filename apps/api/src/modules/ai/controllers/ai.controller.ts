import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal, CurrentUser, NoGuests, Public } from '../../../core/auth';
import { CursorQueryDto } from '../../../core/http';
import { ReqLang } from '../../../core/i18n';
import {
  CreateItineraryDto,
  LandmarkDto,
  SpeakDto,
  TranscribeDto,
  UpdateItineraryDto,
} from '../dto/ai.dto';
import { ItinerariesService } from '../services/itineraries.service';
import { MediaAiService } from '../services/media-ai.service';
import { PlannerService } from '../services/planner.service';
import { QuotaService } from '../services/quota.service';

const UUID = new ParseUUIDPipe();

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly planner: PlannerService,
    private readonly itineraries: ItinerariesService,
    private readonly media: MediaAiService,
    private readonly quota: QuotaService,
  ) {}

  @Get('quota')
  quotaStatus(@CurrentUser() u: AuthPrincipal) {
    return this.quota.status(u);
  }

  @Post('itineraries')
  @NoGuests()
  @ApiOperation({ summary: 'Generate a day-by-day plan (aarti times from temple schedules)' })
  generate(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreateItineraryDto,
    @ReqLang() lang: Lang,
  ) {
    return this.planner.generate(u, dto, lang);
  }

  @Get('itineraries')
  list(@CurrentUser() u: AuthPrincipal, @Query() q: CursorQueryDto) {
    return this.itineraries.list(u, q);
  }

  @Get('itineraries/shared/:token')
  @Public()
  shared(@Param('token') token: string, @ReqLang() lang: Lang) {
    return this.itineraries.shared(token, lang);
  }

  @Get('itineraries/:id')
  get(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string, @ReqLang() lang: Lang) {
    return this.itineraries.get(u, id, lang);
  }

  @Patch('itineraries/:id')
  update(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateItineraryDto,
    @ReqLang() lang: Lang,
  ) {
    return this.itineraries.update(u, id, dto, lang);
  }

  @Delete('itineraries/:id')
  @HttpCode(204)
  async remove(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string): Promise<void> {
    await this.itineraries.remove(u, id);
  }

  @Post('itineraries/:id/share')
  @HttpCode(200)
  share(@CurrentUser() u: AuthPrincipal, @Param('id', UUID) id: string) {
    return this.itineraries.share(u, id);
  }

  @Get('itineraries/:id/pdf')
  @Header('content-type', 'application/pdf')
  async pdf(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @ReqLang() lang: Lang,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.itineraries.pdf(u, id, lang), {
      disposition: `attachment; filename="itinerary-${id}.pdf"`,
    });
  }

  @Post('voice/transcribe')
  @HttpCode(200)
  transcribe(@CurrentUser() u: AuthPrincipal, @Body() dto: TranscribeDto) {
    return this.media.transcribe(u, dto);
  }

  @Post('voice/speak')
  @HttpCode(200)
  speak(@CurrentUser() u: AuthPrincipal, @Body() dto: SpeakDto, @ReqLang() lang: Lang) {
    return this.media.speak(u, dto, lang);
  }

  @Post('landmark')
  @HttpCode(200)
  @ApiOperation({ summary: 'Which temple is in this photo?' })
  landmark(@CurrentUser() u: AuthPrincipal, @Body() dto: LandmarkDto, @ReqLang() lang: Lang) {
    return this.media.landmark(u, dto, lang);
  }
}
