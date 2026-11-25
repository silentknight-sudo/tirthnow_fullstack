import { type AuthResult, type TokenStore, ApiError, createApiClient } from '@tirth-now/api-client';

/** Only the origin: a value pasted with a path (".../v1/auth/...") still works. */
function origin(url: string): string {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim().replace(/\/+$/, '');
  }
}

export const API_BASE_URL = origin(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000');

const KEY = 'tn.admin.session';

interface Stored {
  accessToken: string;
  refreshToken: string;
  user: AuthResult['user'];
}

let cachedRaw: string | null = null;
let cached: Stored | null = null;

/** Parsed once per change so React's useSyncExternalStore sees a stable snapshot. */
function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = raw ? (JSON.parse(raw) as Stored) : null;
    }
    return cached;
  } catch {
    return null;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Tokens live in localStorage so a reload keeps the session (ADR-0019).
 * The API returns them in the body; there is no cookie session to use instead.
 */
export const tokens: TokenStore & {
  user: () => AuthResult['user'] | null;
  subscribe: (l: Listener) => () => void;
} = {
  access: () => read()?.accessToken ?? null,
  refresh: () => read()?.refreshToken ?? null,
  user: () => read()?.user ?? null,
  save: (result) => {
    const stored: Stored = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
    localStorage.setItem(KEY, JSON.stringify(stored));
    listeners.forEach((l) => {
      l();
    });
  },
  clear: () => {
    localStorage.removeItem(KEY);
    listeners.forEach((l) => {
      l();
    });
  },
  subscribe: (l) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const api = createApiClient({ baseUrl: API_BASE_URL, tokens });

/** Unwrap an openapi-fetch result; errors are thrown by the client middleware. */
export function must<T>(result: { data?: T }): T {
  if (result.data === undefined) throw new ApiError(500, 'INTERNAL', 'Empty response');
  return result.data;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // Validation errors list each field; show them so the form can be fixed.
    if (err.code === 'VALIDATION_FAILED' && Array.isArray(err.details)) {
      const lines = (err.details as { errors?: unknown }[])
        .flatMap((d): unknown[] => (Array.isArray(d.errors) ? (d.errors as unknown[]) : []))
        .filter((e): e is string => typeof e === 'string');
      if (lines.length > 0) return lines.join('; ');
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

/** Cast an untyped admin response (not described in the OpenAPI document) to its local shape. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller names the shape
export function as<T>(result: { data?: unknown }): T {
  if (result.data === undefined) throw new ApiError(500, 'INTERNAL', 'Empty response');
  return result.data as T;
}

/** The panel is for platform staff only. */
export function isAdmin(roles: readonly string[] | undefined): boolean {
  return (roles ?? []).some((r) => r === 'admin' || r === 'super_admin');
}

/** Payment, refund, cancel, payout and broadcast actions need a fresh key per click. */
export function idem(): { 'Idempotency-Key': string; 'idempotency-key': string } {
  const key = crypto.randomUUID();
  return { 'Idempotency-Key': key, 'idempotency-key': key };
}
