import { logger } from '@/shared/lib/logger';

/**
 * Crash-reporter seam.
 *
 * A thin, transport-agnostic interface so feature code never imports a vendor
 * SDK directly. The default export is a DEV no-op; the real Sentry transport is
 * swapped in later (see NOTE below) without touching call sites.
 *
 * Context values are constrained to privacy-safe primitives — no nested objects,
 * no PII blobs. The repo logger already redacts token-shaped strings, but keep
 * context tags coarse (ids, flags, counts), never raw user data.
 */
export type CrashContext = Record<string, string | number | boolean | null>;

export interface CrashReporter {
  /** Report a caught error with optional structured context tags. */
  captureException(error: unknown, context?: CrashContext): void;
  /** Report a noteworthy non-error event (e.g. an unexpected-but-handled state). */
  captureMessage(message: string, context?: CrashContext): void;
  /** Associate subsequent reports with a user id, or `null` to clear on sign-out. */
  setUser(userId: string | null): void;
}

/**
 * Default DEV no-op implementation: logs in `__DEV__`, silent in production.
 *
 * NOTE: to wire @sentry/react-native, install it, call `Sentry.init({ dsn })`
 * in `app/_layout.tsx`, then replace the bodies below:
 *   captureException → Sentry.captureException(error, { extra: context })
 *   captureMessage   → Sentry.captureMessage(message, { extra: context })
 *   setUser          → Sentry.setUser(userId ? { id: userId } : null)
 * Keep this same `CrashReporter` shape so no call site changes.
 */
export const crashReporter: CrashReporter = {
  captureException(error: unknown, context?: CrashContext): void {
    if (__DEV__) logger.error('[crash] captureException', error, context);
  },
  captureMessage(message: string, context?: CrashContext): void {
    if (__DEV__) logger.warn('[crash] captureMessage', message, context);
  },
  setUser(userId: string | null): void {
    if (__DEV__) logger.info('[crash] setUser', userId);
  },
};
