import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal, CurrentUser } from '../../../core/auth';
import { ReqLang } from '../../../core/i18n';
import { Idempotent } from '../../../core/idempotency';
import { ResolveSosDto, SosLocationDto, SosResponse, TriggerSosDto } from '../dto/safety.dto';
import { SafetyService } from '../services/safety.service';

@ApiTags('safety')
@ApiBearerAuth()
@Controller('safety/sos')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post()
  @HttpCode(202)
  @Idempotent('sos.trigger')
  @ApiOperation({ summary: 'Trigger SOS: alerts emergency contacts and the safety desk' })
  @ApiAcceptedResponse({ type: SosResponse })
  trigger(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: TriggerSosDto,
    @Headers('idempotency-key') key: string,
    @ReqLang() lang: Lang,
  ): Promise<SosResponse> {
    return this.safety.trigger(u, dto, key, lang);
  }

  @Get(':id')
  @ApiOkResponse({ type: SosResponse })
  get(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @ReqLang() lang: Lang,
  ): Promise<SosResponse> {
    return this.safety.get(u, id, lang);
  }

  @Post(':id/location')
  @HttpCode(200)
  @ApiOperation({ summary: 'Live location while the SOS is active (every ~15 s)' })
  location(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SosLocationDto,
  ): Promise<{ ok: true }> {
    return this.safety.updateLocation(u, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel an accidental SOS within 2 minutes' })
  @ApiOkResponse({ type: SosResponse })
  cancel(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @ReqLang() lang: Lang,
  ): Promise<SosResponse> {
    return this.safety.cancel(u, id, lang);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'I am safe: ends the SOS and tells the contacts' })
  @ApiOkResponse({ type: SosResponse })
  resolve(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveSosDto,
    @ReqLang() lang: Lang,
  ): Promise<SosResponse> {
    return this.safety.resolve(u, id, { note: dto.note }, lang);
  }
}
