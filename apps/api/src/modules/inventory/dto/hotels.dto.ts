import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
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
  ValidateNested,
} from 'class-validator';
import { I18nTextDto, LocalizedQueryDto } from '../../../core/i18n';
import { CancellationPolicyDto, HHMM, ISO_DATE } from './common.dto';

export class CreateHotelDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cityId!: string;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiProperty() @IsString() @MaxLength(300) address!: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  starRating?: number;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @Matches(/^[a-z0-9-]{2,40}$/, { each: true })
  amenities?: string[];
  @ApiPropertyOptional({ example: '12:00' }) @IsOptional() @Matches(HHMM) checkinTime?: string;
  @ApiPropertyOptional({ example: '11:00' }) @IsOptional() @Matches(HHMM) checkoutTime?: string;
  @ApiPropertyOptional({ type: CancellationPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CancellationPolicyDto)
  cancellationPolicy?: CancellationPolicyDto;
  @ApiPropertyOptional({ description: 'Visible to travellers (vendor must be active)' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
export class UpdateHotelDto extends PartialType(CreateHotelDto) {}

export class CreateRoomTypeDto {
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiProperty({ example: 2 }) @IsInt() @Min(1) @Max(20) maxGuests!: number;
  @ApiProperty({ example: 180000, description: 'Default nightly price in paise' })
  @IsInt()
  @Min(0)
  @Max(100_000_00)
  basePricePaise!: number;
  @ApiProperty({ example: 10 }) @IsInt() @Min(0) @Max(1000) totalRooms!: number;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @Matches(/^[a-z0-9-]{2,40}$/, { each: true })
  amenities?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  mediaIds?: string[];
}
export class UpdateRoomTypeDto extends PartialType(CreateRoomTypeDto) {}

export class CalendarQueryDto {
  @ApiProperty({ example: '2026-10-11' }) @Matches(ISO_DATE) from!: string;
  @ApiProperty({ example: '2026-11-10' }) @Matches(ISO_DATE) to!: string;
}

export class UpdateCalendarDto extends CalendarQueryDto {
  @ApiPropertyOptional({ description: 'Nightly price override in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_00)
  pricePaise?: number;
  @ApiPropertyOptional({ description: 'Rooms in the inventory for these nights' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  total?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() stopSell?: boolean;
  @ApiPropertyOptional({
    type: [Number],
    description: 'Only these weekdays (0=Sun … 6=Sat), e.g. weekend pricing',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  weekdays?: number[];
}

export class HotelSearchQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: 'vrindavan' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/)
  city?: string;
  @ApiPropertyOptional({ example: '2026-10-20' }) @IsOptional() @Matches(ISO_DATE) checkIn?: string;
  @ApiPropertyOptional({ example: '2026-10-22' })
  @IsOptional()
  @Matches(ISO_DATE)
  checkOut?: string;
  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  guests?: number;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  rooms?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  radiusKm?: number;
  @ApiPropertyOptional({ description: 'Max average nightly price per room, paise' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number;
}

export class StayQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ example: '2026-10-20' }) @IsOptional() @Matches(ISO_DATE) checkIn?: string;
  @ApiPropertyOptional({ example: '2026-10-22' })
  @IsOptional()
  @Matches(ISO_DATE)
  checkOut?: string;
  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  guests?: number;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  rooms?: number;
}

export class NightPriceResponse {
  @ApiProperty() date!: string;
  @ApiProperty() pricePaise!: number;
}

export class RoomTypeResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() maxGuests!: number;
  @ApiProperty() basePricePaise!: number;
  @ApiProperty() totalRooms!: number;
  @ApiProperty({ type: [String] }) amenities!: string[];
  @ApiProperty({ type: [String] }) imageUrls!: string[];
  @ApiPropertyOptional({ description: 'With dates: bookable for the whole stay' })
  available?: boolean;
  @ApiPropertyOptional({ description: 'With dates: fewest rooms left on any night' })
  roomsLeft?: number;
  @ApiPropertyOptional({ description: 'With dates: total for all nights × rooms, paise' })
  stayTotalPaise?: number;
  @ApiPropertyOptional({ type: [NightPriceResponse] }) nights?: NightPriceResponse[];
}

export class HotelResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) vendorId!: string;
  @ApiProperty({ format: 'uuid' }) cityId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty() address!: string;
  @ApiProperty({ type: Number, nullable: true }) starRating!: number | null;
  @ApiProperty({ type: [String] }) amenities!: string[];
  @ApiProperty() checkinTime!: string;
  @ApiProperty() checkoutTime!: string;
  @ApiProperty({ type: CancellationPolicyDto }) cancellationPolicy!: CancellationPolicyDto;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty() isPublished!: boolean;
  @ApiProperty({ type: String, nullable: true }) coverUrl!: string | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Lowest nightly price per room for the query, paise',
  })
  fromPricePaise!: number | null;
  @ApiPropertyOptional() distanceKm?: number;
  @ApiPropertyOptional({ type: [RoomTypeResponse] }) roomTypes?: RoomTypeResponse[];
}

export class CalendarDayResponse {
  @ApiProperty() date!: string;
  @ApiProperty() total!: number;
  @ApiProperty() available!: number;
  @ApiProperty() booked!: number;
  @ApiProperty() pricePaise!: number;
  @ApiProperty() stopSell!: boolean;
}
