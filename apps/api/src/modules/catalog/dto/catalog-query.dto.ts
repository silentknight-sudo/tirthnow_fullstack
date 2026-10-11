import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ExploreKind, PoiCategory } from '@prisma/client';
import { LocalizedQueryDto } from '../../../core/i18n';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/** `near` filter shared by list endpoints: both lat and lng, optional radius. */
export class NearQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: 27.58 })
  @ValidateIf((o: NearQueryDto) => o.lng !== undefined)
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 77.7 })
  @ValidateIf((o: NearQueryDto) => o.lat !== undefined)
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  radiusKm?: number;
}

export class TempleQueryDto extends NearQueryDto {
  @ApiPropertyOptional({ example: 'vrindavan', description: 'City slug' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/)
  city?: string;

  @ApiPropertyOptional({ example: 'pushtimarg' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,40}$/)
  tag?: string;
}

export class DateRangeQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: '2026-10-11', description: 'IST date, default today' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-17',
    description: 'IST date inclusive, max 31 days after from',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class UpcomingAartiQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: 'vrindavan' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/)
  city?: string;

  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class FestivalQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ example: 'barsana' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/)
  city?: string;
}

export class PoiQueryDto extends NearQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/)
  city?: string;

  @ApiPropertyOptional({ enum: PoiCategory })
  @IsOptional()
  @IsEnum(PoiCategory)
  category?: PoiCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  emergency?: boolean;
}

export class ExploreQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/)
  city?: string;

  @ApiPropertyOptional({ enum: ExploreKind })
  @IsOptional()
  @IsEnum(ExploreKind)
  kind?: ExploreKind;
}

export class SearchQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: 'banke bihari' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  q!: string;

  @ApiPropertyOptional({ example: 'temple,hotel', description: 'Comma list of result types' })
  @IsOptional()
  @Matches(/^[a-z_]+(,[a-z_]+)*$/)
  types?: string;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
