/** Every BullMQ queue (ARCHITECTURE.md §8). Job names are `<verb>-<noun>`. */
export const QUEUES = {
  sos: 'sos',
  notifications: 'notifications',
  payments: 'payments',
  payouts: 'payouts',
  orders: 'orders',
  media: 'media',
  ai: 'ai',
  maintenance: 'maintenance',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Default retry policy; queues override per ARCHITECTURE.md §8. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 86_400, count: 1_000 },
  removeOnFail: { age: 7 * 86_400 },
} as const;
