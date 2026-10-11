import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { createHash } from 'node:crypto';
import { type Request, type Response } from 'express';
import { Public } from '../../../core/auth';
import { ReqLang } from '../../../core/i18n';
import { SettingsService, type PublicSetting } from '../../../core/settings';
import {
  DateRangeQueryDto,
  ExploreQueryDto,
  FestivalQueryDto,
  PoiQueryDto,
  SearchQueryDto,
  TempleQueryDto,
  UpcomingAartiQueryDto,
} from '../dto/catalog-query.dto';
import {
  AartiInstanceResponse,
  CityResponse,
  ExploreItemResponse,
  FestivalResponse,
  ParikramaRouteResponse,
  PoiResponse,
  SafetyDirectoryResponse,
  SearchResultResponse,
  TempleDetailResponse,
  TempleSummaryResponse,
} from '../dto/catalog-responses.dto';
import { AartiService } from '../services/aarti.service';
import { CatalogService } from '../services/catalog.service';
import { SearchService } from '../services/search.service';

@ApiTags('catalog')
@Public()
@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly aarti: AartiService,
    private readonly searchService: SearchService,
    private readonly settings: SettingsService,
  ) {}

  @Get('cities')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOkResponse({ type: [CityResponse] })
  cities(@ReqLang() lang: Lang): Promise<CityResponse[]> {
    return this.catalog.cities(lang);
  }

  @Get('temples')
  @ApiOperation({ summary: 'Temples by city, tag, or near a point (sorted by distance)' })
  @ApiOkResponse({ type: [TempleSummaryResponse] })
  temples(@Query() q: TempleQueryDto, @ReqLang() lang: Lang): Promise<TempleSummaryResponse[]> {
    return this.catalog.temples(q, lang);
  }

  @Get('temples/:idOrSlug')
  @ApiOkResponse({ type: TempleDetailResponse })
  temple(
    @Param('idOrSlug') idOrSlug: string,
    @ReqLang() lang: Lang,
  ): Promise<TempleDetailResponse> {
    return this.catalog.temple(idOrSlug, lang);
  }

  @Get('temples/:id/aarti')
  @ApiOperation({ summary: 'Aarti times for a date range (IST dates, max 31 days)' })
  @ApiOkResponse({ type: [AartiInstanceResponse] })
  async templeAarti(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: DateRangeQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    const { from, to } = this.aarti.resolveRange(q.from, q.to);
    return this.aarti.instancesForTemple(id, from, to, lang);
  }

  @Get('aarti/upcoming')
  @ApiOperation({ summary: 'Next aartis across temples (in progress or upcoming), soonest first' })
  @ApiOkResponse({ type: [AartiInstanceResponse] })
  async upcoming(
    @Query() q: UpcomingAartiQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    const cityId = await this.catalog.cityIdBySlug(q.city);
    return this.aarti.upcoming(cityId, q.limit ?? 10, lang);
  }

  @Get('festivals')
  @ApiOkResponse({ type: [FestivalResponse] })
  festivals(@Query() q: FestivalQueryDto, @ReqLang() lang: Lang): Promise<FestivalResponse[]> {
    return this.catalog.festivals(q, lang);
  }

  @Get('pois')
  @ApiOkResponse({ type: [PoiResponse] })
  pois(@Query() q: PoiQueryDto, @ReqLang() lang: Lang): Promise<PoiResponse[]> {
    return this.catalog.pois(q, lang);
  }

  @Get('safety/directory')
  @ApiOperation({ summary: 'Emergency POIs and helplines for offline use; supports If-None-Match' })
  @ApiOkResponse({ type: SafetyDirectoryResponse })
  async safetyDirectory(
    @ReqLang() lang: Lang,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafetyDirectoryResponse | undefined> {
    const body = await this.catalog.safetyDirectory(lang);
    const etag = `"${createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (req.get('if-none-match') === etag) {
      res.status(304);
      return undefined;
    }
    return body;
  }

  @Get('explore')
  @ApiOkResponse({ type: [ExploreItemResponse] })
  explore(@Query() q: ExploreQueryDto, @ReqLang() lang: Lang): Promise<ExploreItemResponse[]> {
    return this.catalog.explore(q, lang);
  }

  @Get('explore/:id')
  @ApiOkResponse({ type: ExploreItemResponse })
  exploreItem(
    @Param('id', ParseUUIDPipe) id: string,
    @ReqLang() lang: Lang,
  ): Promise<ExploreItemResponse> {
    return this.catalog.exploreItem(id, lang);
  }

  @Get('parikrama-routes')
  @ApiOkResponse({ type: [ParikramaRouteResponse] })
  routes(@ReqLang() lang: Lang): Promise<ParikramaRouteResponse[]> {
    return this.catalog.parikramaRoutes(lang);
  }

  @Get('parikrama-routes/:slug')
  @ApiOkResponse({ type: ParikramaRouteResponse })
  route(@Param('slug') slug: string, @ReqLang() lang: Lang): Promise<ParikramaRouteResponse> {
    return this.catalog.parikramaRoute(slug, lang);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Global search across temples, explore, POIs, hotels, restaurants and experiences',
  })
  @ApiOkResponse({ type: [SearchResultResponse] })
  search(@Query() q: SearchQueryDto, @ReqLang() lang: Lang): Promise<SearchResultResponse[]> {
    const types = q.types ? q.types.split(',') : null;
    return this.searchService.search(q.q, types, q.limit ?? 20, lang);
  }

  @Get('config')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Feature flags, banners, min app version, helplines' })
  config(@Query('platform') platform?: string): Promise<PublicSetting[]> {
    const p =
      platform === 'android' || platform === 'ios' || platform === 'web' ? platform : undefined;
    return this.settings.forClient(p ? { platform: p } : {});
  }
}
