import { type SosStatus } from '@prisma/client';

export const SAFETY_EVENTS = {
  triggered: 'sos.triggered',
  dispatched: 'sos.dispatched',
  location: 'sos.location',
  closed: 'sos.closed',
} as const;

export interface SosEvent {
  sosId: string;
  userId: string;
  shareToken: string;
  status: SosStatus;
  lat: number;
  lng: number;
  accuracyM: number | null;
  batteryPct: number | null;
  at: string;
}
