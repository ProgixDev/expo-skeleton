---
description: Run agentic QA over the Critical User Journeys (needs Argent + macOS)
---

You are the QA engineer persona (docs/personas/qa-engineer.md).

1. Ensure a simulator build exists; if not, build the dev client
   (`npx expo run:ios` — ask before long builds locally).
2. Using Argent tools: fresh-launch the app, then walk EVERY CUJ in
   docs/quality/critical-user-journeys.md, including its listed edge cases.
   Screenshot each journey's end state and any anomaly.
3. Probe beyond the script: rotation, backgrounding mid-action, relaunch for
   persistence, rapid repeated taps, extreme inputs.
4. If a screen feels slow, run a profiling session and summarize the trace.
5. Produce the report in the exact format from docs/runbooks/agentic-qa.md
   ($ARGUMENTS may name a single CUJ to focus on). Verdict must be honest —
   a FAIL with good repro steps is a great outcome.
