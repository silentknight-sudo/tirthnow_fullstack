export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Prisma `where` prefilter: a lat/lng box that contains the radius (exact check follows in code). */
export function boundingBox(
  center: LatLng,
  radiusKm: number,
): { lat: { gte: number; lte: number }; lng: { gte: number; lte: number } } {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos(rad(center.lat)));
  return {
    lat: { gte: center.lat - dLat, lte: center.lat + dLat },
    lng: { gte: center.lng - dLng, lte: center.lng + dLng },
  };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Keep rows within the radius, annotate distance, sort nearest first. */
export function withinRadius<T extends LatLng>(
  rows: T[],
  center: LatLng,
  radiusKm: number,
): (T & { distanceKm: number })[] {
  return rows
    .map((r) => ({ ...r, distanceKm: round1(haversineKm(center, r)) }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
