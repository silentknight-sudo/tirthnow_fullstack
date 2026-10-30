import createClient, { type Client } from 'openapi-fetch';
import type { components, paths } from './schema';

export type { components, paths } from './schema';
export type Schemas = components['schemas'];
export type AuthResult = Schemas['AuthResultResponse'];

/** Error body every API failure uses: `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TokenStore {
  access: () => string | null;
  refresh: () => string | null;
  save: (result: AuthResult) => void;
  clear: () => void;
}

export interface ApiClientOptions {
  /** API origin without `/v1`, e.g. `https://api.tirthnow.in`. */
  baseUrl: string;
  tokens: TokenStore;
  language?: () => string;
  /** Called once when a refresh fails; the store is already cleared. */
  onSessionExpired?: () => void;
}

export type ApiClient = Client<paths> & {
  /** Rotate the refresh token now (e.g. right after creating a vendor, ADR-0014). */
  refreshSession: () => Promise<boolean>;
};

/**
 * openapi-fetch client that adds the bearer token and language, and on a 401
 * performs one shared refresh then retries. Refresh tokens rotate, so two
 * concurrent refreshes would trip reuse detection (ADR-0002).
 */
export function createApiClient(opts: ApiClientOptions): ApiClient {
  let refreshing: Promise<boolean> | null = null;

  const refreshSession = (): Promise<boolean> => {
    refreshing ??= (async () => {
      const token = opts.tokens.refresh();
      if (!token) return false;
      const res = await fetch(`${opts.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) {
        opts.tokens.clear();
        opts.onSessionExpired?.();
        return false;
      }
      opts.tokens.save((await res.json()) as AuthResult);
      return true;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  const send = (request: Request): Promise<Response> => {
    const access = opts.tokens.access();
    if (access) request.headers.set('Authorization', `Bearer ${access}`);
    request.headers.set('Accept-Language', opts.language?.() ?? 'en');
    return fetch(request);
  };

  const authedFetch = async (input: Request): Promise<Response> => {
    const retry = input.clone();
    const res = await send(input);
    const isAuthCall = new URL(input.url).pathname.startsWith('/v1/auth/');
    if (res.status !== 401 || isAuthCall || !opts.tokens.refresh()) return res;
    return (await refreshSession()) ? send(retry) : res;
  };

  const client = createClient<paths>({ baseUrl: opts.baseUrl, fetch: authedFetch });
  client.use({
    async onResponse({ response }) {
      if (response.ok) return undefined;
      const body = (await response
        .clone()
        .json()
        .catch(() => null)) as {
        error?: { code?: string; message?: string; details?: unknown };
      } | null;
      throw new ApiError(
        response.status,
        body?.error?.code ?? 'INTERNAL',
        body?.error?.message ?? response.statusText,
        body?.error?.details,
      );
    },
  });
  return Object.assign(client, { refreshSession });
}

/** New key per user action for endpoints that require `Idempotency-Key`. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
