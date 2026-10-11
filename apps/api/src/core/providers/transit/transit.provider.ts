export interface TransitStation {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export interface TrainOption {
  number: string;
  name: string;
  fromCode: string;
  toCode: string;
  /** Departure and arrival as IST wall-clock HH:MM, plus day offset of arrival. */
  departs: string;
  arrives: string;
  arrivalDayOffset: number;
  durationMin: number;
  classes: string[];
  /** ISO weekdays the train runs (1 = Monday … 7 = Sunday). */
  runsOn: number[];
  /** Where the traveller completes the booking (IRCTC or a partner). */
  bookingUrl: string;
}

/**
 * Train discovery. Booking stays with IRCTC / an authorised partner (deep links); a real
 * adapter is added once a data partner is chosen (docs/CLIENT_SETUP_TODO.md).
 */
export interface TransitProvider {
  stations(query: string): Promise<TransitStation[]>;
  /** Trains running on `date` (YYYY-MM-DD, IST) between two station codes. */
  search(fromCode: string, toCode: string, date: string): Promise<TrainOption[]>;
}

export const TRANSIT_PROVIDER = Symbol('TRANSIT_PROVIDER');
