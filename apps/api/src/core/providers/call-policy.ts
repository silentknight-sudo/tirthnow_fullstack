import { setTimeout as sleep } from 'node:timers/promises';

export interface CallPolicy {
  /** Per-attempt timeout. */
  timeoutMs: number;
  /** Extra attempts after the first (only for errors `isRetryable` accepts). */
  retries: number;
  baseDelayMs: number;
  isRetryable: (err: unknown) => boolean;
}

export class ProviderTimeoutError extends Error {
  constructor(provider: string, ms: number) {
    super(`${provider} did not respond within ${ms} ms`);
    this.name = 'ProviderTimeoutError';
  }
}

const NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
]);

export function isTransientError(err: unknown): boolean {
  if (err instanceof ProviderTimeoutError) return true;
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; status?: unknown; statusCode?: unknown };
  if (typeof e.code === 'string' && NETWORK_CODES.has(e.code)) return true;
  const status = typeof e.status === 'number' ? e.status : e.statusCode;
  return typeof status === 'number' && (status === 429 || status >= 500);
}

export const DEFAULT_CALL_POLICY: CallPolicy = {
  timeoutMs: 10_000,
  retries: 3,
  baseDelayMs: 200,
  isRetryable: isTransientError,
};

async function withTimeout<T>(provider: string, ms: number, fn: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderTimeoutError(provider, ms));
    }, ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a provider call with timeout + exponential backoff with full jitter (ADR-0003).
 * Only use retries for idempotent calls or calls carrying a provider idempotency key.
 */
export async function callWithPolicy<T>(
  provider: string,
  fn: () => Promise<T>,
  policy: Partial<CallPolicy> = {},
): Promise<T> {
  const p = { ...DEFAULT_CALL_POLICY, ...policy };
  for (let attempt = 0; ; attempt++) {
    try {
      return await withTimeout(provider, p.timeoutMs, fn);
    } catch (err) {
      if (attempt >= p.retries || !p.isRetryable(err)) throw err;
      const cap = p.baseDelayMs * 2 ** attempt;
      await sleep(Math.floor(Math.random() * cap));
    }
  }
}
