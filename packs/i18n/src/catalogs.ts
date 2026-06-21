/**
 * Domain-merge catalogs.
 *
 * A locale's full catalog is built by folding every per-screen domain
 * (`src/locales/screens/*`) ON TOP of the small base catalog (`src/locales/{en,fr}`).
 * This keeps each screen's strings in its own file — translation work splits across
 * screens safely, no single giant catalog, no merge conflicts.
 *
 * `en` is the source of truth for the KEY SET; `buildLocale('en')` yields the
 * canonical catalog every other locale is measured against.
 */
import { en as baseEn } from './locales/en';
import { fr as baseFr } from './locales/fr';
import { onboarding, settings, SCREEN_DOMAINS } from './locales/screens';

/** Supported locale codes. Add a code here + a base catalog + screen translations. */
export const LOCALE_CODES = ['en', 'fr'] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

const BASE: Record<LocaleCode, Record<string, string>> = {
  en: baseEn,
  fr: baseFr,
};

/**
 * Reduce the base catalog + all screen domains into one merged catalog for `lang`.
 * Later domains win on key collision, but keys are namespaced so collisions
 * shouldn't happen in practice.
 */
export function buildLocale(lang: LocaleCode): Record<string, string> {
  return SCREEN_DOMAINS.reduce<Record<string, string>>(
    (acc, domain) => ({ ...acc, ...domain[lang] }),
    { ...BASE[lang] },
  );
}

/** All merged catalogs, built once at module load. */
export const catalogs: Record<LocaleCode, Record<string, string>> = Object.fromEntries(
  LOCALE_CODES.map((code) => [code, buildLocale(code)]),
) as Record<LocaleCode, Record<string, string>>;

/**
 * Every translation key, as a literal union — composed from the base `en` plus each
 * screen domain's `en` keys. Add a screen here too so `t()` keys stay type-checked.
 */
export type TranslationKey =
  | keyof typeof baseEn
  | keyof typeof onboarding.en
  | keyof typeof settings.en;

/** A fully-merged catalog (key → string). */
export type Catalog = Record<TranslationKey, string>;

/** Locales that render right-to-left. Extend when you add an RTL language. */
export const RTL_LOCALES: LocaleCode[] = [];
