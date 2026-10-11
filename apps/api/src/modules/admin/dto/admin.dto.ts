import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ConfigKind } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';

export class KpiQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'IST date, inclusive (default: 30 days ago)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;
  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'IST date, inclusive (default: today)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class UserQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ description: 'Phone, email or name fragment' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
  @ApiPropertyOptional({ enum: ['user', 'vendor_owner', 'vendor_staff', 'admin', 'super_admin'] })
  @IsOptional()
  @IsIn(['user', 'vendor_owner', 'vendor_staff', 'admin', 'super_admin'])
  role?: 'user' | 'vendor_owner' | 'vendor_staff' | 'admin' | 'super_admin';
  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsIn(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';
}

export class UserStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] }) @IsIn(['active', 'suspended']) status!:
    'active' | 'suspended';
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class PlatformRoleDto {
  @ApiProperty({ enum: ['admin', 'super_admin'] }) @IsIn(['admin', 'super_admin']) role!:
    'admin' | 'super_admin';
}

export class ConfigDto {
  @ApiProperty({ example: 'banner.diwali' }) @Matches(/^[a-z0-9_.-]{2,80}$/) key!: string;
  @ApiProperty({ enum: ConfigKind }) @IsEnum(ConfigKind) kind!: ConfigKind;
  @ApiProperty({ description: 'Any JSON value' }) @IsObject() value!: Record<string, unknown>;
  @ApiPropertyOptional({ example: { platforms: ['android'], cityIds: [] } })
  @IsOptional()
  @IsObject()
  targeting?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
}

export class BroadcastDto {
  @ApiProperty({ maxLength: 80 }) @IsString() @MinLength(3) @MaxLength(80) title!: string;
  @ApiProperty({ maxLength: 400 }) @IsString() @MinLength(3) @MaxLength(400) body!: string;
  @ApiPropertyOptional({
    example: 'vrindavan',
    description: 'Only users whose home city is this (default: everyone)',
  })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,60}$/)
  city?: string;
  @ApiPropertyOptional({ description: 'Emergency alert: ignores marketing opt-out, high priority' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  emergency?: boolean;
}

export class AuditQueryDto extends CursorQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) entityType?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() actorId?: string;
  @ApiPropertyOptional({ example: 'order.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  actionPrefix?: string;
}
