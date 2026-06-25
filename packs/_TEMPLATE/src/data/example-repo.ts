import { backend } from '@/shared/lib/backend';

import { ExampleSchema, type CreateExample, type Example } from '../model/schema';

/**
 * Backbone-AGNOSTIC data layer. Imports only the `@/shared/lib/backend` seam —
 * never `@supabase/supabase-js` or a generated API client directly. On the
 * Supabase backbone `backend.db.from` hits PostgREST (scoped by RLS); on the
 * API backbone the same seam fronts the REST endpoints. The server half decides
 * trust; the repo just calls and re-validates with Zod.
 */
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Examples the current user owns. RLS / route auth scope this server-side. */
export async function listExamples(): Promise<Result<Example[]>> {
  const { data, error } = await backend.db
    .from('examples')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: ExampleSchema.array().parse(data ?? []) };
}

/** Create one. owner_id is stamped server-side from the session, not sent. */
export async function createExample(input: CreateExample): Promise<Result<Example>> {
  const { data, error } = await backend.db
    .from('examples')
    .insert({ title: input.title.trim(), done: input.done ?? false })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: ExampleSchema.parse(data) };
}
