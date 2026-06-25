# Pack: social-auth

Native **Apple** + **Google** sign-in that goes **through the backend seam** — never around it. The
client obtains the native OIDC credential and hands the `idToken` to `backend.auth`; the backbone
verifies it server-side. Works on **both backbones** with the same app code.

## What it does

- `useAppleSignIn()` / `useGoogleSignIn()` — call the native SDK, get the `idToken`, validate it with
  Zod (`SocialCredentialSchema`), then call `backend.auth.signInWithIdToken({ provider, token, nonce })`.
- **User-cancel is graceful**: dismissing the system sheet returns `{ ok: false, cancelled: true }`,
  never a thrown error or an error toast.
- `SocialButtons` — minimal placeholder UI (Apple iOS-only guard, Google everywhere), shared `Button`
  primitive, testIDs `social-auth-apple` / `social-auth-google`. `// DESIGN: replace after Claude Design`.

The hook calls `signInWithIdToken` on the seam. It is not yet on the shared `BackendAuth` type, so
the call is made through a narrowed view with a `// why:` comment — **each preset must expose it**:

- **Supabase preset** → wraps `supabase.auth.signInWithIdToken({ provider, token, nonce })`.
- **Custom-API preset** → POSTs `/auth/oauth { provider, idToken, nonce }`; the server verifies the
  token and issues your own session.

When the seam adds the method to `BackendAuth`, drop the cast.

## Two-backbone setup

Pick the backbone your app runs on and configure the provider there:

| Backbone   | Where the idToken is verified     | Setup doc                   |
| ---------- | --------------------------------- | --------------------------- |
| Supabase   | `supabase.auth.signInWithIdToken` | `server/supabase/README.md` |
| Custom API | your `POST /auth/oauth` handler   | `server/api/routes.md`      |

## Keys to ship

- **`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`** — Google OAuth **Web** client id (public; identifies, does
  not authorize). On install, add it to the `EnvSchema` in `@/shared/lib/env` (the only place
  `process.env` is read). Also create **iOS** and **Android** OAuth client ids in Google Cloud.
- **Apple**: no client key in the app — enable the **Sign In with Apple** entitlement on the iOS
  target (`app.json` `ios.usesAppleSignUp` / the `expo-apple-authentication` config plugin; never
  edit `ios/` by hand). Register the Service ID / bundle id in the Apple Developer portal.

## Install

```
/add-feature social-auth
npx expo install expo-apple-authentication @react-native-google-signin/google-signin
```

Both native modules need a **dev build** (not Expo Go). Then drop `<SocialButtons />` onto your auth
screen, configure the provider on your backbone (docs above), and replace the placeholder UI after
the design pass.

## Security notes

- Secrets stay server-side; the client only ever holds the public web client id and the short-lived
  idToken. The session that comes back is persisted by the seam (`LargeSecureStore`), not by this pack.
- The server is the verifier — it must check signature, `iss`, `aud`, `exp` (and Apple's hashed
  `nonce`) and never trust a client-asserted identity. See `server/api/routes.md`.
