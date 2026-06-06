const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');
const prettierConfig = require('eslint-config-prettier');

/**
 * ESLint flat config.
 *
 * The `boundaries/*` rules ENFORCE the architecture described in
 * docs/architecture/module-boundaries.md. If a rule blocks you, the fix is
 * almost always to move code, not to disable the rule. Changing these rules
 * requires an ADR (docs/architecture/decisions/).
 */
module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'reports/**',
      'expo-env.d.ts',
      '**/._*', // macOS AppleDouble files on exFAT/network volumes
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        {
          type: 'feature',
          mode: 'folder',
          pattern: 'src/features/*',
          capture: ['featureName'],
        },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'global-css', mode: 'file', pattern: 'src/global.css' },
      ],
    },
    rules: {
      // Layering: app → features → shared. Never the other way around.
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message:
            '${file.type} code must not import from ${dependency.type}. See docs/architecture/module-boundaries.md',
          rules: [
            { from: 'app', allow: ['feature', 'shared', 'global-css'] },
            {
              from: 'feature',
              allow: ['shared', ['feature', { featureName: '${from.featureName}' }]],
            },
            { from: 'shared', allow: ['shared'] },
          ],
        },
      ],
      // Features are only consumable through their public API (index.ts).
      'boundaries/entry-point': [
        'error',
        {
          default: 'allow',
          message:
            'Import features through their public API (src/features/<name>/index.ts), not deep paths.',
          rules: [{ target: ['feature'], allow: ['index.ts', 'index.tsx'] }],
        },
      ],
    },
  },
  {
    // Routes must stay thin: no business logic imports beyond feature APIs.
    files: ['src/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@react-navigation/*'],
              message:
                'SDK 56: expo-router no longer sits on react-navigation. Import navigation APIs from expo-router.',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
]);
