import { z } from 'zod';
import { parseDurationSeconds } from './duration';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== ''),
  );

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v));

const LOCAL_ACCESS_SECRET = 'change-me-local-access-secret-min-32-chars';

/** Raw environment, validated at boot. Add new variables here and to .env.example. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PROCESS_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    WORKER_PORT: z.coerce.number().int().positive().default(4100),
    API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGINS: csv,
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    SWAGGER_ENABLED: bool,
    ALLOW_MOCK_PROVIDERS: csv,

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().default('15m').transform(parseDurationSeconds),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    JWT_ISSUER: z.string().default('tirth-now'),

    THROTTLE_DEFAULT_PER_MIN: z.coerce.number().int().positive().default(120),
    THROTTLE_AUTH_PER_MIN: z.coerce.number().int().positive().default(10),

    FIREBASE_AUTH_PROVIDER: z.enum(['mock', 'firebase']).default('mock'),
    FIREBASE_PROJECT_ID: optionalString,
    FIREBASE_CLIENT_EMAIL: optionalString,
    FIREBASE_PRIVATE_KEY: optionalString,

    EMAIL_PROVIDER: z.enum(['mock', 'smtp']).default('mock'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    EMAIL_FROM: z.string().default('Tirth Now <no-reply@tirthnow.local>'),

    VENDOR_PORTAL_URL: z.string().url().default('http://localhost:3001'),
    ADMIN_PORTAL_URL: z.string().url().default('http://localhost:3002'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (env.JWT_ACCESS_SECRET === LOCAL_ACCESS_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'must be changed from the local default in production',
      });
    }
    const selectors = {
      firebase_auth: env.FIREBASE_AUTH_PROVIDER,
      email: env.EMAIL_PROVIDER,
    } as const;
    for (const [capability, provider] of Object.entries(selectors)) {
      if (provider === 'mock' && !env.ALLOW_MOCK_PROVIDERS.includes(capability)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`${capability.toUpperCase()}_PROVIDER`],
          message: `mock provider is not allowed in production (add "${capability}" to ALLOW_MOCK_PROVIDERS to override)`,
        });
      }
    }
    if (env.FIREBASE_AUTH_PROVIDER === 'firebase') {
      for (const key of [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'required when FIREBASE_AUTH_PROVIDER=firebase',
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;
