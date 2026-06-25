import { z } from 'zod';

/**
 * The social credential payload handed from a native provider to the backend seam.
 * Validated at the edge before it ever reaches `backend.auth` — the idToken is what
 * the backbone verifies server-side (Supabase or your API), so it must be present.
 */
export const SocialProviderSchema = z.enum(['apple', 'google']);
export type SocialProvider = z.infer<typeof SocialProviderSchema>;

export const SocialCredentialSchema = z.object({
  provider: SocialProviderSchema,
  /** OIDC ID token (JWT) returned by the native SDK. Verified by the backend. */
  idToken: z.string().min(1, 'Missing idToken from the provider'),
  /**
   * Raw nonce, when the flow used one (Apple recommends it; Supabase's
   * signInWithIdToken accepts it). The native SDK is given the SHA-256 hash; the
   * backend receives the RAW nonce to compare against the token's hashed claim.
   */
  nonce: z.string().min(1).optional(),
});
export type SocialCredential = z.infer<typeof SocialCredentialSchema>;
