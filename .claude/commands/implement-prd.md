---
description: Implement an approved PRD end-to-end (PM-friendly)
---

Input: $ARGUMENTS = path to an approved PRD in docs/product/prds/.

Operate strictly by AGENTS.md.

## Step 0 — Analyze preflight (one pass, then go)

Before writing any code, do ONE consistency pass — not a document dump:

1. PRD ↔ plan/tasks ↔ codebase: every acceptance criterion maps to a task
   and a planned test; every task's target file is either new or listed in
   the reuse inventory. **If something the tasks would create already exists
   in src/, flag it and reuse it — never regenerate existing code.**
2. Check the PRD's Clarifications section covers any material ambiguity you
   spot; if a NEW material ambiguity emerges, ask now (max 3 questions), not
   mid-implementation.
3. State the result in two lines ("Preflight OK" or the discrepancies) and
   proceed. Do not produce additional planning artifacts.

## Implementation loop

1. **Ground:** read the PRD, its task list / exec plan (run the
   /plan-feature flow if missing — respect its sizing gate), and the docs
   the work touches.
2. **Implement task by task**, checking tasks off as you go. Scaffold new
   features with `npm run new:feature`. Write each AC's test before or with
   its implementation. Small Conventional Commits.
3. **Verify:** `npm run verify` after each task group; fix until green. For
   UI, if Argent is available, build + launch the app, walk the new
   behavior, and capture screenshots for the PR.
4. **Docs:** update any doc your change made stale; tick the task/plan
   boxes; add a line to docs/quality/quality-score.md if you found debt.
5. **Deliver:** branch `feat/<scope>-<slug>`, open a PR filling every
   section of the template, attach proof of work, and list the AC → test
   mapping.

Stop and ask when: a boundary rule blocks the design, the PRD conflicts with
an ADR, or a dependency would need to be added.
