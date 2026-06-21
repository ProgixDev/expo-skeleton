import { createQueryClient } from '../query-client';

describe('createQueryClient', () => {
  it('applies the house query defaults', () => {
    const client = createQueryClient();
    const { queries } = client.getDefaultOptions();

    expect(queries?.staleTime).toBe(60_000);
    expect(queries?.gcTime).toBe(5 * 60_000);
    expect(queries?.retry).toBe(2);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });

  it('disables mutation retries', () => {
    const client = createQueryClient();
    const { mutations } = client.getDefaultOptions();

    expect(mutations?.retry).toBe(0);
  });

  it('returns a fresh client each call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
