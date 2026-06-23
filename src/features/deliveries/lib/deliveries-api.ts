import { supabase } from '@/shared/lib/supabase';

import {
  DeliveryDetailResponseSchema,
  DeliveryListSchema,
  DeliveryStatusSchema,
  HandoffResultSchema,
  type Delivery,
  type DeliveryDetail,
  type DeliveryStatus,
  type HandoffOutcome,
} from '../model/schema';

const KNOWN_STATUSES = new Set<string>(DeliveryStatusSchema.options);

function toStatus(raw: string): DeliveryStatus {
  // Clamp an unknown/new backend status to a non-active value so a drifted row is
  // filtered out by selectActiveDeliveries rather than breaking the parse.
  return (KNOWN_STATUSES.has(raw) ? raw : 'unassigned') as DeliveryStatus;
}

/**
 * Fetch the signed-in driver's active deliveries from the edge function.
 *
 * The request carries NO driver identity — `functions.invoke` attaches the
 * session JWT automatically and the function derives `livreur_id` from it
 * (spec 001 AC-9). The response is Zod-validated at this network edge.
 */
export async function fetchDeliveries(): Promise<Delivery[]> {
  const { data, error } = await supabase.functions.invoke('list-livreur-deliveries', {
    method: 'POST',
  });

  if (error) {
    throw new Error(error.message ?? 'Could not load deliveries');
  }

  const parsed = DeliveryListSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Unexpected deliveries response');
  }

  return parsed.data;
}

/**
 * Fetch ONE delivery's full detail (spec 002). Unlike the list, this carries the full
 * street address + buyer name — surfaced only for the driver's own assigned delivery
 * (server-enforced via the JWT; we send just the delivery id, AC-9). The wire shape is
 * Zod-parsed at this edge and mapped to the flat detail view model; a null buyer name
 * falls back to “Customer”.
 */
export async function getDelivery(deliveryId: string): Promise<DeliveryDetail> {
  const { data, error } = await supabase.functions.invoke('get-delivery', {
    method: 'POST',
    body: { delivery_id: deliveryId },
  });

  if (error) {
    throw new Error(error.message ?? 'Could not load delivery');
  }

  const parsed = DeliveryDetailResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Unexpected delivery response');
  }
  const w = parsed.data;
  const buyerName = w.buyer?.displayName?.trim();

  return {
    id: w.id,
    orderId: w.orderId,
    orderRef: w.order?.reference ?? '',
    amountGnf: w.order?.amountGnf ?? 0,
    itemTitle: w.order?.productSnapshot?.title ?? '',
    itemPhoto: w.order?.productSnapshot?.photo ?? '',
    addressCity: w.deliveryAddress?.city ?? '',
    addressDistrict: w.deliveryAddress?.district ?? '',
    addressDetails: w.deliveryAddress?.details ?? '',
    buyerName: buyerName ? buyerName : 'Customer',
    status: toStatus(w.status),
  };
}

/** Read the Linky error envelope `{ error: { code, message_fr } }` off a non-2xx
 * FunctionsHttpError (its `context` is the Response). Returns {} if unparseable. */
async function readErrorEnvelope(error: unknown): Promise<{ code?: string; message_fr?: string }> {
  const ctx = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: { code?: string; message_fr?: string } };
      if (body?.error?.code) {
        return { code: body.error.code, message_fr: body.error.message_fr };
      }
    } catch {
      // Unparseable error body — fall through to the generic error outcome.
    }
  }
  return {};
}

/**
 * Confirm the handoff — the irreversible money action (spec 002). Sends only the order
 * id + scanned token; the server derives the driver from the JWT and is the sole
 * authority on assignment, token validity, and idempotency (AC-9). Server error codes
 * are MAPPED to a closed `HandoffOutcome` union (never re-thrown) so the detail state
 * machine surfaces every failure honestly: a wrong/forged token or not-the-assigned-
 * driver → `mismatch` (nothing released, AC-5); a non-releasable status → `already_done`
 * (AC-8); a transport failure → `offline` (online-only, AC-7).
 *
 * `idempotencyKey` should be STABLE across retries of the same handoff (the caller mints
 * it once at scan time): a retry then replays the server's cached result rather than
 * racing the RPC status gate.
 */
export async function confirmHandoff({
  orderId,
  scanToken,
  idempotencyKey,
}: {
  orderId: string;
  scanToken: string;
  idempotencyKey?: string;
}): Promise<HandoffOutcome> {
  const { data, error } = await supabase.functions.invoke('livreur-confirm-handoff', {
    method: 'POST',
    body: { order_id: orderId, scan_token: scanToken },
    ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
  });

  if (error) {
    // A transport/fetch failure (no connection) — nothing released while offline (AC-7).
    if ((error as { name?: string }).name === 'FunctionsFetchError') {
      return { kind: 'offline' };
    }
    const { code, message_fr } = await readErrorEnvelope(error);
    switch (code) {
      case 'INVALID_SCAN_TOKEN':
      case 'NOT_ASSIGNED_LIVREUR':
      case 'NOT_ASSIGNED':
      case 'ORDER_NOT_FOUND':
      case 'DELIVERY_NOT_FOUND':
        return { kind: 'mismatch' };
      case 'INVALID_STATUS':
      case 'INVALID_DELIVERY_STATUS':
        return { kind: 'already_done' };
      default:
        return { kind: 'error', message: message_fr || error.message || 'Confirmation failed' };
    }
  }

  const parsed = HandoffResultSchema.safeParse(data);
  if (!parsed.success) {
    return { kind: 'error', message: 'Unexpected confirm response' };
  }
  return { kind: 'success', orderStatus: parsed.data.order_status };
}
