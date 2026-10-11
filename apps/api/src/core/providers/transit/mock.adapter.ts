import { Injectable } from '@nestjs/common';
import { istWeekday } from '../../time';
import { type TrainOption, type TransitProvider, type TransitStation } from './transit.provider';

const STATIONS: TransitStation[] = [
  { code: 'MTJ', name: 'Mathura Junction', city: 'Mathura', lat: 27.4808, lng: 77.6745 },
  { code: 'BDB', name: 'Vrindavan', city: 'Vrindavan', lat: 27.5754, lng: 77.6969 },
  { code: 'KSV', name: 'Kosi Kalan', city: 'Kosi Kalan', lat: 27.7952, lng: 77.4361 },
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', lat: 28.6431, lng: 77.2197 },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi', lat: 28.5887, lng: 77.2532 },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', lat: 27.1582, lng: 77.9899 },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', lat: 26.9196, lng: 75.7878 },
  { code: 'BCT', name: 'Mumbai Central', city: 'Mumbai', lat: 18.9696, lng: 72.8194 },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', lat: 26.8318, lng: 80.9235 },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', lat: 25.3268, lng: 82.9861 },
];

type Leg = Omit<TrainOption, 'bookingUrl' | 'durationMin' | 'arrivalDayOffset'>;
const DAILY = [1, 2, 3, 4, 5, 6, 7];
/** A small, realistic-looking timetable (illustrative — not live data). */
const TIMETABLE: Leg[] = [
  {
    number: '12002',
    name: 'Bhopal Shatabdi',
    fromCode: 'NDLS',
    toCode: 'MTJ',
    departs: '06:00',
    arrives: '07:19',
    classes: ['CC', 'EC'],
    runsOn: DAILY,
  },
  {
    number: '12001',
    name: 'Bhopal Shatabdi',
    fromCode: 'MTJ',
    toCode: 'NDLS',
    departs: '20:28',
    arrives: '22:20',
    classes: ['CC', 'EC'],
    runsOn: DAILY,
  },
  {
    number: '12280',
    name: 'Taj Express',
    fromCode: 'NZM',
    toCode: 'MTJ',
    departs: '07:10',
    arrives: '09:15',
    classes: ['2S', 'CC'],
    runsOn: DAILY,
  },
  {
    number: '12279',
    name: 'Taj Express',
    fromCode: 'MTJ',
    toCode: 'NZM',
    departs: '19:05',
    arrives: '21:40',
    classes: ['2S', 'CC'],
    runsOn: DAILY,
  },
  {
    number: '12952',
    name: 'Mumbai Rajdhani',
    fromCode: 'NDLS',
    toCode: 'BCT',
    departs: '16:55',
    arrives: '08:35',
    classes: ['1A', '2A', '3A'],
    runsOn: DAILY,
  },
  {
    number: '12953',
    name: 'August Kranti Rajdhani',
    fromCode: 'BCT',
    toCode: 'MTJ',
    departs: '17:10',
    arrives: '08:03',
    classes: ['1A', '2A', '3A'],
    runsOn: DAILY,
  },
  {
    number: '12176',
    name: 'Chambal Express',
    fromCode: 'AGC',
    toCode: 'MTJ',
    departs: '10:40',
    arrives: '11:45',
    classes: ['SL', '3A'],
    runsOn: [2, 5],
  },
  {
    number: '19666',
    name: 'Udaipur Express',
    fromCode: 'MTJ',
    toCode: 'JP',
    departs: '12:05',
    arrives: '17:25',
    classes: ['SL', '3A', '2A'],
    runsOn: DAILY,
  },
  {
    number: '14853',
    name: 'Marudhar Express',
    fromCode: 'BSB',
    toCode: 'MTJ',
    departs: '13:00',
    arrives: '06:30',
    classes: ['SL', '3A', '2A'],
    runsOn: [1, 3, 6],
  },
  {
    number: '12179',
    name: 'Intercity Express',
    fromCode: 'LKO',
    toCode: 'MTJ',
    departs: '15:15',
    arrives: '22:40',
    classes: ['2S', 'CC'],
    runsOn: DAILY,
  },
  {
    number: '05180',
    name: 'Vrindavan Shuttle',
    fromCode: 'MTJ',
    toCode: 'BDB',
    departs: '08:30',
    arrives: '08:55',
    classes: ['GEN'],
    runsOn: DAILY,
  },
  {
    number: '05181',
    name: 'Vrindavan Shuttle',
    fromCode: 'BDB',
    toCode: 'MTJ',
    departs: '17:30',
    arrives: '17:55',
    classes: ['GEN'],
    runsOn: DAILY,
  },
];

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Static timetable for development; deep-links to IRCTC for booking. */
@Injectable()
export class MockTransitAdapter implements TransitProvider {
  stations(query: string): Promise<TransitStation[]> {
    const q = query.trim().toLowerCase();
    if (q === '') return Promise.resolve(STATIONS);
    return Promise.resolve(
      STATIONS.filter(
        (s) =>
          s.code.toLowerCase() === q ||
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q),
      ),
    );
  }

  search(fromCode: string, toCode: string, date: string): Promise<TrainOption[]> {
    const weekday = istWeekday(date);
    const isoWeekday = weekday === 0 ? 7 : weekday;
    const trains = TIMETABLE.filter(
      (t) => t.fromCode === fromCode && t.toCode === toCode && t.runsOn.includes(isoWeekday),
    )
      .map((t) => {
        let duration = minutes(t.arrives) - minutes(t.departs);
        let offset = 0;
        while (duration <= 0) {
          duration += 24 * 60;
          offset++;
        }
        return {
          ...t,
          durationMin: duration,
          arrivalDayOffset: offset,
          bookingUrl: `https://www.irctc.co.in/nget/train-search?from=${t.fromCode}&to=${t.toCode}&date=${date.replace(/-/g, '')}&trainNo=${t.number}`,
        };
      })
      .sort((a, b) => a.departs.localeCompare(b.departs));
    return Promise.resolve(trains);
  }
}
