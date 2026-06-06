---
description: Local persona review of the current branch (pre-PR)
---

Review `git diff main...HEAD` exactly as CI will:

For each persona in docs/personas/ (frontend-architect, ux-reviewer,
security-engineer, performance-engineer, qa-engineer): adopt it fully and
list findings as `[P1|P2|P3] file:line — issue — fix`. Skip personas with
nothing to say ($ARGUMENTS may limit to specific personas).

Then:

1. Deduplicate across personas.
2. Offer to fix all P1/P2 findings now; apply approved fixes and re-run
   `npm run verify`.
3. End with any `HARNESS:` proposals (rules/tests/docs that would prevent
   recurring findings permanently).
