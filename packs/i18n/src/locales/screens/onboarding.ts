import { defineScreenDomain } from './types';

/**
 * Per-screen catalog for the onboarding flow. Owned by whoever builds that screen;
 * merged on top of the base by `buildLocale()`. Keys are namespaced `onboarding.*`.
 */
export const onboarding = defineScreenDomain({
  en: {
    'onboarding.title': 'Welcome',
    'onboarding.subtitle': 'A quick tour to set things up.',
    'onboarding.cta': 'Get started',
    'onboarding.step': 'Step {current} of {total}',
  },
  fr: {
    'onboarding.title': 'Bienvenue',
    'onboarding.subtitle': 'Un tour rapide pour tout configurer.',
    'onboarding.cta': 'Commencer',
    'onboarding.step': 'Étape {current} sur {total}',
  },
});
