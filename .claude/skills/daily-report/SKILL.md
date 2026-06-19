---
name: daily-report
description: Compile the last day of GitHub activity into a human-readable daily report (Markdown) and post it to Notion + the repo. Use each morning, when the user says "daily report" / "standup" / "what happened yesterday", or let a scheduled GitHub Action run it. Reads commits, PRs, and issues — the PM reads this, not the git log.
argument-hint: [optional: date, default today]
allowed-tools: Read Write Bash(gh *) Bash(git log*) Bash(git diff*) Glob Grep
---

## Context

- Repo: !`gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "no gh"`
- Merged in last 24h: !`gh pr list --state merged --search "merged:>$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d '1 day ago' +%Y-%m-%d)" --json number,title,author 2>/dev/null | head -c 1500`
- Open issues incl. auto-filed: !`gh issue list --state open --json number,title,labels --limit 20 2>/dev/null | head -c 1500`

## Task

Write the daily report for the current project (date = $ARGUMENTS or today).

1. **Gather** the real activity: merged PRs, open PRs in progress, issues opened/closed in the last 24h (note which carry the `auto-filed` label), and progress against the active spec's `tasks.md`. Use the context above; pull more with `gh` as needed. Never invent activity.
2. **Translate to human.** Each line is what a PM understands, not a commit hash: "Shipped task capture (PR #42)", not "merge a1b2c3d". Use the template `docs/templates/daily-report.md`: at-a-glance counts · shipped · in flight · blocked/needs-decision · auto-filed issues · milestone risk (one honest line).
3. **Be honest about risk.** If the milestone is slipping, say so in one line with the reason — the report exists to surface that early, not to look green.
4. **Post to both surfaces:** commit to `docs/reports/daily/<date>.md` (Markdown), and update the Notion project → GitHub page (latest report) + refresh the PM page's "Where we are right now" if the Notion MCP is connected.
5. Keep it short — a PM should read it in under a minute. Link out for detail; don't inline diffs.

If a generated human line reads wrong repeatedly, the prompt needs tuning — run `/encode-lesson`.
