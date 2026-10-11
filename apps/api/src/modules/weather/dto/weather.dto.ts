import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { LocalizedQueryDto } from '../../../core/i18n';

export class WeatherQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: 'vrindavan', description: 'City slug (or pass lat & lng)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/)
  city?: string;

  @ApiPropertyOptional({ example: 27.58 })
  @ValidateIf((o: WeatherQueryDto) => o.city === undefined)
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 77.7 })
  @ValidateIf((o: WeatherQueryDto) => o.city === undefined)
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}

export class WeatherNowResponse {
  @ApiProperty() tempC!: number;
  @ApiProperty() feelsLikeC!: number;
  @ApiProperty() humidityPct!: number;
  @ApiProperty() windKph!: number;
  @ApiProperty({ example: 'clear' }) condition!: string;
  @ApiProperty() description!: string;
  @ApiProperty() observedAt!: string;
  @ApiProperty({ nullable: true, type: String }) sunrise!: string | null;
  @ApiProperty({ nullable: true, type: String }) sunset!: string | null;
}

export class WeatherDayResponse {
  @ApiProperty({ example: '2026-10-11' }) date!: string;
  @ApiProperty() minC!: number;
  @ApiProperty() maxC!: number;
  @ApiProperty() condition!: string;
  @ApiProperty() rainChancePct!: number;
}

export class WeatherAdvisoryResponse {
  @ApiProperty({ enum: ['heat', 'cold', 'rain', 'fog', 'storm'] }) code!: string;
  @ApiProperty({ enum: ['info', 'warning'] }) severity!: 'info' | 'warning';
  @ApiProperty({ example: '2026-10-11' }) date!: string;
  @ApiProperty() message!: string;
}

export class WeatherResponse {
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ nullable: true, type: String }) cityId!: string | null;
  @ApiProperty({ type: WeatherNowResponse }) now!: WeatherNowResponse;
  @ApiProperty({ type: [WeatherDayResponse] }) daily!: WeatherDayResponse[];
  @ApiProperty({ type: [WeatherAdvisoryResponse] }) advisories!: WeatherAdvisoryResponse[];
  @ApiProperty({ example: 'openweather' }) source!: string;
  @ApiProperty() fetchedAt!: string;
}
