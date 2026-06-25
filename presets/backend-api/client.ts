import { env } from '@/shared/lib/env';
import { secureStorage } from '@/shared/lib/storage';

/**
 * Refresh-aware HTTP client for the custom-API backbone.
 *
 * Unlike the Supabase preset, WE own the token lifecycle here:
 * - Access token lives in memory (never persisted — it's short-lived).
 * - Refresh token is persisted via `secureStorage` (Keychain/Keystore).
 * - On a 401 we run a SINGLE in-flight refresh; concurrent requests queue on it,
 *   then retry once with the rotated access token (the classic "only one refresh,
 *   others wait" pattern). On refresh failure we clear the session and surface an
 *   auth error so the UI can route to login.
 *
 * Env vars consumed (must be added to `src/shared/lib/env.ts` on activation —
 * see README): `EXPO_PUBLIC_API_URL`.
 */

const REFRESH_TOKEN_KEY = 'backend.api.refreshToken';
const BASE_URL = env.EXPO_PUBLIC_API_URL;

/** Generic, backbone-agnostic error (mirrors the supabase preset's BackendError). */
export class BackendError extends Error {
  readonly code: string | null;
  readonly status: number | null;
  readonly details: string | null;

  constructor(message: string, opts: { code?: string; status?: number; details?: string } = {}) {
    super(message);
    this.name = 'BackendError';
    this.code = opts.code ?? null;
    this.status = opts.status ?? null;
    this.details = opts.details ?? null;
  }
}

/** Raised when refresh fails (or there is no session); callers route to login. */
export class AuthError extends BackendError {
  constructor(message = 'Session expired') {
    super(message, { code: 'auth/session-expired', status: 401 });
    this.name = 'AuthError';
  }
}

type Tokens = { accessToken: string; refreshToken: string };

// Access token is in-memory only.
let accessToken: string | null = null;
// A single shared refresh promise; concurrent 401s await this, they don't spawn more.
let refreshing: Promise<string> | null = null;
// Notified when the session is cleared (refresh failed / signOut), so auth.ts can emit.
const sessionClearedListeners = new Set<() => void>();

export function onSessionCleared(listener: () => void): () => void {
  sessionClearedListeners.add(listener);
  return () => sessionClearedListeners.delete(listener);
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Persist a fresh token pair (called by auth.signInWithPassword and on rotation). */
export async function setTokens(tokens: Tokens): Promise<void> {
  accessToken = tokens.accessToken;
  await secureStorage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/** Wipe the session from memory and the Keychain, then notify listeners. */
export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshing = null;
  await secureStorage.remove(REFRESH_TOKEN_KEY);
  for (const listener of sessionClearedListeners) listener();
}

export async function getRefreshToken(): Promise<string | null> {
  return secureStorage.get(REFRESH_TOKEN_KEY);
}

function url(path: string): string {
  return path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Run the refresh exactly once. The first caller does the network round-trip and
 * stores the promise in `refreshing`; everyone else awaits the same promise.
 */
function refreshAccessToken(): Promise<string> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new AuthError('No refresh token');

    const res = await fetch(url('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh is dead — clear the session and force re-login.
      await clearTokens();
      throw new AuthError();
    }

    // Server ROTATES both tokens; persist the new pair.
    const data = (await res.json()) as Tokens;
    await setTokens(data);
    return data.accessToken;
  })().finally(() => {
    // Release the lock whether refresh succeeded or failed.
    refreshing = null;
  });

  return refreshing;
}

type RequestOptions = {
  method?: string;
  // why: request bodies are arbitrary JSON-serialisable shapes; the caller types the response.
  body?: unknown;
  headers?: Record<string, string>;
  // Skip the auth header + refresh dance (used by /auth/login and /auth/refresh).
  skipAuth?: boolean;
  signal?: AbortSignal;
};

async function execute(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers };
  const isForm = options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token && !options.skipAuth) headers.Authorization = `Bearer ${token}`;

  return fetch(url(path), {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body:
      options.body === undefined
        ? undefined
        : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    signal: options.signal,
  });
}

/**
 * The one network entry point. Attaches the access token, and on a 401 from an
 * authed request, refreshes once (queuing concurrent callers) and retries a
 * single time before giving up with an `AuthError`.
 */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await execute(path, options, accessToken);

  if (res.status === 401 && !options.skipAuth) {
    const fresh = await refreshAccessToken(); // shared in-flight refresh
    res = await execute(path, options, fresh); // retry once with rotated token
  }

  if (!res.ok) {
    const body = await safeJson(res);
    throw new BackendError(body?.message ?? `Request failed (${res.status})`, {
      status: res.status,
      code: body?.code,
      details: body?.details,
    });
  }

  // 204 No Content and empty bodies resolve to undefined-as-T.
  if (res.status === 204) return undefined as T;
  return (await safeJson(res)) as T;
}

// why: server error envelopes are untyped JSON; we read a few optional fields off it.
async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
