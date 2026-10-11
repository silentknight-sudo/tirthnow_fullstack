import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, OrderType, VehicleClass } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class HotelOrderDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() roomTypeId!: string;
  @ApiProperty({ example: '2026-10-20' }) @Matches(DATE) checkIn!: string;
  @ApiProperty({ example: '2026-10-22' }) @Matches(DATE) checkOut!: string;
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) @Max(10) rooms!: number;
  @ApiProperty({ example: 2 }) @IsInt() @Min(1) @Max(40) guests!: number;
  @ApiPropertyOptional({ example: 'Radha Krishna Das' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/)
  guestPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) specialRequests?: string;
}

export class PlaceDto {
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiPropertyOptional({ example: 'Banke Bihari gate 2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

export class CabOrderDto {
  @ApiProperty({ format: 'uuid', description: 'Vendor from the chosen estimate' })
  @IsUUID()
  vendorId!: string;
  @ApiProperty({ enum: VehicleClass }) @IsEnum(VehicleClass) vehicleClass!: VehicleClass;
  @ApiProperty({ type: PlaceDto }) @ValidateNested() @Type(() => PlaceDto) pickup!: PlaceDto;
  @ApiProperty({ type: PlaceDto }) @ValidateNested() @Type(() => PlaceDto) drop!: PlaceDto;
  @ApiProperty({ description: 'Pickup time (ISO)' }) @IsDateString() pickupAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(30) passengers?: number;
}

export class FoodLineDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() menuItemId!: string;
  @ApiProperty({ example: 2 }) @IsInt() @Min(1) @Max(20) quantity!: number;
}

export class FoodOrderDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() restaurantId!: string;
  @ApiProperty({ type: [FoodLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FoodLineDto)
  items!: FoodLineDto[];
  @ApiPropertyOptional({ enum: ['pickup', 'dine_in'], default: 'pickup' })
  @IsOptional()
  @IsIn(['pickup', 'dine_in'])
  mode?: 'pickup' | 'dine_in';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class ExperienceOrderDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() slotId!: string;
  @ApiProperty({ example: 2 }) @IsInt() @Min(1) @Max(500) seats!: number;
}

/** One body per booking type; exactly the block matching `type` must be present. */
export class CreateOrderDto {
  @ApiProperty({ enum: ['hotel', 'cab', 'food', 'experience'] })
  @IsIn(['hotel', 'cab', 'food', 'experience'])
  type!: Exclude<OrderType, 'transit'>;

  @ApiPropertyOptional({ type: HotelOrderDto })
  @ValidateIf((o: CreateOrderDto) => o.type === 'hotel')
  @ValidateNested()
  @Type(() => HotelOrderDto)
  hotel?: HotelOrderDto;

  @ApiPropertyOptional({ type: CabOrderDto })
  @ValidateIf((o: CreateOrderDto) => o.type === 'cab')
  @ValidateNested()
  @Type(() => CabOrderDto)
  cab?: CabOrderDto;

  @ApiPropertyOptional({ type: FoodOrderDto })
  @ValidateIf((o: CreateOrderDto) => o.type === 'food')
  @ValidateNested()
  @Type(() => FoodOrderDto)
  food?: FoodOrderDto;

  @ApiPropertyOptional({ type: ExperienceOrderDto })
  @ValidateIf((o: CreateOrderDto) => o.type === 'experience')
  @ValidateNested()
  @Type(() => ExperienceOrderDto)
  experience?: ExperienceOrderDto;
}

export class VerifyPaymentDto {
  @ApiProperty() @IsString() @MaxLength(100) providerOrderId!: string;
  @ApiProperty() @IsString() @MaxLength(100) providerPaymentId!: string;
  @ApiProperty() @IsString() @MaxLength(256) signature!: string;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'change_of_plans' }) @Matches(/^[a-z_]{3,40}$/) reasonCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reasonText?: string;
}

export class ReasonDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class AdminRefundDto {
  @ApiProperty({ example: 50000 }) @IsInt() @Min(1) amountPaise!: number;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class OrderQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
  @ApiPropertyOptional({ enum: OrderType }) @IsOptional() @IsEnum(OrderType) type?: OrderType;
}

export class AdminOrderQueryDto extends OrderQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() vendorId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional({ example: 'TN-2610-AB3K9' })
  @IsOptional()
  @Matches(/^TN-\d{4}-[A-Z0-9]{5}$/)
  code?: string;
}

export class OrderItemResponse {
  @ApiProperty() itemType!: string;
  @ApiProperty({ type: String, nullable: true }) refId!: string | null;
  @ApiProperty({ type: String, nullable: true }) stayDate!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPricePaise!: number;
  @ApiProperty() totalPaise!: number;
  @ApiProperty({ type: Object }) snapshot!: unknown;
}

export class StatusHistoryResponse {
  @ApiProperty({ type: String, nullable: true }) from!: string | null;
  @ApiProperty() to!: string;
  @ApiProperty() actorType!: string;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty() at!: string;
}

export class PaymentIntentResponse {
  @ApiProperty({ format: 'uuid' }) paymentId!: string;
  @ApiProperty({ example: 'razorpay' }) provider!: string;
  @ApiProperty() providerOrderId!: string;
  @ApiProperty() keyId!: string;
  @ApiProperty() amountPaise!: number;
  @ApiProperty({ enum: ['INR'] }) currency!: 'INR';
}

export class OrderResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: OrderType }) type!: OrderType;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ type: String, nullable: true }) subStatus!: string | null;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ type: String, nullable: true }) vendorId!: string | null;
  @ApiProperty() subtotalPaise!: number;
  @ApiProperty() taxPaise!: number;
  @ApiProperty() feePaise!: number;
  @ApiProperty() discountPaise!: number;
  @ApiProperty() totalPaise!: number;
  @ApiProperty({ type: String, nullable: true }) serviceStartsAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) serviceEndsAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) holdExpiresAt!: string | null;
  @ApiProperty({ type: Object }) details!: unknown;
  @ApiProperty({ type: [OrderItemResponse] }) items!: OrderItemResponse[];
  @ApiPropertyOptional({ type: [StatusHistoryResponse] }) history?: StatusHistoryResponse[];
  @ApiPropertyOptional({ description: 'Refunded so far, paise' }) refundedPaise?: number;
  @ApiProperty() createdAt!: string;
}

export class CreateOrderResponse {
  @ApiProperty({ type: OrderResponse }) order!: OrderResponse;
  @ApiProperty({
    type: PaymentIntentResponse,
    nullable: true,
    description: 'Null when nothing is payable',
  })
  payment!: PaymentIntentResponse | null;
}

export class CancellationPreviewResponse {
  @ApiProperty() allowed!: boolean;
  @ApiProperty() refundPaise!: number;
  @ApiProperty() penaltyPaise!: number;
  @ApiProperty() reason!: string;
}
