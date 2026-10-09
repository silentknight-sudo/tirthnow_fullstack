import { ApiProperty } from '@nestjs/swagger';
import { ROLES, type Role } from '@tirth-now/shared-types';

export class AuthUserResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: String, nullable: true }) phoneE164!: string | null;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty() isGuest!: boolean;
  @ApiProperty({ enum: ROLES, isArray: true }) roles!: Role[];
  @ApiProperty({ type: [String] }) vendorIds!: string[];
}

export class TokenPairResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ format: 'date-time' }) accessTokenExpiresAt!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ format: 'date-time' }) refreshTokenExpiresAt!: string;
}

export class AuthResultResponse extends TokenPairResponse {
  @ApiProperty({ type: AuthUserResponse }) user!: AuthUserResponse;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Registered device id',
  })
  deviceId!: string | null;
}

export class OtpChallengeResponse {
  @ApiProperty({ enum: [true] }) otpRequired!: true;
  @ApiProperty({ format: 'uuid' }) challengeId!: string;
  @ApiProperty({ enum: ['email', 'sms'] }) channel!: 'email' | 'sms';
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
