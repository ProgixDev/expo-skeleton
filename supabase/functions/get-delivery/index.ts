// get-delivery — returns ONE delivery's full detail for the assigned driver
// (spec 002 T1, AC-1/AC-9). Unlike `list-livreur-deliveries`, this reveals the
// FULL street address (`delivery_address.details`) + the buyer's `display_name`,
// because the driver needs both at the door.
//
// Security (AC-9): the driver identity comes ONLY from the verified Linky SELF-ROLLED
// JWT (`requireUser(req)` → token `sub`), never from the request body — the client
// sends just the `delivery_id`. The row is read with the service_role (the `deliveries`
// table has RLS enabled with no client policies) but scoped to `livreur_id = <jwt user>`,
// so a driver can never fetch a delivery that isn't theirs. A non-existent or not-yours
// id returns 404 DELIVERY_NOT_FOUND (no information leak about other drivers' rows).
//
// Privacy / secrets: the order's `scan_token` is NEVER selected or returned — the
// driver only obtains it by physically scanning the buyer's on-screen QR (the proof
// of handoff). See LINKY_DRIVER_QR_BRIEF.md.
//
// AUTH (deploy): this matches the live Linky backend — a SELF-ROLLED JWT verified
// in-function via `requireUser` + LINKY_JWT_SECRET, with `verify_jwt = false` at the
// gateway (the app-issued JWT is not a Supabase Auth token, so the gateway can't verify
// it). The client (src/shared/lib/api.ts) sends `Authorization: Bearer <access token>`
// + the anon key in `apikey`. The `{ delivery_id }` contract + wire shape are unchanged.
//
// NOTE: Deno edge function — excluded from `npm run verify` (RN toolchain). Verify with
// `deno check` and a manual call against a seeded livreur. DEPLOY DEFERRED (no Supabase
// access on this host).
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { requireUser } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Redact UUIDs (e.g. the queried delivery_id) from any log line — match the redaction
// discipline of livreur-confirm-handoff.
const scrub = (s: string) => s.replace(UUID_RE, '<uuid-redacted>');

type DeliveryDetailRow = {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  delivery_address: { city?: string; district?: string; details?: string } | null;
  orders: {
    id: string;
    reference: string | null;
    product_snapshot: { title?: string; photo?: string } | null;
    amount_minor: number | null;
    status: string | null;
    // Buyer joined off orders.buyer_id → users.display_name (FK embed).
    buyer: { display_name?: string | null } | null;
  } | null;
};

Deno.serve(async (req) => {
  // Identify the caller from their Linky self-rolled JWT (verified in-function). This is
  // the ONLY source of the driver id — there is no client-supplied identity.
  let userId: string;
  try {
    userId = await requireUser(req);
  } catch {
    return new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message_fr: 'Non authentifié.' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { delivery_id?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const deliveryId = typeof body.delivery_id === 'string' ? body.delivery_id : '';
  if (!deliveryId) {
    return new Response(
      JSON.stringify({
        error: { code: 'INVALID_INPUT', message_fr: 'Identifiant de livraison manquant.' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Read with the service_role (deliveries has no client RLS policy) but scope STRICTLY
  // to this driver. scan_token is deliberately never selected.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from('deliveries')
    .select(
      'id, order_id, status, created_at, delivery_address, orders ( id, reference, product_snapshot, amount_minor, status, buyer:users!orders_buyer_id_fkey ( display_name ) )',
    )
    .eq('id', deliveryId)
    .eq('livreur_id', userId)
    .maybeSingle();

  if (error) {
    console.error('get-delivery query failed', scrub(error.message ?? ''));
    return new Response(
      JSON.stringify({ error: { code: 'QUERY_FAILED', message_fr: 'Erreur serveur.' } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Not found OR not assigned to this driver → identical 404 (no existence leak, AC-9).
  if (!data) {
    return new Response(
      JSON.stringify({
        error: { code: 'DELIVERY_NOT_FOUND', message_fr: 'Livraison introuvable.' },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const row = data as DeliveryDetailRow;
  // Wire shape mirrors the canonical `get-delivery` (camelCase + nested). amount_minor
  // is exposed as `amountGnf` (GNF is a non-decimal currency — minor units are the GNF
  // integer here). The street `details` IS included (full address revealed at handoff).
  const payload = {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    createdAt: row.created_at,
    deliveryAddress: {
      city: row.delivery_address?.city ?? null,
      district: row.delivery_address?.district ?? null,
      details: row.delivery_address?.details ?? null,
    },
    order: {
      id: row.orders?.id ?? row.order_id,
      reference: row.orders?.reference ?? '',
      productSnapshot: {
        title: row.orders?.product_snapshot?.title ?? '',
        photo: row.orders?.product_snapshot?.photo ?? '',
      },
      amountGnf: row.orders?.amount_minor ?? 0,
      status: row.orders?.status ?? '',
    },
    buyer: { displayName: row.orders?.buyer?.display_name ?? null },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
