# Pack: i18n

Lean localization with **no heavy library** and a **per-screen domain-merge** architecture:
a small **base catalog** per locale + **per-screen catalog modules** merged on top, so translation
work splits safely across many screens without one giant file. Device-locale detection, **typed**
`t()` with `{placeholder}` interpolation, **RTL** handling, and a persisted user override.
**Key-free.** Primitive — no route. Client-only, so the manifest's `backends` is `[]`.

## Structure (domain merge)

```
src/
├── locales/
│   ├── en.ts                # BASE catalog — source of truth for the key set (common/auth/greeting)
│   ├── fr.ts                # BASE catalog — typed to match en exactly
│   └── screens/
│       ├── types.ts         # ScreenDomain shape + defineScreenDomain() helper
│       ├── onboarding.ts    # per-screen catalog: { en: {...}, fr: {...} }, keys namespaced onboarding.*
│       ├── settings.ts      # per-screen catalog, keys namespaced settings.*
│       └── index.ts         # SCREEN_DOMAINS registry (the array buildLocale folds)
├── catalogs.ts              # buildLocale(lang) reduces base + all screen domains → one merged catalog
├── i18n.ts                  # deviceLocale(), translate(), isRtl(), applyDirectionForLocale()
├── i18n-provider.tsx        # <I18nProvider> + useTranslation()/useLocale()
└── index.ts                 # barrel
```

`buildLocale(lang)` folds every entry in `SCREEN_DOMAINS` on top of the base catalog for that
locale (`reduce`), producing one merged map. `catalogs` is built once at module load. Because each
screen owns its own file and keys are namespaced (`onboarding.title`, `settings.language`), two
devs can translate two screens **in parallel** with no merge conflicts and no shared giant file.

## What you get

- **Base catalogs** (`locales/en.ts`, `locales/fr.ts`) — `en` is authoritative; `fr` is typed to
  provide the same keys (a missing/typo'd key is a compile error).
- **Per-screen catalogs** (`locales/screens/*.ts`) — each exports `{ en, fr }` via
  `defineScreenDomain`, registered in `SCREEN_DOMAINS`.
- `buildLocale(lang)` + `catalogs` — the merged tables.
- `I18nProvider` + `useTranslation()` / `useLocale()` — `const { t, locale, setLocale } = useLocale()`.
- `i18n.ts` — `deviceLocale()`, `translate()`, `isRtl()`, `applyDirectionForLocale()`.
- `RTL_LOCALES` + `applyDirectionForLocale()` for right-to-left layouts.

## Install

```
/add-feature i18n
npx expo install expo-localization
```

Wire it:

```tsx
// src/app/_layout.tsx
<I18nProvider><Stack /></I18nProvider>

// anywhere
const { t, setLocale } = useLocale();
<AppText>{t('greeting.hello', { name: 'Achraf' })}</AppText>
<AppText>{t('onboarding.title')}</AppText>
<Button label={t('common.save')} onPress={() => setLocale('fr')} />
```

## Add a screen catalog

1. Create `src/locales/screens/<screen>.ts`:
   ```ts
   import { defineScreenDomain } from './types';
   export const profile = defineScreenDomain({
     en: { 'profile.title': 'Profile', 'profile.edit': 'Edit' },
     fr: { 'profile.title': 'Profil', 'profile.edit': 'Modifier' }, // typed to match en
   });
   ```
2. Register it in `src/locales/screens/index.ts` — import it and add to `SCREEN_DOMAINS`.
3. Add it to the `TranslationKey` union in `src/catalogs.ts` (`| keyof typeof profile.en`) so `t()`
   keys stay type-checked.

That's it — `buildLocale()` picks it up. No base-catalog edit, no conflict with other screens.

## Persistence & RTL

The chosen locale is persisted via `@/shared/lib/storage` **appStorage** (non-sensitive) under
`i18n.locale`; `I18nProvider` loads it on init (or falls back to `deviceLocale()`) and the
`setLocale` setter writes it back. Never import AsyncStorage/secure-store directly — that's banned.

**RTL** (e.g. Arabic): add the code to `RTL_LOCALES` and ship its base + screen translations.
`applyDirectionForLocale` flips the native layout via `I18nManager`, which only fully applies after
a reload — call it early and prompt a restart when it returns `true`. If you later need plurals/ICU
at scale, swap the catalog layer for `i18next` behind the same `useLocale` surface.
