import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { type LatLng } from '../../geo';
import { callWithPolicy } from '../call-policy';
import { type MapsProvider, type RouteResult } from './maps.provider';

interface ComputeRoutesResponse {
  routes?: {
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
  }[];
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Google Routes API (computeRoutes). */
@Injectable()
export class GoogleMapsAdapter implements MapsProvider {
  private readonly apiKey: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.maps.googleApiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    this.apiKey = config.maps.googleApiKey;
  }

  async route(
    origin: LatLng,
    destination: LatLng,
    mode: 'drive' | 'walk' = 'drive',
  ): Promise<RouteResult> {
    const point = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
    const body = await callWithPolicy('google-routes', async () => {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: point(origin),
          destination: point(destination),
          travelMode: mode === 'walk' ? 'WALK' : 'DRIVE',
          ...(mode === 'drive' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
        }),
      });
      if (!res.ok) throw new HttpError(res.status, `Routes API ${res.status}`);
      return (await res.json()) as ComputeRoutesResponse;
    });
    const r = body.routes?.[0];
    if (!r?.distanceMeters || !r.duration) throw new Error('No route found');
    return {
      distanceM: r.distanceMeters,
      durationS: Number.parseInt(r.duration, 10),
      polyline: r.polyline?.encodedPolyline ?? null,
    };
  }
}
