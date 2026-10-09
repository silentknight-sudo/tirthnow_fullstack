import { createTestApp, type TestApp } from './helpers';

describe('health, docs and cross-cutting HTTP behaviour', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('GET /healthz is public and unprefixed', async () => {
    const res = await t.http.get('/healthz').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz checks Postgres and Redis', async () => {
    const res = await t.http.get('/readyz').expect(200);
    expect(res.body).toEqual({ status: 'ok', checks: { postgres: 'up', redis: 'up' } });
  });

  it('serves the OpenAPI document with the v1 auth routes', async () => {
    const res = await t.http.get('/docs-json').expect(200);
    const paths = Object.keys((res.body as { paths: Record<string, unknown> }).paths);
    expect(paths).toEqual(
      expect.arrayContaining(['/v1/auth/firebase', '/v1/auth/refresh', '/v1/me', '/healthz']),
    );
  });

  it('echoes a well-formed x-request-id and mints one otherwise', async () => {
    const echoed = await t.http.get('/healthz').set('x-request-id', 'client-req-12345').expect(200);
    expect(echoed.headers['x-request-id']).toBe('client-req-12345');
    const minted = await t.http.get('/healthz').set('x-request-id', 'bad id!').expect(200);
    expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns the error envelope with the request id', async () => {
    const res = await t.http.get('/v1/me').set('x-request-id', 'trace-abcdef12').expect(401);
    expect(res.body).toEqual({
      error: {
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
        requestId: 'trace-abcdef12',
      },
    });
  });

  it('returns 404 in the envelope for unknown routes', async () => {
    const res = await t.http.get('/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sets security headers and honours the CORS allowlist', async () => {
    const res = await t.http.get('/healthz').set('origin', 'http://localhost:3001').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    const blocked = await t.http.get('/healthz').set('origin', 'https://evil.example').expect(200);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('exposes the dev outbox outside production', async () => {
    await t.http.get('/v1/dev/outbox').expect(200);
  });
});
