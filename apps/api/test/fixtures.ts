import { type AartiKind, type PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { dbTime } from '../src/core/time';

export interface CatalogFixture {
  vrindavan: string;
  mathura: string;
  bankeBihari: string;
  iskcon: string;
  janmabhoomi: string;
  hospital: string;
  police: string;
  ghat: string;
}

/** Minimal catalog: 2 cities, 3 temples with aarti, 3 POIs, an explore item, a festival and a route. */
export async function seedCatalog(prisma: PrismaClient): Promise<CatalogFixture> {
  const vrindavan = await prisma.city.create({
    data: {
      slug: 'vrindavan',
      nameI18n: { en: 'Vrindavan', hi: 'वृन्दावन' },
      lat: 27.565,
      lng: 77.6593,
      sortOrder: 1,
    },
  });
  const mathura = await prisma.city.create({
    data: {
      slug: 'mathura',
      nameI18n: { en: 'Mathura', hi: 'मथुरा' },
      lat: 27.4924,
      lng: 77.6737,
      sortOrder: 0,
    },
  });
  const temple = (
    cityId: string,
    slug: string,
    en: string,
    hi: string,
    lat: number,
    lng: number,
    tags: string[],
  ) =>
    prisma.temple.create({
      data: {
        cityId,
        slug,
        nameI18n: { en, hi },
        descriptionI18n: { en: `${en} description` },
        lat,
        lng,
        tags,
      },
    });
  const bb = await temple(
    vrindavan.id,
    'banke-bihari',
    'Shri Banke Bihari Temple',
    'श्री बांके बिहारी मंदिर',
    27.5806,
    77.6996,
    ['krishna', 'crowded'],
  );
  const isk = await temple(
    vrindavan.id,
    'iskcon-vrindavan',
    'ISKCON Krishna Balaram Mandir',
    'इस्कॉन कृष्ण बलराम मंदिर',
    27.5717,
    77.6799,
    ['iskcon'],
  );
  const jb = await temple(
    mathura.id,
    'shri-krishna-janmabhoomi',
    'Shri Krishna Janmabhoomi',
    'श्री कृष्ण जन्मभूमि',
    27.5046,
    77.6699,
    ['krishna'],
  );
  const aarti = (templeId: string, kind: AartiKind, en: string, time: string, extra: object = {}) =>
    prisma.aartiSchedule.create({
      data: {
        templeId,
        kind,
        nameI18n: { en, hi: `${en} (hi)` },
        localTime: dbTime(time),
        ...extra,
      },
    });
  await aarti(bb.id, 'shringar', 'Shringar Aarti', '07:45', { season: 'summer' });
  await aarti(bb.id, 'shringar', 'Shringar Aarti', '08:45', { season: 'winter' });
  await aarti(bb.id, 'shayan', 'Shayan Aarti', '21:25');
  await aarti(isk.id, 'mangla', 'Mangala Arati', '04:30');
  await aarti(isk.id, 'sandhya', 'Sandhya Arati', '18:30');
  await aarti(jb.id, 'sandhya', 'Sandhya Aarti', '19:00', { recurrence: 'FREQ=WEEKLY;BYDAY=SU' });
  const poi = (
    cityId: string,
    category: 'hospital' | 'police' | 'ghat',
    en: string,
    lat: number,
    lng: number,
    isEmergency: boolean,
  ) =>
    prisma.poi.create({
      data: { cityId, category, nameI18n: { en }, lat, lng, isEmergency, is24x7: isEmergency },
    });
  const hospital = await poi(vrindavan.id, 'hospital', 'Vrindavan CHC', 27.5762, 77.6905, true);
  const police = await poi(mathura.id, 'police', 'Kotwali Police Station', 27.5049, 77.6787, true);
  const ghat = await poi(vrindavan.id, 'ghat', 'Keshi Ghat', 27.5844, 77.7004, false);
  await prisma.exploreItem.create({
    data: {
      cityId: vrindavan.id,
      kind: 'van',
      titleI18n: { en: 'Nidhivan', hi: 'निधिवन' },
      bodyI18n: { en: 'Sacred grove' },
      lat: 27.5826,
      lng: 77.6969,
    },
  });
  await prisma.festival.create({
    data: {
      cityId: vrindavan.id,
      nameI18n: { en: 'Sharad Purnima' },
      startsOn: new Date(Date.UTC(new Date().getUTCFullYear() + 1, 9, 1)),
      endsOn: new Date(Date.UTC(new Date().getUTCFullYear() + 1, 9, 1)),
    },
  });
  const route = await prisma.parikramaRoute.create({
    data: {
      slug: 'vrindavan-parikrama',
      nameI18n: { en: 'Vrindavan Parikrama' },
      distanceM: 10_000,
      estDurationMin: 180,
    },
  });
  await prisma.parikramaRouteStop.createMany({
    data: [
      { routeId: route.id, seq: 0, templeId: isk.id },
      { routeId: route.id, seq: 1, poiId: ghat.id },
      { routeId: route.id, seq: 2, templeId: bb.id },
    ],
  });
  await prisma.appConfig.createMany({
    data: [
      { key: 'safety.helplines', kind: 'setting', value: [{ name: 'Emergency', phone: '112' }] },
      { key: 'feature.reels', kind: 'feature_flag', value: true },
      {
        key: 'banner.ios-only',
        kind: 'banner',
        value: { text: 'iOS' },
        targeting: { platforms: ['ios'] },
      },
    ],
  });
  return {
    vrindavan: vrindavan.id,
    mathura: mathura.id,
    bankeBihari: bb.id,
    iskcon: isk.id,
    janmabhoomi: jb.id,
    hospital: hospital.id,
    police: police.id,
    ghat: ghat.id,
  };
}

export function pngBytes(width = 1600, height = 900): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 15, g: 122, b: 58 } } })
    .png()
    .toBuffer();
}
