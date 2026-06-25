import { type en } from './en';

/**
 * French base catalog — typed to provide EXACTLY the keys in `en`, so a missing or
 * mistyped key is a compile error rather than a raw key shipped to users.
 */
export const fr: Record<keyof typeof en, string> = {
  'common.ok': 'OK',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.retry': 'Réessayer',
  'common.back': 'Retour',
  'common.next': 'Suivant',
  'auth.signIn': 'Se connecter',
  'auth.signOut': 'Se déconnecter',
  'greeting.hello': 'Bonjour, {name}',
};
