import { create } from 'zustand';

import { backend, type BackendSession } from '@/shared/lib/backend';

import { CredentialsSchema } from './schema';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

type Result = { ok: true } | { ok: false; error: string };

type AuthState = {
  status: Status;
  session: BackendSession | null;
  error: string | null;
  /** Load the current session and subscribe to changes. Returns an unsubscribe. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  /** Permanently delete the account + all its data (store-compliance requirement). */
  deleteAccount: () => Promise<Result>;
};

function statusFor(session: BackendSession | null): Status {
  return session ? 'authenticated' : 'unauthenticated';
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  session: null,
  error: null,

  // Goes through the backbone seam (@/shared/lib/backend) — never the SDK — so the
  // whole auth feature works unchanged on either backbone (Supabase / custom API).
  init: () => {
    void backend.auth.getSession().then((session) => {
      set({ session, status: statusFor(session) });
    });
    const sub = backend.auth.onAuthStateChange((session) => {
      set({ session, status: statusFor(session) });
    });
    return () => sub.unsubscribe();
  },

  signIn: async (email, password) => {
    const parsed = CredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid credentials';
      set({ error });
      return { ok: false, error };
    }
    set({ error: null });
    try {
      await backend.auth.signInWithPassword(parsed.data.email, parsed.data.password);
      return { ok: true };
    } catch (error) {
      const message = messageFor(error, 'Sign-in failed');
      set({ error: message });
      return { ok: false, error: message };
    }
  },

  signUp: async (email, password) => {
    const parsed = CredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid credentials';
      set({ error });
      return { ok: false, error };
    }
    set({ error: null });
    try {
      await backend.auth.signUp(parsed.data.email, parsed.data.password);
      return { ok: true };
    } catch (error) {
      const message = messageFor(error, 'Sign-up failed');
      set({ error: message });
      return { ok: false, error: message };
    }
  },

  signOut: async () => {
    // The seam clears the LargeSecureStore session via the backbone's storage adapter.
    await backend.auth.signOut();
    set({ session: null, status: 'unauthenticated', error: null });
  },

  deleteAccount: async () => {
    try {
      await backend.auth.deleteAccount();
      set({ session: null, status: 'unauthenticated', error: null });
      return { ok: true };
    } catch (error) {
      const message = messageFor(error, 'Account deletion failed');
      set({ error: message });
      return { ok: false, error: message };
    }
  },
}));

export const selectIsAuthenticated = (s: AuthState): boolean => s.status === 'authenticated';
