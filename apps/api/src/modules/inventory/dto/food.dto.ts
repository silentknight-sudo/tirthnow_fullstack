import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
import { I18nTextDto, LocalizedQueryDto } from '../../../core/i18n';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ExternalLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  zomato?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  swiggy?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  blinkit?: string;
}

export class CreateRestaurantDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() cityId!: string;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isPureVeg?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSatvik?: boolean;
  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @Matches(/^\d{14}$/)
  fssaiNo?: string;
  @ApiPropertyOptional({ example: { daily: [['07:00', '22:30']] } })
  @IsOptional()
  @IsObject()
  openingHours?: Record<string, unknown>;
  @ApiPropertyOptional({ type: ExternalLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExternalLinksDto)
  externalLinks?: ExternalLinksDto;
  @ApiPropertyOptional({ description: 'Accept in-app food orders' })
  @IsOptional()
  @IsBoolean()
  acceptsOrders?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {}

export class CreateMenuItemDto {
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) name!: I18nTextDto;
  @ApiProperty({ example: 'thali' }) @Matches(/^[a-z0-9-]{2,40}$/) category!: string;
  @ApiProperty({ example: 22000 }) @IsInt() @Min(0) @Max(1_000_000) pricePaise!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isJain?: boolean;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() mediaId?: string;
}
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}

export class RestaurantQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[a-z0-9-]{2,60}$/) city?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() veg?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() satvik?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  radiusKm?: number;
}

export class MenuItemResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() pricePaise!: number;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty() isJain!: boolean;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;
}

export class RestaurantResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) vendorId!: string;
  @ApiProperty({ format: 'uuid' }) cityId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty() isPureVeg!: boolean;
  @ApiProperty() isSatvik!: boolean;
  @ApiProperty({ type: Object }) openingHours!: unknown;
  @ApiProperty({ type: ExternalLinksDto }) externalLinks!: ExternalLinksDto;
  @ApiProperty() acceptsOrders!: boolean;
  @ApiProperty() isPublished!: boolean;
  @ApiPropertyOptional() distanceKm?: number;
  @ApiPropertyOptional({ type: [MenuItemResponse] }) menu?: MenuItemResponse[];
}
