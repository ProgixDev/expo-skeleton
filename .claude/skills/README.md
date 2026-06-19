# Skills — the Progix operating system

One front door, then the skills that run the work. Invoke with a slash (e.g. `/progix`, `/create-spec`). Governance: `specs/constitution.md`. Rationale: ADR-0006. Flow + roles: `docs/process/workflow.md`.

| Skill                | Phase        | What it does                                                                                                                   |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `/progix`            | front door   | Stands up a whole new project end to end (interview → PRD → Notion → GitHub → setup → design prompt). `--dry-run` to rehearse. |
| `/setup-project`     | init         | Initializes one fresh clone into a real project (rename, vision, CODEOWNERS, env/ADR, verify).                                 |
| `/write-prd`         | product      | Intake → PRD in `docs/product/prds/`.                                                                                          |
| `/design-prompt`     | product      | Emits the Claude Design brief (`design/<name>-design-prompt.md`).                                                              |
| `/create-spec`       | spec track   | Idea → `specs/NNN-slug/spec.md`.                                                                                               |
| `/clarify` (command) | spec track   | Bounded ambiguity pass on a PRD/spec (≤5 questions).                                                                           |
| `/plan-feature`      | spec track   | Sizing gate (S/M/L) → `plan.md` + `tasks.md`, reuse inventory, AC→test map.                                                    |
| `/new-module`        | spec track   | Scaffolds a feature slice (`npm run new:feature` + model mirror of `tasks`).                                                   |
| `/implement-feature` | spec track   | Executes `tasks.md` task-by-task, gates green, checkpoint commits.                                                             |
| `/verify-ui`         | verification | Drives the app on the simulator with Argent, walks CUJs, attests vs ACs.                                                       |
| `/review`            | verification | Multi-persona review board (uses the `code-reviewer` agent + personas).                                                        |
| `/feature-report`    | reporting    | Markdown evidence report → `docs/reports/NNN-slug.md`.                                                                         |
| `/daily-report`      | reporting    | GitHub activity → `docs/reports/daily/<date>.md` + Notion.                                                                     |
| `/meeting-intake`    | R2R          | Transcript → requirement diff (add/change/remove/reject) + grill.                                                              |
| `/encode-lesson`     | flywheel     | Turns a correction into permanent repo machinery (lint/test/hook/doc).                                                         |

**Tooling note (Expo):** all skills use `npm` (not pnpm), Maestro + **Argent** for UI verification (not Playwright), the `model/ui/lib` slice anatomy, and `app.config.ts` for app identity. Reports are Markdown only.
