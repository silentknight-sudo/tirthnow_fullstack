import { type AddressInfo } from 'node:net';
import { type INestApplication, type Type } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import { type Job, type Queue } from 'bullmq';
import { type Redis } from 'ioredis';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { type AppConfig, loadConfig } from '../src/core/config';
import { PrismaService } from '../src/core/prisma';
import {
  MockEmailAdapter,
  MockPushAdapter,
  MockSmsAdapter,
  MockWhatsAppAdapter,
} from '../src/core/providers';
import { REDIS } from '../src/core/redis';

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  /** http://127.0.0.1:<port> (Socket.IO clients connect to `${baseUrl}/rt`). */
  baseUrl: string;
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
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bufferLogs: true,
    rawBody: true,
  });
  configureApp(app, config);
  // Listen once on an ephemeral port: supertest's per-request listen/close races under load.
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  return {
    app,
    http: request(`http://127.0.0.1:${address.port}`),
    baseUrl: `http://127.0.0.1:${address.port}`,
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
  t.app.get(MockPushAdapter).outbox.length = 0;
  t.app.get(MockSmsAdapter).outbox.length = 0;
  t.app.get(MockSmsAdapter).rejectNumbers.clear();
  t.app.get(MockWhatsAppAdapter).outbox.length = 0;
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

/** Process every queued job of `queue` synchronously with the given processor (deterministic tests). */
export async function drainQueue(
  t: TestApp,
  queue: string,
  processor: Type<{ process(job: Job): Promise<unknown> }>,
): Promise<unknown[]> {
  const q = t.app.get<Queue>(getQueueToken(queue));
  const proc = t.app.get(processor);
  const results: unknown[] = [];
  for (let round = 0; round < 20; round++) {
    const jobs = await q.getJobs(['waiting', 'prioritized', 'delayed']);
    if (jobs.length === 0) break;
    for (const job of jobs) {
      results.push(await proc.process(job));
      await job.remove();
    }
  }
  return results;
}

/** Sign in a mobile user through the mock Firebase exchange. */
export async function signInMobile(
  t: TestApp,
  uid: string,
  phone = `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
): Promise<{ token: string; userId: string; refreshToken: string }> {
  const res = await t.http.post('/v1/auth/firebase').send({ idToken: `mock:${uid}:${phone}` });
  if (res.status !== 200)
    throw new Error(`sign-in failed: ${res.status} ${JSON.stringify(res.body)}`);
  const body = res.body as { accessToken: string; refreshToken: string; user: { id: string } };
  return { token: body.accessToken, userId: body.user.id, refreshToken: body.refreshToken };
}

/** Sign in a portal user created with createPortalUser. */
export async function signInPortal(
  t: TestApp,
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  const res = await t.http.post('/v1/auth/portal/login').send({ email, password });
  if (res.status !== 200)
    throw new Error(`portal sign-in failed: ${res.status} ${JSON.stringify(res.body)}`);
  const body = res.body as { accessToken: string; user: { id: string } };
  return { token: body.accessToken, userId: body.user.id };
}

export const bearer = (token: string): [string, string] => ['authorization', `Bearer ${token}`];

/**
 * Upload through the presign → PUT → complete flow (mock storage serves PUTs on /v1/dev/storage),
 * then run the media queue so the asset is verified and ready.
 */
export async function uploadFile(
  t: TestApp,
  token: string,
  opts: { purpose: string; mimeType: string; body: Buffer; declaredSize?: number },
): Promise<{ mediaId: string; status: number; completeBody: unknown }> {
  const presign = await t.http
    .post('/v1/files/presign')
    .set('authorization', `Bearer ${token}`)
    .send({
      purpose: opts.purpose,
      mimeType: opts.mimeType,
      sizeBytes: opts.declaredSize ?? opts.body.length,
    });
  if (presign.status !== 201)
    throw new Error(`presign failed ${presign.status} ${JSON.stringify(presign.body)}`);
  const { mediaId, uploadUrl, headers } = presign.body as {
    mediaId: string;
    uploadUrl: string;
    headers: Record<string, string>;
  };
  const url = new URL(uploadUrl);
  await t.http.put(`${url.pathname}${url.search}`).set(headers).send(opts.body).expect(200);
  const complete = await t.http
    .post(`/v1/files/${mediaId}/complete`)
    .set('authorization', `Bearer ${token}`)
    .send();
  return { mediaId, status: complete.status, completeBody: complete.body };
}

/** A minimal valid PDF for KYC uploads. */
export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

/**
 * Create an active vendor owned by a fresh portal user, with KYC approved by an admin.
 * Returns tokens refreshed so they carry the vendor claims.
 */
export async function createActiveVendor(
  t: TestApp,
  opts: {
    email: string;
    type: 'hotel' | 'cab' | 'restaurant' | 'experience' | 'multi';
    cityId?: string;
    adminToken: string;
  },
): Promise<{ vendorId: string; token: string; userId: string }> {
  await createPortalUser(t, { email: opts.email, password: 'Password-123' });
  const owner = await signInPortal(t, opts.email, 'Password-123');
  const created = await t.http
    .post('/v1/vendors')
    .set('authorization', `Bearer ${owner.token}`)
    .send({
      type: opts.type,
      legalName: `${opts.email} Pvt Ltd`,
      displayName: opts.email,
      pan: 'ABCDE1234F',
      ...(opts.cityId ? { cityId: opts.cityId } : {}),
    });
  if (created.status !== 201)
    throw new Error(`vendor create failed ${created.status} ${JSON.stringify(created.body)}`);
  const vendorId = (created.body as { id: string }).id;
  const needed = (created.body as { missingDocuments: string[] }).missingDocuments;
  // Vendor claims arrive with a fresh token (portal does this right after onboarding starts).
  Object.assign(owner, await signInPortal(t, opts.email, 'Password-123'));
  const { MediaProcessor } = await import('../src/modules/files');
  for (const docType of needed) {
    const { mediaId } = await uploadFile(t, owner.token, {
      purpose: 'kyc_document',
      mimeType: 'application/pdf',
      body: PDF_BYTES,
    });
    await drainQueue(t, 'media', MediaProcessor);
    const added = await t.http
      .post(`/v1/vendors/${vendorId}/kyc-documents`)
      .set('authorization', `Bearer ${owner.token}`)
      .send({ docType, mediaId });
    if (added.status !== 201)
      throw new Error(`kyc add failed ${added.status} ${JSON.stringify(added.body)}`);
  }
  await t.http
    .post(`/v1/vendors/${vendorId}/submit`)
    .set('authorization', `Bearer ${owner.token}`)
    .expect(200);
  const docs = await t.prisma.vendorKycDocument.findMany({ where: { vendorId } });
  for (const d of docs) {
    await t.http
      .post(`/v1/admin/vendors/${vendorId}/kyc-documents/${d.id}/review`)
      .set('authorization', `Bearer ${opts.adminToken}`)
      .send({ decision: 'approved' })
      .expect(200);
  }
  await t.http
    .post(`/v1/admin/vendors/${vendorId}/approve`)
    .set('authorization', `Bearer ${opts.adminToken}`)
    .expect(200);
  const login = await signInPortal(t, opts.email, 'Password-123');
  return { vendorId, token: login.token, userId: login.userId };
}

export async function adminToken(t: TestApp, email = 'admin@ops.test'): Promise<string> {
  await createPortalUser(t, { email, password: 'Password-123', roles: ['user', 'admin'] });
  return (await signInPortal(t, email, 'Password-123')).token;
}

/** Connected Socket.IO client for the /rt namespace (anonymous without a token). */
export async function connectSocket(t: TestApp, token?: string): Promise<ClientSocket> {
  const socket = io(`${t.baseUrl}/rt`, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => {
      resolve();
    });
    socket.once('connect_error', reject);
  });
  return socket;
}

export function subscribeRoom(
  socket: ClientSocket,
  room: string,
): Promise<{ ok: boolean; error?: string }> {
  return socket.timeout(3_000).emitWithAck('subscribe', { room }) as Promise<{
    ok: boolean;
    error?: string;
  }>;
}

/** Resolve with the next payload of `event` (rejects after `ms`). */
export function nextEvent<T>(socket: ClientSocket, event: string, ms = 3_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`no ${event} within ${String(ms)} ms`));
    }, ms);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

/** Collect payloads of `event` for `ms` (to assert something was NOT received). */
export async function collectEvents<T>(
  socket: ClientSocket,
  event: string,
  ms = 400,
): Promise<T[]> {
  const got: T[] = [];
  const handler = (payload: T) => got.push(payload);
  socket.on(event, handler);
  await new Promise((r) => setTimeout(r, ms));
  socket.off(event, handler);
  return got;
}

/** Smallest valid-looking MP4 header (ftyp box) plus padding; passes content sniffing. */
export const MP4_BYTES = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypisom'),
  Buffer.from([0x00, 0x00, 0x02, 0x00]),
  Buffer.from('isommp42'),
  Buffer.alloc(2048, 0),
]);
