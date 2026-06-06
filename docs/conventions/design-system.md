# Design System

Single source of truth: **`tailwind.config.js`**. Designers own this file's
token values; engineers own its structure. The imperative mirror
(`src/shared/theme/colors.ts`) must stay in sync — PRs touching one must
touch both (reviewer + persona checklist item).

## Tokens

- **Color roles, not hues:** `brand-*` (action), `surface[-muted|-inverse]`
  (backgrounds), `ink[-muted|-faint|-inverse]` (text), `danger`, `success`.
  Components never reference hexes.
- **Type scale via `AppText` variants:** `display` (32/bold) · `title`
  (20/semibold) · `body` (16/regular) · `label` (14/medium) · `caption`
  (14/regular muted). Need a new size? Propose a variant, don't inline it.
- **Font:** Inter (400/500/600/700) loaded in the root layout; classes
  `font-sans[-medium|-semibold|-bold]`.
- **Radii:** `rounded-card` (16) for containers, `rounded-control` (12) for
  inputs/buttons. **Spacing:** Tailwind scale, screen gutter `px-5` via
  `<Screen>`.

## Typography copy rules

User-facing strings use real typography: curly apostrophes (’) and quotes
(“ ”), ellipsis character (…). docs-lint fails straight apostrophes in UI
text — this is the canonical example of taste encoded as a check. British vs
American spelling: American. Sentence case for headings and buttons
(“Add task”, not “Add Task”).

## Component policy

`shared/ui` is the kit: `AppText`, `Button` (primary/secondary/ghost/
destructive × md/sm, loading state), `Screen`, `TextField`. Extending the kit
beats local styling; new primitives need a quick design sign-off and tests.
Accessibility is part of the definition of done: roles, labels, 44pt touch
targets, `accessibilityState` for toggles — see the
[UX reviewer persona](../personas/ux-reviewer.md).

## Painted-door experiments

Designers may ship UI with a no-op backend behind an analytics event to test
demand — the UI lives in the feature's `ui/`, returns a “coming soon” state,
and must be flagged in the PRD + removed or wired within two sprints.
