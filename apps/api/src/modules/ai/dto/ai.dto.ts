import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateChatSessionDto {
  @ApiPropertyOptional({ example: 'vrindavan' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,60}$/)
  city?: string;
  @ApiPropertyOptional({ enum: ['en', 'hi'] }) @IsOptional() @IsIn(['en', 'hi']) lang?: 'en' | 'hi';
}

export class ChatMessageDto {
  @ApiProperty({ maxLength: 2000 }) @IsString() @MinLength(1) @MaxLength(2000) content!: string;
}

export class AccessibilityDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wheelchair?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() elderly?: boolean;
}

export const INTERESTS = [
  'aarti',
  'temples',
  'parikrama',
  'ghats',
  'food',
  'shopping',
  'festivals',
] as const;

export class CreateItineraryDto {
  @ApiProperty({ example: '2026-11-01' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @ApiProperty({ minimum: 1, maximum: 7 }) @IsInt() @Min(1) @Max(7) days!: number;
  @ApiPropertyOptional({ description: 'Total budget (paise)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  budgetPaise?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(20) partySize?: number;
  @ApiPropertyOptional({ type: [String], example: ['vrindavan', 'mathura'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Matches(/^[a-z0-9-]{1,60}$/, { each: true })
  cities?: string[];
  @ApiPropertyOptional({ type: AccessibilityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessibilityDto)
  accessibility?: AccessibilityDto;
  @ApiPropertyOptional({ enum: INTERESTS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(INTERESTS, { each: true })
  interests?: (typeof INTERESTS)[number][];
  @ApiPropertyOptional({ enum: ['relaxed', 'normal', 'packed'], default: 'normal' })
  @IsOptional()
  @IsIn(['relaxed', 'normal', 'packed'])
  pace?: 'relaxed' | 'normal' | 'packed';
  @ApiPropertyOptional({ enum: ['en', 'hi'] }) @IsOptional() @IsIn(['en', 'hi']) lang?: 'en' | 'hi';
}

export class UpdateItineraryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) title?: string;
  @ApiPropertyOptional({ enum: ['draft', 'saved', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'saved', 'archived'])
  status?: 'draft' | 'saved' | 'archived';
  @ApiPropertyOptional({ type: [String], description: 'Item ids to remove' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  removeItemIds?: string[];
}

export class TranscribeDto {
  @ApiProperty({ format: 'uuid', description: 'voice_note upload' }) @IsUUID() mediaId!: string;
}

export class SpeakDto {
  @ApiProperty({ maxLength: 1000 }) @IsString() @MinLength(1) @MaxLength(1000) text!: string;
  @ApiPropertyOptional({ enum: ['en', 'hi'] }) @IsOptional() @IsIn(['en', 'hi']) lang?: 'en' | 'hi';
}

export class LandmarkDto {
  @ApiProperty({ format: 'uuid', description: 'landmark_photo upload' }) @IsUUID() mediaId!: string;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() lng?: number;
}
