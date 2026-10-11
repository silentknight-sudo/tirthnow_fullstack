import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CityResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
}

export class AartiInstanceResponse {
  @ApiProperty({ format: 'uuid' }) scheduleId!: string;
  @ApiProperty({ format: 'uuid' }) templeId!: string;
  @ApiPropertyOptional() templeName?: string;
  @ApiProperty() kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: '2026-10-11', description: 'IST date' }) date!: string;
  @ApiProperty({ example: '05:00', description: 'IST wall-clock time' }) localTime!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty() isLiveStreamed!: boolean;
  @ApiProperty({ type: String, nullable: true }) streamUrl!: string | null;
}

export class TempleSummaryResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ format: 'uuid' }) cityId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ minimum: 0, maximum: 4 }) crowdLevel!: number;
  @ApiProperty({ type: String, nullable: true }) coverUrl!: string | null;
  @ApiPropertyOptional({ description: 'Present when the request had lat/lng' }) distanceKm?: number;
}

export class TempleDetailResponse extends TempleSummaryResponse {
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) history!: string | null;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty({ type: Object }) openingHours!: unknown;
  @ApiProperty({ type: String, nullable: true }) dressCode!: string | null;
  @ApiProperty({ type: [String] }) galleryUrls!: string[];
  @ApiProperty({ type: [AartiInstanceResponse] }) aartiToday!: AartiInstanceResponse[];
  @ApiProperty({ type: AartiInstanceResponse, nullable: true })
  nextAarti!: AartiInstanceResponse | null;
}

export class FestivalResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() startsOn!: string;
  @ApiProperty() endsOn!: string;
  @ApiProperty({ type: String, nullable: true }) cityId!: string | null;
  @ApiProperty({ type: String, nullable: true }) templeId!: string | null;
  @ApiProperty({ type: String, nullable: true }) crowdAdvisory!: string | null;
}

export class PoiResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) cityId!: string;
  @ApiProperty() category!: string;
  @ApiProperty() name!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty({ type: String, nullable: true }) phoneE164!: string | null;
  @ApiProperty() is24x7!: boolean;
  @ApiProperty() isEmergency!: boolean;
  @ApiPropertyOptional() distanceKm?: number;
}

export class HelplineResponse {
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
}

export class SafetyDirectoryResponse {
  @ApiProperty({ type: [HelplineResponse] }) helplines!: HelplineResponse[];
  @ApiProperty({ type: [PoiResponse] }) pois!: PoiResponse[];
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ExploreItemResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) cityId!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) body!: string | null;
  @ApiProperty({ type: Number, nullable: true }) lat!: number | null;
  @ApiProperty({ type: Number, nullable: true }) lng!: number | null;
  @ApiProperty({ type: String, nullable: true }) coverUrl!: string | null;
}

export class ParikramaStopResponse {
  @ApiProperty() seq!: number;
  @ApiProperty({ type: String, nullable: true }) templeId!: string | null;
  @ApiProperty({ type: String, nullable: true }) poiId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ type: Number, nullable: true }) lat!: number | null;
  @ApiProperty({ type: Number, nullable: true }) lng!: number | null;
  @ApiProperty({ type: String, nullable: true }) note!: string | null;
}

export class ParikramaRouteResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() distanceM!: number;
  @ApiProperty() estDurationMin!: number;
  @ApiProperty({ type: String, nullable: true }) polyline!: string | null;
  @ApiProperty({ type: String, nullable: true }) difficulty!: string | null;
  @ApiProperty({ type: [ParikramaStopResponse] }) stops!: ParikramaStopResponse[];
}

export class SearchResultResponse {
  @ApiProperty({ example: 'temple' }) type!: string;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) subtitle!: string | null;
  @ApiProperty({ description: '0–1 relevance' }) score!: number;
  @ApiProperty({ type: Number, nullable: true }) lat!: number | null;
  @ApiProperty({ type: Number, nullable: true }) lng!: number | null;
}
