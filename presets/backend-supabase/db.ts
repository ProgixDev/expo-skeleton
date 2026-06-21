import { supabase } from '../supabase';

/**
 * Generic backend error shape. The custom-API preset raises the same shape, so
 * feature error handling does not branch on the backbone.
 */
export type BackendError = {
  message: string;
  // PostgREST / HTTP status-ish code, when available.
  code: string | null;
  details: string | null;
};

/**
 * Typed query helpers — a thin pass-through to `supabase.from`. Once you run
 * `supabase gen types typescript`, parameterise the client with `<Database>` and
 * these return rows fully typed. Validate rows at the feature edge with Zod
 * (model/schema.ts) regardless — never trust the wire.
 */
export const db = {
  /** Direct table handle for query-builder chains (`db.from('tasks').select()`). */
  from: supabase.from.bind(supabase),

  /** Call a Postgres function (RPC). */
  rpc: supabase.rpc.bind(supabase),
} as const;

export type BackendDb = typeof db;
