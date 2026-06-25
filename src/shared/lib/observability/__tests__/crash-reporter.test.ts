import { crashReporter } from '../crash-reporter';

describe('crashReporter (DEV no-op)', () => {
  it('captureException does not throw', () => {
    expect(() =>
      crashReporter.captureException(new Error('boom'), { screen: 'home' }),
    ).not.toThrow();
    expect(() => crashReporter.captureException('plain string error')).not.toThrow();
  });

  it('captureMessage does not throw', () => {
    expect(() => crashReporter.captureMessage('unexpected state', { count: 3 })).not.toThrow();
    expect(() => crashReporter.captureMessage('no context')).not.toThrow();
  });

  it('setUser accepts an id and null without throwing', () => {
    expect(() => crashReporter.setUser('user-123')).not.toThrow();
    expect(() => crashReporter.setUser(null)).not.toThrow();
  });
});
