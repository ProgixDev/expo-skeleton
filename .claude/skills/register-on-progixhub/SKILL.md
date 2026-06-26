---
name: register-on-progixhub
description: Register this Expo app on progixHub (the central hub) via its MCP — creates the hub project, links GitHub, and pushes the specs, product docs, and (optionally) env keys straight from this repo. Run once, after /setup-project, with the progixHub MCP connected. After this, day-to-day jobs (daily reports, tasks/phases, tutorials, env, docs) flow through the same MCP.
argument-hint: [hub-project-name]
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, AskUserQuestion, Bash(node*), Bash(git remote*), Bash(ls*)
---

## Context

- App (package name): !`node -p "require('./package.json').name" 2>/dev/null || echo unknown`
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

## Task — register, push, then hand off to the hub

### 1 · Confirm identity (don't guess)

- **Name:** `$ARGUMENTS`, else the package name / `app.config.ts` app name, humanized.
- **GitHub URL:** from the remote above — convert `git@github.com:org/repo.git` → `https://github.com/org/repo`.
- **Description:** the first paragraph of `docs/product/overview.md` (read it — that's the product pitch).

Show the user these three values and confirm before creating anything.

### 2 · Avoid duplicates

Call **`list_projects`**. If a project with this name already exists, STOP and ask whether to (a) push into the existing one (use its id) or (b) create a new one. Never silently duplicate.

### 3 · Create the hub project

Call **`create_project`** with `{ name, description, github_url }`. Capture the returned **project id** — you are now its PM. The hub project lives at `https://hub.progix.pro/projects/<id>`.

### 4 · Push what the repo already knows

- **Specs →** for every `specs/NNN-*/spec.md`, call **`sync_specs`** with `{ projectId, specs: [{ slug, title, status, body }] }`. slug = folder name; title = the spec's first `#` heading; status = its Status line; body = the file contents. It upserts by slug, so re-running is safe.
- **Product doc →** call **`add_document`** with the contents of `docs/product/overview.md` (and any `docs/product/prds/*.md`) as a project document.
- **Env (optional — ASK FIRST) →** if a local `.env` / `.env.local` exists, ask the user whether to upload it. Values are **encrypted at rest** on progixHub (AES-256-GCM keyring); `EXPO_PUBLIC_*` keys are auto-scoped public. If yes, read the file and call **`upload_env`** with `{ projectId, dotenv }`. **Never upload env without explicit confirmation** — it contains secrets (EAS tokens, API keys).

### 5 · Verify + hand off

- Call **`get_project_status`** and report the checklist (specs, docs, env, setup, portal).
- Tell the user the app is registered at `https://hub.progix.pro/projects/<id>`, with N specs + the product doc synced.
- Remind them the same MCP now powers day-to-day jobs from this repo:
  - **`post_daily_report`** — push a standup to the hub (or use `/daily-report`).
  - **`bulk_create_plan` / `create_phase` / `create_task` / `set_status`** — seed and drive the roadmap.
  - **`create_tutorial` / `link_tutorial_to_platform`** — build the client setup guides.
  - **`upload_env` / `add_document` / `sync_specs`** — keep config, docs, and specs in sync as the app evolves.

## Why this skill exists

progixHub is the single home for a project's config, specs, and live status. Populating it by hand after every clone is error-prone and gets skipped. This pushes the repo's truth into the hub in one motion — and leaves the same MCP wired up for everything that comes after, so the clone and the hub never drift.
