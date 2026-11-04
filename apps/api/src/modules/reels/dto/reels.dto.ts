import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  ValidateNested,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ModAction,
  ModerationStatus,
  ReelStatus,
  ReportStatus,
  ReportTarget,
} from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';
import { LocalizedQueryDto } from '../../../core/i18n';

export const REEL_FILTERS = [
  'none',
  'warm',
  'cool',
  'vivid',
  'mono',
  'sepia',
  'fade',
  'saffron',
] as const;
export const REEL_SPEEDS = [0.5, 1, 1.5, 2] as const;

/** Text drawn over the video; x and y are fractions of the frame (0–1). */
export class ReelOverlayDto {
  @ApiProperty({ maxLength: 120 }) @IsString() @MinLength(1) @MaxLength(120) text!: string;
  @ApiProperty({ minimum: 0, maximum: 1 }) @IsNumber() @Min(0) @Max(1) x!: number;
  @ApiProperty({ minimum: 0, maximum: 1 }) @IsNumber() @Min(0) @Max(1) y!: number;
  @ApiProperty({ example: '#FFFFFF' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color!: string;
  @ApiProperty({ minimum: 12, maximum: 64 }) @IsInt() @Min(12) @Max(64) size!: number;
  @ApiProperty({ enum: ['plain', 'box', 'outline'] })
  @IsIn(['plain', 'box', 'outline'])
  style!: 'plain' | 'box' | 'outline';
}

/**
 * Non-destructive edits, applied by the player: the uploaded video is kept
 * as is and the app trims, filters, speeds up and overlays text on playback.
 */
export class ReelEditsDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) trimStartMs!: number;
  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    minimum: 1,
    description: 'null = to the end',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  trimEndMs?: number | null;
  @ApiProperty({ enum: REEL_FILTERS }) @IsIn(REEL_FILTERS) filter!: (typeof REEL_FILTERS)[number];
  @ApiProperty({ enum: REEL_SPEEDS, type: Number })
  @IsIn(REEL_SPEEDS)
  speed!: (typeof REEL_SPEEDS)[number];
  @ApiProperty() @IsBoolean() muted!: boolean;
  @ApiProperty({ type: [ReelOverlayDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ReelOverlayDto)
  overlays!: ReelOverlayDto[];
}

const EditsField = () => (target: object, key: string) => {
  ApiPropertyOptional({ type: ReelEditsDto })(target, key);
  IsOptional()(target, key);
  ValidateNested()(target, key);
  Type(() => ReelEditsDto)(target, key);
};

export class CreateReelDto {
  @ApiProperty({ format: 'uuid', description: 'Uploaded reel_video' })
  @IsUUID()
  videoMediaId!: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Uploaded reel_thumbnail' })
  @IsOptional()
  @IsUUID()
  thumbnailMediaId?: string;
  @ApiPropertyOptional({ maxLength: 2200 })
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;
  @ApiPropertyOptional({ type: [String], example: ['vrindavan', 'aarti'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(41, { each: true })
  hashtags?: string[];
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cityId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templeId?: string;
  @EditsField() edits?: ReelEditsDto;
}

/** Owner edits after posting; omitted fields stay as they are. */
export class UpdateReelDto {
  @ApiPropertyOptional({ maxLength: 2200 })
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(41, { each: true })
  hashtags?: string[];
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null removes the tag',
  })
  @IsOptional()
  @IsUUID()
  templeId?: string | null;
  @ApiPropertyOptional({ format: 'uuid', description: 'New uploaded reel_thumbnail (cover)' })
  @IsOptional()
  @IsUUID()
  thumbnailMediaId?: string;
  @EditsField() edits?: ReelEditsDto;
}

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class FeedQueryDto extends LocalizedQueryDto {
  @ApiPropertyOptional({ description: 'Opaque cursor' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
  @ApiPropertyOptional({ default: 10, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
  @ApiPropertyOptional({ example: 'vrindavan' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,60}$/)
  city?: string;
  @ApiPropertyOptional({ example: 'holi' })
  @IsOptional()
  @Matches(/^[\p{L}\p{M}\p{N}_]{1,40}$/u)
  hashtag?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templeId?: string;
  @ApiPropertyOptional({ description: 'Only creators I follow (newest first)' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  following?: boolean;
}

export class CreateCommentDto {
  @ApiProperty({ maxLength: 1000 }) @IsString() @MinLength(1) @MaxLength(1000) body!: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Reply to a top-level comment' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export const REPORT_REASONS = [
  'spam',
  'nudity',
  'hate',
  'violence',
  'harassment',
  'misinformation',
  'scam',
  'copyright',
  'other',
] as const;

export class CreateReportDto {
  @ApiProperty({ enum: ReportTarget }) @IsEnum(ReportTarget) targetType!: ReportTarget;
  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS)
  reasonCode!: (typeof REPORT_REASONS)[number];
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class ModerationQueueQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus, default: 'open' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
  @ApiPropertyOptional({ enum: ReportTarget })
  @IsOptional()
  @IsEnum(ReportTarget)
  targetType?: ReportTarget;
}

export class ModerationActionDto {
  @ApiProperty({ enum: ModAction }) @IsEnum(ModAction) action!: ModAction;
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreatorResponse {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true, type: String }) avatarUrl!: string | null;
}

export class ReelResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ type: CreatorResponse }) creator!: CreatorResponse;
  @ApiProperty({ nullable: true, type: String }) caption!: string | null;
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty({ nullable: true, type: String }) cityId!: string | null;
  @ApiProperty({ nullable: true, type: String }) templeId!: string | null;
  @ApiProperty({ nullable: true, type: String }) templeName!: string | null;
  @ApiProperty({ enum: ReelStatus }) status!: ReelStatus;
  @ApiProperty({ enum: ModerationStatus }) moderationStatus!: ModerationStatus;
  @ApiProperty({ nullable: true, type: String }) playbackUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) posterUrl!: string | null;
  @ApiProperty({ nullable: true, type: Number }) durationMs!: number | null;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty() saveCount!: number;
  @ApiProperty() viewCount!: number;
  @ApiProperty() likedByMe!: boolean;
  @ApiProperty() savedByMe!: boolean;
  @ApiProperty({ description: 'The viewer follows the creator' }) followingCreator!: boolean;
  @ApiProperty({ nullable: true, type: ReelEditsDto }) edits!: ReelEditsDto | null;
  @ApiProperty() createdAt!: string;
}

export class ReelPageResponse {
  @ApiProperty({ type: [ReelResponse] }) data!: ReelResponse[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}

export class CommentResponse {
  @ApiProperty() id!: string;
  @ApiProperty() reelId!: string;
  @ApiProperty({ nullable: true, type: String }) parentId!: string | null;
  @ApiProperty({ type: CreatorResponse }) author!: CreatorResponse;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: ModerationStatus }) moderationStatus!: ModerationStatus;
  @ApiProperty() createdAt!: string;
}

export class CreatorProfileResponse extends CreatorResponse {
  @ApiProperty() followerCount!: number;
  @ApiProperty() followingCount!: number;
  @ApiProperty() reelCount!: number;
  @ApiProperty() isFollowing!: boolean;
  @ApiProperty() isMe!: boolean;
}

export class CreatorPageResponse extends ReelPageResponse {
  @ApiProperty({ type: CreatorProfileResponse }) profile!: CreatorProfileResponse;
}
