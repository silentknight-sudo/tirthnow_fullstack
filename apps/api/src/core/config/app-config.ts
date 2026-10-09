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
  };
}
