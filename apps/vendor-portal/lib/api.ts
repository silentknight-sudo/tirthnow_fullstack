import { type AuthResult, type TokenStore, ApiError, createApiClient } from '@tirth-now/api-client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const KEY = 'tn.vendor.session';

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

/** Presigned upload: ask the API for a URL, PUT the file, mark it complete. */
export async function uploadFile(
  file: File,
  purpose: 'kyc_document' | 'listing_image' | 'menu_image',
): Promise<string> {
  const res = await api.POST('/v1/files/presign', {
    body: { purpose, mimeType: file.type, sizeBytes: file.size },
  });
  // The presign response is not described in the OpenAPI document.
  const presign = res.data as unknown as {
    mediaId: string;
    uploadUrl: string;
    headers?: Record<string, string>;
  };
  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.headers ?? { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) throw new ApiError(put.status, 'UPLOAD_FAILED', 'Upload failed');
  await api.POST('/v1/files/{id}/complete', { params: { path: { id: presign.mediaId } } });
  return presign.mediaId;
}
