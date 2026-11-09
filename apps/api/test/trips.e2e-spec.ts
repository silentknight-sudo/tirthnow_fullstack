import { bearer, createTestApp, resetState, signInMobile, type TestApp } from './helpers';

describe('trips, notifications and family tracking', () => {
  let t: TestApp;
  let ravi: { token: string; userId: string };
  let mom: { token: string; userId: string };
  let stranger: { token: string; userId: string };

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetState(t);
    ravi = await signInMobile(t, 'ravi', '+919833310001');
    mom = await signInMobile(t, 'mom', '+919833310002');
    stranger = await signInMobile(t, 'stranger', '+919833310003');
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(ravi.token))
      .send({ displayName: 'Ravi Kumar' })
      .expect(200);
  });
  afterAll(async () => {
    await t.close();
  });

  const bodies = async (userId: string) =>
    (
      await t.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
    ).map((n) => n.body);

  it('starts and ends a trip with notifications, keeps history, and shares a tracking link', async () => {
    const started = await t.http
      .post('/v1/trips')
      .set(...bearer(ravi.token))
      .send({ title: 'Vrindavan yatra', fromPlace: 'Delhi' })
      .expect(201);
    expect(started.body).toMatchObject({
      status: 'active',
      fromPlace: 'Delhi',
      sharingLocation: false,
    });
    const id = started.body.id as string;
    expect(await bodies(ravi.userId)).toContain(
      'Your TirthNow pilgrimage has started. We wish you a safe and blessed journey!',
    );
    // One active trip at a time.
    await t.http
      .post('/v1/trips')
      .set(...bearer(ravi.token))
      .send({})
      .expect(409);

    // Location is ignored until the traveller turns sharing on.
    expect(
      (
        await t.http
          .post(`/v1/trips/${id}/location`)
          .set(...bearer(ravi.token))
          .send({ lat: 27.58, lng: 77.69 })
          .expect(200)
      ).body,
    ).toEqual({ stored: false });
    await t.http
      .patch(`/v1/trips/${id}/sharing`)
      .set(...bearer(ravi.token))
      .send({ sharing: true })
      .expect(200);
    expect(
      (
        await t.http
          .post(`/v1/trips/${id}/location`)
          .set(...bearer(ravi.token))
          .send({ lat: 27.58, lng: 77.69, accuracyM: 10 })
          .expect(200)
      ).body,
    ).toEqual({ stored: true });

    const share = await t.http
      .post(`/v1/trips/${id}/share`)
      .set(...bearer(ravi.token))
      .expect(200);
    expect(share.body.message).toContain(share.body.shareUrl);
    const token = (share.body.shareUrl as string).split('/t/')[1] ?? '';
    const pub = await t.http.get(`/t/${token}`).set('accept', 'application/json').expect(200);
    expect(pub.body).toMatchObject({
      name: 'Ravi Kumar',
      status: 'active',
      sharing: true,
      lat: 27.58,
    });
    const html = await t.http.get(`/t/${token}`).set('accept', 'text/html').expect(200);
    expect(html.text).toContain('Trip in progress');
    expect(html.headers['content-security-policy']).toContain('frame-src https://www.google.com');

    // Pausing hides the position from the link.
    await t.http
      .patch(`/v1/trips/${id}/sharing`)
      .set(...bearer(ravi.token))
      .send({ sharing: false })
      .expect(200);
    expect((await t.http.get(`/t/${token}`).set('accept', 'application/json')).body).toMatchObject({
      sharing: false,
      lat: null,
    });

    // Other users cannot touch the trip.
    await t.http
      .post(`/v1/trips/${id}/end`)
      .set(...bearer(stranger.token))
      .expect(404);

    const ended = await t.http
      .post(`/v1/trips/${id}/end`)
      .set(...bearer(ravi.token))
      .expect(200);
    expect(ended.body).toMatchObject({ status: 'ended', sharingLocation: false, shareUrl: null });
    expect(ended.body.endedAt).toBeTruthy();
    expect(await bodies(ravi.userId)).toContain(
      'Your pilgrimage has been completed. Thank you for travelling with TirthNow!',
    );
    await t.http.get(`/t/${token}`).set('accept', 'application/json').expect(404);

    const history = await t.http
      .get('/v1/trips')
      .set(...bearer(ravi.token))
      .expect(200);
    expect(history.body.data).toHaveLength(1);
    expect((await t.http.get('/v1/trips/active').set(...bearer(ravi.token))).body).toEqual({
      trip: null,
    });
  });

  it('shows a member’s location only to their family group, and only with consent', async () => {
    const group = await t.http
      .post('/v1/family/groups')
      .set(...bearer(mom.token))
      .send({ name: 'Kumar parivar' })
      .expect(201);
    const code = group.body.joinCode as string;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    await t.http
      .post('/v1/family/groups/join')
      .set(...bearer(ravi.token))
      .send({ code: code.toLowerCase() })
      .expect(200);

    const trip = await t.http
      .post('/v1/trips')
      .set(...bearer(ravi.token))
      .send({ title: 'Braj yatra', shareLocation: true })
      .expect(201);
    expect(await bodies(mom.userId)).toEqual(
      expect.arrayContaining([expect.stringContaining('Ravi Kumar started "Braj yatra"')]),
    );
    await t.http
      .post(`/v1/trips/${trip.body.id as string}/location`)
      .set(...bearer(ravi.token))
      .send({ lat: 27.5, lng: 77.6 })
      .expect(200);

    const view = async () => {
      const res = await t.http
        .get('/v1/family/groups')
        .set(...bearer(mom.token))
        .expect(200);
      const groups = res.body as {
        members: { name: string; lat: number | null; trip: unknown }[];
      }[];
      return groups[0]?.members.find((m) => m.name === 'Ravi Kumar');
    };
    // Joined, trip sharing on, but no consent for this group yet.
    expect(await view()).toMatchObject({ lat: null });
    expect((await view())?.trip).toBeTruthy();

    await t.http
      .patch(`/v1/family/groups/${group.body.id as string}/me`)
      .set(...bearer(ravi.token))
      .send({ sharing: true })
      .expect(200);
    expect(await view()).toMatchObject({ lat: 27.5 });

    // Outsiders see nothing, and cannot probe the group.
    expect((await t.http.get('/v1/family/groups').set(...bearer(stranger.token))).body).toEqual([]);
    await t.http
      .patch(`/v1/family/groups/${group.body.id as string}/me`)
      .set(...bearer(stranger.token))
      .send({ sharing: true })
      .expect(404);

    // Only the owner removes members.
    await t.http
      .delete(`/v1/family/groups/${group.body.id as string}/members/${mom.userId}`)
      .set(...bearer(ravi.token))
      .expect(403);
    await t.http
      .delete(`/v1/family/groups/${group.body.id as string}/members/${ravi.userId}`)
      .set(...bearer(mom.token))
      .expect(200);
    expect((await t.http.get('/v1/family/groups').set(...bearer(ravi.token))).body).toEqual([]);

    await t.http
      .post('/v1/family/groups/join')
      .set(...bearer(ravi.token))
      .send({ code: 'ZZZZZZ' })
      .expect(404);
  });
});
