/**
 * Observability — the crash-reporting seam.
 *
 * Import `crashReporter` everywhere you'd otherwise reach for a vendor SDK; the
 * concrete transport (Sentry) is swapped behind this interface.
 */
export { crashReporter, type CrashReporter, type CrashContext } from './crash-reporter';
