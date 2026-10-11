import { InventoryFacade } from '../src/modules/inventory';
import { addDays, istDate, istToUtc } from '../src/core/time';
import { type CatalogFixture, seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  createActiveVendor,
  createTestApp,
  resetState,
  signInMobile,
  type TestApp,
} from './helpers';

const today = istDate(new Date());
const d = (n: number) => addDays(today, n);

describe('inventory', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
  });
  afterAll(async () => {
    await t.close();
  });

  async function hotelWithRooms() {
    const v = await createActiveVendor(t, {
      email: 'hotel@inv.test',
      type: 'hotel',
      cityId: fx.vrindavan,
      adminToken: admin,
    });
    const hotel = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels`)
      .set(...bearer(v.token))
      .send({
        cityId: fx.vrindavan,
        name: { en: 'Radha Residency', hi: 'राधा रेजीडेंसी' },
        lat: 27.5734,
        lng: 77.6812,
        address: 'Raman Reti',
        amenities: ['wifi'],
        isPublished: true,
      })
      .expect(201);
    const rt = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels/${hotel.body.id as string}/room-types`)
      .set(...bearer(v.token))
      .send({ name: { en: 'Deluxe' }, maxGuests: 2, basePricePaise: 200_000, totalRooms: 2 })
      .expect(201);
    return { v, hotelId: hotel.body.id as string, roomTypeId: rt.body.id as string };
  }

  describe('hotels', () => {
    it('materialises a year of nights and edits the calendar', async () => {
      const { v, roomTypeId } = await hotelWithRooms();
      expect(await t.prisma.roomInventory.count({ where: { roomTypeId } })).toBe(365);

      const cal = await t.http
        .get(
          `/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory?from=${d(0)}&to=${d(13)}`,
        )
        .set(...bearer(v.token))
        .expect(200);
      expect(cal.body).toHaveLength(14);
      expect(cal.body[0]).toMatchObject({
        total: 2,
        available: 2,
        booked: 0,
        pricePaise: 200_000,
        stopSell: false,
      });

      const weekend = await t.http
        .put(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory`)
        .set(...bearer(v.token))
        .send({ from: d(0), to: d(13), pricePaise: 260_000, weekdays: [0, 6] })
        .expect(200);
      const prices = new Set(weekend.body.map((x: { pricePaise: number }) => x.pricePaise));
      expect(prices).toEqual(new Set([200_000, 260_000]));

      await t.http
        .put(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory`)
        .set(...bearer(v.token))
        .send({ from: d(0), to: d(200) })
        .expect(400);
    });

    it('searches by dates with real availability and price', async () => {
      const { v, hotelId, roomTypeId } = await hotelWithRooms();
      const found = await t.http
        .get(`/v1/hotels?city=vrindavan&checkIn=${d(1)}&checkOut=${d(3)}&guests=2`)
        .expect(200);
      expect(found.body).toHaveLength(1);
      expect(found.body[0]).toMatchObject({ id: hotelId, fromPricePaise: 200_000 });

      await t.http
        .put(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory`)
        .set(...bearer(v.token))
        .send({ from: d(2), to: d(2), stopSell: true })
        .expect(200);
      const none = await t.http
        .get(`/v1/hotels?city=vrindavan&checkIn=${d(1)}&checkOut=${d(3)}`)
        .expect(200);
      expect(none.body).toHaveLength(0);

      const detail = await t.http
        .get(`/v1/hotels/${hotelId}?checkIn=${d(4)}&checkOut=${d(6)}&rooms=1&lang=hi`)
        .expect(200);
      expect(detail.body.name).toBe('राधा रेजीडेंसी');
      expect(detail.body.roomTypes[0]).toMatchObject({
        available: true,
        roomsLeft: 2,
        stayTotalPaise: 400_000,
      });
      expect(detail.body.roomTypes[0].nights).toHaveLength(2);

      const tooMany = await t.http.get(`/v1/hotels?city=vrindavan&guests=5`).expect(200);
      expect(tooMany.body).toHaveLength(0);
      await t.http.get(`/v1/hotels?checkIn=${d(-1)}&checkOut=${d(1)}`).expect(400);
      await t.http.get(`/v1/hotels?checkIn=${d(1)}`).expect(400);
    });

    it('never oversells the last room under concurrent holds', async () => {
      const { roomTypeId } = await hotelWithRooms();
      const facade = t.app.get(InventoryFacade);
      const nights = [d(5), d(6)];
      const attempt = () =>
        t.prisma.$transaction((tx) => facade.holdRooms(tx, roomTypeId, nights, 1));
      const results = await Promise.allSettled([attempt(), attempt(), attempt(), attempt()]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
      const rows = await t.prisma.roomInventory.findMany({
        where: { roomTypeId, stayDate: { in: nights.map((n) => new Date(`${n}T00:00:00Z`)) } },
      });
      expect(rows.every((r) => r.available === 0)).toBe(true);

      await t.prisma.$transaction((tx) => facade.releaseRooms(tx, roomTypeId, nights, 5));
      const released = await t.prisma.roomInventory.findMany({
        where: { roomTypeId, stayDate: { in: nights.map((n) => new Date(`${n}T00:00:00Z`)) } },
      });
      expect(released.every((r) => r.available === 2)).toBe(true);
    });

    it('refuses to shrink a night below what is already booked', async () => {
      const { v, roomTypeId } = await hotelWithRooms();
      await t.prisma.$transaction((tx) =>
        t.app.get(InventoryFacade).holdRooms(tx, roomTypeId, [d(7)], 2),
      );
      const res = await t.http
        .put(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory`)
        .set(...bearer(v.token))
        .send({ from: d(7), to: d(7), total: 1 })
        .expect(409);
      expect(res.body.error.code).toBe('INVENTORY_UNAVAILABLE');
      await t.http
        .put(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory`)
        .set(...bearer(v.token))
        .send({ from: d(7), to: d(7), total: 5 })
        .expect(200);
      const row = await t.prisma.roomInventory.findFirstOrThrow({
        where: { roomTypeId, stayDate: new Date(`${d(7)}T00:00:00Z`) },
      });
      expect(row).toMatchObject({ total: 5, available: 3 });
    });

    it('hides listings of suspended vendors and blocks publishing while inactive', async () => {
      const { v, hotelId } = await hotelWithRooms();
      await t.http
        .post(`/v1/admin/vendors/${v.vendorId}/suspend`)
        .set(...bearer(admin))
        .send({ reason: 'audit' })
        .expect(200);
      await t.http.get(`/v1/hotels/${hotelId}`).expect(404);
      const res = await t.http
        .patch(`/v1/vendors/${v.vendorId}/hotels/${hotelId}`)
        .set(...bearer(v.token))
        .send({ isPublished: true })
        .expect(409);
      expect(res.body.error.code).toBe('VENDOR_NOT_ACTIVE');
    });

    it('applies room-type changes to future default nights only', async () => {
      const { v, roomTypeId } = await hotelWithRooms();
      await t.http
        .put(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory`)
        .set(...bearer(v.token))
        .send({ from: d(3), to: d(3), pricePaise: 999_00 })
        .expect(200);
      await t.http
        .patch(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}`)
        .set(...bearer(v.token))
        .send({ basePricePaise: 250_000, totalRooms: 4 })
        .expect(200);
      const cal = await t.http
        .get(`/v1/vendors/${v.vendorId}/room-types/${roomTypeId}/inventory?from=${d(2)}&to=${d(3)}`)
        .set(...bearer(v.token))
        .expect(200);
      expect(
        cal.body.map((x: { pricePaise: number; total: number }) => [x.pricePaise, x.total]),
      ).toEqual([
        [250_000, 4],
        [999_00, 4],
      ]);
    });
  });

  describe('cabs', () => {
    async function cabVendor() {
      const v = await createActiveVendor(t, {
        email: 'cab@inv.test',
        type: 'cab',
        cityId: fx.mathura,
        adminToken: admin,
      });
      await t.http
        .post(`/v1/vendors/${v.vendorId}/vehicles`)
        .set(...bearer(v.token))
        .send({ class: 'sedan', registrationNo: 'UP85AT1001', seats: 4 })
        .expect(201);
      await t.http
        .put(`/v1/vendors/${v.vendorId}/cab-fares/sedan`)
        .set(...bearer(v.token))
        .send({
          baseFarePaise: 100_00,
          perKmPaise: 14_00,
          perMinPaise: 1_00,
          minFarePaise: 250_00,
          nightSurchargePct: 25,
          fixedRoutes: [{ from: 'mathura', to: 'vrindavan', farePaise: 450_00 }],
        })
        .expect(200);
      await t.http
        .put(`/v1/vendors/${v.vendorId}/cab-fares/suv`)
        .set(...bearer(v.token))
        .send({ baseFarePaise: 150_00, perKmPaise: 19_00, perMinPaise: 1_50, minFarePaise: 400_00 })
        .expect(200);
      return v;
    }

    it('quotes metered fares only for classes with active vehicles', async () => {
      await cabVendor();
      const noon = istToUtc(d(1), 12, 0).toISOString();
      const res = await t.http
        .post('/v1/cabs/estimate')
        .send({
          pickup: { lat: 27.5806, lng: 77.6996 },
          drop: { lat: 27.5717, lng: 77.6799 },
          at: noon,
        })
        .expect(200);
      expect(res.body.map((q: { class: string }) => q.class)).toEqual(['sedan']);
      expect(res.body[0]).toMatchObject({
        fixedRoute: false,
        nightSurchargeApplied: false,
        seats: 4,
      });
      expect(res.body[0].farePaise).toBe(250_00);
    });

    it('uses the fixed Mathura–Vrindavan fare in both directions and the night surcharge otherwise', async () => {
      await cabVendor();
      const mathura = { lat: 27.4924, lng: 77.6737 };
      const vrindavan = { lat: 27.565, lng: 77.6593 };
      const fixed = await t.http
        .post('/v1/cabs/estimate')
        .send({ pickup: vrindavan, drop: mathura, at: istToUtc(d(1), 23, 0).toISOString() })
        .expect(200);
      expect(fixed.body[0]).toMatchObject({
        farePaise: 450_00,
        fixedRoute: true,
        nightSurchargeApplied: false,
      });

      const night = await t.http
        .post('/v1/cabs/estimate')
        .send({
          pickup: { lat: 27.5806, lng: 77.6996 },
          drop: { lat: 27.5717, lng: 77.6799 },
          at: istToUtc(d(1), 23, 0).toISOString(),
        })
        .expect(200);
      expect(night.body[0]).toMatchObject({ farePaise: 312_50, nightSurchargeApplied: true });
    });

    it('validates trips', async () => {
      await t.http
        .post('/v1/cabs/estimate')
        .send({ pickup: { lat: 27.5, lng: 77.6 }, drop: { lat: 27.5, lng: 77.6 } })
        .expect(400);
      await t.http
        .post('/v1/cabs/estimate')
        .send({
          pickup: { lat: 27.5, lng: 77.6 },
          drop: { lat: 28.6, lng: 77.2 },
          at: '2020-01-01T00:00:00Z',
        })
        .expect(400);
      await t.http
        .post('/v1/cabs/estimate')
        .send({ pickup: { lat: 99, lng: 77.6 }, drop: { lat: 27.5, lng: 77.6 } })
        .expect(400);
    });
  });

  describe('restaurants and experiences', () => {
    it('lists restaurants with menus and prices food orders server-side', async () => {
      const v = await createActiveVendor(t, {
        email: 'food@inv.test',
        type: 'restaurant',
        cityId: fx.vrindavan,
        adminToken: admin,
      });
      const r = await t.http
        .post(`/v1/vendors/${v.vendorId}/restaurants`)
        .set(...bearer(v.token))
        .send({
          cityId: fx.vrindavan,
          name: { en: 'Braj Bhojanalaya' },
          lat: 27.58,
          lng: 77.69,
          isSatvik: true,
          acceptsOrders: true,
          isPublished: true,
          externalLinks: { zomato: 'https://www.zomato.com/x' },
        })
        .expect(201);
      const thali = await t.http
        .post(`/v1/vendors/${v.vendorId}/restaurants/${r.body.id as string}/menu-items`)
        .set(...bearer(v.token))
        .send({ name: { en: 'Thali' }, category: 'thali', pricePaise: 220_00 })
        .expect(201);
      const lassi = await t.http
        .post(`/v1/vendors/${v.vendorId}/restaurants/${r.body.id as string}/menu-items`)
        .set(...bearer(v.token))
        .send({ name: { en: 'Lassi' }, category: 'drinks', pricePaise: 60_00, isAvailable: false })
        .expect(201);

      const list = await t.http.get('/v1/restaurants?city=vrindavan&satvik=true').expect(200);
      expect(list.body).toHaveLength(1);
      const detail = await t.http.get(`/v1/restaurants/${r.body.id as string}`).expect(200);
      expect(detail.body.menu).toHaveLength(2);
      expect(detail.body.externalLinks).toEqual({ zomato: 'https://www.zomato.com/x' });

      const facade = t.app.get(InventoryFacade);
      const priced = await facade.priceFoodOrder(r.body.id as string, [
        { menuItemId: thali.body.id as string, quantity: 2 },
      ]);
      expect(priced.subtotalPaise).toBe(440_00);
      await expect(
        facade.priceFoodOrder(r.body.id as string, [
          { menuItemId: lassi.body.id as string, quantity: 1 },
        ]),
      ).rejects.toThrow(/not available/);

      await t.http
        .patch(`/v1/vendors/${v.vendorId}/restaurants/${r.body.id as string}`)
        .set(...bearer(v.token))
        .send({ openingHours: { daily: [['00:00', '00:01']] } })
        .expect(200);
      await expect(
        facade.priceFoodOrder(r.body.id as string, [
          { menuItemId: thali.body.id as string, quantity: 1 },
        ]),
      ).rejects.toThrow(/closed/);
    });

    it('creates experience slots and holds seats within capacity', async () => {
      const v = await createActiveVendor(t, {
        email: 'exp@inv.test',
        type: 'experience',
        cityId: fx.vrindavan,
        adminToken: admin,
      });
      const e = await t.http
        .post(`/v1/vendors/${v.vendorId}/experiences`)
        .set(...bearer(v.token))
        .send({
          cityId: fx.vrindavan,
          kind: 'boat_ride',
          title: { en: 'Yamuna Boat Ride' },
          pricePaise: 300_00,
          durationMin: 45,
          maxGroupSize: 8,
          isPublished: true,
        })
        .expect(201);
      const slots = await t.http
        .post(`/v1/vendors/${v.vendorId}/experiences/${e.body.id as string}/slots`)
        .set(...bearer(v.token))
        .send({ dates: [d(1), d(2)], times: ['06:30', '17:30'], capacity: 8 })
        .expect(201);
      expect(slots.body).toHaveLength(4);
      await t.http
        .post(`/v1/vendors/${v.vendorId}/experiences/${e.body.id as string}/slots`)
        .set(...bearer(v.token))
        .send({ dates: [d(-1)], times: ['06:30'], capacity: 8 })
        .expect(400);

      const detail = await t.http.get(`/v1/experiences/${e.body.id as string}?days=7`).expect(200);
      expect(detail.body.slots[0]).toMatchObject({ remaining: 8 });

      const facade = t.app.get(InventoryFacade);
      const slotId = slots.body[0].id as string;
      await t.prisma.$transaction((tx) => facade.holdSlot(tx, slotId, 6));
      await expect(t.prisma.$transaction((tx) => facade.holdSlot(tx, slotId, 3))).rejects.toThrow(
        /Only 2 places/,
      );
      await t.http
        .delete(`/v1/vendors/${v.vendorId}/experience-slots/${slotId}`)
        .set(...bearer(v.token))
        .expect(409);
    });
  });

  it('enforces staff permissions on listings and adds listings to search', async () => {
    const { v, hotelId } = await hotelWithRooms();
    const staff = await signInMobile(t, 'frontdesk', '+919800055555');
    await t.http
      .post(`/v1/vendors/${v.vendorId}/staff`)
      .set(...bearer(v.token))
      .send({ phoneE164: '+919800055555', permissions: ['orders.manage'] })
      .expect(201);
    await t.http
      .get(`/v1/vendors/${v.vendorId}/hotels`)
      .set(...bearer(staff.token))
      .expect(200);
    await t.http
      .patch(`/v1/vendors/${v.vendorId}/hotels/${hotelId}`)
      .set(...bearer(staff.token))
      .send({ address: 'x' })
      .expect(403);

    const res = await t.http.get('/v1/search?q=radha residency').expect(200);
    expect(res.body[0]).toMatchObject({ type: 'hotel', id: hotelId });
  });
});
