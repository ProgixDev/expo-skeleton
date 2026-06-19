---
name: progix
description: The one front door for a new Progix mobile project. Run this first, in a fresh Expo-skeleton clone, with one message — "/progix". It interviews you about the project, fills the Notion project from the canonical template, creates the GitHub repo under DigitariaWebs, initializes the clone (/setup-project), writes the PRD, and emits the Claude Design prompt as a clean copy-paste .md. Add "--dry-run" to rehearse safely — it plans everything and creates nothing. Subsumes the old kickoff prompt + /setup-project. Use whenever starting any new client mobile project.
disable-model-invocation: true
argument-hint: [project-name-kebab-case] [--dry-run]
allowed-tools: Read Write Edit Glob Grep AskUserQuestion Bash(gh *) Bash(git *) Bash(npm *) Bash(npx expo *)
---

## Context

- Package name (must still be the skeleton): !`node -p "require('./package.json').name" 2>/dev/null || echo unknown`
- gh authenticated: !`gh auth status >/dev/null 2>&1 && echo yes || echo "no — degrade to describe-steps"`
- Notion MCP present: check your tool list for `notion-create-pages` / `notion-fetch` before the Notion step.

## Task

Stand up project **$ARGUMENTS** end to end. Make it feel effortless: ask many small, concrete questions; never assume a product decision. If the `package.json` name above is not `expo-skeleton`, stop — this clone is already initialized.

### Dry-run mode (testing)

If the arguments contain **`--dry-run`** (strip it to get the real project name), run in REHEARSAL mode: do every step that only thinks or talks — grounding receipt, the full intake interview, drafting the PRD and PM narrative, planning the Notion structure and GitHub repo/board — but **create nothing and change nothing**. Specifically, in dry-run you MUST NOT:

- create or duplicate any Notion page (describe exactly what you would create — which master id you'd duplicate, the project name, which sub-pages);
- run any `gh` command that writes (`repo create`, `project create`, `issue create`) — print the exact commands instead;
- write project files, run `/setup-project`, or `git commit`/`push`.

End a dry run with a clear **"DRY RUN — nothing was created. To do it for real, run `/progix <name>` without --dry-run."** plus the plan of what would have happened. Announce at the start that you're in dry-run so the human knows. This mode exists so the skill can be tested without leaving junk repos or Notion pages.

### Step 1 — Ground (read these fully, then prove it)

Read AGENTS.md, docs/index.md, docs/architecture/overview.md, docs/architecture/module-boundaries.md, docs/process/workflow.md, docs/process/notion-workspace.md, docs/process/r2r.md, specs/constitution.md. Then reply with the **grounding receipt** (max 10 lines, then stop) so the human can confirm you're oriented:

1. The operating loop, in one line.
2. The two work tracks (S quick-track / M·L spec-track) and when each applies.
3. The layer rule (`app → features → shared`) and what enforces it (ESLint `boundaries/*`).
4. What "done" requires here (`npm run verify` green · every AC mapped to a Jest/Maestro test · UI observed on the simulator via Argent).
5. The single question you would ask before touching any code.

Then continue.

### Step 2 — Intake interview (the heart of this skill)

Use AskUserQuestion in rounds. It's fine to ask 50–100 questions across rounds — keep each one a quick choice or one-liner. Cover, grounded in any docs/transcripts the user pasted:

- **Identity:** project name, client + company + contact, one-line pitch, one-paragraph description, visual personality, brand/logo status, store name.
- **App identity:** display name, slug, URL scheme, iOS/Android bundle id base (for `app.config.ts`).
- **Market & languages:** launch market, MVP languages, data-coverage priorities.
- **Users & jobs:** who, what they're trying to do, what success looks like; anti-goals (2–3).
- **Surfaces:** mobile (Expo) is the default; also web / landing / admin? — which, and the key screens of each.
- **Data & auth:** data layer + why; auth methods (note platform mandates like Sign in with Apple); compliance (RGPD / Loi 25 for health data).
- **Scope & constraints:** MVP non-negotiables ranked, deadline, hosting/EAS, IP, budget, contractual terms, the signature feature that must be impeccable.
- **Stack sensitivity:** anything fast-moving (Expo SDK, native modules, store policy) — flag it for a current-year research pass before the design/build prompts.

Anything the user leaves open → record as an Open Question, never an assumption.

### Step 3 — PRD

Run `/write-prd` with the intake answers → `docs/product/prds/NNNN-<slug>.md` (repo mirror) and stage the human original for Notion.

### Step 4 — Notion project (if the Notion MCP is connected)

**Duplicate the live master, don't rebuild it.** The ready master page is `Project Template v2 — Progix OS`, id `379bfde8-7d02-81a7-8881-e89edfc4ac19`, under the **Projets** data source `collection://378bfde8-7d02-8088-941f-000bf7aa576f`. Use the Notion `duplicate-page` tool on that id, then rename the copy to the project and fill every section from the intake + the PRD (step 3) + the PM narrative (`docs/templates/pm-page.md`). The duplicate already contains the seven sub-pages (PRD, Meetings, Feature Specs, Technical Notes, GitHub, Resources, PM). If duplication isn't available, recreate the structure from `docs/templates/notion-project-template.md`. If the MCP isn't connected at all, write the filled content to a repo-root `notion-export/` folder as Markdown and tell the user to paste it. Make the PM page genuinely human — narrate the project, don't dump fields.

### Step 5 — GitHub repo + project board (gh CLI, org DigitariaWebs)

If `gh auth status` is OK: `gh repo create DigitariaWebs/<name> --private --source . --remote origin` (the clone is the source), then create the project board — `gh project create --owner DigitariaWebs --title "<name>"` — and add its URL plus the repo URL to the Notion **GitHub** sub-page and `docs/product/vision.md`. Tasks live on this board, not in a Notion database (four-surface rule); the Notion GitHub page embeds/links it. If `gh` isn't authed, output the exact commands and continue.

### Step 6 — Initialize the clone

Run `/setup-project <name>` and answer its interview FROM the intake (don't re-ask). This renames the app (`app.config.ts` + `package.json`), fills `docs/product/vision.md`, sets CODEOWNERS, stubs the data-layer ADR + env, removes the demo feature if chosen, and runs `npm run verify`.

### Step 7 — Claude Design prompt

Run `/design-prompt` → a clean `design/<name>-design-prompt.md` ready to paste into Claude Design (no code inside). Remind the user to attach visual references (Pinterest/Behance/Dribbble) and to export the result as a ZIP back to Cowork.

> Dry-run reminder: steps 4–7 all have side effects (Notion, gh, files, /setup-project). In `--dry-run`, do none of them — print the plan for each and move on.

### Step 8 — Hand off

Report, concisely: the grounding receipt, the Notion project link, the GitHub repo URL, the PRD path, the design-prompt path, `npm run verify` status, and the human-only steps (`eas init` + projectId; protect `main`; add `CLAUDE_CODE_OAUTH_TOKEN` for persona reviews / agentic QA; invite CODEOWNERS teams). Then: "Next — paste the design prompt into Claude Design; when the ZIP comes back, run `/create-spec` on the first ranked feature."

### Rules

- This skill sets up the obligations in AGENTS.md (skills/agents/specs/PRD, four surfaces, default automations) and the Constitution. Don't skip them to move faster.
- Degrade gracefully: a missing connector becomes a "here are the exact manual steps", never a hard stop.
- One front door: the user typed one word; everything else is your job.
