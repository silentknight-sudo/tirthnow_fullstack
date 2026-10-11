import { Injectable } from '@nestjs/common';
import { haversineKm, type LatLng } from '../../geo';
import { type MapsProvider, type RouteResult } from './maps.provider';

/** Straight-line distance × 1.3 road factor at 25 km/h driving (5 km/h walking). */
@Injectable()
export class MockMapsAdapter implements MapsProvider {
  route(
    origin: LatLng,
    destination: LatLng,
    mode: 'drive' | 'walk' = 'drive',
  ): Promise<RouteResult> {
    const distanceM = Math.round(haversineKm(origin, destination) * 1.3 * 1000);
    const speedMs = (mode === 'walk' ? 5 : 25) / 3.6;
    return Promise.resolve({
      distanceM,
      durationS: Math.round(distanceM / speedMs),
      polyline: null,
    });
  }
}
