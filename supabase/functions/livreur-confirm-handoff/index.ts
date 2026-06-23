// livreur-confirm-handoff — the irreversible money action (spec 002 T1, AC-4/5/8/9).
// The driver scans the buyer's on-screen QR, the app POSTs { order_id, scan_token },
// and this function calls the service-role-only `livreur_confirm_handoff(p_order_id,
// p_livreur_id, p_scan_token)` RPC, which (atomically) verifies assignment + token +
// status, marks the delivery delivered, flips the order to `released`, and releases the
// escrow to the seller. On success it returns { delivery, order_status }.
//
// Security (AC-9): `p_livreur_id` is taken ONLY from the verified JWT (`getUser()`),
// never from the request body — a client cannot release another driver's delivery or
// claim to be someone else. The RPC is the single source of truth for authorization,
// token validity, and idempotency; this function only translates its error codes to the
// Linky French envelope `{ error: { code, message_fr } }` + an HTTP status.
//
// RPC error codes (raised by the migration) → mapping:
//   ORDER_NOT_FOUND / DELIVERY_NOT_FOUND        → 404  (client: mismatch)
//   NOT_ASSIGNED_LIVREUR                         → 403  (client: mismatch)
//   INVALID_SCAN_TOKEN                           → 400  (client: mismatch — AC-5)
//   INVALID_STATUS / INVALID_DELIVERY_STATUS     → 400  (client: already_done — AC-8)
//
// AUTH CAVEAT (deploy): modeled on THIS repo's `list-livreur-deliveries` (Supabase Auth
// `getUser()` + `verify_jwt = true`). The canonical Linky backend uses a SELF-ROLLED JWT
// (`requireUser` + LINKY_JWT_SECRET, `verify_jwt = false`) AND this function ALREADY
// EXISTS there. When pointing at the real backend, prefer the canonical function (or swap
// `getUser()` → `requireUser(req)` and flip verify_jwt); the { order_id, scan_token }
// contract + error codes already match.
//
// NOTE: Deno edge function — excluded from `npm run verify`. Verify with `deno check` +
// a manual call against a seeded livreur. DEPLOY DEFERRED (no Supabase access on this host).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Never log a raw scan_token/order_id — redact UUIDs before any console output.
const scrub = (s: string) => s.replace(UUID_RE, '<uuid-redacted>');

const ERROR_MAP: Record<string, { status: number; message_fr: string }> = {
  ORDER_NOT_FOUND: { status: 404, message_fr: 'Commande introuvable.' },
  DELIVERY_NOT_FOUND: { status: 404, message_fr: 'Livraison introuvable.' },
  NOT_ASSIGNED_LIVREUR: { status: 403, message_fr: 'Cette livraison ne t’est pas attribuée.' },
  INVALID_SCAN_TOKEN: {
    status: 400,
    message_fr: 'Ce QR code ne correspond pas à cette livraison.',
  },
  INVALID_STATUS: { status: 400, message_fr: 'Cette commande n’est plus à confirmer.' },
  INVALID_DELIVERY_STATUS: { status: 400, message_fr: 'Cette livraison n’est plus à confirmer.' },
};

function jsonError(code: string, message_fr: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message_fr } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonError('UNAUTHORIZED', 'Non authentifié.', 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonError('UNAUTHORIZED', 'Non authentifié.', 401);
  }

  let body: { order_id?: unknown; scan_token?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const orderId = typeof body.order_id === 'string' ? body.order_id : '';
  const scanToken = typeof body.scan_token === 'string' ? body.scan_token : '';
  if (!orderId || !scanToken) {
    return jsonError('INVALID_INPUT', 'Requête invalide.', 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // The RPC is the authority: it re-checks assignment (caller is the assigned livreur),
  // the scan_token, and the order/delivery status, then releases escrow atomically.
  const { error: rpcError } = await admin.rpc('livreur_confirm_handoff', {
    p_order_id: orderId,
    p_livreur_id: user.id, // JWT-derived — never from the body (AC-9)
    p_scan_token: scanToken,
  });

  if (rpcError) {
    const raw = rpcError.message ?? '';
    const code = Object.keys(ERROR_MAP).find((c) => raw.includes(c));
    if (code) {
      // Expected business rejection — log the code only (no token/order id).
      console.warn('livreur-confirm-handoff rejected', code);
      return jsonError(code, ERROR_MAP[code].message_fr, ERROR_MAP[code].status);
    }
    // Unexpected failure — log scrubbed, never leak internals to the client.
    console.error('livreur-confirm-handoff RPC failed', scrub(raw));
    return jsonError('CONFIRM_FAILED', 'La confirmation a échoué.', 500);
  }

  // Success — re-read the released order status + the delivery row for the response.
  // (The RPC returns void; the canonical function shapes { delivery, order_status }.)
  const { data: order } = await admin
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();
  const { data: delivery } = await admin
    .from('deliveries')
    .select('id, order_id, status, delivered_at')
    .eq('order_id', orderId)
    .maybeSingle();

  return new Response(JSON.stringify({ delivery, order_status: order?.status ?? 'released' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
