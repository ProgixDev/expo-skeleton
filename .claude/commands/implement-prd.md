---
description: Implement an approved PRD end-to-end (PM-friendly)
---

Input: $ARGUMENTS = path to an approved PRD in docs/product/prds/.

Operate strictly by AGENTS.md. Loop:

1. **Ground:** read the PRD, its exec plan (create one via the plan-feature
   flow if missing), and the docs the work touches.
2. **Implement** phase by phase. Scaffold new features with
   `npm run new:feature`. Acceptance criteria become tests BEFORE
   implementation where feasible.
3. **Verify:** `npm run verify` after every phase; fix until green. For UI,
   if Argent is available, build + launch the app, walk the new behavior,
   and capture screenshots for the PR.
4. **Docs:** update any doc your change made stale; tick the exec plan boxes;
   add a line to docs/quality/quality-score.md if you found debt.
5. **Deliver:** branch `feat/<scope>-<slug>`, Conventional Commits, open a PR
   filling every section of the template, attach proof of work, and list
   which acceptance criteria map to which tests.

Stop and ask when: a boundary rule blocks the design, the PRD conflicts with
an ADR, or a dependency would need to be added.
