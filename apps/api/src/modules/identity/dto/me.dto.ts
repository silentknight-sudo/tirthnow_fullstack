import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
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
import { DevicePlatform } from '@prisma/client';
import { LANGS, type Lang } from '@tirth-now/shared-types';

export const E164 = /^\+[1-9]\d{6,14}$/;

export class AccessibilityDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wheelchair?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() elderly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() avoidStairs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() lowWalking?: boolean;
}

export class NotificationPrefsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aartiReminders?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bookingUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() marketing?: boolean;
  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  defaultReminderMinutes?: number;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Radha Krishna Das' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ enum: LANGS })
  @IsOptional()
  @IsIn(LANGS)
  preferredLang?: Lang;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  homeCityId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Ready media id uploaded with purpose "avatar"',
  })
  @IsOptional()
  @IsUUID()
  avatarMediaId?: string;

  @ApiPropertyOptional({ type: AccessibilityDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AccessibilityDto)
  accessibility?: AccessibilityDto;

  @ApiPropertyOptional({ type: NotificationPrefsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPrefsDto)
  notificationPrefs?: NotificationPrefsDto;
}

export class RegisterDeviceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  fcmToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  locale?: string;
}

export class EmergencyContactDto {
  @ApiProperty({ example: 'Sita Devi' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: '+919876543210' })
  @Matches(E164, { message: 'phoneE164 must be an E.164 number like +919876543210' })
  phoneE164!: string;

  @ApiPropertyOptional({ example: 'mother' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  relation?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyWhatsapp?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;
}

export class UpdateEmergencyContactDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(E164) phoneE164?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) relation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyWhatsapp?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;
}

export class ProfileResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: String, nullable: true }) phoneE164!: string | null;
  @ApiProperty() isGuest!: boolean;
  @ApiProperty({ enum: LANGS }) preferredLang!: string;
  @ApiProperty({ type: String, nullable: true }) homeCityId!: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ type: Object }) accessibility!: Record<string, unknown>;
  @ApiProperty({ type: Object }) notificationPrefs!: Record<string, unknown>;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty({ type: [String] }) vendorIds!: string[];
}

export class EmergencyContactResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phoneE164!: string;
  @ApiProperty({ type: String, nullable: true }) relation!: string | null;
  @ApiProperty() notifyWhatsapp!: boolean;
  @ApiProperty() priority!: number;
}

export class DeviceResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: DevicePlatform }) platform!: DevicePlatform;
  @ApiProperty() hasPushToken!: boolean;
  @ApiProperty({ type: String, nullable: true }) appVersion!: string | null;
  @ApiProperty({ format: 'date-time' }) lastSeenAt!: string;
}
