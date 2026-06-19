---
name: design-prompt
description: Generate the Claude Design prompt as a clean, copy-paste .md from the filled project context (PRD, intake, brand). Use as /progix step 7, or when the user says "design prompt", "prompt for Claude Design", or is about to start the UI/UX pass. The prompt contains NO code — design only; coding stays in Claude Code.
argument-hint: [project name]
allowed-tools: Read Write Glob Grep AskUserQuestion WebSearch
---

## Task

Write `design/<project>-design-prompt.md` (repo-root `design/` dir — a copy-paste export, kept out of the `docs/` knowledge tree) for **$ARGUMENTS**, ready to paste straight into Claude Design.

1. **Source the context:** the PRD in `docs/product/prds/`, `docs/product/vision.md`, the intake answers, brand/logo notes. The design prompt is a brief, not a spec — it describes the experience to design, never how to build it.
2. **Research the moving parts (current year).** If the project names fast-changing tech that affects UX or feasibility (Expo SDK capabilities, iOS/Android platform UI conventions, new component patterns, dynamic island, predictive back gesture), do a quick `WebSearch` pass so the brief is current — this is the rule that prevents compatibility surprises later in the build.
3. **Fill the template** `docs/templates/claude-design-prompt.md`: product · users & primary journeys · surfaces to design (mobile screens + landing/admin if any) · visual direction (personality, brand, references) · expected result & quality bar (real states: empty/loading/error/success; native feel, safe areas, dark mode) · out of scope.
4. **Cue the visual references.** The prompt should explicitly expect attached images from Pinterest / Behance / Dribbble, with a line per reference on what to borrow (the visual, not the function). Remind the user to attach them when pasting.
5. **No code rule (hard):** if you catch yourself writing component names, props, NativeWind classes, or snippets, stop — that belongs to Claude Code. The output is pure design intent.
6. **Output hygiene:** clean Markdown, copy-paste-able as a single block, no repo-internal jargon. End with the reminder: paste into Claude Design, attach references, export the result as a ZIP back to Cowork for the `/progix` handoff to Claude Code.
