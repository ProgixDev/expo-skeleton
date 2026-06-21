-- example-feature — owner-scoped rows over Supabase. RLS-first (deny-by-default).
-- RLS is auto-enabled on this table by the skeleton's 0001 event trigger; with no
-- policy, every row is denied. The policies below open ONLY owner-scoped access.
-- Mirrors src/model/schema.ts (the shared Zod contract). Never trust the client:
-- owner_id is stamped from auth.uid() and writes are checked against it.

create table public.examples (
  id uuid primary key default gen_random_uuid(),
  -- Owner is the session user, never a client-supplied value.
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.examples to authenticated;
create index examples_owner_idx on public.examples (owner_id, created_at);

-- Deny-by-default: each policy opens exactly one owner-scoped operation.
create policy "examples: owner read" on public.examples for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "examples: owner insert" on public.examples for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "examples: owner update" on public.examples for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "examples: owner delete" on public.examples for delete to authenticated
  using (owner_id = (select auth.uid()));
