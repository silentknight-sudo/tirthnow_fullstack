import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth';
import { AppException } from '../../core/http';
import { TRANSIT_PROVIDER, type TransitProvider } from '../../core/providers';
import { isIsoDate } from '../../core/time';
import {
  StationQueryDto,
  StationResponse,
  TrainSearchQueryDto,
  TrainSearchResponse,
} from './dto/transit.dto';

@ApiTags('transit')
@Public()
@Controller('transit')
export class TransitController {
  constructor(@Inject(TRANSIT_PROVIDER) private readonly transit: TransitProvider) {}

  @Get('stations')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOkResponse({ type: [StationResponse] })
  stations(@Query() q: StationQueryDto): Promise<StationResponse[]> {
    return this.transit.stations(q.q ?? '');
  }

  @Get('search')
  @ApiOperation({ summary: 'Trains between two stations on a date, with booking deep links' })
  @ApiOkResponse({ type: TrainSearchResponse })
  async search(@Query() q: TrainSearchQueryDto): Promise<TrainSearchResponse> {
    if (!isIsoDate(q.date)) throw AppException.badRequest('date must be a valid YYYY-MM-DD date');
    if (q.from === q.to) throw AppException.badRequest('from and to must differ');
    const [from] = await this.transit.stations(q.from);
    const [to] = await this.transit.stations(q.to);
    if (from?.code !== q.from || to?.code !== q.to)
      throw AppException.notFound('Unknown station code');
    return {
      from,
      to,
      date: q.date,
      trains: await this.transit.search(q.from, q.to, q.date),
      disclaimer: 'Timings are indicative. Check live status and book on IRCTC.',
    };
  }
}
