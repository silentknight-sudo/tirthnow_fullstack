import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { Public } from '../../../core/auth';
import { ReqLang } from '../../../core/i18n';
import { CabEstimateDto, CabQuoteResponse } from '../dto/cabs.dto';
import { ExperienceQueryDto, ExperienceResponse, SlotQueryDto } from '../dto/experiences.dto';
import { RestaurantQueryDto, RestaurantResponse } from '../dto/food.dto';
import { HotelResponse, HotelSearchQueryDto, StayQueryDto } from '../dto/hotels.dto';
import { CabsService } from '../services/cabs.service';
import { ExperiencesService } from '../services/experiences.service';
import { HotelsService } from '../services/hotels.service';
import { RestaurantsService } from '../services/restaurants.service';

@ApiTags('listings')
@Public()
@Controller()
export class InventoryController {
  constructor(
    private readonly hotels: HotelsService,
    private readonly cabs: CabsService,
    private readonly restaurants: RestaurantsService,
    private readonly experiences: ExperiencesService,
  ) {}

  @Get('hotels')
  @ApiOperation({ summary: 'Hotels with availability and lowest nightly price for the dates' })
  @ApiOkResponse({ type: [HotelResponse] })
  searchHotels(@Query() q: HotelSearchQueryDto, @ReqLang() lang: Lang): Promise<HotelResponse[]> {
    return this.hotels.search(q, lang);
  }

  @Get('hotels/:id')
  @ApiOkResponse({ type: HotelResponse })
  hotel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: StayQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<HotelResponse> {
    return this.hotels.detail(id, q, lang);
  }

  @Post('cabs/estimate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Fare estimate per vehicle class (cheapest active vendor per class)' })
  @ApiOkResponse({ type: [CabQuoteResponse] })
  estimate(@Body() dto: CabEstimateDto): Promise<CabQuoteResponse[]> {
    return this.cabs.estimate(dto);
  }

  @Get('restaurants')
  @ApiOkResponse({ type: [RestaurantResponse] })
  restaurantsList(
    @Query() q: RestaurantQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<RestaurantResponse[]> {
    return this.restaurants.search(q, lang);
  }

  @Get('restaurants/:id')
  @ApiOkResponse({ type: RestaurantResponse })
  restaurant(
    @Param('id', ParseUUIDPipe) id: string,
    @ReqLang() lang: Lang,
  ): Promise<RestaurantResponse> {
    return this.restaurants.detail(id, lang);
  }

  @Get('experiences')
  @ApiOkResponse({ type: [ExperienceResponse] })
  experiencesList(
    @Query() q: ExperienceQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<ExperienceResponse[]> {
    return this.experiences.search(q, lang);
  }

  @Get('experiences/:id')
  @ApiOkResponse({ type: ExperienceResponse })
  experience(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: SlotQueryDto,
    @ReqLang() lang: Lang,
  ): Promise<ExperienceResponse> {
    return this.experiences.detail(id, q, lang);
  }
}
