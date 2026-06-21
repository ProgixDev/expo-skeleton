/**
 * Shape every per-screen catalog module exports: one flat string map per supported
 * locale. Namespace keys with the screen name (e.g. `onboarding.title`) so domains
 * never collide when merged into the base by `buildLocale()`.
 *
 *   // src/locales/screens/<screen>.ts
 *   export const myScreen: ScreenDomain = {
 *     en: { 'myScreen.title': '…' },
 *     fr: { 'myScreen.title': '…' },
 *   };
 *
 * `en` is authoritative; `fr` is typed to provide the same keys (compile error if not).
 */
export type ScreenDomain = {
  en: Record<string, string>;
  fr: Record<string, string>;
};

/** Helper that infers the en key union of a domain while enforcing fr parity. */
export function defineScreenDomain<const T extends Record<string, string>>(domain: {
  en: T;
  fr: Record<keyof T, string>;
}): { en: T; fr: Record<keyof T, string> } {
  return domain;
}
