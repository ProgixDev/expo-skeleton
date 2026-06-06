# ADR-0004 — AI harness: AGENTS.md + persona reviews + agentic QA

- **Status:** accepted
- **Date:** 2026-06-06
- **Deciders:** engineering leadership

## Context

We operate "agent-first": most code is produced by coding agents directed by
engineers, PMs, designers and QA. Agents start every session with zero
context; synchronous human steering doesn't scale. The repository itself must
inject context and reject bad output (harness engineering).

## Decision

1. **AGENTS.md** (open standard, Linux Foundation) is the canonical operating
   manual; `CLAUDE.md` imports it; Cursor/Copilot configs point to it.
2. **Docs tree as brain:** `docs/` holds architecture, conventions, ADRs,
   exec plans, PRDs, CUJs, personas; docs-lint keeps it linked and current —
   broken docs fail CI exactly like broken tests.
3. **Taste as automation:** persona files (`docs/personas/`) drive a matrixed
   Claude Code review job on every PR; recurring human feedback must be
   encoded into rules/tests ("give feedback at most twice").
4. **Closed verification loops:** agents prove work via `npm run verify`,
   Maestro CUJ flows, and interactive Argent sessions (simulator control,
   screenshots, logs, profiling). Nightly agentic QA walks all CUJs.

## Consequences

- Positive: feedback compounds in the repo; non-engineers ship safely via
  PRDs; review attention moves to intent, not mechanics.
- Negative: docs discipline is mandatory (docs-lint makes it cheap to keep);
  CI minutes for AI review/QA; macOS runners for simulator jobs.
- Enforcement: `scripts/docs-lint.mjs`, `.github/workflows/claude-pr-review.yml`,
  `agentic-qa.yml`, PR template proof-of-work section.

## Alternatives considered

- Tool-specific rule files only (.cursorrules et al.): fragments knowledge per
  vendor; AGENTS.md is the portable superset.
- Human-only review: doesn't scale with agent-generated PR volume and loses
  the encode-the-feedback flywheel.
