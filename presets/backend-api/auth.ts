import {
  AuthError,
  clearTokens,
  getAccessToken,
  http,
  onSessionCleared,
  setTokens,
} from './client';

/**
 * Auth surface — identical shape to the Supabase preset's `auth`, so features
 * are source-compatible. Here WE drive login/logout against REST endpoints and
 * keep an in-process emitter for `onAuthStateChange` (no SDK to lean on).
 */

export type BackendUser = {
  id: string;
  email: string | null;
};

export type BackendSession = {
  user: BackendUser;
  accessToken: string;
  expiresAt: number | null;
};

export type AuthSubscription = { unsubscribe: () => void };

// Shape returned by POST /auth/login and /auth/me.
type LoginResponse = {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
};

// In-memory mirror of the current session for getSession() and emitter payloads.
let current: BackendSession | null = null;

const listeners = new Set<(session: BackendSession | null) => void>();

function emit(session: BackendSession | null): void {
  current = session;
  for (const listener of listeners) listener(session);
}

// A failed refresh (in client.ts) clears tokens — reflect that as a sign-out event.
onSessionCleared(() => emit(null));

export const auth = {
  async signInWithPassword(email: string, password: string): Promise<BackendSession> {
    const data = await http<LoginResponse>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: { email, password },
    });
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const session: BackendSession = {
      user: data.user,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt ?? null,
    };
    emit(session);
    return session;
  },

  /**
   * Native social sign-in — same method the Supabase preset exposes, so the
   * `social-auth` pack is backbone-agnostic. We POST the provider id-token to our
   * own endpoint, which verifies it (JWKS) and mints OUR access/refresh tokens.
   */
  async signInWithIdToken(params: {
    provider: 'apple' | 'google';
    idToken: string;
    nonce?: string;
  }): Promise<BackendSession> {
    const data = await http<LoginResponse>('/auth/oauth', {
      method: 'POST',
      skipAuth: true,
      body: params,
    });
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const session: BackendSession = {
      user: data.user,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt ?? null,
    };
    emit(session);
    return session;
  },

  /** Create an account. Returns null when the API requires email confirmation. */
  async signUp(email: string, password: string): Promise<BackendSession | null> {
    const data = await http<LoginResponse | null>('/auth/signup', {
      method: 'POST',
      skipAuth: true,
      body: { email, password },
    });
    if (!data) return null; // confirmation pending — no session yet
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const session: BackendSession = {
      user: data.user,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt ?? null,
    };
    emit(session);
    return session;
  },

  async signOut(): Promise<void> {
    // Best-effort server-side revocation; local clear is what matters.
    try {
      await http<void>('/auth/logout', { method: 'POST' });
    } catch {
      // ignore — the token may already be invalid; we clear locally regardless.
    }
    await clearTokens(); // emits null via onSessionCleared
  },

  /** Permanently delete the account + cascaded data, then clear locally. */
  async deleteAccount(): Promise<void> {
    await http<void>('/auth/me', { method: 'DELETE' });
    await clearTokens(); // emits null via onSessionCleared
  },

  async getSession(): Promise<BackendSession | null> {
    if (current) return current;
    // No in-memory session but a refresh token may exist; let a guarded call hydrate.
    if (!getAccessToken()) {
      try {
        return await this.getUser().then((user) =>
          user ? ({ user, accessToken: getAccessToken() ?? '', expiresAt: null } as BackendSession) : null,
        );
      } catch {
        return null;
      }
    }
    return current;
  },

  async getUser(): Promise<BackendUser | null> {
    try {
      const user = await http<BackendUser>('/auth/me');
      return user;
    } catch (error) {
      if (error instanceof AuthError) return null; // no/expired session is normal
      throw error;
    }
  },

  onAuthStateChange(handler: (session: BackendSession | null) => void): AuthSubscription {
    listeners.add(handler);
    return { unsubscribe: () => listeners.delete(handler) };
  },
} as const;

export type BackendAuth = typeof auth;
