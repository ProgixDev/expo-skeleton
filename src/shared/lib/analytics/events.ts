/**
 * Typed event helpers — the analytics contract.
 *
 * Each helper FIXES one event name and one privacy-safe prop shape, so events
 * are spelled and typed identically everywhere they fire. This is the contract
 * pattern: call `screenViewed({ name })`, never `analytics.track('screen', …)`
 * with a free-form string.
 *
 * Apps EXTEND this file with their own funnel events (checkout_started,
 * paywall_viewed, …). Hard rule: prop shapes here must only ever carry
 * privacy-safe primitives — NEVER free text, message bodies, emails, or any PII.
 * If you're tempted to pass user content, pass an id or a flag instead.
 */
import { analytics } from './index';

/** A screen/route became visible. */
export function screenViewed(props: { name: string }): void {
  analytics.screen(props.name);
}

/** App returned to the foreground; whether a session was already active. */
export function appResumed(props: { hadActiveSession: boolean }): void {
  analytics.track('app_resumed', { hadActiveSession: props.hadActiveSession });
}

/** A user signed in; `method` is a fixed enum, never a raw identifier. */
export function signedIn(props: { method: 'password' | 'oauth' | 'magic_link' }): void {
  analytics.track('signed_in', { method: props.method });
}
