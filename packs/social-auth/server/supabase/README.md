# social-auth — Supabase backbone setup (no SQL)

When the app runs on the **Supabase preset** (`presets/backend-supabase`), the client obtains the
native idToken and calls `backend.auth.signInWithIdToken({ provider, token, nonce })`, which wraps
`supabase.auth.signInWithIdToken({ provider, token, nonce })`. Supabase verifies the token and
creates/links the user. **No migration, no SQL, no Edge Function** — it's all dashboard config.

## Enable Apple

1. Supabase dashboard → **Authentication → Providers → Apple** → enable.
2. Fill in (from the Apple Developer portal):
   - **Client IDs**: your app's bundle id (the `aud` of the native idToken). You can list several,
     comma-separated, for native + web.
   - **Secret Key (for OAuth)**: only needed for the web/redirect OAuth flow; the **native** flow
     (this pack) verifies the idToken directly, so the bundle id in _Client IDs_ is the key part.
3. Save. That's it for native Apple sign-in.

## Enable Google

1. Google Cloud → **APIs & Services → Credentials** → create OAuth client ids:
   - a **Web** client id (this is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, used as `webClientId`),
   - an **iOS** client id, and an **Android** client id (with the SHA-1 of your signing key).
2. Supabase dashboard → **Authentication → Providers → Google** → enable.
3. Paste the **Web client id** into _Client IDs_ (Supabase accepts a comma-separated list — add the
   iOS/Android client ids too so their idTokens pass audience checks).
4. Toggle **"Skip nonce checks"** OFF; the native SDKs don't send a nonce for Google, so the default
   is fine. (Apple's idToken nonce, when used, is forwarded as `nonce`.)

## Verify

Run a dev build (not Expo Go), tap a button, and confirm a row appears in **Authentication → Users**
with the matching provider. The client's `onAuthStateChange` fires and the session is persisted by
the seam's storage adapter (`LargeSecureStore`).
