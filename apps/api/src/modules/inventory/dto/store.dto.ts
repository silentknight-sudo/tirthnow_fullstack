import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const PRODUCT_CATEGORIES = [
  'pooja_thali',
  'diya_dhoop',
  'garland',
  'prasad',
  'poshak',
  'tilak_mala',
  'idols',
  'books',
  'other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export class CreateProductDto {
  @ApiProperty({ example: 'Pooja thali set' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  @IsIn(PRODUCT_CATEGORIES)
  category!: ProductCategory;

  @ApiPropertyOptional({ example: 'piece' })
  @IsOptional()
  @Matches(/^[a-z ]{2,20}$/)
  unit?: string;

  @ApiProperty({
    description: 'Vendor base price in paise (GST and platform fee are added at checkout)',
    example: 25000,
  })
  @IsInt()
  @Min(100)
  @Max(5_000_000)
  pricePaise!: number;

  @ApiPropertyOptional({ example: 32000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5_000_000)
  mrpPaise?: number;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(0)
  @Max(100_000)
  stock!: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Ready media ids uploaded with purpose "listing_image"',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('4', { each: true })
  mediaIds?: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;

  @ApiPropertyOptional({ description: 'Search in name' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}

export class ProductResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) vendorId!: string;
  @ApiProperty() vendorName!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ enum: PRODUCT_CATEGORIES }) category!: string;
  @ApiProperty() unit!: string;
  @ApiProperty({ description: 'Vendor base price' }) pricePaise!: number;
  @ApiProperty({ description: 'Price the customer pays (base + GST + platform fee)' })
  displayPricePaise!: number;
  @ApiProperty({ type: Number, nullable: true }) mrpPaise!: number | null;
  @ApiProperty() stock!: number;
  @ApiProperty({ type: [String] }) imageUrls!: string[];
  @ApiProperty() isPublished!: boolean;
  @ApiProperty() ratingAvg!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty() soldCount!: number;
}

export class CategoryResponse {
  @ApiProperty({ enum: PRODUCT_CATEGORIES }) key!: string;
  @ApiProperty() count!: number;
}

export class ProductLineDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() productId!: string;
  @ApiProperty({ example: 2 }) @IsInt() @Min(1) @Max(50) quantity!: number;
}

// ───────────── coupons ─────────────

export class CreateCouponDto {
  @ApiProperty({ example: 'RADHE10' })
  @Matches(/^[A-Z0-9]{4,16}$/)
  code!: string;

  @ApiProperty({ enum: ['percent', 'flat'] })
  @IsIn(['percent', 'flat'])
  kind!: 'percent' | 'flat';

  @ApiPropertyOptional({
    description: 'For percent coupons, basis points (1000 = 10%)',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(9000)
  percentBps?: number;

  @ApiPropertyOptional({ description: 'For flat coupons, paise off', example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(1_000_000)
  flatPaise?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  minOrderPaise?: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  maxDiscountPaise?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class CouponResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: ['percent', 'flat'] }) kind!: string;
  @ApiProperty() percentBps!: number;
  @ApiProperty() flatPaise!: number;
  @ApiProperty() minOrderPaise!: number;
  @ApiProperty({ type: Number, nullable: true }) maxDiscountPaise!: number | null;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) endsAt!: string | null;
  @ApiProperty({ type: Number, nullable: true }) usageLimit!: number | null;
  @ApiProperty() usedCount!: number;
  @ApiProperty() isActive!: boolean;
}

export class PriceQuoteDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() vendorId!: string;
  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  basePaise!: number;
  @ApiPropertyOptional({ example: 'RADHE10' })
  @IsOptional()
  @Matches(/^[A-Z0-9]{4,16}$/)
  couponCode?: string;
}

export class PriceQuoteResponse {
  @ApiProperty() basePaise!: number;
  @ApiProperty() discountPaise!: number;
  @ApiProperty({ description: 'GST on the discounted base' }) taxPaise!: number;
  @ApiProperty({ description: 'Platform charge on the discounted base' }) feePaise!: number;
  @ApiProperty() totalPaise!: number;
  @ApiProperty({ type: String, nullable: true }) couponCode!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Why the coupon did not apply' })
  couponError!: string | null;
}
