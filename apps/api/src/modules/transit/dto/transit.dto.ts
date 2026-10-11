import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class StationQueryDto {
  @ApiPropertyOptional({ example: 'mathura' }) @IsOptional() @IsString() @MaxLength(60) q?: string;
}

export class TrainSearchQueryDto {
  @ApiProperty({ example: 'NDLS' }) @Matches(/^[A-Z]{2,5}$/) from!: string;
  @ApiProperty({ example: 'MTJ' }) @Matches(/^[A-Z]{2,5}$/) to!: string;
  @ApiProperty({ example: '2026-11-01' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
}

export class StationResponse {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() city!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
}

export class TrainResponse {
  @ApiProperty() number!: string;
  @ApiProperty() name!: string;
  @ApiProperty() fromCode!: string;
  @ApiProperty() toCode!: string;
  @ApiProperty({ example: '06:00' }) departs!: string;
  @ApiProperty({ example: '07:19' }) arrives!: string;
  @ApiProperty() arrivalDayOffset!: number;
  @ApiProperty() durationMin!: number;
  @ApiProperty({ type: [String] }) classes!: string[];
  @ApiProperty({ type: [Number] }) runsOn!: number[];
  @ApiProperty() bookingUrl!: string;
}

export class TrainSearchResponse {
  @ApiProperty({ type: StationResponse }) from!: StationResponse;
  @ApiProperty({ type: StationResponse }) to!: StationResponse;
  @ApiProperty() date!: string;
  @ApiProperty({ type: [TrainResponse] }) trains!: TrainResponse[];
  @ApiProperty({ description: 'Shown in the app: timings are indicative; confirm on IRCTC.' })
  disclaimer!: string;
}
