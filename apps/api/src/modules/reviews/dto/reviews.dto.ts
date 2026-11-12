import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ModerationStatus, ReviewTarget } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';

export class CreateReviewDto {
  @ApiProperty({ enum: ReviewTarget }) @IsEnum(ReviewTarget) targetType!: ReviewTarget;
  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Completed order (required for everything except temples)',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
  @ApiPropertyOptional({ type: [String], description: 'Ready review_image uploads (max 6)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('all', { each: true })
  mediaIds?: string[];
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('all', { each: true })
  mediaIds?: string[];
}

export class ReviewQueryDto extends CursorQueryDto {
  @ApiProperty({ enum: ReviewTarget }) @IsEnum(ReviewTarget) targetType!: ReviewTarget;
  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class VendorReviewQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ description: 'Only reviews without a reply' })
  @IsOptional()
  @IsString()
  unanswered?: string;
}

export class ReplyDto {
  @ApiProperty({ maxLength: 1000 }) @IsString() @MinLength(2) @MaxLength(1000) reply!: string;
}

export class ReviewAuthorResponse {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true, type: String }) avatarUrl!: string | null;
}

export class ReviewResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ReviewTarget }) targetType!: ReviewTarget;
  @ApiProperty() targetId!: string;
  @ApiProperty() rating!: number;
  @ApiProperty({ nullable: true, type: String }) body!: string | null;
  @ApiProperty({ type: [String] }) photoUrls!: string[];
  @ApiProperty() verifiedStay!: boolean;
  @ApiProperty({ type: ReviewAuthorResponse }) author!: ReviewAuthorResponse;
  @ApiProperty({ nullable: true, type: String }) vendorReply!: string | null;
  @ApiProperty({ nullable: true, type: String }) vendorRepliedAt!: string | null;
  @ApiProperty({ enum: ModerationStatus }) moderationStatus!: ModerationStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class RatingSummaryResponse {
  @ApiProperty({ example: 4.4 }) average!: number;
  @ApiProperty() count!: number;
  @ApiProperty({ example: { '1': 0, '2': 1, '3': 2, '4': 10, '5': 20 } }) distribution!: Record<
    string,
    number
  >;
}

export class ReviewPageResponse {
  @ApiProperty({ type: RatingSummaryResponse }) summary!: RatingSummaryResponse;
  @ApiProperty({ type: [ReviewResponse] }) data!: ReviewResponse[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}

/** Cursor page of reviews about a vendor's listings (portal). */
export class VendorReviewPageResponse {
  @ApiProperty({ type: [ReviewResponse] }) data!: ReviewResponse[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: [7, 30, 90], default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90])
  days?: number;
}

export class DailySalesResponse {
  @ApiProperty({ example: '2026-11-12' }) date!: string;
  @ApiProperty() orders!: number;
  @ApiProperty() earningsPaise!: number;
}

export class TopItemResponse {
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() salesPaise!: number;
}

export class VendorAnalyticsResponse {
  @ApiProperty() days!: number;
  @ApiProperty() ordersCount!: number;
  @ApiProperty({ description: 'What customers paid' }) grossPaise!: number;
  @ApiProperty({ description: 'What the vendor keeps (gross − platform fee)' })
  earningsPaise!: number;
  @ApiProperty() discountsPaise!: number;
  @ApiProperty() avgOrderPaise!: number;
  @ApiProperty({ type: Object }) statusCounts!: Record<string, number>;
  @ApiProperty({ type: [DailySalesResponse] }) daily!: DailySalesResponse[];
  @ApiProperty({ type: [TopItemResponse] }) topItems!: TopItemResponse[];
  @ApiProperty() ratingAverage!: number;
  @ApiProperty() ratingCount!: number;
  @ApiProperty({ type: Object }) ratingDistribution!: Record<string, number>;
}
