import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class DeviceInfoDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Device id returned by a previous sign-in' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiPropertyOptional({ description: 'FCM registration token' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  fcmToken?: string;

  @ApiPropertyOptional({ example: '1.0.0+12' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @ApiPropertyOptional({ example: 'hi-IN' })
  @IsOptional()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  locale?: string;
}

export class FirebaseExchangeDto {
  @ApiProperty({
    description: 'Firebase ID token (mock: "mock:<uid>[:<phone>][:<email>]" or "mock:guest:<uid>")',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(8192)
  idToken!: string;

  @ApiPropertyOptional({ type: DeviceInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

export class PortalLoginDto {
  @ApiProperty({ example: 'admin@tirthnow.local' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class OtpVerifyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  challengeId!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Revoke every session of this user, not just the current one',
  })
  @IsOptional()
  @IsBoolean()
  allSessions?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  token!: string;

  @ApiProperty({ format: 'password', description: 'Min 10 chars with a letter and a digit' })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/[A-Za-z]/, { message: 'password must contain a letter' })
  @Matches(/\d/, { message: 'password must contain a digit' })
  password!: string;
}
