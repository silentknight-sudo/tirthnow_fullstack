import type { Metadata } from 'next';
import { YatraJourney } from '@/components/YatraJourney';

export const metadata: Metadata = {
  title: 'Yatra Journey — Tirth Now',
  description:
    'Ride through a Vrindavan, Mathura or Govardhan yatra stop by stop: route, travel mode, fares, darshan details and pilgrim tips.',
};

export default function JourneyPage() {
  return <YatraJourney />;
}
