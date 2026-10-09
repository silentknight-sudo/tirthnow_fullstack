import { z } from 'zod';
import { type Role } from './roles';

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

export const portalLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
export type PortalLoginInput = z.infer<typeof portalLoginSchema>;

export const otpVerifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const passwordResetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export interface AccessTokenClaims {
  sub: string;
  roles: Role[];
  vendorIds: string[];
  /** refresh-token family (session) id */
  sid: string;
  guest: boolean;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phoneE164: string | null;
  displayName: string | null;
  isGuest: boolean;
  roles: Role[];
  vendorIds: string[];
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResult extends TokenPair {
  user: AuthUser;
}

export interface OtpChallenge {
  otpRequired: true;
  challengeId: string;
  channel: 'email' | 'sms';
  expiresAt: string;
}
