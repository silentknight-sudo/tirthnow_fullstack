/**
 * Local development seed. Idempotent: every row has a deterministic id, so re-running
 * updates in place. Refuses to run against production.
 *
 *   pnpm db:seed
 */
import { createHash } from 'node:crypto';
import path from 'node:path';
import { type Prisma, PrismaClient, type RoleKey, type VehicleClass } from '@prisma/client';
import argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { type AartiSeed, CITIES, POIS, TEMPLES } from './catalog-data';

loadEnv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

const prisma = new PrismaClient();

/** Deterministic UUID (v5-shaped) from a stable key. */
export function sid(key: string): string {
  const h = createHash('sha1').update(`tirth-now:${key}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

/** Wall-clock time for a Postgres `time` column. */
const timeOf = (hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(1970, 0, 1, h, m));
};

const i18n = (en: string, hi?: string): Prisma.InputJsonValue => (hi ? { en, hi } : { en });

const utcMidnight = (offsetDays: number): Date => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays));
};

const ARGON = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

async function seedCatalog(): Promise<void> {
  for (const [i, c] of CITIES.entries()) {
    const data = { slug: c.slug, nameI18n: i18n(c.en, c.hi), lat: c.lat, lng: c.lng, sortOrder: i };
    await prisma.city.upsert({
      where: { id: sid(`city:${c.slug}`) },
      create: { id: sid(`city:${c.slug}`), ...data },
      update: data,
    });
  }

  for (const t of TEMPLES) {
    const id = sid(`temple:${t.slug}`);
    const data = {
      cityId: sid(`city:${t.city}`),
      slug: t.slug,
      nameI18n: i18n(t.en, t.hi),
      descriptionI18n: i18n(t.description),
      lat: t.lat,
      lng: t.lng,
      tags: t.tags,
      crowdLevel: t.crowd ?? 0,
      openingHours: { note: 'Darshan between aarti times; temple closes for afternoon rest.' },
      dressCodeI18n: i18n(
        'Modest clothing; leather items may not be allowed inside.',
        'शालीन वस्त्र; चमड़े की वस्तुएँ अंदर ले जाना वर्जित हो सकता है।',
      ),
    };
    await prisma.temple.upsert({ where: { id }, create: { id, ...data }, update: data });
    await seedAarti(id, t.slug, t.aarti);
  }

  for (const p of POIS) {
    const id = sid(`poi:${p.key}`);
    const data = {
      cityId: sid(`city:${p.city}`),
      category: p.category,
      nameI18n: i18n(p.en, p.hi),
      lat: p.lat,
      lng: p.lng,
      is24x7: p.is24x7 ?? false,
      isEmergency: p.isEmergency ?? false,
    };
    await prisma.poi.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const routeId = sid('route:goverdhan-parikrama');
  const route = {
    slug: 'goverdhan-parikrama',
    nameI18n: i18n('Goverdhan Parikrama', 'गोवर्धन परिक्रमा'),
    descriptionI18n: i18n(
      'The 21 km barefoot circumambulation of Giriraj ji, usually begun at Daan Ghati.',
    ),
    distanceM: 21_000,
    estDurationMin: 360,
    difficulty: 'moderate',
  };
  await prisma.parikramaRoute.upsert({
    where: { id: routeId },
    create: { id: routeId, ...route },
    update: route,
  });
  const stops = ['daan-ghati-temple', 'radha-kund', 'mukharvind-jatipura', 'haridev-ji-temple'];
  for (const [seq, slug] of stops.entries()) {
    const stop = { templeId: sid(`temple:${slug}`) };
    await prisma.parikramaRouteStop.upsert({
      where: { routeId_seq: { routeId, seq } },
      create: { routeId, seq, ...stop },
      update: stop,
    });
  }
}

async function seedAarti(templeId: string, slug: string, list: AartiSeed[]): Promise<void> {
  const ids = list.map((_, i) => sid(`aarti:${slug}:${i}`));
  await prisma.aartiSchedule.deleteMany({ where: { templeId, id: { notIn: ids } } });
  for (const [i, [kind, en, hi, time, season]] of list.entries()) {
    const data = {
      templeId,
      kind,
      nameI18n: i18n(en, hi),
      localTime: timeOf(time),
      durationMin: kind === 'shayan' || kind === 'mangla' ? 20 : 15,
      season: season ?? 'all',
      // Indicative season windows; real dates shift with the Hindu calendar.
      validFrom: null,
      validTo: null,
    };
    const id = ids[i] as string;
    await prisma.aartiSchedule.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
}

async function upsertPortalUser(opts: {
  key: string;
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  roles: { key: RoleKey; vendorId?: string }[];
}): Promise<string> {
  const id = sid(`user:${opts.key}`);
  const passwordHash = await argon2.hash(opts.password, ARGON);
  const data = {
    email: opts.email,
    passwordHash,
    phoneE164: opts.phone ?? null,
    status: 'active' as const,
  };
  await prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data });
  await prisma.userProfile.upsert({
    where: { userId: id },
    create: { userId: id, displayName: opts.displayName },
    update: { displayName: opts.displayName },
  });
  await grantRoles(id, opts.roles);
  return id;
}

async function grantRoles(
  userId: string,
  roles: { key: RoleKey; vendorId?: string }[],
): Promise<void> {
  for (const r of roles) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: r.key } });
    const vendorId = r.vendorId ?? null;
    const exists = await prisma.userRole.findFirst({
      where: { userId, roleId: role.id, vendorId },
    });
    if (!exists) await prisma.userRole.create({ data: { userId, roleId: role.id, vendorId } });
  }
}

async function upsertVendor(
  key: string,
  data: Omit<Prisma.VendorUncheckedCreateInput, 'id'>,
): Promise<string> {
  const id = sid(`vendor:${key}`);
  await prisma.vendor.upsert({ where: { id }, create: { id, ...data }, update: data });
  return id;
}

async function seedHotelVendor(adminId: string, password: string): Promise<void> {
  const ownerId = await upsertPortalUser({
    key: 'hotel-owner',
    email: 'hotel.owner@tirthnow.local',
    password,
    displayName: 'Radhika Sharma',
    roles: [{ key: 'user' }],
  });
  const vendorId = await upsertVendor('radha-residency', {
    ownerUserId: ownerId,
    type: 'hotel',
    legalName: 'Shri Radha Hospitality Pvt Ltd',
    displayName: 'Shri Radha Residency',
    gstin: '09ABCDE1234F1Z5',
    cityId: sid('city:vrindavan'),
    status: 'active',
    approvedAt: new Date(),
    approvedById: adminId,
  });
  await grantRoles(ownerId, [{ key: 'vendor_owner', vendorId }]);

  const hotels = [
    {
      key: 'radha-residency-vrindavan',
      city: 'vrindavan',
      en: 'Shri Radha Residency',
      hi: 'श्री राधा रेजीडेंसी',
      lat: 27.5734,
      lng: 77.6812,
      address: 'Raman Reti Marg, near ISKCON, Vrindavan',
      stars: 3,
      amenities: ['wifi', 'ac', 'satvik-kitchen', 'parking', 'temple-shuttle'],
    },
    {
      key: 'yamuna-view-mathura',
      city: 'mathura',
      en: 'Yamuna View Guest House',
      hi: 'यमुना व्यू गेस्ट हाउस',
      lat: 27.5079,
      lng: 77.6849,
      address: 'Near Vishram Ghat, Mathura',
      stars: 2,
      amenities: ['wifi', 'ac', 'river-view'],
    },
  ];
  const roomTypes = [
    {
      key: 'standard',
      en: 'Standard Room',
      hi: 'स्टैंडर्ड रूम',
      guests: 2,
      price: 1_800_00,
      rooms: 10,
    },
    { key: 'deluxe', en: 'Deluxe Room', hi: 'डीलक्स रूम', guests: 3, price: 2_900_00, rooms: 6 },
    { key: 'family', en: 'Family Suite', hi: 'फैमिली सुइट', guests: 5, price: 4_500_00, rooms: 2 },
  ];
  for (const h of hotels) {
    const hotelId = sid(`hotel:${h.key}`);
    const data = {
      vendorId,
      cityId: sid(`city:${h.city}`),
      nameI18n: i18n(h.en, h.hi),
      descriptionI18n: i18n('Clean, family-friendly stay a short walk from the main temples.'),
      lat: h.lat,
      lng: h.lng,
      address: h.address,
      starRating: h.stars,
      amenities: h.amenities,
      checkinTime: timeOf('12:00'),
      checkoutTime: timeOf('11:00'),
      cancellationPolicy: { freeUntilHoursBefore: 48, penaltyPctAfter: 50, noShowPct: 100 },
      isPublished: true,
    };
    await prisma.hotel.upsert({
      where: { id: hotelId },
      create: { id: hotelId, ...data },
      update: data,
    });

    for (const rt of roomTypes) {
      const roomTypeId = sid(`room-type:${h.key}:${rt.key}`);
      const rtData = {
        hotelId,
        nameI18n: i18n(rt.en, rt.hi),
        maxGuests: rt.guests,
        basePricePaise: rt.price,
        totalRooms: rt.rooms,
        amenities: ['ac', 'hot-water'],
      };
      await prisma.roomType.upsert({
        where: { id: roomTypeId },
        create: { id: roomTypeId, ...rtData },
        update: rtData,
      });
      // 60 nights of date-level inventory; weekends +20%.
      await prisma.roomInventory.createMany({
        skipDuplicates: true,
        data: Array.from({ length: 60 }, (_, d) => {
          const stayDate = utcMidnight(d);
          const weekend = [0, 6].includes(stayDate.getUTCDay());
          return {
            roomTypeId,
            stayDate,
            total: rt.rooms,
            available: rt.rooms,
            pricePaise: weekend ? Math.round((rt.price * 12) / 10) : rt.price,
          };
        }),
      });
    }
  }
}

async function seedTransportAndFoodVendor(adminId: string, password: string): Promise<void> {
  const ownerId = await upsertPortalUser({
    key: 'cab-owner',
    email: 'cabs.owner@tirthnow.local',
    password,
    displayName: 'Mohan Lal Yadav',
    roles: [{ key: 'user' }],
  });
  const vendorId = await upsertVendor('braj-yatra', {
    ownerUserId: ownerId,
    type: 'multi',
    legalName: 'Braj Yatra Services LLP',
    displayName: 'Braj Yatra Cabs & Kitchen',
    cityId: sid('city:mathura'),
    status: 'active',
    approvedAt: new Date(),
    approvedById: adminId,
  });
  await grantRoles(ownerId, [{ key: 'vendor_owner', vendorId }]);

  const vehicles: {
    reg: string;
    cls: VehicleClass;
    model: string;
    seats: number;
    driver: string;
  }[] = [
    { reg: 'UP85AT1001', cls: 'sedan', model: 'Maruti Dzire', seats: 4, driver: 'Ramesh Kumar' },
    {
      reg: 'UP85AT2002',
      cls: 'suv',
      model: 'Toyota Innova Crysta',
      seats: 7,
      driver: 'Suresh Singh',
    },
    { reg: 'UP85ER3003', cls: 'e_rickshaw', model: 'Mahindra Treo', seats: 4, driver: 'Gopal Das' },
  ];
  for (const v of vehicles) {
    const id = sid(`vehicle:${v.reg}`);
    const data = {
      vendorId,
      class: v.cls,
      registrationNo: v.reg,
      model: v.model,
      seats: v.seats,
      driverName: v.driver,
    };
    await prisma.vehicle.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const fares: { cls: VehicleClass; base: number; km: number; min: number; floor: number }[] = [
    { cls: 'e_rickshaw', base: 20_00, km: 10_00, min: 0, floor: 30_00 },
    { cls: 'sedan', base: 100_00, km: 14_00, min: 1_00, floor: 250_00 },
    { cls: 'suv', base: 150_00, km: 19_00, min: 1_50, floor: 400_00 },
  ];
  for (const f of fares) {
    const data = {
      vendorId,
      class: f.cls,
      baseFarePaise: f.base,
      perKmPaise: f.km,
      perMinPaise: f.min,
      minFarePaise: f.floor,
      nightSurchargePct: 25,
      fixedRoutes:
        f.cls === 'e_rickshaw'
          ? []
          : [{ from: 'mathura', to: 'vrindavan', farePaise: f.cls === 'sedan' ? 450_00 : 700_00 }],
    };
    await prisma.cabFare.upsert({
      where: { vendorId_class: { vendorId, class: f.cls } },
      create: data,
      update: data,
    });
  }

  const restaurantId = sid('restaurant:braj-bhojanalaya');
  const restaurant = {
    vendorId,
    cityId: sid('city:vrindavan'),
    nameI18n: i18n('Braj Bhojanalaya', 'ब्रज भोजनालय'),
    lat: 27.5801,
    lng: 77.6979,
    address: 'Vidyapeeth Chauraha, Vrindavan',
    isPureVeg: true,
    isSatvik: true,
    openingHours: { daily: [['07:00', '22:30']] },
    externalLinks: { zomato: null, swiggy: null },
    acceptsOrders: true,
    isPublished: true,
  };
  await prisma.restaurant.upsert({
    where: { id: restaurantId },
    create: { id: restaurantId, ...restaurant },
    update: restaurant,
  });
  const menu: [string, string, string, number, boolean][] = [
    ['thali', 'Braj Satvik Thali', 'ब्रज सात्विक थाली', 220_00, true],
    ['thali', 'Mini Thali', 'मिनी थाली', 140_00, true],
    ['breakfast', 'Kachori Sabzi (2 pc)', 'कचौड़ी सब्ज़ी', 60_00, false],
    ['breakfast', 'Poha', 'पोहा', 50_00, true],
    ['sweets', 'Mathura Peda (250 g)', 'मथुरा पेड़ा', 150_00, true],
    ['sweets', 'Rabri (bowl)', 'रबड़ी', 80_00, true],
    ['drinks', 'Lassi', 'लस्सी', 60_00, true],
    ['drinks', 'Masala Chai', 'मसाला चाय', 25_00, true],
  ];
  for (const [i, [category, en, hi, price, jain]] of menu.entries()) {
    const id = sid(`menu:braj-bhojanalaya:${i}`);
    const data = {
      restaurantId,
      category,
      nameI18n: i18n(en, hi),
      pricePaise: price,
      isJain: jain,
    };
    await prisma.menuItem.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const experienceId = sid('experience:yamuna-boat-ride');
  const experience = {
    vendorId,
    cityId: sid('city:vrindavan'),
    kind: 'boat_ride' as const,
    titleI18n: i18n('Yamuna Boat Ride at Keshi Ghat', 'केशी घाट पर यमुना नौका विहार'),
    descriptionI18n: i18n(
      'A 45-minute boat ride along the Vrindavan ghats, timed for sunrise or the evening Yamuna aarti.',
    ),
    pricePaise: 300_00,
    durationMin: 45,
    maxGroupSize: 8,
    cancellationPolicy: { freeUntilHoursBefore: 6 },
    isPublished: true,
  };
  await prisma.experience.upsert({
    where: { id: experienceId },
    create: { id: experienceId, ...experience },
    update: experience,
  });
  // 06:30 and 17:30 IST = 01:00 and 12:00 UTC.
  for (let d = 1; d <= 14; d++) {
    for (const utcHour of [1, 12]) {
      const startsAt = new Date(utcMidnight(d).getTime() + utcHour * 3_600_000);
      await prisma.experienceSlot.upsert({
        where: { experienceId_startsAt: { experienceId, startsAt } },
        create: { experienceId, startsAt, capacity: 8 },
        update: {},
      });
    }
  }
}

async function seedPlatform(): Promise<void> {
  const rules: {
    key: string;
    name: string;
    orderType: 'hotel' | 'cab' | 'food' | 'experience' | null;
    bps: number;
    priority: number;
  }[] = [
    { key: 'global', name: 'Default commission', orderType: null, bps: 1000, priority: 0 },
    { key: 'food', name: 'Food orders', orderType: 'food', bps: 1500, priority: 10 },
    { key: 'cab', name: 'Cab rides', orderType: 'cab', bps: 800, priority: 10 },
  ];
  for (const r of rules) {
    const id = sid(`commission:${r.key}`);
    const data = { name: r.name, orderType: r.orderType, percentBps: r.bps, priority: r.priority };
    await prisma.commissionRule.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const templates = [
    {
      key: 'aarti_reminder',
      channel: 'push' as const,
      title: i18n('Aarti in {{minutes}} minutes', '{{minutes}} मिनट में आरती'),
      body: i18n(
        '{{aartiName}} at {{templeName}} starts at {{time}}.',
        '{{templeName}} में {{aartiName}} {{time}} बजे।',
      ),
      variables: ['minutes', 'aartiName', 'templeName', 'time'],
    },
    {
      key: 'sos_alert',
      channel: 'sms' as const,
      title: null,
      body: i18n('SOS from {{name}} via Tirth Now. Live location: {{link}}'),
      variables: ['name', 'link'],
    },
    {
      key: 'order_confirmed',
      channel: 'push' as const,
      title: i18n('Booking confirmed', 'बुकिंग पक्की'),
      body: i18n('Your booking {{code}} is confirmed.', 'आपकी बुकिंग {{code}} पक्की हो गई है।'),
      variables: ['code'],
    },
  ];
  for (const t of templates) {
    const data = { titleI18n: t.title ?? undefined, bodyI18n: t.body, variables: t.variables };
    await prisma.notificationTemplate.upsert({
      where: { key_channel: { key: t.key, channel: t.channel } },
      create: { key: t.key, channel: t.channel, ...data },
      update: data,
    });
  }

  const configs: { key: string; kind: 'feature_flag' | 'setting'; value: Prisma.InputJsonValue }[] =
    [
      { key: 'feature.reels', kind: 'feature_flag', value: true },
      { key: 'feature.ai_guide', kind: 'feature_flag', value: true },
      { key: 'feature.transit', kind: 'feature_flag', value: false },
      { key: 'app.min_version', kind: 'setting', value: { android: '1.0.0', ios: '1.0.0' } },
      {
        key: 'safety.helplines',
        kind: 'setting',
        value: [
          { name: 'Emergency (all services)', phone: '112' },
          { name: 'Ambulance', phone: '108' },
          { name: 'Women helpline', phone: '1091' },
          { name: 'Tourist helpline', phone: '1363' },
        ],
      },
    ];
  for (const c of configs) {
    await prisma.appConfig.upsert({
      where: { key: c.key },
      create: c,
      update: { value: c.value, kind: c.kind },
    });
  }
}

async function seedDemoUser(): Promise<void> {
  const id = sid('user:demo');
  const data = {
    firebaseUid: 'demo-user',
    phoneE164: '+919999900001',
    isGuest: false,
    status: 'active' as const,
  };
  await prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data });
  await prisma.userProfile.upsert({
    where: { userId: id },
    create: {
      userId: id,
      displayName: 'Demo Yatri',
      preferredLang: 'hi',
      homeCityId: sid('city:vrindavan'),
    },
    update: { displayName: 'Demo Yatri' },
  });
  await grantRoles(id, [{ key: 'user' }]);
  const contactId = sid('emergency-contact:demo:1');
  const contact = {
    userId: id,
    name: 'Sita Devi',
    phoneE164: '+919999900002',
    relation: 'mother',
    priority: 1,
  };
  await prisma.emergencyContact.upsert({
    where: { id: contactId },
    create: { id: contactId, ...contact },
    update: contact,
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      'Refusing to seed a production database (set SEED_ALLOW_PRODUCTION=true to override).',
    );
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'TirthNow@Admin123';
  const vendorPassword = process.env.SEED_VENDOR_PASSWORD ?? 'TirthNow@Vendor123';

  await seedCatalog();
  const adminId = await upsertPortalUser({
    key: 'admin',
    email: 'admin@tirthnow.local',
    password: adminPassword,
    displayName: 'Tirth Now Admin',
    roles: [{ key: 'user' }, { key: 'admin' }, { key: 'super_admin' }],
  });
  await seedHotelVendor(adminId, vendorPassword);
  await seedTransportAndFoodVendor(adminId, vendorPassword);
  await seedPlatform();
  await seedDemoUser();

  const counts = {
    cities: await prisma.city.count(),
    temples: await prisma.temple.count(),
    aarti: await prisma.aartiSchedule.count(),
    hotels: await prisma.hotel.count(),
    roomNights: await prisma.roomInventory.count(),
    vehicles: await prisma.vehicle.count(),
    menuItems: await prisma.menuItem.count(),
    users: await prisma.user.count(),
  };
  console.log('Seed complete', counts);
  console.log(`
Portal logins (local only):
  admin   admin@tirthnow.local        ${adminPassword}
  vendor  hotel.owner@tirthnow.local  ${vendorPassword}
  vendor  cabs.owner@tirthnow.local   ${vendorPassword}
Mobile demo user (mock Firebase token):
  mock:demo-user:+919999900001`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
