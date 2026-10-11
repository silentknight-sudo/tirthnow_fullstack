import { istDate } from '../src/core/time';
import { type CatalogFixture, seedCatalog } from './fixtures';
import {
  bearer,
  createPortalUser,
  createTestApp,
  resetState,
  signInMobile,
  signInPortal,
  type TestApp,
} from './helpers';

describe('catalog', () => {
  let t: TestApp;
  let fx: CatalogFixture;

  beforeAll(async () => {
    t = await createTestApp();
    await resetState(t);
    fx = await seedCatalog(t.prisma);
  });
  afterAll(async () => {
    await t.close();
  });

  describe('public reads', () => {
    it('lists cities in order, localised', async () => {
      const res = await t.http.get('/v1/cities?lang=hi').expect(200);
      expect(res.body.map((c: { name: string }) => c.name)).toEqual(['मथुरा', 'वृन्दावन']);
    });

    it('filters temples by city and tag', async () => {
      const byCity = await t.http.get('/v1/temples?city=vrindavan').expect(200);
      expect(byCity.body.map((x: { slug: string }) => x.slug).sort()).toEqual([
        'banke-bihari',
        'iskcon-vrindavan',
      ]);
      const byTag = await t.http.get('/v1/temples?tag=krishna').expect(200);
      expect(byTag.body).toHaveLength(2);
      await t.http.get('/v1/temples?city=nowhere').expect(404);
    });

    it('sorts temples by distance when given a location', async () => {
      const res = await t.http.get('/v1/temples?lat=27.5806&lng=77.6996&radiusKm=5').expect(200);
      expect(res.body[0]).toMatchObject({ slug: 'banke-bihari', distanceKm: 0 });
      expect(res.body.every((x: { distanceKm: number }) => x.distanceKm <= 5)).toBe(true);
      expect(
        res.body.find((x: { slug: string }) => x.slug === 'shri-krishna-janmabhoomi'),
      ).toBeUndefined();
      await t.http.get('/v1/temples?lat=27.58').expect(400);
    });

    it('returns temple detail by slug with today’s aarti and the next one', async () => {
      const res = await t.http.get('/v1/temples/iskcon-vrindavan').expect(200);
      expect(res.body.name).toBe('ISKCON Krishna Balaram Mandir');
      expect(res.body.aartiToday.map((a: { localTime: string }) => a.localTime)).toEqual([
        '04:30',
        '18:30',
      ]);
      expect(res.body.aartiToday[0].date).toBe(istDate(new Date()));
      expect(res.body.nextAarti).not.toBeNull();
      expect(new Date(res.body.nextAarti.endsAt as string).getTime()).toBeGreaterThan(Date.now());
      await t.http.get('/v1/temples/does-not-exist').expect(404);
    });

    it('expands aarti over a date range and validates it', async () => {
      const res = await t.http
        .get(`/v1/temples/${fx.janmabhoomi}/aarti?from=2026-10-11&to=2026-10-24`)
        .expect(200);
      expect(res.body.map((a: { date: string }) => a.date)).toEqual(['2026-10-11', '2026-10-18']);
      expect(res.body[0]).toMatchObject({
        localTime: '19:00',
        startsAt: '2026-10-11T13:30:00.000Z',
      });

      const summer = await t.http
        .get(`/v1/temples/${fx.bankeBihari}/aarti?from=2026-06-01&to=2026-06-01`)
        .expect(200);
      expect(summer.body.map((a: { localTime: string }) => a.localTime)).toEqual([
        '07:45',
        '21:25',
      ]);
      const winter = await t.http
        .get(`/v1/temples/${fx.bankeBihari}/aarti?from=2026-12-01&to=2026-12-01`)
        .expect(200);
      expect(winter.body.map((a: { localTime: string }) => a.localTime)).toEqual([
        '08:45',
        '21:25',
      ]);

      await t.http
        .get(`/v1/temples/${fx.bankeBihari}/aarti?from=2026-01-01&to=2026-03-01`)
        .expect(400);
      await t.http.get(`/v1/temples/${fx.bankeBihari}/aarti?from=2026-02-30`).expect(400);
    });

    it('lists upcoming aartis across a city', async () => {
      const res = await t.http.get('/v1/aarti/upcoming?city=vrindavan&limit=3').expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.length).toBeLessThanOrEqual(3);
      const starts = res.body.map((a: { startsAt: string }) => Date.parse(a.startsAt));
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
      expect(res.body[0].templeName).toEqual(expect.any(String));
    });

    it('lists festivals, POIs, explore and parikrama routes', async () => {
      const fest = await t.http
        .get(
          `/v1/festivals?from=${new Date().getUTCFullYear() + 1}-01-01&to=${new Date().getUTCFullYear() + 1}-12-31`,
        )
        .expect(200);
      expect(fest.body[0].name).toBe('Sharad Purnima');

      const near = await t.http
        .get('/v1/pois?lat=27.58&lng=77.69&radiusKm=3&emergency=true')
        .expect(200);
      expect(near.body.map((p: { id: string }) => p.id)).toEqual([fx.hospital]);

      const explore = await t.http.get('/v1/explore?city=vrindavan&kind=van&lang=hi').expect(200);
      expect(explore.body[0].title).toBe('निधिवन');

      const route = await t.http.get('/v1/parikrama-routes/vrindavan-parikrama').expect(200);
      expect(route.body.stops.map((s: { name: string }) => s.name)).toEqual([
        'ISKCON Krishna Balaram Mandir',
        'Keshi Ghat',
        'Shri Banke Bihari Temple',
      ]);
    });

    it('serves the safety directory with an ETag for offline caching', async () => {
      const first = await t.http.get('/v1/safety/directory').expect(200);
      expect(first.body.helplines).toEqual([{ name: 'Emergency', phone: '112' }]);
      expect(first.body.pois.map((p: { id: string }) => p.id).sort()).toEqual(
        [fx.hospital, fx.police].sort(),
      );
      const etag = first.headers.etag as string;
      await t.http.get('/v1/safety/directory').set('If-None-Match', etag).expect(304);
    });

    it('searches English, Hindi and misspelt names', async () => {
      const en = await t.http.get('/v1/search?q=banke bihari').expect(200);
      expect(en.body[0]).toMatchObject({ type: 'temple', id: fx.bankeBihari });
      const hi = await t.http.get(`/v1/search?q=${encodeURIComponent('बांके')}`).expect(200);
      expect(hi.body[0].id).toBe(fx.bankeBihari);
      const typo = await t.http.get('/v1/search?q=janmbhoomi').expect(200);
      expect(typo.body[0].id).toBe(fx.janmabhoomi);
      const typed = await t.http.get('/v1/search?q=keshi&types=poi').expect(200);
      expect(typed.body.every((r: { type: string }) => r.type === 'poi')).toBe(true);
      await t.http.get('/v1/search?q=a').expect(400);
    });

    it('returns client config filtered by platform', async () => {
      const android = await t.http.get('/v1/config?platform=android').expect(200);
      expect(android.body.map((c: { key: string }) => c.key)).not.toContain('banner.ios-only');
      const ios = await t.http.get('/v1/config?platform=ios').expect(200);
      expect(ios.body.map((c: { key: string }) => c.key)).toContain('banner.ios-only');
    });
  });

  describe('admin CMS', () => {
    let admin: string;

    beforeAll(async () => {
      await createPortalUser(t, {
        email: 'cms@catalog.test',
        password: 'Password-123',
        roles: ['user', 'admin'],
      });
      ({ token: admin } = await signInPortal(t, 'cms@catalog.test', 'Password-123'));
    });

    it('creates a temple with aarti schedules and audits it', async () => {
      const temple = await t.http
        .post('/v1/admin/temples')
        .set(...bearer(admin))
        .send({
          cityId: fx.vrindavan,
          slug: 'radha-damodar',
          name: { en: 'Radha Damodar Temple', hi: 'राधा दामोदर मंदिर' },
          lat: 27.5809,
          lng: 77.6958,
          tags: ['gaudiya'],
        })
        .expect(201);
      const id = temple.body.id as string;

      await t.http
        .post(`/v1/admin/temples/${id}/aarti`)
        .set(...bearer(admin))
        .send({
          kind: 'mangla',
          name: { en: 'Mangla' },
          localTime: '04:15',
          recurrence: 'FREQ=MONTHLY',
        })
        .expect(400);
      await t.http
        .post(`/v1/admin/temples/${id}/aarti`)
        .set(...bearer(admin))
        .send({ kind: 'mangla', name: { en: 'Mangla' }, localTime: '25:00' })
        .expect(400);
      const aarti = await t.http
        .post(`/v1/admin/temples/${id}/aarti`)
        .set(...bearer(admin))
        .send({ kind: 'mangla', name: { en: 'Mangla' }, localTime: '04:15' })
        .expect(201);

      const detail = await t.http.get('/v1/temples/radha-damodar').expect(200);
      expect(detail.body.aartiToday.map((a: { localTime: string }) => a.localTime)).toEqual([
        '04:15',
      ]);

      await t.http
        .patch(`/v1/admin/aarti/${aarti.body.id as string}`)
        .set(...bearer(admin))
        .send({ localTime: '04:30' })
        .expect(200);
      const after = await t.http.get('/v1/temples/radha-damodar').expect(200);
      expect(after.body.aartiToday[0].localTime).toBe('04:30');

      const audits = await t.prisma.auditLog.findMany({
        where: { entityType: { in: ['temple', 'aarti_schedule'] } },
        orderBy: { createdAt: 'asc' },
      });
      expect(audits.map((a) => a.action)).toEqual([
        'temple.create',
        'aarti.create',
        'aarti.update',
      ]);
      expect(audits[0]?.actorRole).toBe('admin');

      await t.http
        .delete(`/v1/admin/temples/${id}`)
        .set(...bearer(admin))
        .expect(204);
      await t.http.get('/v1/temples/radha-damodar').expect(404);
    });

    it('validates festivals, POIs and parikrama stops', async () => {
      await t.http
        .post('/v1/admin/festivals')
        .set(...bearer(admin))
        .send({ name: { en: 'Holi' }, startsOn: '2027-03-22', endsOn: '2027-03-20' })
        .expect(400);
      await t.http
        .post('/v1/admin/pois')
        .set(...bearer(admin))
        .send({
          cityId: fx.vrindavan,
          category: 'atm',
          name: { en: 'ATM' },
          lat: 27.5,
          lng: 77.6,
          phoneE164: '12345',
        })
        .expect(400);
      await t.http
        .put('/v1/admin/parikrama-routes/x')
        .set(...bearer(admin))
        .send({ name: { en: 'X' }, distanceM: 10, estDurationMin: 5, stops: [{}] })
        .expect(400);
    });

    it('is closed to non-admins', async () => {
      const user = await signInMobile(t, 'not-admin');
      const res = await t.http
        .post('/v1/admin/pois')
        .set(...bearer(user.token))
        .send({})
        .expect(403);
      expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
      await t.http.post('/v1/admin/pois').send({}).expect(401);
    });
  });
});
