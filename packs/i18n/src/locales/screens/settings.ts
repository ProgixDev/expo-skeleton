import { defineScreenDomain } from './types';

/**
 * Per-screen catalog for the settings screen. Keys are namespaced `settings.*`.
 * Add more screens by copying this file — see README's "Add a screen catalog".
 */
export const settings = defineScreenDomain({
  en: {
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.signedInAs': 'Signed in as {email}',
  },
  fr: {
    'settings.title': 'Paramètres',
    'settings.language': 'Langue',
    'settings.theme': 'Thème',
    'settings.signedInAs': 'Connecté en tant que {email}',
  },
});
