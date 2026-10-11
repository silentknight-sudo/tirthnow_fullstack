import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExperienceKind } from '@prisma/client';
import { I18nTextDto, LocalizedQueryDto } from '../../../core/i18n';
import { CancellationPolicyDto, HHMM, ISO_DATE } from './common.dto';

export class CreateExperienceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cityId!: string;
  @ApiProperty({ enum: ExperienceKind }) @IsEnum(ExperienceKind) kind!: ExperienceKind;
  @ApiProperty({ type: I18nTextDto })
  @ValidateNested()
  @Type(() => I18nTextDto)
  title!: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;
  @ApiProperty({ example: 30000, description: 'Per person, paise' })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  pricePaise!: number;
  @ApiProperty({ example: 45 }) @IsInt() @Min(5) @Max(1440) durationMin!: number;
  @ApiProperty({ example: 8 }) @IsInt() @Min(1) @Max(500) maxGroupSize!: number;
  @ApiPropertyOptional({ type: CancellationPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CancellationPolicyDto)
  cancellationPolicy?: CancellationPolicyDto;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {}

export class CreateSlotsDto {
  @ApiProperty({ type: [String], example: ['2026-10-20', '2026-10-21'], description: 'IST dates' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(90)
  @Matches(ISO_DATE, { each: true })
  dates!: string[];

  @ApiProperty({ type: [String], example: ['06:30', '17:30'], description: 'IST start times' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @Matches(HHMM, { each: true })
  times!: string[];

  @ApiProperty({ example: 8 }) @IsInt() @Min(1) @Max(500) capacity!: number;
}

export class ExperienceQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[a-z0-9-]{2,60}$/) city?: string;
  @ApiPropertyOptional({ enum: ExperienceKind })
  @IsOptional()
  @IsEnum(ExperienceKind)
  kind?: ExperienceKind;
}

export class SlotQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ description: 'From (ISO), default now' })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({ default: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  days?: number;
}

export class SlotResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty() capacity!: number;
  @ApiProperty() booked!: number;
  @ApiProperty() remaining!: number;
}

export class ExperienceResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) vendorId!: string;
  @ApiProperty({ format: 'uuid' }) cityId!: string;
  @ApiProperty({ enum: ExperienceKind }) kind!: ExperienceKind;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() pricePaise!: number;
  @ApiProperty() durationMin!: number;
  @ApiProperty() maxGroupSize!: number;
  @ApiProperty({ type: CancellationPolicyDto }) cancellationPolicy!: CancellationPolicyDto;
  @ApiProperty() isPublished!: boolean;
  @ApiPropertyOptional({ type: [SlotResponse] }) slots?: SlotResponse[];
}
