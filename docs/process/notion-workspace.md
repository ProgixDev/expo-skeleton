# Notion Workspace — the human side of a project

Notion is where the **non-engineers live**: the PM, Ilyes, and the client read Notion, not the repo. The repo enforces quality; Notion explains the project in human language. This file defines the canonical structure `/progix` creates and keeps current. Full rule and rationale: ADR-0006, Constitution Art. XI. The Notion MCP is configured in `.mcp.json`.

## The four surfaces

> **Notion explains · GitHub tracks · Slack coordinates · the repo enforces.**

| Surface    | Owns                                                                        | Never holds                                                     |
| ---------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Notion** | Product intent (PRD), human docs, meeting decisions, the PM view, resources | Task status (that's GitHub), code conventions (that's the repo) |
| **GitHub** | Issues, the project board, PRs, review state, releases                      | Long-form explanation (link to Notion instead)                  |
| **Slack**  | Meeting outputs, questions, decisions, handoffs, alerts                     | The source of truth for anything (it scrolls away)              |
| **Repo**   | AGENTS.md, specs, ADRs, conventions, gates                                  | Client-facing narrative                                         |

A fact that needs to be readable by an agent **and** a human (PRD, feature spec) lives in Notion as the human original and is mirrored into the repo (`docs/product/prds/`, `specs/`) for agent context. The Notion copy is the one humans edit; `/update-docs` and `/meeting-intake` keep the repo mirror honest.

## The project structure

`/progix` **duplicates the live master template** — `Project Template v2 — Progix OS` (page id `379bfde8-7d02-81a7-8881-e89edfc4ac19`, under the **Projets** data source) — into each new project, then fills it. The master mirrors `docs/templates/notion-project-template.md`:

```
Projets/
└── <Project name>
    ├── Overview          status, current focus, milestone, links
    ├── PRD               the product requirements (human original; mirrored to docs/product/prds/)
    ├── Meetings          dated decisions + action items (one page per meeting)
    ├── Feature Specs     human-readable specs, one per shipped feature (mirrors specs/ + docs/product/features/)
    ├── Technical Notes   ADR summaries, stack choices, gotchas — plain language
    ├── GitHub            repo link, board embed, open issues, latest daily report
    ├── Resources         Figma, design ZIP, API docs, monitoring, brand files
    └── PM                the project, narrated for a human running it (see below)
```

`/progix` keeps the two inline databases the master carries (board + meetings) and fills PRD, Feature Specs, Technical Notes, GitHub, and PM.

## The PM page — written for a person, not a parser

The PM page is the most important human artifact. A project manager who has never read the code should open it and, in five minutes, understand what the project is, where it stands, what's at risk, and what to do next. It is **narrative and structured**, never a raw data dump.

Required sections (template: `docs/templates/pm-page.md`):

1. **In one paragraph** — what we're building, for whom, why it matters, in plain language.
2. **Where we are right now** — this week's focus, % toward the milestone, the single most important thing in flight.
3. **Decisions made** — dated, one line each, with the "why" — so nobody re-opens settled questions.
4. **Open questions & risks** — what's unresolved, who owns it, what happens if it slips.
5. **What's next** — the next 2–3 things, ranked, in user terms.
6. **How to read this project** — pointers: where the PRD is, where issues live, what the daily report means.

Tone: warm, concrete, honest. Short sentences. No jargon the client didn't introduce. If a section would only make sense to an engineer, it belongs in Technical Notes, not here.

## Keeping it true

Stale Notion is worse than empty Notion — the PM acts on it. The daily report agent updates the GitHub page; `/meeting-intake` updates Meetings, PRD, and the decision log; `/update-docs` reconciles Feature Specs and Technical Notes with what actually shipped. Each runs as part of the workflow, not as a chore someone remembers.
