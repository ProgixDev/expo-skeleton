---
name: meeting-intake
description: Turn a meeting (tldv transcript or pasted notes) into an R2R requirement diff and proposed spec/PRD updates. Use after any client/team meeting where requirements were added, changed, removed, or rejected, or when the user says "process this meeting", "intake", "requirements changed", or pastes a transcript. This is the entry point of the Requirement-to-Review loop.
argument-hint: [transcript path, or paste the transcript]
allowed-tools: Read Write Edit Glob Grep AskUserQuestion
---

## Task

Process the meeting for the current project and produce the R2R artifacts. Full loop: `docs/process/r2r.md`.

1. **Read the source** ($ARGUMENTS — a transcript path, or the pasted text) plus the current PRD(s) in `docs/product/prds/` and active `specs/` so you diff against today's truth, not a blank slate.
2. **Build the requirement diff** — classify every requirement the meeting produced into four moves, not just "to build":
   - **Add** — new scope → new PRD section / new spec candidate.
   - **Change** — a decision refined or reversed → spec diff (+ ADR if architectural).
   - **Remove** — scope dropped → mark spec abandoned, note the slice to delete (boundaries make it a one-folder removal).
   - **Reject** — requested but out of scope/contract → record with the reason so it can't creep back.
3. **Grill each Add/Change** before it becomes work (grill-with-docs style): pre-mortem (how it fails), success metric (measurable proof), edge cases (what breaks behavior/trust), review rubric (what a reviewer must verify). This output becomes the spec's acceptance criteria — don't discard it.
4. **Write the meeting page** from `docs/templates/meeting-notes.md` (decisions, the diff table, grill notes, action items) → Notion → project → Meetings. If the Notion MCP isn't connected, write it to a repo-root `notion-export/` folder as Markdown (kept out of `docs/`) and tell the user to paste it. Append decisions to the PRD's Clarifications/decision log.
5. **Propose, don't auto-build.** Present the diff + grill and the resulting spec/PRD changes for approval. On approval: Adds/Changes that are new behavior → `/create-spec`; small ones → Quick track (S-size); Removes → abandon the spec; Rejects → just recorded.
6. **Keep the surfaces honest:** PRD updated in Notion (human original) + `docs/product/prds/` (repo mirror); tasks become GitHub issues; the Slack thread is linked from the meeting page.

The value is catching subtractions and rejections, not only additions — that's what stops silent scope drift between meetings.
