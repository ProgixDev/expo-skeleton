/**
 * Base catalog — English is the source of truth.
 *
 * This holds only **cross-app** strings (common actions, auth, greetings). Per-screen
 * copy lives in `src/locales/screens/*.ts` and is merged ON TOP of this base by
 * `buildLocale()`. Keeping the base small lets translation work be split safely
 * across many screens without one giant file (and without merge conflicts).
 *
 * Use {name}-style placeholders; t() interpolates them.
 */
export const en = {
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.next': 'Next',
  'auth.signIn': 'Sign in',
  'auth.signOut': 'Sign out',
  'greeting.hello': 'Hello, {name}',
} as const;

/** Keys present in the BASE catalog. The full key union also includes screen keys. */
export type BaseKey = keyof typeof en;
