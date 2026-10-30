import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OrderType, PayoutStatus } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';

export class CommissionRuleDto {
  @ApiProperty({ example: 'Default commission' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiPropertyOptional({ enum: OrderType }) @IsOptional() @IsEnum(OrderType) orderType?: OrderType;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() vendorId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cityId?: string;
  @ApiProperty({ example: 1000, description: 'Basis points (1000 = 10%)' })
  @IsInt()
  @Min(0)
  @Max(10_000)
  percentBps!: number;
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_00)
  flatPaise?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minPaise?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maxPaise?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateCommissionRuleDto extends PartialType(CommissionRuleDto) {}

export class PayoutQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() vendorId?: string;
}

export class HoldPayoutDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class MockCheckoutDto {
  @ApiProperty() @IsString() @MaxLength(100) providerOrderId!: string;
  @ApiPropertyOptional({ enum: ['success', 'failure'], default: 'success' })
  @IsOptional()
  @IsIn(['success', 'failure'])
  outcome?: 'success' | 'failure';
  @ApiPropertyOptional({
    default: true,
    description: 'Also deliver the signed webhook, like the gateway would',
  })
  @IsOptional()
  @IsBoolean()
  deliverWebhook?: boolean;
}

export class StatementQueryDto {
  @ApiProperty({ example: '2026-10' }) @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!: string;
}

export class EarningsResponse {
  @ApiProperty({ description: 'Vendor share of bookings not yet completed' })
  pendingServicePaise!: number;
  @ApiProperty({ description: 'Earned and not yet paid out' }) payablePaise!: number;
  @ApiProperty({ description: 'Past the settlement hold and not in a payout yet' })
  availableForPayoutPaise!: number;
  @ApiProperty() inFlightPayoutsPaise!: number;
  @ApiProperty() paidOutPaise!: number;
  @ApiProperty() settlementHoldDays!: number;
}

export class PayoutResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) vendorId!: string;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty() amountPaise!: number;
  @ApiProperty({ enum: PayoutStatus }) status!: PayoutStatus;
  @ApiProperty({ type: String, nullable: true }) providerTransferId!: string | null;
  @ApiProperty({ type: String, nullable: true }) approvedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) paidAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) failureReason!: string | null;
  @ApiProperty() createdAt!: string;
}

/** Cursor page of a vendor's payouts. */
export class PayoutPageResponse {
  @ApiProperty({ type: [PayoutResponse] }) data!: PayoutResponse[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}
