import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../supabase';

/**
 * Backbone-agnostic auth surface. Features depend on THESE types, never on
 * `@supabase/supabase-js` — so the custom-API preset (presets/backend-api) can
 * present the same shape and features stay source-compatible.
 */
export type BackendUser = {
  id: string;
  email: string | null;
};

export type BackendSession = {
  user: BackendUser;
  accessToken: string;
  // Epoch seconds; null when the backbone does not expose an expiry.
  expiresAt: number | null;
};

/** Unsubscribe handle returned by `onAuthStateChange`. */
export type AuthSubscription = { unsubscribe: () => void };

function toUser(user: User): BackendUser {
  return { id: user.id, email: user.email ?? null };
}

function toSession(session: Session | null): BackendSession | null {
  if (!session) return null;
  return {
    user: toUser(session.user),
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
  };
}

export const auth = {
  async signInWithPassword(email: string, password: string): Promise<BackendSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // supabase returns a session on success; the cast-free path is to assert non-null.
    return toSession(data.session)!;
  },

  /**
   * Native social sign-in: exchange a provider id-token (Apple/Google) for a
   * session. Used by the `social-auth` pack. The custom-API preset implements the
   * same method by POSTing the id-token to `/auth/oauth` (it verifies + mints its
   * own tokens), so the pack stays backbone-agnostic.
   */
  async signInWithIdToken(params: {
    provider: 'apple' | 'google';
    idToken: string;
    nonce?: string;
  }): Promise<BackendSession> {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: params.provider,
      token: params.idToken,
      nonce: params.nonce,
    });
    if (error) throw error;
    return toSession(data.session)!;
  },

  /**
   * Create an account. Returns the session, or null when the backbone requires
   * email confirmation before a session exists.
   */
  async signUp(email: string, password: string): Promise<BackendSession | null> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return toSession(data.session);
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Permanently delete the account + cascaded data (store-compliance). On the
   * BaaS backbone an Edge Function validates the JWT and deletes server-side; the
   * custom-API preset hits `DELETE /auth/me`. Signs out locally afterwards.
   */
  async deleteAccount(): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw error;
    await supabase.auth.signOut();
  },

  async getSession(): Promise<BackendSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return toSession(data.session);
  },

  async getUser(): Promise<BackendUser | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null; // No (or expired) session is a normal, non-throwing state.
    return data.user ? toUser(data.user) : null;
  },

  onAuthStateChange(handler: (session: BackendSession | null) => void): AuthSubscription {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handler(toSession(session));
    });
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },
} as const;

export type BackendAuth = typeof auth;
