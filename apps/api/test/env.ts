// Test environment: separate database, separate Redis DB, all providers mocked, quiet logs.
import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const testDb =
  process.env.DATABASE_URL_TEST ??
  'postgresql://tirthnow:tirthnow@localhost:5432/tirthnow_test?schema=public';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: testDb,
  REDIS_URL: process.env.REDIS_URL_TEST ?? 'redis://localhost:6379/15',
  LOG_LEVEL: 'silent',
  JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-0123456789',
  FIREBASE_AUTH_PROVIDER: 'mock',
  EMAIL_PROVIDER: 'mock',
  THROTTLE_DEFAULT_PER_MIN: '10000',
  THROTTLE_AUTH_PER_MIN: '10000',
  CORS_ORIGINS: 'http://localhost:3001',
});
