import { envSchema, type Env } from './env.schema';

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Typed, structured configuration derived from the validated environment. */
export interface AppConfig {
  env: Env['NODE_ENV'];
  isProduction: boolean;
  processRole: Env['PROCESS_ROLE'];
  port: number;
  workerPort: number;
  publicUrl: string;
  logLevel: Env['LOG_LEVEL'];
  corsOrigins: string[];
  trustProxy: number;
  swaggerEnabled: boolean;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
    issuer: string;
  };
  throttle: { defaultPerMin: number; authPerMin: number };
  firebase: {
    provider: Env['FIREBASE_AUTH_PROVIDER'];
    projectId: string | undefined;
    clientEmail: string | undefined;
    privateKey: string | undefined;
  };
  email: {
    provider: Env['EMAIL_PROVIDER'];
    host: string;
    port: number;
    user: string | undefined;
    pass: string | undefined;
    from: string;
  };
  portals: { vendorUrl: string; adminUrl: string };
  dataEncryptionKey: Buffer;
  payments: {
    provider: Env['PAYMENT_PROVIDER'];
    mockSecret: string;
    razorpayKeyId: string | undefined;
    razorpayKeySecret: string | undefined;
    razorpayWebhookSecret: string | undefined;
    orderHoldMinutes: number;
    payoutHoldDays: number;
    payoutMinPaise: number;
    gstOnCommissionBps: number;
  };
  maps: { provider: Env['MAPS_PROVIDER']; googleApiKey: string | undefined };
  messaging: {
    pushProvider: Env['PUSH_PROVIDER'];
    smsProvider: Env['SMS_PROVIDER'];
    msg91AuthKey: string | undefined;
    msg91SenderId: string | undefined;
    msg91DltEntityId: string | undefined;
    whatsappProvider: Env['WHATSAPP_PROVIDER'];
    whatsappPhoneNumberId: string | undefined;
    whatsappAccessToken: string | undefined;
  };
  weather: {
    provider: Env['WEATHER_PROVIDER'];
    openWeatherApiKey: string | undefined;
    cacheSeconds: number;
  };
  transit: { provider: Env['TRANSIT_PROVIDER'] };
  video: {
    provider: Env['VIDEO_PROVIDER'];
    mockSecret: string;
    cfAccountId: string | undefined;
    cfApiToken: string | undefined;
    cfWebhookSecret: string | undefined;
    muxTokenId: string | undefined;
    muxTokenSecret: string | undefined;
    muxWebhookSecret: string | undefined;
  };
  moderation: { provider: Env['MODERATION_PROVIDER'] };
  ai: {
    llmProvider: Env['LLM_PROVIDER'];
    anthropicApiKey: string | undefined;
    modelDefault: string;
    modelCheap: string;
    embeddingProvider: Env['EMBEDDING_PROVIDER'];
    openaiApiKey: string | undefined;
    embeddingModel: string;
    embeddingDimensions: number;
    sttProvider: Env['STT_PROVIDER'];
    ttsProvider: Env['TTS_PROVIDER'];
    visionProvider: Env['VISION_PROVIDER'];
    googleApiKey: string | undefined;
    quotaGuest: number;
    quotaUser: number;
    responseCacheSeconds: number;
  };
  sos: { maxPer10Min: number; shareHours: number };
  storage: {
    provider: Env['STORAGE_PROVIDER'];
    endpoint: string | undefined;
    region: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    publicBucket: string;
    privateBucket: string;
    publicBaseUrl: string | undefined;
    maxImageBytes: number;
    maxVideoBytes: number;
  };
}

export class ConfigValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigValidationError';
  }
}

export function loadConfig(source: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigValidationError(
      parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    processRole: e.PROCESS_ROLE,
    port: e.API_PORT,
    workerPort: e.WORKER_PORT,
    publicUrl: e.API_PUBLIC_URL,
    logLevel: e.LOG_LEVEL,
    corsOrigins: e.CORS_ORIGINS,
    trustProxy: e.TRUST_PROXY,
    swaggerEnabled: e.NODE_ENV !== 'production' || e.SWAGGER_ENABLED,
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET,
      accessTtlSeconds: e.JWT_ACCESS_TTL,
      refreshTtlDays: e.JWT_REFRESH_TTL_DAYS,
      issuer: e.JWT_ISSUER,
    },
    throttle: { defaultPerMin: e.THROTTLE_DEFAULT_PER_MIN, authPerMin: e.THROTTLE_AUTH_PER_MIN },
    firebase: {
      provider: e.FIREBASE_AUTH_PROVIDER,
      projectId: e.FIREBASE_PROJECT_ID,
      clientEmail: e.FIREBASE_CLIENT_EMAIL,
      // Private keys arrive with literal "\n" when set through most secret stores.
      privateKey: e.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    email: {
      provider: e.EMAIL_PROVIDER,
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS,
      from: e.EMAIL_FROM,
    },
    portals: { vendorUrl: e.VENDOR_PORTAL_URL, adminUrl: e.ADMIN_PORTAL_URL },
    dataEncryptionKey: Buffer.from(e.DATA_ENCRYPTION_KEY, 'base64'),
    payments: {
      provider: e.PAYMENT_PROVIDER,
      mockSecret: e.MOCK_PAYMENT_SECRET,
      razorpayKeyId: e.RAZORPAY_KEY_ID,
      razorpayKeySecret: e.RAZORPAY_KEY_SECRET,
      razorpayWebhookSecret: e.RAZORPAY_WEBHOOK_SECRET,
      orderHoldMinutes: e.ORDER_HOLD_MINUTES,
      payoutHoldDays: e.PAYOUT_SETTLEMENT_HOLD_DAYS,
      payoutMinPaise: e.PAYOUT_MIN_PAISE,
      gstOnCommissionBps: e.PLATFORM_GST_BPS,
    },
    maps: { provider: e.MAPS_PROVIDER, googleApiKey: e.GOOGLE_MAPS_API_KEY },
    messaging: {
      pushProvider: e.PUSH_PROVIDER,
      smsProvider: e.SMS_PROVIDER,
      msg91AuthKey: e.MSG91_AUTH_KEY,
      msg91SenderId: e.MSG91_SENDER_ID,
      msg91DltEntityId: e.MSG91_DLT_ENTITY_ID,
      whatsappProvider: e.WHATSAPP_PROVIDER,
      whatsappPhoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID,
      whatsappAccessToken: e.WHATSAPP_ACCESS_TOKEN,
    },
    weather: {
      provider: e.WEATHER_PROVIDER,
      openWeatherApiKey: e.OPENWEATHER_API_KEY,
      cacheSeconds: e.WEATHER_CACHE_SECONDS,
    },
    transit: { provider: e.TRANSIT_PROVIDER },
    video: {
      provider: e.VIDEO_PROVIDER,
      mockSecret: e.MOCK_VIDEO_SECRET,
      cfAccountId: e.CF_STREAM_ACCOUNT_ID,
      cfApiToken: e.CF_STREAM_API_TOKEN,
      cfWebhookSecret: e.CF_STREAM_WEBHOOK_SECRET,
      muxTokenId: e.MUX_TOKEN_ID,
      muxTokenSecret: e.MUX_TOKEN_SECRET,
      muxWebhookSecret: e.MUX_WEBHOOK_SECRET,
    },
    moderation: { provider: e.MODERATION_PROVIDER },
    ai: {
      llmProvider: e.LLM_PROVIDER,
      anthropicApiKey: e.ANTHROPIC_API_KEY,
      modelDefault: e.LLM_MODEL_DEFAULT,
      modelCheap: e.LLM_MODEL_CHEAP,
      embeddingProvider: e.EMBEDDING_PROVIDER,
      openaiApiKey: e.OPENAI_API_KEY,
      embeddingModel: e.EMBEDDING_MODEL,
      embeddingDimensions: e.EMBEDDING_DIMENSIONS,
      sttProvider: e.STT_PROVIDER,
      ttsProvider: e.TTS_PROVIDER,
      visionProvider: e.VISION_PROVIDER,
      googleApiKey: e.GOOGLE_CLOUD_API_KEY,
      quotaGuest: e.AI_DAILY_QUOTA_GUEST,
      quotaUser: e.AI_DAILY_QUOTA_USER,
      responseCacheSeconds: e.AI_RESPONSE_CACHE_SECONDS,
    },
    sos: { maxPer10Min: e.SOS_MAX_PER_10_MIN, shareHours: e.SOS_SHARE_HOURS },
    storage: {
      provider: e.STORAGE_PROVIDER,
      endpoint: e.S3_ENDPOINT,
      region: e.S3_REGION,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      publicBucket: e.S3_BUCKET_PUBLIC,
      privateBucket: e.S3_BUCKET_PRIVATE,
      publicBaseUrl: e.MEDIA_PUBLIC_BASE_URL,
      maxImageBytes: Math.round(e.UPLOAD_MAX_IMAGE_MB * 1024 * 1024),
      maxVideoBytes: Math.round(e.UPLOAD_MAX_VIDEO_MB * 1024 * 1024),
    },
  };
}
