# Work order — example feature (API backbone)

The contract is `openapi.yaml` (mirrors `src/model/schema.ts`). Implement these
endpoints in the backend service. **The client is never trusted** — the rules
below live server-side and are not enforceable in the app.

## Endpoints

| Method | Path        | Auth     | Returns               |
| ------ | ----------- | -------- | --------------------- |
| GET    | `/examples` | required | the caller's examples |
| POST   | `/examples` | required | the created example   |

## Auth

- Every route requires a valid bearer token (JWT). Reject with `401` otherwise.
- Derive the user id from the **token**, not from the body or query.

## Trust rules (server-side only — "never trust the client")

- **Ownership is server-stamped.** On POST, set `owner_id` from the token subject.
  Ignore any `owner_id`/`id`/`created_at` in the request body.
- **Scope every read.** GET returns only rows where `owner_id` = the token user.
  Never return another user's rows, even if an id is guessable.
- **Validate the body** against `CreateExample` (title 1–200 chars). Reject extra
  or malformed fields with `400`.
- **Authorize writes by ownership.** Future update/delete routes must check the
  row's `owner_id` against the token user before mutating.

These mirror the Supabase RLS policies in `../supabase/0010_example.sql`; the two
backbones must enforce the same guarantees.
