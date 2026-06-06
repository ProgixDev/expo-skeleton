# Architecture Decision Records

Every consequential choice gets an ADR — small, numbered, immutable once
accepted (supersede instead of editing). Agents read these to understand
_why_; humans read them to stop relitigating settled questions.

When an ADR is required: new dependency with architectural impact, changing
module boundaries, changing state/data patterns, build/release pipeline
changes, anything you'd otherwise explain twice.

- [Template](_template.md)
- [ADR-0001 — Feature-sliced architecture with enforced boundaries](0001-feature-sliced-architecture.md)
- [ADR-0002 — NativeWind 4 for styling](0002-nativewind-for-styling.md)
- [ADR-0003 — Zustand + Zod for state and validation](0003-zustand-zod-state.md)
- [ADR-0004 — AI harness: AGENTS.md + persona reviews + agentic QA](0004-ai-harness.md)
