---
description: Size the work, then (only if warranted) turn a PRD into an exec plan with an ordered task list
---

You are planning, not implementing. Input: $ARGUMENTS (a PRD path under
docs/product/prds/, or a rough description — if rough, draft the PRD first
using the template and ask the user to confirm it).

## Step 0 — SIZING GATE (mandatory, prevents process-overkill)

Classify the work and SAY the classification out loud:

- **S (small)** — bug fix, copy change, single-component tweak, anything one
  PR with obvious shape. → **STOP planning.** No PRD, no exec plan, no task
  list. Tell the user: "This is S-size; just implement it directly with a
  regression test." Process documents for small work are waste (ADR-0005).
- **M (story)** — one feature slice, ≤ ~2 days. → Lightweight path: ensure
  the PRD's acceptance criteria are testable, then produce ONLY the task
  list (Step 3) appended to the PRD. No separate exec plan.
- **L (large)** — multi-slice, native config changes, new architecture. →
  Full path: Steps 1–3 into docs/architecture/exec-plans/.

If material ambiguities exist, run the /clarify flow first (max 5 questions).

## Step 1 — Ground (M and L)

Read the PRD, docs/architecture/overview.md, module-boundaries.md, and the
reference feature src/features/tasks/. **Inventory existing code the work
touches** and list it in the plan as "Already exists — reuse, do not
recreate" with file paths. (Agents regenerating existing code as duplicates
is a known failure mode; this section is the guard.)

## Step 2 — Plan (L only)

Write docs/architecture/exec-plans/YYYY-MM-DD-<slug>.md from \_template.md:
phases with verifiable deliverables, risks checked against
docs/quality/quality-score.md. **Hard cap: 2 pages.** A plan longer than the
diff it produces is a smell — humans must be able to review it in minutes.

## Step 3 — Tasks (M and L)

Decompose into an ordered task list:

```markdown
## Tasks

- [ ] T1 — <verb + object> → `src/features/x/model/schema.ts` (AC-1)
- [ ] T2 [P] — <task> → `path` (AC-2) # [P] = parallelizable with previous
- [ ] T3 — depends: T1 — <task> → `path` (AC-1, AC-3)
```

Rules: every task names its file path(s) and the acceptance criteria it
satisfies; test tasks come before their implementation tasks; every AC maps
to ≥1 task — list any unmapped AC as an open question instead of inventing
work.

## Step 4 — Hand off

Output: size verdict, the reuse inventory, the task list, and open
questions. **Do not start coding.**
