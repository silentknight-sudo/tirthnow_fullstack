import { MediaProcessor } from '../src/modules/files';
import { pngBytes } from './fixtures';
import {
  bearer,
  createPortalUser,
  createTestApp,
  drainQueue,
  resetState,
  signInMobile,
  signInPortal,
  type TestApp,
  uploadFile,
} from './helpers';

describe('files', () => {
  let t: TestApp;
  let token: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetState(t);
    ({ token } = await signInMobile(t, 'uploader'));
  });
  afterAll(async () => {
    await t.close();
  });

  const process = () => drainQueue(t, 'media', MediaProcessor);

  it('uploads an image, verifies it and creates variants', async () => {
    const png = await pngBytes();
    const { mediaId, status, completeBody } = await uploadFile(t, token, {
      purpose: 'avatar',
      mimeType: 'image/png',
      body: png,
    });
    expect(status).toBe(200);
    expect(completeBody).toMatchObject({ status: 'uploaded', url: null });

    await process();
    const res = await t.http
      .get(`/v1/files/${mediaId}`)
      .set(...bearer(token))
      .expect(200);
    expect(res.body).toMatchObject({ status: 'ready', width: 1600, height: 900, kind: 'image' });
    expect(Object.keys(res.body.variants as object).sort()).toEqual(['medium', 'thumb']);

    const thumbUrl = new URL(res.body.variants.thumb as string);
    const thumb = await t.http.get(thumbUrl.pathname).expect(200);
    expect(thumb.headers['content-type']).toBe('image/webp');
  });

  it('rejects content that does not match the declared type', async () => {
    const fake = Buffer.from('#!/bin/sh\necho not an image\n');
    const { mediaId } = await uploadFile(t, token, {
      purpose: 'review_image',
      mimeType: 'image/jpeg',
      body: fake,
    });
    await process();
    const asset = await t.prisma.mediaAsset.findUniqueOrThrow({ where: { id: mediaId } });
    expect(asset.status).toBe('failed');
  });

  it('rejects a size that differs from the declared size', async () => {
    const png = await pngBytes(10, 10);
    const presign = await t.http
      .post('/v1/files/presign')
      .set(...bearer(token))
      .send({ purpose: 'avatar', mimeType: 'image/png', sizeBytes: png.length + 10 })
      .expect(201);
    const url = new URL(presign.body.uploadUrl as string);
    await t.http
      .put(`${url.pathname}${url.search}`)
      .set('content-type', 'image/png')
      .send(png)
      .expect(200);
    const res = await t.http
      .post(`/v1/files/${presign.body.mediaId as string}/complete`)
      .set(...bearer(token))
      .expect(400);
    expect(res.body.error.code).toBe('UPLOAD_INVALID');
  });

  it('enforces type, size and staff-only purposes at presign time', async () => {
    const wrongType = await t.http
      .post('/v1/files/presign')
      .set(...bearer(token))
      .send({ purpose: 'avatar', mimeType: 'application/pdf', sizeBytes: 100 })
      .expect(400);
    expect(wrongType.body.error.code).toBe('UPLOAD_INVALID');
    await t.http
      .post('/v1/files/presign')
      .set(...bearer(token))
      .send({ purpose: 'avatar', mimeType: 'image/png', sizeBytes: 50 * 1024 * 1024 })
      .expect(400);
    await t.http
      .post('/v1/files/presign')
      .set(...bearer(token))
      .send({ purpose: 'kyc_document', mimeType: 'application/pdf', sizeBytes: 100 })
      .expect(403);
  });

  it('keeps private files private and serves them to the owner with a signed URL', async () => {
    await createPortalUser(t, {
      email: 'v@files.test',
      password: 'Password-123',
      roles: ['user', 'vendor_owner'],
    });
    const vendor = await signInPortal(t, 'v@files.test', 'Password-123');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    const { mediaId } = await uploadFile(t, vendor.token, {
      purpose: 'kyc_document',
      mimeType: 'application/pdf',
      body: pdf,
    });
    await process();

    const own = await t.http
      .get(`/v1/files/${mediaId}`)
      .set(...bearer(vendor.token))
      .expect(200);
    expect(own.body.status).toBe('ready');
    const signed = new URL(own.body.url as string);
    expect(signed.searchParams.get('sig')).toBeTruthy();
    await t.http.get(`${signed.pathname}${signed.search}`).expect(200);
    await t.http.get(signed.pathname).expect(403);

    await t.http
      .get(`/v1/files/${mediaId}`)
      .set(...bearer(token))
      .expect(404);
  });

  it('only lets the owner complete an upload', async () => {
    const presign = await t.http
      .post('/v1/files/presign')
      .set(...bearer(token))
      .send({ purpose: 'avatar', mimeType: 'image/png', sizeBytes: 10 })
      .expect(201);
    const other = await signInMobile(t, 'someone-else');
    await t.http
      .post(`/v1/files/${presign.body.mediaId as string}/complete`)
      .set(...bearer(other.token))
      .expect(404);
  });
});
