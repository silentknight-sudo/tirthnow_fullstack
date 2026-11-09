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

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class TripMemberDto {
  @ApiProperty({ maxLength: 60 }) @IsString() @MinLength(1) @MaxLength(60) name!: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone?: string;
  @ApiPropertyOptional({ enum: ['organiser', 'member', 'elder', 'child'] })
  @IsOptional()
  @IsIn(['organiser', 'member', 'elder', 'child'])
  role?: 'organiser' | 'member' | 'elder' | 'child';
}

export class TripStayDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'A TirthNow hotel, if booked here' })
  @IsOptional()
  @IsUUID()
  hotelId?: string;
  @ApiProperty({ maxLength: 120 }) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional({ description: 'Price per room per night (paise)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  nightlyPaise?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  rooms?: number;
  @ApiPropertyOptional({ example: '13:00' }) @IsOptional() @Matches(HHMM) checkInTime?: string;
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
  @ApiPropertyOptional({ maxLength: 300 }) @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export const ARRIVAL_MODES = ['train', 'bus', 'car', 'flight', 'other'] as const;
export const LOCAL_TRANSPORT = ['e_rickshaw', 'cab', 'walk', 'bus', 'own_vehicle'] as const;

export class TripTravelDto {
  @ApiProperty({ enum: ARRIVAL_MODES })
  @IsIn(ARRIVAL_MODES)
  arrivalMode!: (typeof ARRIVAL_MODES)[number];
  @ApiPropertyOptional({ maxLength: 80, example: 'New Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  from?: string;
  @ApiPropertyOptional({ example: '09:30', description: 'Arrival on day 1 (IST)' })
  @IsOptional()
  @Matches(HHMM)
  arrivalTime?: string;
  @ApiPropertyOptional({ example: '18:00', description: 'Departure on the last day (IST)' })
  @IsOptional()
  @Matches(HHMM)
  departureTime?: string;
  @ApiPropertyOptional({ enum: LOCAL_TRANSPORT })
  @IsOptional()
  @IsIn(LOCAL_TRANSPORT)
  localTransport?: (typeof LOCAL_TRANSPORT)[number];
  @ApiPropertyOptional({ maxLength: 200, example: 'Taj Express 12280, coach B2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  details?: string;
}

export class CustomStopDto {
  @ApiProperty({ minimum: 0, maximum: 6 }) @IsInt() @Min(0) @Max(6) dayIndex!: number;
  @ApiPropertyOptional({ example: '10:00' }) @IsOptional() @Matches(HHMM) time?: string;
  @ApiProperty({ maxLength: 120 }) @IsString() @MinLength(1) @MaxLength(120) title!: string;
  @ApiPropertyOptional({ maxLength: 300 }) @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templeId?: string;
  @ApiPropertyOptional({ minimum: 15, maximum: 600, default: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(600)
  durationMin?: number;
}

export class CreateItineraryDto {
  @ApiProperty({ example: '2026-11-01' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @ApiProperty({ minimum: 1, maximum: 7 }) @IsInt() @Min(1) @Max(7) days!: number;
  @ApiPropertyOptional({ description: 'Total budget (paise)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  budgetPaise?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(50) partySize?: number;
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
  @ApiPropertyOptional({
    enum: ['ai', 'custom'],
    default: 'ai',
    description: 'custom = only your own stops',
  })
  @IsOptional()
  @IsIn(['ai', 'custom'])
  mode?: 'ai' | 'custom';
  @ApiPropertyOptional({ enum: ['solo', 'family', 'group'] })
  @IsOptional()
  @IsIn(['solo', 'family', 'group'])
  tripType?: 'solo' | 'family' | 'group';
  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  groupName?: string;
  @ApiPropertyOptional({ type: [TripMemberDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TripMemberDto)
  members?: TripMemberDto[];
  @ApiPropertyOptional({ type: TripStayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TripStayDto)
  stay?: TripStayDto;
  @ApiPropertyOptional({ type: TripTravelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TripTravelDto)
  travel?: TripTravelDto;
  @ApiPropertyOptional({ type: [CustomStopDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => CustomStopDto)
  customStops?: CustomStopDto[];
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) notes?: string;
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

export class TranslateDto {
  @ApiProperty({ maxLength: 2000 }) @IsString() @MinLength(1) @MaxLength(2000) text!: string;
  @ApiProperty({ enum: ['en', 'hi'], description: 'Target language' }) @IsIn(['en', 'hi']) to!:
    'en' | 'hi';
}

export class TranslateResponse {
  @ApiProperty() text!: string;
  @ApiProperty({ enum: ['en', 'hi'] }) lang!: 'en' | 'hi';
}

export class LandmarkDto {
  @ApiProperty({ format: 'uuid', description: 'landmark_photo upload' }) @IsUUID() mediaId!: string;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() lng?: number;
}
