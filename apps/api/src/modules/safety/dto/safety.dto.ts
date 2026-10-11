import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SosStatus } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';

export class SosLocationDto {
  @ApiProperty({ example: 27.5806 }) @IsLatitude() lat!: number;
  @ApiProperty({ example: 77.6996 }) @IsLongitude() lng!: number;
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  accuracyM?: number;
  @ApiPropertyOptional({ example: 54 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryPct?: number;
}

export class TriggerSosDto extends SosLocationDto {}

export class ResolveSosDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
  @ApiPropertyOptional({ description: 'Admin only: mark as a false alarm' })
  @IsOptional()
  @IsBoolean()
  falseAlarm?: boolean;
}

export class SosAdminQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: SosStatus }) @IsOptional() @IsEnum(SosStatus) status?: SosStatus;
  @ApiPropertyOptional({ description: 'Only triggered or dispatched' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class HelpPointResponse {
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ nullable: true, type: String }) phoneE164!: string | null;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiPropertyOptional() distanceKm?: number;
}

export class SosResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: SosStatus }) status!: SosStatus;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty() shareUrl!: string;
  @ApiProperty() shareExpiresAt!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) dispatchedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) resolvedAt!: string | null;
  @ApiProperty() contactsNotified!: number;
  @ApiProperty({ description: 'Seconds left to cancel an accidental trigger' })
  cancellableForS!: number;
  @ApiProperty({ type: [HelpPointResponse] }) nearestHelp!: HelpPointResponse[];
  @ApiProperty({ type: [Object] }) helplines!: { name: string; phone: string }[];
}

export class SharedSosResponse {
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['active', 'ended'] }) state!: 'active' | 'ended';
  @ApiProperty({ nullable: true, type: Number }) lat!: number | null;
  @ApiProperty({ nullable: true, type: Number }) lng!: number | null;
  @ApiProperty({ nullable: true, type: Number }) accuracyM!: number | null;
  @ApiProperty({ nullable: true, type: Number }) batteryPct!: number | null;
  @ApiProperty() updatedAt!: string;
  @ApiProperty() expiresAt!: string;
  @ApiProperty({ type: [Object], description: 'Recent points, oldest first' }) trail!: {
    lat: number;
    lng: number;
    at: string;
  }[];
}
