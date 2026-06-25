/** Public API of the social-auth pack. */
export { SocialButtons } from './ui/social-buttons';
export { useAppleSignIn, useGoogleSignIn, type SocialAuthResult } from './use-social-auth';
export {
  SocialCredentialSchema,
  SocialProviderSchema,
  type SocialCredential,
  type SocialProvider,
} from './model/schema';
