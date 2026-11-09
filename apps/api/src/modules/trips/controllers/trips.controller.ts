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
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { type Request, type Response } from 'express';
import { type AuthPrincipal, CurrentUser, NoGuests, Public } from '../../../core/auth';
import { CursorQueryDto } from '../../../core/http';
import { ReqLang } from '../../../core/i18n';
import {
  CreateFamilyGroupDto,
  FamilyGroupResponse,
  FamilySharingDto,
  JoinFamilyGroupDto,
  SharedTripResponse,
  StartTripDto,
  TripLocationDto,
  TripPageResponse,
  TripResponse,
  TripShareResponse,
  TripSharingDto,
} from '../dto/trips.dto';
import { sharedTripHtml, TripsService } from '../services/trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@NoGuests()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a pilgrimage (sends the trip-start notification)' })
  @ApiOkResponse({ type: TripResponse })
  start(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: StartTripDto,
    @ReqLang() lang: Lang,
  ): Promise<TripResponse> {
    return this.trips.start(u, dto, lang);
  }

  @Get()
  @ApiOperation({ summary: 'Trip history, newest first' })
  @ApiOkResponse({ type: TripPageResponse })
  history(@CurrentUser() u: AuthPrincipal, @Query() q: CursorQueryDto): Promise<TripPageResponse> {
    return this.trips.history(u, q);
  }

  @Get('active')
  @ApiOkResponse({ type: TripResponse })
  async active(@CurrentUser() u: AuthPrincipal): Promise<{ trip: TripResponse | null }> {
    return { trip: await this.trips.active(u) };
  }

  @Post(':id/end')
  @HttpCode(200)
  @ApiOperation({ summary: 'End a pilgrimage (sends the trip-end notification, stops sharing)' })
  @ApiOkResponse({ type: TripResponse })
  end(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripResponse> {
    return this.trips.end(u, id);
  }

  @Patch(':id/sharing')
  @ApiOperation({ summary: 'Start or pause live location sharing for this trip' })
  @ApiOkResponse({ type: TripResponse })
  sharing(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TripSharingDto,
  ): Promise<TripResponse> {
    return this.trips.setSharing(u, id, dto.sharing);
  }

  @Post(':id/location')
  @HttpCode(200)
  @ApiOperation({ summary: 'Live location update (stored only while sharing is on)' })
  location(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TripLocationDto,
  ): Promise<{ stored: boolean }> {
    return this.trips.location(u, id, dto);
  }

  @Post(':id/share')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a tracking link and a WhatsApp-ready message' })
  @ApiOkResponse({ type: TripShareResponse })
  share(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @ReqLang() lang: Lang,
  ): Promise<TripShareResponse> {
    return this.trips.share(u, id, lang);
  }

  @Delete(':id/share')
  @HttpCode(204)
  @ApiOperation({ summary: 'Stop the tracking link' })
  unshare(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.trips.unshare(u, id);
  }
}

@ApiTags('trips')
@ApiBearerAuth()
@NoGuests()
@Controller('family/groups')
export class FamilyController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @ApiOkResponse({ type: [FamilyGroupResponse] })
  mine(@CurrentUser() u: AuthPrincipal): Promise<FamilyGroupResponse[]> {
    return this.trips.myGroups(u);
  }

  @Post()
  @ApiOkResponse({ type: FamilyGroupResponse })
  create(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreateFamilyGroupDto,
  ): Promise<FamilyGroupResponse> {
    return this.trips.createGroup(u, dto.name);
  }

  @Post('join')
  @HttpCode(200)
  @ApiOkResponse({ type: FamilyGroupResponse })
  join(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: JoinFamilyGroupDto,
  ): Promise<FamilyGroupResponse> {
    return this.trips.joinGroup(u, dto.code);
  }

  @Patch(':id/me')
  @ApiOperation({ summary: 'My consent: may this group see my live trip location?' })
  @ApiOkResponse({ type: FamilyGroupResponse })
  sharing(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FamilySharingDto,
  ): Promise<FamilyGroupResponse> {
    return this.trips.setGroupSharing(u, id, dto.sharing);
  }

  @Delete(':id/me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Leave the group (the owner leaving deletes it)' })
  leave(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.trips.leaveGroup(u, id);
  }

  @Delete(':id/members/:userId')
  @ApiOkResponse({ type: FamilyGroupResponse })
  remove(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<FamilyGroupResponse> {
    return this.trips.removeMember(u, id, userId);
  }
}

/** Served at /t/:token (outside /v1) so WhatsApp links stay short. */
@ApiTags('trips')
@Public()
@Controller('t')
export class TripShareController {
  constructor(private readonly trips: TripsService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({ summary: 'Shared trip and permitted live location (JSON, or HTML for browsers)' })
  @ApiOkResponse({ type: SharedTripResponse })
  async view(
    @Param('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SharedTripResponse | string> {
    const view = await this.trips.shared(token);
    if (req.accepts(['json', 'html']) === 'html') {
      res.type('html');
      // Allow only the inline styles and the Google Maps embed on this page.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; frame-src https://www.google.com; base-uri 'none'; form-action 'none'",
      );
      return sharedTripHtml(view);
    }
    return view;
  }
}
