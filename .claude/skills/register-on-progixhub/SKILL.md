---
name: register-on-progixhub
description: Link this Expo app to progixHub (the central hub) via its MCP — for a fresh clone OR an existing project. Creates the hub project (or reuses the matching one), saves the link in .progixhub.json, and pushes specs + product docs (and optionally env). Run anytime; re-run to re-sync. After this, day-to-day jobs (daily reports, tasks/phases, tutorials, env, docs) flow through the same MCP.
argument-hint: [hub-project-name]
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash(node*), Bash(git remote*), Bash(ls*), mcp__progixhub
note: The MCP tools require the server to be added as `progixhub` (the connect command below names it that). If you added it under a different name, replace `mcp__progixhub` here with `mcp__<your-name>`.
---

## Context

- App (package name): !`node -p "require('./package.json').name" 2>/dev/null || echo unknown`
- Already linked: !`cat .progixhub.json 2>/dev/null || echo "no .progixhub.json yet"`
- GitHub remote: !`git remote get-url origin 2>/dev/null || echo "none"`
- Specs present: !`ls -d specs/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null | tr '\n' ' ' || echo "none"`
- Product overview: !`test -f docs/product/overview.md && echo present || echo missing`

## Prerequisite — the progixHub MCP must be connected

This skill drives progixHub through its **MCP server**. The tools it calls (`list_projects`, `create_project`, `sync_specs`, `add_document`, `upload_env`, `get_project_status`, `post_daily_report`, …) come from that server. If those MCP tools are **not** available in this session, STOP and tell the user to connect it first, then re-run:

```
claude mcp add --transport http progixhub https://hub.progix.pro/api/mcp \
  --header "Authorization: Bearer pgx_mcp_<their-token>"
```

(They mint a personal token in progixHub → Settings → MCP. One token per developer.)

## This works for any project — new OR existing

There are three cases; detect which one you're in and act accordingly:

- **Already linked** — `.progixhub.json` exists with a `projectId`. Skip creation, go straight to "Push what the repo knows" to re-sync. This is the normal re-run.
- **Existing hub project, not yet linked here** — a project with this name already exists on the hub (see step 2). Reuse it; don't create a duplicate.
- **Brand-new** — nothing matches. Create it.

A fresh skeleton clone and a long-running existing app both use this same skill — the only difference is whether the hub project already exists.

## Task

### 1 · Confirm identity (don't guess)

- **Name:** `$ARGUMENTS`, else the package name / `app.config.ts` app name, humanized.
- **GitHub URL:** from the remote above — convert `git@github.com:org/repo.git` → `https://github.com/org/repo`.
- **Description:** the first paragraph of `docs/product/overview.md` (read it — that's the product pitch).

Show the user these three values and confirm.

### 2 · Resolve the hub project (create or reuse — never duplicate)

- If `.progixhub.json` already has a `projectId`, use it.
- Otherwise call **`list_projects`** and look for one matching this name. If found, ask the user to confirm it's the same project, then use its id. If several or unsure, ask.
- If nothing matches, call **`create_project`** with `{ name, description, github_url }` and capture the returned **project id** (you become its PM).

### 3 · Save the link

Write **`.progixhub.json`** at the repo root (commit it — it's just an id + url, no secret):

```json
{ "projectId": "<id>", "name": "<name>", "url": "https://hub.progix.pro/projects/<id>" }
```

This is how `/daily-report` and future jobs know which hub project to target. If the file already exists with the same id, leave it.

### 4 · Push what the repo already knows

- **Specs →** for every `specs/NNN-*/spec.md`, call **`sync_specs`** with `{ projectId, specs: [{ slug, title, status, kind, body }] }`. slug = folder name; title = the spec's first `#` heading; status = its Status line; kind = `spec` (use `prd` for PRD docs); body = the file contents. It upserts by slug, so re-running is safe.
- **Product doc →** call **`add_document`** with the contents of `docs/product/overview.md` (and any `docs/product/prds/*.md`) as a project document.
- **Env (optional — ASK FIRST) →** if a local `.env` / `.env.local` exists, ask whether to upload it. Values are **encrypted at rest** on progixHub (AES-256-GCM keyring); `EXPO_PUBLIC_*` keys are auto-scoped public. If yes, read the file and call **`upload_env`** with `{ projectId, dotenv }`. **Never upload env without explicit confirmation** — it contains secrets (EAS tokens, API keys).

### 5 · Verify + hand off

- Call **`get_project_status`** and report the checklist (specs, docs, env, setup, portal).
- Tell the user the app is linked at `https://hub.progix.pro/projects/<id>`, with N specs + the product doc synced, and that `.progixhub.json` now records the link.
- Remind them the same MCP powers day-to-day jobs from this repo:
  - **`/daily-report`** posts the standup to the hub automatically (via `post_daily_report`).
  - **`bulk_create_plan` / `create_phase` / `create_task` / `set_status`** — seed and drive the roadmap.
  - **`create_tutorial` / `link_tutorial_to_platform`** — build the client setup guides.
  - **`upload_env` / `add_document` / `sync_specs`** — re-run this skill anytime to re-sync config, docs, and specs.

## Why this skill exists

progixHub is the single home for a project's config, specs, and live status. This links any repo — new or existing — to its hub project in one motion, records the link in `.progixhub.json`, and leaves the MCP wired up for everything after, so the clone and the hub never drift.
