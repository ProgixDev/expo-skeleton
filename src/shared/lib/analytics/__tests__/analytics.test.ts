import { logger } from '@/shared/lib/logger';

import { analytics, sanitize, type AnalyticsProps } from '../index';

describe('analytics', () => {
  it('forwards track to the (DEV) transport with the event name', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);

    analytics.track('signed_in', { method: 'oauth' });

    expect(spy).toHaveBeenCalledWith('[analytics] track', 'signed_in', { method: 'oauth' });
    spy.mockRestore();
  });

  it('runs props through sanitize before forwarding', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);

    // why: deliberately smuggle a non-primitive past the type to prove the backstop strips it
    const dirty = { keepMe: 1, drop: { nested: true } } as unknown as AnalyticsProps;
    analytics.track('evt', dirty);

    expect(spy).toHaveBeenCalledWith('[analytics] track', 'evt', { keepMe: 1 });
    spy.mockRestore();
  });
});

describe('sanitize', () => {
  it('keeps privacy-safe primitives and null', () => {
    expect(sanitize({ s: 'a', n: 1, b: true, z: null })).toEqual({
      s: 'a',
      n: 1,
      b: true,
      z: null,
    });
  });

  it('drops non-primitive values', () => {
    // why: callers may cross the boundary with an `any`, so test the runtime guard
    const input = { ok: 1, arr: [1, 2], obj: { x: 1 } } as unknown as AnalyticsProps;
    expect(sanitize(input)).toEqual({ ok: 1 });
  });

  it('passes undefined through unchanged', () => {
    expect(sanitize(undefined)).toBeUndefined();
  });
});
