import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import {
  CreateAartiScheduleDto,
  CreateCityDto,
  CreateExploreItemDto,
  CreateFestivalDto,
  CreatePoiDto,
  CreateTempleDto,
  UpdateAartiScheduleDto,
  UpdateCityDto,
  UpdateExploreItemDto,
  UpdateFestivalDto,
  UpdatePoiDto,
  UpdateTempleDto,
  UpsertParikramaRouteDto,
} from '../dto/catalog-admin.dto';
import { CatalogAdminService } from '../services/catalog-admin.service';

@ApiTags('admin · catalog')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class CatalogAdminController {
  constructor(private readonly cms: CatalogAdminService) {}

  @Post('cities')
  createCity(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateCityDto) {
    return this.cms.createCity(u, dto);
  }

  @Patch('cities/:id')
  updateCity(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCityDto,
  ) {
    return this.cms.updateCity(u, id, dto);
  }

  @Post('temples')
  createTemple(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateTempleDto) {
    return this.cms.createTemple(u, dto);
  }

  @Patch('temples/:id')
  updateTemple(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTempleDto,
  ) {
    return this.cms.updateTemple(u, id, dto);
  }

  @Delete('temples/:id')
  @HttpCode(204)
  async deleteTemple(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.cms.deleteTemple(u, id);
  }

  @Get('temples/:id/aarti')
  listAarti(@Param('id', ParseUUIDPipe) id: string) {
    return this.cms.listAarti(id);
  }

  @Post('temples/:id/aarti')
  createAarti(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAartiScheduleDto,
  ) {
    return this.cms.createAarti(u, id, dto);
  }

  @Patch('aarti/:id')
  updateAarti(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAartiScheduleDto,
  ) {
    return this.cms.updateAarti(u, id, dto);
  }

  @Delete('aarti/:id')
  @HttpCode(204)
  async deleteAarti(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.cms.deleteAarti(u, id);
  }

  @Post('festivals')
  createFestival(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateFestivalDto) {
    return this.cms.createFestival(u, dto);
  }

  @Patch('festivals/:id')
  updateFestival(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFestivalDto,
  ) {
    return this.cms.updateFestival(u, id, dto);
  }

  @Delete('festivals/:id')
  @HttpCode(204)
  async deleteFestival(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.cms.deleteFestival(u, id);
  }

  @Post('pois')
  createPoi(@CurrentUser() u: AuthPrincipal, @Body() dto: CreatePoiDto) {
    return this.cms.createPoi(u, dto);
  }

  @Patch('pois/:id')
  updatePoi(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePoiDto,
  ) {
    return this.cms.updatePoi(u, id, dto);
  }

  @Delete('pois/:id')
  @HttpCode(204)
  async deletePoi(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.cms.deletePoi(u, id);
  }

  @Post('explore')
  createExplore(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateExploreItemDto) {
    return this.cms.createExplore(u, dto);
  }

  @Patch('explore/:id')
  updateExplore(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExploreItemDto,
  ) {
    return this.cms.updateExplore(u, id, dto);
  }

  @Delete('explore/:id')
  @HttpCode(204)
  async deleteExplore(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.cms.deleteExplore(u, id);
  }

  @Put('parikrama-routes/:slug')
  upsertRoute(
    @CurrentUser() u: AuthPrincipal,
    @Param('slug') slug: string,
    @Body() dto: UpsertParikramaRouteDto,
  ) {
    return this.cms.upsertParikrama(u, slug, dto);
  }
}
