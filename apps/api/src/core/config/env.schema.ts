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
/** Local-development key from .env.example (never valid in production). */
export const LOCAL_ENCRYPTION_KEY = 'dGlydGgtbm93LWxvY2FsLWRldi1rZXktMzJieXRlcyE=';

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

    DATA_ENCRYPTION_KEY: z
      .string()
      .refine(
        (v) => Buffer.from(v, 'base64').length === 32,
        'must be 32 bytes, base64-encoded (openssl rand -base64 32)',
      ),

    PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
    MOCK_PAYMENT_SECRET: z.string().min(8).default('local-mock-payment-secret'),
    RAZORPAY_KEY_ID: optionalString,
    RAZORPAY_KEY_SECRET: optionalString,
    RAZORPAY_WEBHOOK_SECRET: optionalString,
    ORDER_HOLD_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
    PAYOUT_SETTLEMENT_HOLD_DAYS: z.coerce.number().int().min(0).max(30).default(3),
    PAYOUT_MIN_PAISE: z.coerce.number().int().min(0).default(10_000),
    PLATFORM_GST_BPS: z.coerce.number().int().min(0).max(5000).default(1800),

    MAPS_PROVIDER: z.enum(['mock', 'google']).default('mock'),
    GOOGLE_MAPS_API_KEY: optionalString,

    THROTTLE_DEFAULT_PER_MIN: z.coerce.number().int().positive().default(120),
    THROTTLE_AUTH_PER_MIN: z.coerce.number().int().positive().default(10),
    SOS_MAX_PER_10_MIN: z.coerce.number().int().min(1).max(20).default(3),
    SOS_SHARE_HOURS: z.coerce.number().int().min(1).max(48).default(2),

    PUSH_PROVIDER: z.enum(['mock', 'fcm']).default('mock'),
    SMS_PROVIDER: z.enum(['mock', 'msg91']).default('mock'),
    MSG91_AUTH_KEY: optionalString,
    MSG91_SENDER_ID: optionalString,
    MSG91_DLT_ENTITY_ID: optionalString,
    WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
    WHATSAPP_PHONE_NUMBER_ID: optionalString,
    WHATSAPP_ACCESS_TOKEN: optionalString,

    VIDEO_PROVIDER: z.enum(['mock', 'cloudflare_stream', 'mux']).default('mock'),
    MOCK_VIDEO_SECRET: z.string().min(8).default('local-mock-video-secret'),
    CF_STREAM_ACCOUNT_ID: optionalString,
    CF_STREAM_API_TOKEN: optionalString,
    CF_STREAM_WEBHOOK_SECRET: optionalString,
    MUX_TOKEN_ID: optionalString,
    MUX_TOKEN_SECRET: optionalString,
    MUX_WEBHOOK_SECRET: optionalString,
    MODERATION_PROVIDER: z.enum(['mock', 'llm']).default('mock'),

    LLM_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
    ANTHROPIC_API_KEY: optionalString,
    LLM_MODEL_DEFAULT: z.string().default('claude-opus-5-5'),
    LLM_MODEL_CHEAP: z.string().default('claude-haiku-5-5'),
    EMBEDDING_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
    OPENAI_API_KEY: optionalString,
    EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    EMBEDDING_DIMENSIONS: z.coerce
      .number()
      .int()
      .refine((n) => n === 1536, 'knowledge_chunks.embedding is vector(1536)')
      .default(1536),
    STT_PROVIDER: z.enum(['mock', 'google']).default('mock'),
    TTS_PROVIDER: z.enum(['mock', 'google']).default('mock'),
    VISION_PROVIDER: z.enum(['mock', 'google']).default('mock'),
    GOOGLE_CLOUD_API_KEY: optionalString,
    AI_DAILY_QUOTA_GUEST: z.coerce.number().int().min(0).default(10),
    AI_DAILY_QUOTA_USER: z.coerce.number().int().min(0).default(50),
    AI_RESPONSE_CACHE_SECONDS: z.coerce.number().int().min(0).default(86_400),

    WEATHER_PROVIDER: z.enum(['mock', 'openweather']).default('mock'),
    OPENWEATHER_API_KEY: optionalString,
    WEATHER_CACHE_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    TRANSIT_PROVIDER: z.enum(['mock']).default('mock'),

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

    STORAGE_PROVIDER: z.enum(['mock', 's3']).default('mock'),
    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().default('auto'),
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_BUCKET_PUBLIC: z.string().default('tirthnow-public'),
    S3_BUCKET_PRIVATE: z.string().default('tirthnow-private'),
    MEDIA_PUBLIC_BASE_URL: optionalString,
    UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().default(15),
    UPLOAD_MAX_VIDEO_MB: z.coerce.number().positive().default(200),

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
      storage: env.STORAGE_PROVIDER,
      maps: env.MAPS_PROVIDER,
      payment: env.PAYMENT_PROVIDER,
      push: env.PUSH_PROVIDER,
      sms: env.SMS_PROVIDER,
      whatsapp: env.WHATSAPP_PROVIDER,
      weather: env.WEATHER_PROVIDER,
      video: env.VIDEO_PROVIDER,
      moderation: env.MODERATION_PROVIDER,
      llm: env.LLM_PROVIDER,
      embedding: env.EMBEDDING_PROVIDER,
      stt: env.STT_PROVIDER,
      tts: env.TTS_PROVIDER,
      vision: env.VISION_PROVIDER,
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
    if (env.DATA_ENCRYPTION_KEY === LOCAL_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATA_ENCRYPTION_KEY'],
        message: 'must be changed from the local default in production',
      });
    }
    if (env.PAYMENT_PROVIDER === 'razorpay') {
      for (const key of [
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
      ] as const) {
        if (!env[key])
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'required when PAYMENT_PROVIDER=razorpay',
          });
      }
    }
    const requires: [boolean, string, (keyof typeof env)[]][] = [
      [env.LLM_PROVIDER === 'anthropic', 'LLM_PROVIDER=anthropic', ['ANTHROPIC_API_KEY']],
      [env.EMBEDDING_PROVIDER === 'openai', 'EMBEDDING_PROVIDER=openai', ['OPENAI_API_KEY']],
      [env.STT_PROVIDER === 'google', 'STT_PROVIDER=google', ['GOOGLE_CLOUD_API_KEY']],
      [env.TTS_PROVIDER === 'google', 'TTS_PROVIDER=google', ['GOOGLE_CLOUD_API_KEY']],
      [env.VISION_PROVIDER === 'google', 'VISION_PROVIDER=google', ['GOOGLE_CLOUD_API_KEY']],
      [env.SMS_PROVIDER === 'msg91', 'SMS_PROVIDER=msg91', ['MSG91_AUTH_KEY', 'MSG91_SENDER_ID']],
      [
        env.WHATSAPP_PROVIDER === 'meta',
        'WHATSAPP_PROVIDER=meta',
        ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'],
      ],
      [
        env.VIDEO_PROVIDER === 'cloudflare_stream',
        'VIDEO_PROVIDER=cloudflare_stream',
        ['CF_STREAM_ACCOUNT_ID', 'CF_STREAM_API_TOKEN', 'CF_STREAM_WEBHOOK_SECRET'],
      ],
      [
        env.VIDEO_PROVIDER === 'mux',
        'VIDEO_PROVIDER=mux',
        ['MUX_TOKEN_ID', 'MUX_TOKEN_SECRET', 'MUX_WEBHOOK_SECRET'],
      ],
      [
        env.WEATHER_PROVIDER === 'openweather',
        'WEATHER_PROVIDER=openweather',
        ['OPENWEATHER_API_KEY'],
      ],
      [
        env.PUSH_PROVIDER === 'fcm',
        'PUSH_PROVIDER=fcm',
        ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
      ],
    ];
    for (const [active, when, keys] of requires) {
      if (!active) continue;
      for (const key of keys) {
        if (!env[key])
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `required when ${when}`,
          });
      }
    }
    if (env.MAPS_PROVIDER === 'google' && !env.GOOGLE_MAPS_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GOOGLE_MAPS_API_KEY'],
        message: 'required when MAPS_PROVIDER=google',
      });
    }
    if (env.STORAGE_PROVIDER === 's3') {
      for (const key of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'required when STORAGE_PROVIDER=s3',
          });
        }
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
