import { logger } from '@/shared/lib/logger';

/**
 * Typed product analytics.
 *
 * The default transport is a NO-OP that logs in `__DEV__` and is silent in
 * production. The PostHog transport pack swaps the real sink in by replacing
 * `transport` below — call sites never change.
 *
 * Privacy contract: prop values are constrained at the type level to
 * privacy-safe primitives (`string | number | boolean | null`). This keeps PII
 * blobs and nested objects out by construction; `sanitize()` is a runtime
 * backstop for untyped/`any`-typed callers crossing the boundary.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export interface AnalyticsTransport {
  track(event: string, props?: AnalyticsProps): void;
  screen(name: string, props?: AnalyticsProps): void;
  identify(id: string | null): void;
}

const PRIMITIVE = new Set(['string', 'number', 'boolean']);

/**
 * Runtime backstop: drop any prop whose value isn't a privacy-safe primitive
 * (or `null`). Defends against `any`-typed callers that slip a nested object,
 * array, function, or `undefined` past the compile-time type.
 */
export function sanitize(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (props === undefined) return undefined;
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || PRIMITIVE.has(typeof value)) out[key] = value;
  }
  return out;
}

/**
 * Default NO-OP sink. Replace this binding with the PostHog transport to ship
 * real events; everything goes through `sanitize()` first regardless of sink.
 */
const transport: AnalyticsTransport = {
  track(event: string, props?: AnalyticsProps): void {
    if (__DEV__) logger.info('[analytics] track', event, props);
  },
  screen(name: string, props?: AnalyticsProps): void {
    if (__DEV__) logger.info('[analytics] screen', name, props);
  },
  identify(id: string | null): void {
    if (__DEV__) logger.info('[analytics] identify', id);
  },
};

export const analytics = {
  track(event: string, props?: AnalyticsProps): void {
    transport.track(event, sanitize(props));
  },
  screen(name: string, props?: AnalyticsProps): void {
    transport.screen(name, sanitize(props));
  },
  identify(id: string | null): void {
    transport.identify(id);
  },
} as const;
