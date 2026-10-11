import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AartiKind, ExploreKind, PoiCategory } from '@prisma/client';
import { I18nTextDto } from '../../../core/i18n';
import { E164_PATTERN, SLUG_PATTERN } from './patterns';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCityDto {
  @ApiProperty({ example: 'radha-kund' }) @Matches(SLUG_PATTERN) slug!: string;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000) sortOrder?: number;
}
export class UpdateCityDto extends PartialType(CreateCityDto) {}

export class CreateTempleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cityId!: string;
  @ApiProperty({ example: 'shri-radha-damodar' }) @Matches(SLUG_PATTERN) slug!: string;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  history?: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  dressCode?: I18nTextDto;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional({ type: Object }) @IsOptional() @IsObject() openingHours?: Record<
    string,
    unknown
  >;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Matches(/^[a-z0-9-]{2,40}$/, { each: true })
  tags?: string[];
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() coverMediaId?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  galleryMediaIds?: string[];
  @ApiPropertyOptional({ minimum: 0, maximum: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  crowdLevel?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isPublished?: boolean;
}
export class UpdateTempleDto extends PartialType(CreateTempleDto) {}

export class CreateAartiScheduleDto {
  @ApiProperty({ enum: AartiKind }) @IsEnum(AartiKind) kind!: AartiKind;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiProperty({ example: '05:00', description: 'IST wall-clock HH:MM' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  localTime!: string;
  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMin?: number;
  @ApiPropertyOptional({ default: 'FREQ=DAILY', example: 'FREQ=WEEKLY;BYDAY=SU' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recurrence?: string;
  @ApiPropertyOptional({ example: '2026-08-15' }) @IsOptional() @Matches(DATE) validFrom?: string;
  @ApiPropertyOptional({ example: '2026-08-16' }) @IsOptional() @Matches(DATE) validTo?: string;
  @ApiPropertyOptional({ enum: ['all', 'summer', 'winter'], default: 'all' })
  @IsOptional()
  @Matches(/^(all|summer|winter)$/)
  season?: 'all' | 'summer' | 'winter';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLiveStreamed?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  streamUrl?: string;
}
export class UpdateAartiScheduleDto extends PartialType(CreateAartiScheduleDto) {}

export class CreateFestivalDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cityId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templeId?: string;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  crowdAdvisory?: I18nTextDto;
  @ApiProperty({ example: '2026-09-04' }) @Matches(DATE) startsOn!: string;
  @ApiProperty({ example: '2026-09-05' }) @Matches(DATE) endsOn!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() coverMediaId?: string;
}
export class UpdateFestivalDto extends PartialType(CreateFestivalDto) {}

export class CreatePoiDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cityId!: string;
  @ApiProperty({ enum: PoiCategory }) @IsEnum(PoiCategory) category!: PoiCategory;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(E164_PATTERN) phoneE164?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is24x7?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEmergency?: boolean;
}
export class UpdatePoiDto extends PartialType(CreatePoiDto) {}

export class CreateExploreItemDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cityId!: string;
  @ApiProperty({ enum: ExploreKind }) @IsEnum(ExploreKind) kind!: ExploreKind;
  @ApiProperty({ type: I18nTextDto })
  @ValidateNested()
  @Type(() => I18nTextDto)
  title!: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  body?: I18nTextDto;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() lng?: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() coverMediaId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
export class UpdateExploreItemDto extends PartialType(CreateExploreItemDto) {}

export class ParikramaStopDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templeId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() poiId?: string;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  note?: I18nTextDto;
}

export class UpsertParikramaRouteDto {
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;
  @ApiProperty() @IsInt() @Min(1) @Max(500_000) distanceM!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(10_000) estDurationMin!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100_000) polyline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) difficulty?: string;
  @ApiProperty({ type: [ParikramaStopDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ParikramaStopDto)
  stops!: ParikramaStopDto[];
}
