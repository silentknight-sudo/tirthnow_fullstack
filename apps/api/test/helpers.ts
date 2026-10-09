import { type INestApplication, type Type } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import { type Redis } from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { type AppConfig, loadConfig } from '../src/core/config';
import { PrismaService } from '../src/core/prisma';
import { MockEmailAdapter } from '../src/core/providers';
import { REDIS } from '../src/core/redis';

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  prisma: PrismaService;
  redis: Redis;
  email: MockEmailAdapter;
  config: AppConfig;
  close: () => Promise<void>;
}

export async function createTestApp(
  opts: { env?: Record<string, string>; controllers?: Type[] } = {},
): Promise<TestApp> {
  const config = loadConfig({ ...process.env, ...opts.env });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
    controllers: opts.controllers ?? [],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app, config);
  await app.init();
  return {
    app,
    http: request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    redis: app.get<Redis>(REDIS),
    email: app.get(MockEmailAdapter),
    config,
    close: () => app.close(),
  };
}

/** Empty every table except migrations and the reference roles; flush the test Redis DB. */
export async function resetState(t: TestApp): Promise<void> {
  const rows = await t.prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'roles')`;
  if (rows.length > 0) {
    const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
    await t.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  await t.redis.flushdb();
  t.email.outbox.length = 0;
}

const FAST_ARGON = {
  type: argon2.argon2id,
  memoryCost: 4096,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function createPortalUser(
  t: TestApp,
  opts: {
    email: string;
    password: string;
    roles?: ('user' | 'admin' | 'super_admin' | 'vendor_owner')[];
    mfa?: boolean;
    status?: 'active' | 'suspended';
  },
): Promise<string> {
  const user = await t.prisma.user.create({
    data: {
      email: opts.email,
      passwordHash: await argon2.hash(opts.password, FAST_ARGON),
      mfaEnabled: opts.mfa ?? false,
      status: opts.status ?? 'active',
      profile: { create: { displayName: 'Portal User' } },
    },
  });
  for (const key of opts.roles ?? ['user']) {
    const role = await t.prisma.role.findUniqueOrThrow({ where: { key } });
    await t.prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user.id;
}

export function codeFromEmail(text: string): string {
  const m = /\b(\d{6})\b/.exec(text);
  if (!m?.[1]) throw new Error('no code in email');
  return m[1];
}

export function tokenFromResetEmail(text: string): string {
  const m = /token=([A-Za-z0-9_%-]+)/.exec(text);
  if (!m?.[1]) throw new Error('no reset token in email');
  return decodeURIComponent(m[1]);
}
