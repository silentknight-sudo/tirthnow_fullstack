import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { Public } from '../../core/auth';
import { ReqLang } from '../../core/i18n';
import { WeatherQueryDto, WeatherResponse } from './dto/weather.dto';
import { WeatherService } from './services/weather.service';

@ApiTags('weather')
@Public()
@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary: 'Current weather, 5-day forecast and travel advisories (cached 15 min)',
  })
  @ApiOkResponse({ type: WeatherResponse })
  get(@Query() q: WeatherQueryDto, @ReqLang() lang: Lang): Promise<WeatherResponse> {
    return this.weather.get(q, lang);
  }
}
