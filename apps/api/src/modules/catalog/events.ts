export const CATALOG_EVENTS = {
  /** Aarti schedules of a temple were created, changed or removed. */
  aartiChanged: 'catalog.aarti_changed',
} as const;

export interface AartiChangedEvent {
  templeId: string;
}
