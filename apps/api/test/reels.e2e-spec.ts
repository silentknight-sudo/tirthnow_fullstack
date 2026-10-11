import { MockVideoAdapter } from '../src/core/providers';
import { addDays, istDate } from '../src/core/time';
import { MediaProcessor } from '../src/modules/files';
import { NotificationsProcessor } from '../src/modules/notifications';
import { ReelsService } from '../src/modules/reels';
import { type CatalogFixture, pngBytes, seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  connectSocket,
  createActiveVendor,
  createTestApp,
  drainQueue,
  MP4_BYTES,
  nextEvent,
  resetState,
  signInMobile,
  subscribeRoom,
  type TestApp,
  uploadFile,
} from './helpers';

const d = (n: number) => addDays(istDate(new Date()), n);
let seq = 0;
const key = () => `r-key-${Date.now()}-${++seq}`;

describe('reviews, reels and moderation', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;
  let alice: { token: string; userId: string };
  let bob: { token: string; userId: string };
  let video: MockVideoAdapter;

  beforeAll(async () => {
    t = await createTestApp();
    video = t.app.get(MockVideoAdapter);
  });
  beforeEach(async () => {
    await resetState(t);
    video.holdAssets = false;
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
    alice = await signInMobile(t, 'alice', '+919833300001');
    bob = await signInMobile(t, 'bob', '+919833300002');
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(alice.token))
      .send({ displayName: 'Alice Gupta' })
      .expect(200);
  });
  afterAll(async () => {
    await t.close();
  });

  const drainMedia = () => drainQueue(t, 'media', MediaProcessor);

  async function postReel(token: string, body: object = {}) {
    const up = await uploadFile(t, token, {
      purpose: 'reel_video',
      mimeType: 'video/mp4',
      body: MP4_BYTES,
    });
    const res = await t.http
      .post('/v1/reels')
      .set(...bearer(token))
      .send({
        videoMediaId: up.mediaId,
        caption: 'Evening #Aarti at Keshi Ghat',
        templeId: fx.bankeBihari,
        cityId: fx.vrindavan,
        ...body,
      })
      .expect(201);
    await drainMedia();
    return res.body as { id: string; status: string };
  }

  // ───────────── reviews ─────────────

  async function completedHotelStay() {
    await t.http
      .post('/v1/admin/commission-rules')
      .set(...bearer(admin))
      .send({ name: 'Default', percentBps: 1000 })
      .expect(201);
    const v = await createActiveVendor(t, {
      email: `hotel${seq++}@rev.test`,
      type: 'hotel',
      cityId: fx.vrindavan,
      adminToken: admin,
    });
    const h = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels`)
      .set(...bearer(v.token))
      .send({
        cityId: fx.vrindavan,
        name: { en: 'Govind Dham' },
        lat: 27.57,
        lng: 77.68,
        address: 'Parikrama Marg',
        checkinTime: '12:00',
        checkoutTime: '11:00',
        isPublished: true,
      })
      .expect(201);
    const rt = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels/${h.body.id as string}/room-types`)
      .set(...bearer(v.token))
      .send({ name: { en: 'Std' }, maxGuests: 2, basePricePaise: 150_000, totalRooms: 3 })
      .expect(201);
    const book = await t.http
      .post('/v1/orders')
      .set(...bearer(alice.token))
      .set('Idempotency-Key', key())
      .send({
        type: 'hotel',
        hotel: { roomTypeId: rt.body.id, checkIn: d(5), checkOut: d(6), rooms: 1, guests: 2 },
      })
      .expect(201);
    await t.http
      .post('/v1/dev/payments/checkout')
      .send({ providerOrderId: book.body.payment.providerOrderId })
      .expect(200);
    return { vendor: v, hotelId: h.body.id as string, orderId: book.body.order.id as string };
  }

  it('accepts verified reviews only, keeps hotel ratings current and lets vendors reply', async () => {
    const stay = await completedHotelStay();
    const review = (body: object, token = alice.token) =>
      t.http
        .post('/v1/reviews')
        .set(...bearer(token))
        .send({ targetType: 'hotel', targetId: stay.hotelId, rating: 4, ...body });

    expect((await review({ orderId: stay.orderId }).expect(403)).body.error.code).toBe(
      'REVIEW_NOT_ALLOWED',
    );
    await t.http
      .post(`/v1/vendors/${stay.vendor.vendorId}/orders/${stay.orderId}/complete`)
      .set(...bearer(stay.vendor.token))
      .expect(200);
    await review({}).expect(403);
    await review({ orderId: stay.orderId }, bob.token).expect(403);
    await review({ orderId: stay.orderId, targetId: fx.bankeBihari }).expect(403);

    const photo = await uploadFile(t, alice.token, {
      purpose: 'review_image',
      mimeType: 'image/png',
      body: await pngBytes(800, 600),
    });
    await drainMedia();
    const created = await review({
      orderId: stay.orderId,
      body: 'Clean rooms, 5 minutes from Banke Bihari.',
      mediaIds: [photo.mediaId],
    }).expect(201);
    expect(created.body).toMatchObject({
      rating: 4,
      verifiedStay: true,
      moderationStatus: 'approved',
      author: { displayName: 'Alice Gupta' },
    });
    expect(created.body.photoUrls).toHaveLength(1);
    await review({ orderId: stay.orderId }).expect(409);

    const hotel = await t.prisma.hotel.findUniqueOrThrow({ where: { id: stay.hotelId } });
    expect([Number(hotel.ratingAvg), hotel.ratingCount]).toEqual([4, 1]);

    const listed = await t.http
      .get(`/v1/reviews?targetType=hotel&targetId=${stay.hotelId}`)
      .expect(200);
    expect(listed.body.summary).toEqual({
      average: 4,
      count: 1,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 0 },
    });

    await t.http
      .patch(`/v1/reviews/${created.body.id as string}`)
      .set(...bearer(alice.token))
      .send({ rating: 5 })
      .expect(200);
    expect(
      Number((await t.prisma.hotel.findUniqueOrThrow({ where: { id: stay.hotelId } })).ratingAvg),
    ).toBe(5);
    await t.http
      .patch(`/v1/reviews/${created.body.id as string}`)
      .set(...bearer(bob.token))
      .send({ rating: 1 })
      .expect(404);

    const inbox = await t.http
      .get(`/v1/vendors/${stay.vendor.vendorId}/reviews?unanswered=true`)
      .set(...bearer(stay.vendor.token))
      .expect(200);
    expect(inbox.body.data.map((r: { id: string }) => r.id)).toEqual([created.body.id]);
    await t.http
      .post(`/v1/vendors/${stay.vendor.vendorId}/reviews/${created.body.id as string}/reply`)
      .set(...bearer(stay.vendor.token))
      .send({ reply: 'Thank you, Radhe Radhe!' })
      .expect(200);
    expect(
      (
        await t.http
          .get(`/v1/vendors/${stay.vendor.vendorId}/reviews?unanswered=true`)
          .set(...bearer(stay.vendor.token))
          .expect(200)
      ).body.data,
    ).toHaveLength(0);
    await drainQueue(t, 'notifications', NotificationsProcessor);
    const notes = await t.http
      .get('/v1/notifications')
      .set(...bearer(alice.token))
      .expect(200);
    expect(notes.body.data.map((n: { title: string }) => n.title)).toContainEqual(
      expect.stringMatching(/replied to your review$/),
    );

    await t.http
      .delete(`/v1/reviews/${created.body.id as string}`)
      .set(...bearer(alice.token))
      .expect(204);
    expect(
      (await t.prisma.hotel.findUniqueOrThrow({ where: { id: stay.hotelId } })).ratingCount,
    ).toBe(0);
  });

  it('lets anyone review a temple once, holds abusive reviews for moderation', async () => {
    const temple = (body: object, token = bob.token) =>
      t.http
        .post('/v1/reviews')
        .set(...bearer(token))
        .send({ targetType: 'temple', targetId: fx.iskcon, rating: 5, ...body });
    await temple({ body: 'Peaceful mangala arati.' }).expect(201);
    await temple({ body: 'Again' }).expect(409);
    const flagged = await temple({ body: 'The guide was an idiot.' }, alice.token).expect(201);
    expect(flagged.body.moderationStatus).toBe('flagged');
    expect(
      (await t.http.get(`/v1/reviews?targetType=temple&targetId=${fx.iskcon}`).expect(200)).body
        .summary.count,
    ).toBe(1);

    const queue = await t.http
      .get('/v1/admin/moderation/queue')
      .set(...bearer(admin))
      .expect(200);
    expect(queue.body.data[0]).toMatchObject({
      targetType: 'review',
      targetId: flagged.body.id,
      automatic: true,
      reasonCode: 'auto:abuse',
    });
    await t.http
      .post(`/v1/admin/moderation/${queue.body.data[0].id as string}/action`)
      .set(...bearer(admin))
      .send({ action: 'approve', note: 'Mild' })
      .expect(200);
    expect(
      (await t.http.get(`/v1/reviews?targetType=temple&targetId=${fx.iskcon}`).expect(200)).body
        .summary.count,
    ).toBe(2);
    expect(
      (
        await t.http
          .get('/v1/admin/moderation/queue')
          .set(...bearer(admin))
          .expect(200)
      ).body.data,
    ).toHaveLength(0);

    const guest = await t.http
      .post('/v1/auth/firebase')
      .send({ idToken: 'mock:guest:g-rev' })
      .expect(200);
    await temple({}, guest.body.accessToken as string).expect(403);
    await temple({ rating: 6 }).expect(400);
  });

  // ───────────── reels ─────────────

  it('publishes reels after transcoding and serves a ranked, personalised feed', async () => {
    const reel = await postReel(alice.token, { hashtags: ['Vrindavan'] });
    expect(reel.status).toBe('processing');
    const live = await t.http
      .get(`/v1/reels/${reel.id}`)
      .set(...bearer(bob.token))
      .expect(200);
    expect(live.body).toMatchObject({
      status: 'published',
      moderationStatus: 'approved',
      hashtags: ['vrindavan', 'aarti'],
      templeName: 'Shri Banke Bihari Temple',
      creator: { displayName: 'Alice Gupta' },
    });
    expect(live.body.playbackUrl).toMatch(/reel_video\//);

    expect(
      (
        await t.http
          .post(`/v1/reels/${reel.id}/like`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toEqual({ liked: true, likeCount: 1 });
    expect(
      (
        await t.http
          .post(`/v1/reels/${reel.id}/like`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toEqual({ liked: true, likeCount: 1 });
    expect(
      (
        await t.http
          .post(`/v1/reels/${reel.id}/save`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toEqual({ saved: true, saveCount: 1 });
    expect(
      (
        await t.http
          .post(`/v1/reels/${reel.id}/view`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toEqual({ viewCount: 1 });
    expect(
      (
        await t.http
          .post(`/v1/reels/${reel.id}/view`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toEqual({ viewCount: 1 });

    const comment = await t.http
      .post(`/v1/reels/${reel.id}/comments`)
      .set(...bearer(bob.token))
      .send({ body: 'Jai Shri Krishna 🙏' })
      .expect(201);
    await t.http
      .post(`/v1/reels/${reel.id}/comments`)
      .set(...bearer(alice.token))
      .send({ body: 'Radhe Radhe', parentId: comment.body.id })
      .expect(201);
    const spam = await t.http
      .post(`/v1/reels/${reel.id}/comments`)
      .set(...bearer(bob.token))
      .send({ body: 'Call me on 9876543210 for cheap darshan' })
      .expect(201);
    expect(spam.body.moderationStatus).toBe('flagged');
    const comments = await t.http
      .get(`/v1/reels/${reel.id}/comments`)
      .set(...bearer(bob.token))
      .expect(200);
    expect(comments.body.data).toHaveLength(2);

    const second = await postReel(bob.token, {
      caption: 'Holi at Barsana',
      templeId: undefined,
      hashtags: ['holi'],
    });
    await t.app.get(ReelsService).recomputeScores();
    const feed = await t.http
      .get('/v1/reels/feed?limit=1')
      .set(...bearer(bob.token))
      .expect(200);
    expect(feed.body.data[0]).toMatchObject({
      id: reel.id,
      likedByMe: true,
      savedByMe: true,
      likeCount: 1,
      commentCount: 2,
      viewCount: 1,
    });
    const page2 = await t.http
      .get(`/v1/reels/feed?limit=1&cursor=${feed.body.nextCursor as string}`)
      .set(...bearer(bob.token))
      .expect(200);
    expect(page2.body.data.map((r: { id: string }) => r.id)).toEqual([second.id]);
    expect(page2.body.nextCursor).toBeNull();
    expect(
      (
        await t.http
          .get('/v1/reels/feed?hashtag=holi')
          .set(...bearer(alice.token))
          .expect(200)
      ).body.data.map((r: { id: string }) => r.id),
    ).toEqual([second.id]);
    expect(
      (
        await t.http
          .get('/v1/reels/feed?city=mathura')
          .set(...bearer(alice.token))
          .expect(200)
      ).body.data,
    ).toHaveLength(0);
    await t.http
      .get('/v1/reels/feed?cursor=garbage')
      .set(...bearer(alice.token))
      .expect(400);

    expect(
      (
        await t.http
          .post(`/v1/users/${alice.userId}/follow`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toEqual({ following: true, followerCount: 1 });
    await t.http
      .post(`/v1/users/${bob.userId}/follow`)
      .set(...bearer(bob.token))
      .expect(400);
    const following = await t.http
      .get('/v1/reels/feed?following=true')
      .set(...bearer(bob.token))
      .expect(200);
    expect(following.body.data.map((r: { id: string }) => r.id)).toEqual([reel.id]);
    const creator = await t.http
      .get(`/v1/users/${alice.userId}/reels`)
      .set(...bearer(bob.token))
      .expect(200);
    expect(creator.body.profile).toMatchObject({
      displayName: 'Alice Gupta',
      followerCount: 1,
      reelCount: 1,
      isFollowing: true,
      isMe: false,
    });
    expect(
      (
        await t.http
          .get('/v1/reels/saved')
          .set(...bearer(bob.token))
          .expect(200)
      ).body.data.map((r: { id: string }) => r.id),
    ).toEqual([reel.id]);

    await t.http
      .delete(`/v1/reels/${reel.id}/comments/${comment.body.id as string}`)
      .set(...bearer(alice.token))
      .expect(204);
    expect(
      (
        await t.http
          .get(`/v1/reels/${reel.id}`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body.commentCount,
    ).toBe(1);
    await t.http
      .delete(`/v1/reels/${reel.id}`)
      .set(...bearer(bob.token))
      .expect(404);
    await t.http
      .delete(`/v1/reels/${reel.id}`)
      .set(...bearer(alice.token))
      .expect(204);
    await t.http
      .get(`/v1/reels/${reel.id}`)
      .set(...bearer(bob.token))
      .expect(404);
    expect(video.removed).toHaveLength(1);
  });

  it('finishes transcoding by signed webhook and keeps flagged captions out of the feed', async () => {
    video.holdAssets = true;
    const reel = await postReel(alice.token);
    const row = await t.prisma.reel.findUniqueOrThrow({ where: { id: reel.id } });
    expect(row.status).toBe('processing');
    expect(row.videoProviderId).toMatch(/^vid_mock_/);
    const hook = video.webhook(row.videoProviderId ?? '');
    await t.http
      .post('/v1/reels/webhooks/video')
      .set('content-type', 'application/json')
      .set('x-mock-signature', 'bad')
      .send(hook.body.toString())
      .expect(401);
    expect(
      (
        await t.http
          .post('/v1/reels/webhooks/video')
          .set('content-type', 'application/json')
          .set('x-mock-signature', hook.signature)
          .send(hook.body.toString())
          .expect(200)
      ).body,
    ).toEqual({ status: 'ready' });
    expect(
      (
        await t.http
          .get(`/v1/reels/${reel.id}`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body,
    ).toMatchObject({ status: 'published', durationMs: 15_000 });

    const failing = await postReel(alice.token);
    const failRow = await t.prisma.reel.findUniqueOrThrow({ where: { id: failing.id } });
    const errored = video.webhook(failRow.videoProviderId ?? '', 'errored');
    await t.http
      .post('/v1/reels/webhooks/video')
      .set('content-type', 'application/json')
      .set('x-mock-signature', errored.signature)
      .send(errored.body.toString())
      .expect(200);
    expect((await t.prisma.reel.findUniqueOrThrow({ where: { id: failing.id } })).status).toBe(
      'removed',
    );

    video.holdAssets = false;
    const rude = await postReel(alice.token, { caption: 'Only an idiot skips this' });
    const own = await t.http
      .get(`/v1/reels/${rude.id}`)
      .set(...bearer(alice.token))
      .expect(200);
    expect(own.body).toMatchObject({ status: 'hidden', moderationStatus: 'flagged' });
    await t.http
      .get(`/v1/reels/${rude.id}`)
      .set(...bearer(bob.token))
      .expect(404);
    const reports = await t.prisma.report.findMany({ where: { targetId: rude.id } });
    expect(reports).toMatchObject([{ reporterId: null, reasonCode: 'auto:abuse' }]);

    await t.http
      .post('/v1/reels')
      .set(...bearer(bob.token))
      .send({
        videoMediaId: (
          await uploadFile(t, alice.token, {
            purpose: 'reel_video',
            mimeType: 'video/mp4',
            body: MP4_BYTES,
          })
        ).mediaId,
      })
      .expect(400);
  });

  it('hides content after three reports and applies moderator decisions', async () => {
    const reel = await postReel(alice.token);
    const adminSocket = await connectSocket(t, admin);
    await subscribeRoom(adminSocket, 'admin');
    const alert = nextEvent<{ targetType: string; automatic: boolean }>(
      adminSocket,
      'moderation.new',
    );

    const report = (token: string) =>
      t.http
        .post('/v1/reports')
        .set(...bearer(token))
        .send({ targetType: 'reel', targetId: reel.id, reasonCode: 'spam' });
    const first = await report(bob.token).expect(201);
    expect(await alert).toMatchObject({ targetType: 'reel', automatic: false });
    expect((await report(bob.token).expect(201)).body.id).toBe(first.body.id);
    await report(alice.token).expect(400);
    await t.http
      .post('/v1/reports')
      .set(...bearer(bob.token))
      .send({
        targetType: 'reel',
        targetId: '00000000-0000-4000-8000-000000000000',
        reasonCode: 'spam',
      })
      .expect(404);
    await t.http
      .post('/v1/reports')
      .set(...bearer(bob.token))
      .send({ targetType: 'reel', targetId: reel.id, reasonCode: 'boring' })
      .expect(400);

    const carol = await signInMobile(t, 'carol', '+919833300003');
    const dave = await signInMobile(t, 'dave', '+919833300004');
    await report(carol.token).expect(201);
    expect((await t.prisma.reel.findUniqueOrThrow({ where: { id: reel.id } })).status).toBe(
      'published',
    );
    await report(dave.token).expect(201);
    expect((await t.prisma.reel.findUniqueOrThrow({ where: { id: reel.id } })).status).toBe(
      'hidden',
    );

    const queue = await t.http
      .get('/v1/admin/moderation/queue?targetType=reel')
      .set(...bearer(admin))
      .expect(200);
    expect(queue.body.data).toHaveLength(3);
    expect(queue.body.data[0]).toMatchObject({
      openReportsOnTarget: 3,
      target: { exists: true, authorId: alice.userId },
    });
    await t.http
      .post(`/v1/admin/moderation/${first.body.id as string}/action`)
      .set(...bearer(admin))
      .send({ action: 'restore' })
      .expect(200);
    expect(
      (
        await t.http
          .get(`/v1/reels/${reel.id}`)
          .set(...bearer(bob.token))
          .expect(200)
      ).body.status,
    ).toBe('published');
    expect(await t.prisma.report.count({ where: { status: 'dismissed' } })).toBe(3);

    // A new report, then removal and suspension of the author.
    const again = await report(bob.token).expect(201);
    await t.http
      .post(`/v1/admin/moderation/${again.body.id as string}/action`)
      .set(...bearer(admin))
      .send({ action: 'suspend_user', note: 'Repeat spam' })
      .expect(200);
    expect((await t.prisma.reel.findUniqueOrThrow({ where: { id: reel.id } })).status).toBe(
      'removed',
    );
    expect((await t.prisma.user.findUniqueOrThrow({ where: { id: alice.userId } })).status).toBe(
      'suspended',
    );
    expect(await t.prisma.moderationAction.count()).toBe(2);
    await t.http
      .get('/v1/admin/moderation/queue')
      .set(...bearer(bob.token))
      .expect(403);

    const userReport = await t.http
      .post('/v1/reports')
      .set(...bearer(bob.token))
      .send({ targetType: 'user', targetId: carol.userId, reasonCode: 'harassment' })
      .expect(201);
    await t.http
      .post(`/v1/admin/moderation/${userReport.body.id as string}/action`)
      .set(...bearer(admin))
      .send({ action: 'hide' })
      .expect(400);
    await t.http
      .post(`/v1/admin/moderation/${userReport.body.id as string}/action`)
      .set(...bearer(admin))
      .send({ action: 'warn_user' })
      .expect(200);
    adminSocket.disconnect();
  });
});
