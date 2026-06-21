import { onboarding } from './onboarding';
import { settings } from './settings';
import { type ScreenDomain } from './types';

/**
 * The registry of every per-screen catalog. To add a new screen's strings:
 *   1. create `./<screen>.ts` exporting a `defineScreenDomain({ en, fr })`,
 *   2. import it here and add it to this array.
 * `buildLocale()` folds them all on top of the base catalog. No giant file, and
 * two screens can be translated in parallel without touching each other.
 */
export const SCREEN_DOMAINS: ScreenDomain[] = [onboarding, settings];

export { onboarding, settings };
export { defineScreenDomain, type ScreenDomain } from './types';
