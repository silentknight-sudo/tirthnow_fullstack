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

export class ProviderUnavailableError extends Error {
  constructor(provider: string) {
    super(`${provider} is temporarily unavailable (circuit open)`);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Per-provider circuit breaker: after `failureThreshold` consecutive transient failures the
 * circuit opens for `cooldownMs`; calls fail fast with ProviderUnavailableError meanwhile.
 * One trial call is let through after the cooldown (half-open).
 */
interface CircuitState {
  failures: number;
  openUntil: number;
}
const circuits = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

function circuitFor(provider: string): CircuitState {
  let state = circuits.get(provider);
  if (!state) {
    state = { failures: 0, openUntil: 0 };
    circuits.set(provider, state);
  }
  return state;
}

/** Test helper. */
export function resetCircuits(): void {
  circuits.clear();
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
  const circuit = circuitFor(provider);
  if (circuit.openUntil > Date.now()) throw new ProviderUnavailableError(provider);
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await withTimeout(provider, p.timeoutMs, fn);
      circuit.failures = 0;
      return result;
    } catch (err) {
      const transient = p.isRetryable(err);
      if (transient) {
        circuit.failures++;
        if (circuit.failures >= FAILURE_THRESHOLD) {
          circuit.openUntil = Date.now() + COOLDOWN_MS;
          circuit.failures = 0;
          throw new ProviderUnavailableError(provider);
        }
      }
      if (attempt >= p.retries || !transient) throw err;
      const cap = p.baseDelayMs * 2 ** attempt;
      await sleep(Math.floor(Math.random() * cap));
    }
  }
}
