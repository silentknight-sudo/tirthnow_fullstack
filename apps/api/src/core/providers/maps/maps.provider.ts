import { type LatLng } from '../../geo';

export interface RouteResult {
  distanceM: number;
  durationS: number;
  /** Encoded polyline when the provider returns one. */
  polyline: string | null;
}

/** Google Maps today; Mapbox can implement the same interface. */
export interface MapsProvider {
  route(origin: LatLng, destination: LatLng, mode?: 'drive' | 'walk'): Promise<RouteResult>;
}

export const MAPS_PROVIDER = Symbol('MAPS_PROVIDER');
