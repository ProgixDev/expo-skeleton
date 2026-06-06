---
description: Reconcile the docs tree with reality after changes
---

Audit and repair the knowledge tree:

1. Run `npm run docs:lint`; fix every failure.
2. Diff awareness: `git log --oneline -20` + `git diff main --stat` — for
   each meaningful change, check whether docs/architecture, docs/conventions,
   AGENTS.md, or the README still tell the truth. Update what drifted.
3. Verify AGENTS.md's docs map lists every docs/ section and that
   docs/index.md links every page (docs-lint enforces orphans, you handle
   accuracy of descriptions).
4. Check code comments referenced by docs (e.g. tokens sync rule between
   tailwind.config.js and src/shared/theme/colors.ts).
5. Summarize what you fixed; if something recurs, add a `HARNESS:` proposal
   ($ARGUMENTS may scope the audit to a path).
