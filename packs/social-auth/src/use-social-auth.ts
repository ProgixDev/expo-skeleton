import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { backend, type BackendSession } from '@/shared/lib/backend';
import { env } from '@/shared/lib/env';

import { SocialCredentialSchema, type SocialCredential } from './model/schema';

/**
 * Result envelope. `cancelled` is a first-class, NON-error outcome: the user backing
 * out of the system sheet must never surface as a thrown error or a red toast.
 */
export type SocialAuthResult =
  | { ok: true; session: BackendSession }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

const CANCELLED: SocialAuthResult = { ok: false, cancelled: true };

/**
 * Hand a validated social credential to the BACKEND SEAM. The seam is backbone-agnostic;
 * we do not import `@supabase/supabase-js` here.
 *
 * The two presets resolve this differently:
 *   • presets/backend-supabase → `backend.auth.signInWithIdToken({ provider, token, nonce })`
 *     (thin wrapper over supabase.auth.signInWithIdToken).
 *   • presets/backend-api       → POST /auth/oauth { provider, idToken, nonce } which verifies
 *     the token server-side and returns your own session.
 *
 * `signInWithIdToken` is not yet on the shared `auth` type, so we call it through a
 * narrowed view of `backend.auth`. When the seam adds the method to BackendAuth, drop
 * the cast. Until then both presets must expose `signInWithIdToken` with this signature.
 */
type IdTokenSignIn = (input: {
  provider: SocialCredential['provider'];
  token: string;
  nonce?: string;
}) => Promise<BackendSession>;

async function signInThroughSeam(cred: SocialCredential): Promise<BackendSession> {
  const parsed = SocialCredentialSchema.parse(cred); // validate at the edge
  // why: the shared BackendAuth type omits signInWithIdToken today; each preset provides it.
  const signIn = (backend.auth as unknown as { signInWithIdToken: IdTokenSignIn })
    .signInWithIdToken;
  return signIn({ provider: parsed.provider, token: parsed.idToken, nonce: parsed.nonce });
}

let googleConfigured = false;
function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({
    // Web client id so the returned idToken's audience matches the backend's verifier.
    // On install, add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the EnvSchema in
    // `@/shared/lib/env` (process.env is read only there) so this stays typed.
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  googleConfigured = true;
}

/** Native Apple sign-in (iOS only) → backend seam. */
export function useAppleSignIn() {
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(async (): Promise<SocialAuthResult> => {
    if (Platform.OS !== 'ios') {
      return { ok: false, cancelled: false, error: 'Apple sign-in is iOS-only' };
    }
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        return { ok: false, cancelled: false, error: 'Apple returned no identity token' };
      }
      const session = await signInThroughSeam({
        provider: 'apple',
        idToken: credential.identityToken,
      });
      return { ok: true, session };
    } catch (e) {
      // The user dismissing the Apple sheet throws ERR_REQUEST_CANCELED.
      if (e instanceof Error && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
        return CANCELLED;
      }
      return { ok: false, cancelled: false, error: messageOf(e) };
    } finally {
      setBusy(false);
    }
  }, []);

  return { signIn, busy };
}

/** Native Google sign-in (iOS + Android) → backend seam. */
export function useGoogleSignIn() {
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(async (): Promise<SocialAuthResult> => {
    setBusy(true);
    try {
      ensureGoogleConfigured();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      // v13 returns a discriminated result; a cancel comes back as type 'cancelled'.
      if (response.type === 'cancelled') return CANCELLED;
      const idToken = response.data.idToken;
      if (!idToken) {
        return { ok: false, cancelled: false, error: 'Google returned no idToken' };
      }
      const session = await signInThroughSeam({ provider: 'google', idToken });
      return { ok: true, session };
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return CANCELLED;
      return { ok: false, cancelled: false, error: messageOf(e) };
    } finally {
      setBusy(false);
    }
  }, []);

  return { signIn, busy };
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Sign-in failed';
}
