import { decryptField } from '../src/core/crypto';
import { MediaProcessor } from '../src/modules/files';
import {
  adminToken,
  bearer,
  createActiveVendor,
  createPortalUser,
  createTestApp,
  drainQueue,
  PDF_BYTES,
  resetState,
  signInMobile,
  signInPortal,
  type TestApp,
  uploadFile,
} from './helpers';

describe('vendors', () => {
  let t: TestApp;
  let admin: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetState(t);
    admin = await adminToken(t);
  });
  afterAll(async () => {
    await t.close();
  });

  const kycUpload = async (token: string) => {
    const { mediaId } = await uploadFile(t, token, {
      purpose: 'kyc_document',
      mimeType: 'application/pdf',
      body: PDF_BYTES,
    });
    await drainQueue(t, 'media', MediaProcessor);
    return mediaId;
  };

  it('runs onboarding: draft → KYC → submit → review → approve', async () => {
    await createPortalUser(t, { email: 'owner@hotel.test', password: 'Password-123' });
    const owner = await signInPortal(t, 'owner@hotel.test', 'Password-123');

    const created = await t.http
      .post('/v1/vendors')
      .set(...bearer(owner.token))
      .send({
        type: 'hotel',
        legalName: 'Radha Hospitality Pvt Ltd',
        displayName: 'Radha Residency',
        pan: 'ABCDE1234F',
        gstin: '09ABCDE1234F1Z5',
      })
      .expect(201);
    const vid = created.body.id as string;
    expect(created.body).toMatchObject({
      status: 'draft',
      myRole: 'owner',
      missingDocuments: ['pan', 'gst', 'trade_license'],
    });

    // The new vendor role arrives with the next refresh.
    const refreshed = await signInPortal(t, 'owner@hotel.test', 'Password-123');
    const me = await t.http
      .get('/v1/me')
      .set(...bearer(refreshed.token))
      .expect(200);
    expect(me.body.vendorIds).toEqual([vid]);

    const early = await t.http
      .post(`/v1/vendors/${vid}/submit`)
      .set(...bearer(owner.token))
      .expect(400);
    expect(early.body.error).toMatchObject({
      code: 'KYC_INCOMPLETE',
      details: { missing: ['pan', 'gst', 'trade_license'] },
    });

    // KYC uploads need the vendor claim, so the portal refreshes after creating the vendor.
    const presignBefore = await t.http
      .post('/v1/files/presign')
      .set(...bearer(owner.token))
      .send({ purpose: 'kyc_document', mimeType: 'application/pdf', sizeBytes: 100 });
    expect(presignBefore.status).toBe(403);
    for (const docType of ['pan', 'gst', 'trade_license']) {
      const mediaId = await kycUpload(refreshed.token);
      await t.http
        .post(`/v1/vendors/${vid}/kyc-documents`)
        .set(...bearer(refreshed.token))
        .send({ docType, mediaId })
        .expect(201);
    }
    const submitted = await t.http
      .post(`/v1/vendors/${vid}/submit`)
      .set(...bearer(owner.token))
      .expect(200);
    expect(submitted.body.status).toBe('kyc_pending');

    await t.http
      .patch(`/v1/vendors/${vid}`)
      .set(...bearer(owner.token))
      .send({ legalName: 'Changed' })
      .expect(409);
    await t.http
      .patch(`/v1/vendors/${vid}`)
      .set(...bearer(owner.token))
      .send({ displayName: 'Radha Residency & Suites' })
      .expect(200);

    const list = await t.http
      .get('/v1/admin/vendors?status=kyc_pending')
      .set(...bearer(admin))
      .expect(200);
    expect(list.body.data.map((v: { id: string }) => v.id)).toEqual([vid]);

    const detail = await t.http
      .get(`/v1/admin/vendors/${vid}`)
      .set(...bearer(admin))
      .expect(200);
    expect(detail.body.kycDocuments).toHaveLength(3);

    const tooSoon = await t.http
      .post(`/v1/admin/vendors/${vid}/approve`)
      .set(...bearer(admin))
      .expect(400);
    expect(tooSoon.body.error.code).toBe('KYC_INCOMPLETE');

    await t.http
      .post(
        `/v1/admin/vendors/${vid}/kyc-documents/${detail.body.kycDocuments[0].id as string}/review`,
      )
      .set(...bearer(admin))
      .send({ decision: 'rejected' })
      .expect(400);
    for (const doc of detail.body.kycDocuments as { id: string }[]) {
      await t.http
        .post(`/v1/admin/vendors/${vid}/kyc-documents/${doc.id}/review`)
        .set(...bearer(admin))
        .send({ decision: 'approved' })
        .expect(200);
    }
    const approved = await t.http
      .post(`/v1/admin/vendors/${vid}/approve`)
      .set(...bearer(admin))
      .expect(200);
    expect(approved.body.status).toBe('active');

    const suspended = await t.http
      .post(`/v1/admin/vendors/${vid}/suspend`)
      .set(...bearer(admin))
      .send({ reason: 'Customer complaints' })
      .expect(200);
    expect(suspended.body.status).toBe('suspended');
    await t.http
      .post(`/v1/admin/vendors/${vid}/reinstate`)
      .set(...bearer(admin))
      .expect(200);

    const actions = (
      await t.prisma.auditLog.findMany({
        where: { entityType: 'vendor', entityId: vid },
        orderBy: { createdAt: 'asc' },
      })
    ).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'vendor.create',
        'vendor.submit',
        'vendor.approve',
        'vendor.suspend',
        'vendor.reinstate',
      ]),
    );
  });

  it('lets admins send an application back for corrections', async () => {
    await createPortalUser(t, { email: 'cab@owner.test', password: 'Password-123' });
    const owner = await signInPortal(t, 'cab@owner.test', 'Password-123');
    const vid = (
      await t.http
        .post('/v1/vendors')
        .set(...bearer(owner.token))
        .send({ type: 'cab', legalName: 'Braj Cabs', displayName: 'Braj Cabs', pan: 'ABCDE1234F' })
        .expect(201)
    ).body.id as string;
    Object.assign(owner, await signInPortal(t, 'cab@owner.test', 'Password-123'));
    for (const docType of ['pan', 'rc', 'permit']) {
      await t.http
        .post(`/v1/vendors/${vid}/kyc-documents`)
        .set(...bearer(owner.token))
        .send({ docType, mediaId: await kycUpload(owner.token) })
        .expect(201);
    }
    await t.http
      .post(`/v1/vendors/${vid}/submit`)
      .set(...bearer(owner.token))
      .expect(200);
    const rejected = await t.http
      .post(`/v1/admin/vendors/${vid}/reject`)
      .set(...bearer(admin))
      .send({ reason: 'Permit expired' })
      .expect(200);
    expect(rejected.body.status).toBe('kyc_rejected');
    await t.http
      .patch(`/v1/vendors/${vid}`)
      .set(...bearer(owner.token))
      .send({ legalName: 'Braj Cabs LLP' })
      .expect(200);
    await t.http
      .post(`/v1/vendors/${vid}/submit`)
      .set(...bearer(owner.token))
      .expect(200);
  });

  it('only accepts KYC documents the owner uploaded as kyc_document', async () => {
    const v = await createActiveVendor(t, {
      email: 'x@v.test',
      type: 'experience',
      adminToken: admin,
    });
    await createPortalUser(t, { email: 'y@v.test', password: 'Password-123' });
    const other = await signInPortal(t, 'y@v.test', 'Password-123');
    const vid = (
      await t.http
        .post('/v1/vendors')
        .set(...bearer(other.token))
        .send({
          type: 'experience',
          legalName: 'Yatra Co',
          displayName: 'Yatra',
          pan: 'ABCDE1234F',
        })
        .expect(201)
    ).body.id as string;
    Object.assign(other, await signInPortal(t, 'y@v.test', 'Password-123'));
    const foreignMedia = await kycUpload(v.token);
    const res = await t.http
      .post(`/v1/vendors/${vid}/kyc-documents`)
      .set(...bearer(other.token))
      .send({ docType: 'pan', mediaId: foreignMedia })
      .expect(400);
    expect(res.body.error.code).toBe('UPLOAD_INVALID');
  });

  it('manages staff permissions and revokes access immediately on removal', async () => {
    const v = await createActiveVendor(t, {
      email: 'boss@v.test',
      type: 'hotel',
      adminToken: admin,
    });
    const staffUser = await signInMobile(t, 'manager', '+919812312312');

    await t.http
      .post(`/v1/vendors/${v.vendorId}/staff`)
      .set(...bearer(v.token))
      .send({ phoneE164: '+919800000000', permissions: [] })
      .expect(404);
    await t.http
      .post(`/v1/vendors/${v.vendorId}/staff`)
      .set(...bearer(v.token))
      .send({ phoneE164: '+919812312312', permissions: ['delete.everything'] })
      .expect(400);
    const invited = await t.http
      .post(`/v1/vendors/${v.vendorId}/staff`)
      .set(...bearer(v.token))
      .send({ phoneE164: '+919812312312', permissions: ['orders.manage'] })
      .expect(201);

    const asStaff = await t.http
      .get(`/v1/vendors/${v.vendorId}`)
      .set(...bearer(staffUser.token))
      .expect(200);
    expect(asStaff.body).toMatchObject({ myRole: 'staff', myPermissions: ['orders.manage'] });
    expect(asStaff.body.kycDocuments[0].url).toBeUndefined();
    await t.http
      .get(`/v1/vendors/${v.vendorId}/bank-accounts`)
      .set(...bearer(staffUser.token))
      .expect(403);
    await t.http
      .get(`/v1/vendors/${v.vendorId}/staff`)
      .set(...bearer(staffUser.token))
      .expect(403);

    const mine = await t.http
      .get('/v1/vendors/me')
      .set(...bearer(staffUser.token))
      .expect(200);
    expect(mine.body.map((x: { id: string }) => x.id)).toEqual([v.vendorId]);

    await t.http
      .delete(`/v1/vendors/${v.vendorId}/staff/${invited.body.id as string}`)
      .set(...bearer(v.token))
      .expect(204);
    await t.http
      .get(`/v1/vendors/${v.vendorId}`)
      .set(...bearer(staffUser.token))
      .expect(404);
  });

  it('stores bank account numbers encrypted and shows only the last 4 digits', async () => {
    const v = await createActiveVendor(t, {
      email: 'bank@v.test',
      type: 'restaurant',
      adminToken: admin,
    });
    await t.http
      .post(`/v1/vendors/${v.vendorId}/bank-accounts`)
      .set(...bearer(v.token))
      .send({ accountHolder: 'Bank Owner', accountNumber: '12AB', ifsc: 'HDFC0001234' })
      .expect(400);
    const res = await t.http
      .post(`/v1/vendors/${v.vendorId}/bank-accounts`)
      .set(...bearer(v.token))
      .send({ accountHolder: 'Bank Owner', accountNumber: '123456789012', ifsc: 'HDFC0001234' })
      .expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      accountHolder: 'Bank Owner',
      accountLast4: '9012',
      ifsc: 'HDFC0001234',
      isPrimary: true,
      isVerified: false,
    });

    const row = await t.prisma.vendorBankAccount.findUniqueOrThrow({
      where: { id: res.body.id as string },
    });
    expect(row.accountNumberEnc).not.toContain('123456789012');
    expect(decryptField(row.accountNumberEnc, t.config.dataEncryptionKey)).toBe('123456789012');

    const second = await t.http
      .post(`/v1/vendors/${v.vendorId}/bank-accounts`)
      .set(...bearer(v.token))
      .send({ accountHolder: 'Bank Owner', accountNumber: '999988887777', ifsc: 'SBIN0000001' })
      .expect(201);
    expect(second.body.isPrimary).toBe(false);
    const after = await t.http
      .post(`/v1/vendors/${v.vendorId}/bank-accounts/${second.body.id as string}/primary`)
      .set(...bearer(v.token))
      .expect(200);
    expect(after.body[0]).toMatchObject({ id: second.body.id, isPrimary: true });
  });

  it('hides vendors from outsiders and blocks guests from onboarding', async () => {
    const v = await createActiveVendor(t, {
      email: 'hidden@v.test',
      type: 'hotel',
      adminToken: admin,
    });
    const outsider = await signInMobile(t, 'outsider');
    await t.http
      .get(`/v1/vendors/${v.vendorId}`)
      .set(...bearer(outsider.token))
      .expect(404);
    const guest = await t.http.post('/v1/auth/firebase').send({ idToken: 'mock:guest:guest-v' });
    await t.http
      .post('/v1/vendors')
      .set(...bearer(guest.body.accessToken as string))
      .send({ type: 'hotel', legalName: 'G', displayName: 'G' })
      .expect(403);
    await t.http
      .get('/v1/admin/vendors')
      .set(...bearer(outsider.token))
      .expect(403);
  });
});
