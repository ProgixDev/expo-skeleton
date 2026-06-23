import { supabase } from '@/shared/lib/supabase';

import { confirmHandoff, fetchDeliveries, getDelivery } from '../lib/deliveries-api';

// jest.mock is hoisted above the imports by babel-jest, so `supabase` resolves to
// this mock at module load.
jest.mock('@/shared/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const invoke = supabase.functions.invoke as jest.Mock;

const ORDER_UUID = '11111111-1111-4111-8111-111111111111';
const TOKEN_UUID = '22222222-2222-4222-8222-222222222222';

const validDelivery = {
  id: 'd1',
  orderRef: 'LK-2026-00001',
  itemTitle: 'Phone case',
  itemPhoto: '',
  shopName: 'TechShop',
  dropoffCity: 'Conakry',
  dropoffDistrict: 'Kaloum',
  status: 'assigned',
  createdAt: 1700000000000,
};

// The `get-delivery` wire shape (camelCase + nested) — carries the FULL street address
// + buyer name, unlike the list.
const detailWire = {
  id: 'd1',
  orderId: ORDER_UUID,
  status: 'assigned',
  createdAt: '2026-06-22T10:00:00.000Z',
  deliveryAddress: { city: 'Conakry', district: 'Kaloum', details: '12 Rue de la Paix' },
  order: {
    id: ORDER_UUID,
    reference: 'LK-2026-00042',
    productSnapshot: { title: 'Blue mug', photo: '' },
    amountGnf: 150000,
    status: 'paid',
  },
  buyer: { displayName: 'Mariama' },
};

// supabase-js error shapes: a non-2xx response is a FunctionsHttpError whose `context`
// is the Response (read the Linky envelope via .json()); a transport failure is a
// FunctionsFetchError. We branch on `name` (stable across realms, unlike instanceof).
const httpError = (code: string, message_fr = '') => ({
  name: 'FunctionsHttpError',
  context: { json: async () => ({ error: { code, message_fr } }) },
});
const fetchError = () => ({ name: 'FunctionsFetchError', message: 'Failed to send a request' });

beforeEach(() => invoke.mockReset());

describe('fetchDeliveries', () => {
  it('invokes the endpoint with NO client-supplied identity (AC-9)', async () => {
    invoke.mockResolvedValue({ data: [validDelivery], error: null });

    await fetchDeliveries();

    expect(invoke).toHaveBeenCalledWith('list-livreur-deliveries', { method: 'POST' });
    // The driver id must never be sent by the client — it is derived server-side.
    const [, options] = invoke.mock.calls[0];
    expect(JSON.stringify(options ?? {})).not.toMatch(/livreur|user|driver|id/i);
  });

  it('parses and returns the delivery list', async () => {
    invoke.mockResolvedValue({ data: [validDelivery], error: null });

    const result = await fetchDeliveries();

    expect(result).toHaveLength(1);
    expect(result[0]?.orderRef).toBe('LK-2026-00001');
  });

  it('strips unknown fields such as street details (AC-10)', async () => {
    invoke.mockResolvedValue({
      data: [{ ...validDelivery, details: '12 Rue Secret' }],
      error: null,
    });

    const result = await fetchDeliveries();

    expect(result[0]).not.toHaveProperty('details');
  });

  it('throws when the endpoint returns an error', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(fetchDeliveries()).rejects.toThrow('boom');
  });

  it('throws on an unexpected payload shape', async () => {
    invoke.mockResolvedValue({ data: [{ id: 'x' }], error: null });

    await expect(fetchDeliveries()).rejects.toThrow('Unexpected deliveries response');
  });
});

describe('getDelivery', () => {
  it('sends ONLY the delivery id and returns the flat detail incl. full street address (AC-1/AC-9)', async () => {
    invoke.mockResolvedValue({ data: detailWire, error: null });

    const result = await getDelivery('d1');

    expect(invoke).toHaveBeenCalledWith('get-delivery', {
      method: 'POST',
      body: { delivery_id: 'd1' },
    });
    // No client identity travels with the request — only the delivery id.
    const [, options] = invoke.mock.calls[0];
    expect(JSON.stringify(options.body)).not.toMatch(/livreur|driver|user/i);

    expect(result.orderId).toBe(ORDER_UUID);
    expect(result.orderRef).toBe('LK-2026-00042');
    expect(result.amountGnf).toBe(150000);
    expect(result.buyerName).toBe('Mariama');
    expect(result.addressDetails).toBe('12 Rue de la Paix'); // full street revealed here
    expect(result.addressCity).toBe('Conakry');
    expect(result.status).toBe('assigned');
  });

  it('falls back to "Customer" when the buyer display name is null (AC-1)', async () => {
    invoke.mockResolvedValue({
      data: { ...detailWire, buyer: { displayName: null } },
      error: null,
    });

    const result = await getDelivery('d1');

    expect(result.buyerName).toBe('Customer');
  });

  it('throws when the endpoint returns an error', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'down' } });

    await expect(getDelivery('d1')).rejects.toThrow('down');
  });

  it('throws on an unexpected payload shape', async () => {
    invoke.mockResolvedValue({ data: { id: 'd1' }, error: null });

    await expect(getDelivery('d1')).rejects.toThrow('Unexpected delivery response');
  });
});

describe('confirmHandoff', () => {
  it('sends ONLY order id + scan token (no identity, AC-9) and returns success', async () => {
    invoke.mockResolvedValue({ data: { order_status: 'released' }, error: null });

    const outcome = await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID });

    expect(outcome).toEqual({ kind: 'success', orderStatus: 'released' });
    const [name, options] = invoke.mock.calls[0];
    expect(name).toBe('livreur-confirm-handoff');
    expect(options.body).toEqual({ order_id: ORDER_UUID, scan_token: TOKEN_UUID });
    // The driver identity is derived server-side from the JWT — never sent.
    expect(JSON.stringify(options.body)).not.toMatch(/livreur|driver|user/i);
  });

  it('forwards a stable Idempotency-Key header when given (AC-7 retry replays)', async () => {
    invoke.mockResolvedValue({ data: { order_status: 'released' }, error: null });

    await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID, idempotencyKey: 'idem-1' });

    const [, options] = invoke.mock.calls[0];
    expect(options.headers).toEqual({ 'Idempotency-Key': 'idem-1' });
  });

  it('maps a forged/wrong token to mismatch — nothing released (AC-5)', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError('INVALID_SCAN_TOKEN') });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'mismatch',
    });
  });

  it('maps not-the-assigned-driver to mismatch (AC-5/AC-9)', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError('NOT_ASSIGNED_LIVREUR') });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'mismatch',
    });
  });

  it('maps a non-releasable order status to already_done (AC-8)', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError('INVALID_STATUS') });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'already_done',
    });
  });

  it('maps a non-releasable delivery status to already_done (AC-8)', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError('INVALID_DELIVERY_STATUS') });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'already_done',
    });
  });

  it('maps a transport failure to offline — money action is online-only (AC-7)', async () => {
    invoke.mockResolvedValue({ data: null, error: fetchError() });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'offline',
    });
  });

  it('surfaces an unknown server error with its French message', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError('SERVER_BOOM', 'Erreur serveur.') });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'error',
      message: 'Erreur serveur.',
    });
  });

  it('does NOT leak a raw transport string for an unknown code — generic copy only', async () => {
    invoke.mockResolvedValue({
      data: null,
      // A 5xx with no curated French message but a leaky supabase-js .message.
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge Function returned a non-2xx status code',
        context: { json: async () => ({ error: { code: 'WEIRD_5XX' } }) },
      },
    });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'error',
      message: 'Confirmation failed',
    });
  });

  // Contract gate: every code the `livreur_confirm_handoff` RPC can raise MUST map to a
  // deliberate outcome. A new server code with no mapping silently falls to { kind: 'error' }
  // — for a money action that is a bug, so enumerate them here. Note INVALID_STATUS (the
  // code a post-release retry raises) → already_done, never a re-attempt invite.
  describe('error-code → outcome contract', () => {
    const cases: [string, string][] = [
      ['INVALID_SCAN_TOKEN', 'mismatch'],
      ['NOT_ASSIGNED_LIVREUR', 'mismatch'],
      ['ORDER_NOT_FOUND', 'mismatch'],
      ['DELIVERY_NOT_FOUND', 'mismatch'],
      ['INVALID_STATUS', 'already_done'],
      ['INVALID_DELIVERY_STATUS', 'already_done'],
    ];

    it.each(cases)('maps %s → %s', async (code, kind) => {
      invoke.mockResolvedValue({ data: null, error: httpError(code) });
      const outcome = await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID });
      expect(outcome.kind).toBe(kind);
    });
  });

  it('treats an unexpected success payload as an error (not a false release)', async () => {
    invoke.mockResolvedValue({ data: { nope: true }, error: null });

    expect(await confirmHandoff({ orderId: ORDER_UUID, scanToken: TOKEN_UUID })).toEqual({
      kind: 'error',
      message: 'Unexpected confirm response',
    });
  });
});
