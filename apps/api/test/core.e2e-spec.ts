import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { type AuthPrincipal, CurrentUser } from '../src/core/auth';
import { AppException } from '../src/core/http';
import { Idempotent } from '../src/core/idempotency';
import { MaintenanceRegistry } from '../src/core/maintenance';
import { bearer, createTestApp, resetState, signInMobile, type TestApp } from './helpers';

class ChargeDto {
  @IsInt()
  @Min(1)
  amountPaise!: number;
}

let calls = 0;

@Controller('idem-probe')
class IdempotencyProbeController {
  @Post()
  @Idempotent('probe')
  charge(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: ChargeDto,
  ): { n: number; userId: string; amountPaise: number } {
    calls++;
    if (dto.amountPaise === 13) throw AppException.badRequest('unlucky');
    return { n: calls, userId: user.userId, amountPaise: dto.amountPaise };
  }

  @Post('accepted')
  @HttpCode(202)
  @Idempotent('probe-accepted')
  accept(): { ok: true } {
    return { ok: true };
  }
}

describe('core: idempotency', () => {
  let t: TestApp;
  let token: string;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [IdempotencyProbeController] });
  });
  beforeEach(async () => {
    await resetState(t);
    calls = 0;
    ({ token } = await signInMobile(t, 'idem-user'));
  });
  afterAll(async () => {
    await t.close();
  });

  const post = (key: string | null, body: object, path = '/v1/idem-probe') => {
    const req = t.http.post(path).set(...bearer(token));
    return key ? req.set('Idempotency-Key', key).send(body) : req.send(body);
  };

  it('requires the header', async () => {
    const res = await post(null, { amountPaise: 100 }).expect(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    await post('short', { amountPaise: 100 }).expect(400);
  });

  it('replays the first response for a repeated key', async () => {
    const first = await post('key-00000001', { amountPaise: 100 }).expect(201);
    const second = await post('key-00000001', { amountPaise: 100 }).expect(201);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replay']).toBe('true');
    expect(calls).toBe(1);
  });

  it('keeps the original status code on replay', async () => {
    await post('accept-0001', {}, '/v1/idem-probe/accepted').expect(202);
    await post('accept-0001', {}, '/v1/idem-probe/accepted').expect(202);
  });

  it('rejects the same key with a different body', async () => {
    await post('key-00000002', { amountPaise: 100 }).expect(201);
    const res = await post('key-00000002', { amountPaise: 200 }).expect(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_MISMATCH');
  });

  it('does not consume the key when the request fails', async () => {
    await post('key-00000003', { amountPaise: 13 }).expect(400);
    expect(await t.prisma.idempotencyKey.count()).toBe(0);
    await post('key-00000003', { amountPaise: 13 }).expect(400);
    expect(calls).toBe(2);
  });

  it('scopes keys per user', async () => {
    await post('shared-key-1', { amountPaise: 100 }).expect(201);
    const other = await signInMobile(t, 'idem-other');
    const res = await t.http
      .post('/v1/idem-probe')
      .set(...bearer(other.token))
      .set('Idempotency-Key', 'shared-key-1')
      .send({ amountPaise: 100 })
      .expect(201);
    expect(res.body.userId).toBe(other.userId);
    expect(calls).toBe(2);
  });

  it('purges expired keys through the maintenance registry', async () => {
    await post('key-00000004', { amountPaise: 100 }).expect(201);
    await t.prisma.idempotencyKey.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const results = await t.app.get(MaintenanceRegistry).runAll();
    expect(results['idempotency-keys']).toBe(1);
  });
});
