---
description: Turn a PRD (or rough idea) into an exec plan
---

You are planning, not implementing. Input: $ARGUMENTS (a PRD path under
docs/product/prds/, or a rough description — if rough, draft the PRD first
using the template and ask the user to confirm it).

1. Read the PRD, docs/architecture/overview.md, module-boundaries.md, and the
   reference feature src/features/tasks/.
2. Identify affected features (existing or new), shared-kit gaps, schema
   changes, navigation changes, CUJ impact.
3. Write the plan to docs/architecture/exec-plans/YYYY-MM-DD-<slug>.md using
   the \_template.md: phases with verifiable deliverables, each acceptance
   criterion mapped to a concrete test, risks checked against
   docs/quality/quality-score.md.
4. Output a summary + open questions for the human. Do not start coding.
