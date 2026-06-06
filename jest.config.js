/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4: worklets ship a resolver that swaps native entry points
  // for mockable ones under Jest (official setup for RN 0.85 / Reanimated 4).
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Test files live in __tests__ folders next to the code they test —
  // never inside src/app (Expo Router treats those as routes).
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|expo-modules-core|react-native-css-interop|nativewind|@react-native-async-storage/.*|react-native-.*|zustand)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**',
    '!src/shared/testing/**',
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      statements: 60,
    },
  },
  clearMocks: true,
};
