# Query-key convention

Every feature that uses React Query owns a **query-key factory**: one small
`const` object that produces all the keys for that feature. This keeps keys
typed, collision-free, and invalidatable as a group — never hand-write a
`['foo', 'list']` array at a call site.

## The factory shape

Each feature exports its factory from its module (e.g.
`features/foo/model/queries.ts`):

```ts
export const fooKeys = {
  all: ['foo'] as const,
  list: () => [...fooKeys.all, 'list'] as const,
  detail: (id: string) => [...fooKeys.all, 'detail', id] as const,
};
```

- `all` is the namespace root — `queryClient.invalidateQueries({ queryKey: fooKeys.all })`
  nukes every `foo` query at once.
- `list()` / `detail(id)` derive from `all` so they always share the prefix.
- Keep them `as const` so the tuple types are literals (TanStack matches keys
  structurally, and the literal types catch typos at compile time).

## Disabled-query guard

When a query depends on a value that may not be ready (a route param, a
not-yet-loaded id), gate it with `enabled` instead of firing a request with a
bogus key:

```ts
useQuery({
  queryKey: fooKeys.detail(String(id)),
  queryFn: () => fetchFoo(id),
  // Don't run until we actually have a usable numeric id.
  enabled: Number.isFinite(id),
});
```

Use the same pattern for any precondition: `enabled: Boolean(userId)`,
`enabled: id.length > 0`, etc. A disabled query stays idle (no fetch, no error)
until its inputs are valid.
