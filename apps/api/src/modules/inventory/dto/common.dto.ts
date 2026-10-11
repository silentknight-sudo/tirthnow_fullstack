import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator';

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Refund rules applied when a booking is cancelled (orders module). */
export class CancellationPolicyDto {
  @ApiProperty({
    example: 48,
    description: 'Full refund if cancelled at least this many hours before service',
  })
  @IsInt()
  @Min(0)
  @Max(720)
  freeUntilHoursBefore!: number;

  @ApiProperty({ example: 50, description: 'Penalty % after the free window' })
  @IsInt()
  @Min(0)
  @Max(100)
  penaltyPctAfter!: number;

  @ApiPropertyOptional({ example: 100, description: 'Penalty % for no-shows' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  noShowPct?: number;
}

export class PointDto {
  @ApiProperty({ example: 27.5806 }) @IsLatitude() lat!: number;
  @ApiProperty({ example: 77.6996 }) @IsLongitude() lng!: number;
}
