import { z } from 'zod';

/**
 * The single shared contract. CLIENT (repo/hook/ui) and SERVER (RLS SQL,
 * OpenAPI, mock) both mirror this Zod model — change it here and both halves
 * follow. Validate every row at the edge; never trust the wire.
 */
export const ExampleSchema = z.object({
  id: z.string(),
  // Owner — server stamps this from the session (auth.uid() / token sub).
  // The client never sets it; RLS / route auth enforce ownership.
  owner_id: z.string(),
  title: z.string().min(1).max(200),
  done: z.boolean(),
  created_at: z.string(),
});
export type Example = z.infer<typeof ExampleSchema>;

/** Fields the client may send when creating one (server owns id/owner/created_at). */
export const CreateExampleSchema = ExampleSchema.pick({ title: true }).extend({
  done: z.boolean().optional(),
});
export type CreateExample = z.infer<typeof CreateExampleSchema>;

/** Validate a single db/wire row before trusting it (input at the edge). */
export function parseExample(row: unknown): Example | null {
  const r = ExampleSchema.safeParse(row);
  return r.success ? r.data : null;
}
