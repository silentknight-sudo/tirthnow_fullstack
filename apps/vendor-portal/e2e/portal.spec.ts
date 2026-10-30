import { type APIRequestContext, expect, test } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:4000';

async function json<T>(res: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  if (!res.ok()) throw new Error(`${res.url()} → ${res.status()} ${await res.text()}`);
  return (await res.json()) as T;
}

/** A pilgrim books one night at the seeded hotel and pays with the mock gateway. */
async function bookAsPilgrim(request: APIRequestContext, ownerToken: string): Promise<string> {
  const auth = { Authorization: `Bearer ${ownerToken}` };
  const [vendor] = await json<{ id: string }[]>(
    await request.get(`${API}/v1/vendors/me`, { headers: auth }),
  );
  const hotels = await json<{ roomTypes: { id: string }[] }[]>(
    await request.get(`${API}/v1/vendors/${vendor!.id}/hotels`, { headers: auth }),
  );
  const roomTypeId = hotels[0]!.roomTypes[0]!.id;

  const phone = `+9198${String(Date.now()).slice(-8)}`;
  const pilgrim = await json<{ accessToken: string }>(
    await request.post(`${API}/v1/auth/firebase`, {
      data: { idToken: `mock:portal-e2e-${phone.slice(3)}:${phone}`, device: { platform: 'web' } },
    }),
  );
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const created = await json<{ order: { code: string }; payment: { providerOrderId: string } }>(
    await request.post(`${API}/v1/orders`, {
      headers: {
        Authorization: `Bearer ${pilgrim.accessToken}`,
        'Idempotency-Key': crypto.randomUUID(),
      },
      data: {
        type: 'hotel',
        hotel: {
          roomTypeId,
          checkIn: day(30),
          checkOut: day(31),
          rooms: 1,
          guests: 2,
          guestName: 'Portal Test Yatri',
        },
      },
    }),
  );
  await json(
    await request.post(`${API}/v1/dev/payments/checkout`, {
      headers: { Authorization: `Bearer ${pilgrim.accessToken}` },
      data: { providerOrderId: created.payment.providerOrderId, outcome: 'success' },
    }),
  );
  return created.order.code;
}

const SEEDED_OWNER = {
  email: 'hotel.owner@tirthnow.local',
  password: process.env.SEED_VENDOR_PASSWORD ?? 'TirthNow@Vendor123',
};

test('seeded hotel owner sees bookings, listings, calendar and payouts', async ({ page }) => {
  await page.goto('/login/');
  await page.getByLabel('Email').fill(SEEDED_OWNER.email);
  await page.getByLabel('Password').fill(SEEDED_OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: /Namaste, Shri Radha Residency/ })).toBeVisible();
  await expect(page.getByText('Live').first()).toBeVisible();

  await page.getByRole('link', { name: 'Listings' }).click();
  await expect(page.getByText('Shri Radha Residency', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Deluxe Room').first()).toBeVisible();

  await page.getByRole('link', { name: 'Room calendar' }).click();
  await expect(page.getByRole('heading', { name: 'Room calendar' })).toBeVisible();
  await page.getByLabel('Price per night (₹)').fill('2100');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('Calendar updated')).toBeVisible();
  await expect(page.getByText('₹2,100').first()).toBeVisible();

  await page.getByRole('link', { name: 'Bookings' }).click();
  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

  await page.getByRole('link', { name: 'Payouts' }).click();
  await expect(page.getByText('Available for payout')).toBeVisible();

  await page.getByRole('link', { name: 'Reviews' }).click();
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('a new partner signs up, onboards, uploads KYC, adds a bank account and a stay, and submits', async ({
  page,
}) => {
  const email = `owner+${Date.now()}@tirthnow.test`;
  await page.goto('/register/');
  await page.getByLabel('Your name').fill('Asha Goswami');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Radhe-Radhe-108');
  await page.getByLabel('Confirm password').fill('Radhe-Radhe-108');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: /Welcome, Asha Goswami/ })).toBeVisible();
  await page.getByLabel('Name guests will see').fill('Govind Dham Dharamshala');
  await page.getByLabel('Registered business name').fill('Govind Dham Trust');
  await page.getByLabel('City').selectOption({ label: 'Vrindavan' });
  await page.getByLabel('PAN (optional now)').fill('ABCDE1234F');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('heading', { name: /Namaste, Govind Dham Dharamshala/ }),
  ).toBeVisible();
  await expect(page.getByText('Finish setting up to go live')).toBeVisible();

  await page.getByRole('link', { name: 'Business & KYC' }).click();
  const pdf = {
    name: 'doc.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%test\n'),
  };
  for (const label of ['PAN card', 'Trade licence']) {
    await page.getByLabel('Document type').selectOption({ label });
    await page.getByLabel('Choose document').setInputFiles(pdf);
    await expect(page.getByRole('listitem').filter({ hasText: label })).toBeVisible();
  }

  await page.getByLabel('Account holder').fill('Govind Dham Trust');
  await page.getByLabel('Account number').fill('123456789012');
  await page.getByLabel('IFSC').fill('SBIN0001234');
  await page.getByRole('button', { name: 'Add bank account' }).click();
  await expect(page.getByText('••••9012')).toBeVisible();

  await page.getByRole('link', { name: 'Listings' }).click();
  await page.getByRole('button', { name: 'Add stay' }).click();
  await page.getByLabel('Name (English)').fill('Govind Dham');
  await page.getByLabel('Address').fill('Parikrama Marg, Vrindavan');
  await page.getByRole('dialog').getByLabel('City').selectOption({ label: 'Vrindavan' });
  await page.getByRole('dialog').getByRole('button', { name: 'Add stay' }).click();
  await expect(page.getByText('Govind Dham', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add room type' }).click();
  await page.getByLabel('Room name').fill('Family Room');
  await page.getByLabel('Price per night (₹)').fill('900');
  await page.getByRole('dialog').getByRole('button', { name: 'Add room type' }).click();
  await expect(page.getByText('Family Room')).toBeVisible();
  await expect(page.getByText('₹900')).toBeVisible();

  await page.getByRole('link', { name: 'Business & KYC' }).click();
  const submit = page.getByRole('button', { name: 'Submit for review' });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText('Under review').first()).toBeVisible();
});

test('the owner accepts a newly paid booking from the dashboard', async ({ page, request }) => {
  const login = await json<{ accessToken: string }>(
    await request.post(`${API}/v1/auth/portal/login`, { data: SEEDED_OWNER }),
  );
  const code = await bookAsPilgrim(request, login.accessToken);

  await page.goto('/login/');
  await page.getByLabel('Email').fill(SEEDED_OWNER.email);
  await page.getByLabel('Password').fill(SEEDED_OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const row = page.getByRole('listitem').filter({ hasText: code });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Portal Test Yatri');
  await row.getByRole('button', { name: 'Accept' }).click();
  await expect(row).toHaveCount(0);

  await page.getByRole('link', { name: 'Bookings' }).click();
  await page.getByRole('link', { name: code }).click();
  await expect(page.getByRole('heading', { name: `Booking ${code}` })).toBeVisible();
  await expect(page.getByText('Accepted').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start service' })).toBeVisible();
});
