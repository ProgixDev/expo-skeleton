// Returns the signed-in driver's ACTIVE deliveries (status assigned/in_transit),
// newest first, joined with the order's reference + item snapshot + dropoff AREA
// (city/district). Shaped as the { deliveries, next_cursor } envelope the client expects.
//
// Security (spec 001 AC-9): the driver identity is taken ONLY from the verified Linky
// SELF-ROLLED JWT (`requireUser(req)` → token `sub`), never from the request body — a
// client cannot ask for another driver's deliveries. `deliveries` has RLS enabled with no
// client policies, so the read runs with the service_role and is scoped here by
// `livreur_id = <jwt user>`.
//
// AUTH (deploy): matches the live Linky backend — SELF-ROLLED JWT verified in-function,
// `verify_jwt = false` at the gateway (the app-issued JWT isn't a Supabase Auth token).
// The client (src/shared/lib/api.ts) sends `Authorization: Bearer <access token>` + the
// anon key in `apikey`.
//
// Privacy (AC-10): the street-level `details` field of delivery_address is NOT
// returned — only city/district. The full address is revealed at the handoff step.
//
// NOTE: Deno edge function — excluded from `npm run verify` (RN toolchain). Verify
// with `deno check` and a manual call against a seeded livreur.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { requireUser } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ACTIVE_STATUSES = ['assigned', 'in_transit'];

type DeliveryRow = {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  delivery_address: { city?: string; district?: string } | null;
  orders: {
    reference: string | null;
    product_snapshot: { title?: string; photo?: string } | null;
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

  // Read with service_role (deliveries has no client RLS policy) but scope strictly
  // to this driver + active statuses, newest first.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from('deliveries')
    .select(
      'id, order_id, status, created_at, delivery_address, orders ( reference, product_snapshot )',
    )
    .eq('livreur_id', userId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false });

  if (error) {
    // Log server-side so failures are diagnosable; never leak internals to the client.
    console.error('list-livreur-deliveries query failed', error);
    return new Response(JSON.stringify({ error: 'query_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Response shape MIRRORS the canonical deployed function: a { deliveries, next_cursor }
  // envelope of NESTED camelCase rows (the client in src/features/deliveries/lib maps it to
  // its flat view model). Privacy (AC-10): only city/district of the address are returned —
  // the street `details` is revealed only by get-delivery, at the handoff step.
  const deliveries = ((data ?? []) as DeliveryRow[]).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    createdAt: row.created_at, // ISO string — the client coerces to epoch ms
    deliveryAddress: {
      city: row.delivery_address?.city ?? null,
      district: row.delivery_address?.district ?? null,
    },
    order: row.orders
      ? {
          reference: row.orders.reference ?? '',
          productSnapshot: {
            title: row.orders.product_snapshot?.title ?? '',
            photo: row.orders.product_snapshot?.photo ?? '',
          },
        }
      : null,
  }));

  return new Response(JSON.stringify({ deliveries, next_cursor: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
