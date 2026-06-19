# Skeleton Upgrade Roadmap — "Next Level" (v2, research-backed)

> **Purpose.** Single source of truth for taking the Expo + Next.js skeletons to a production,
> secure, store-ready, professionally-designed level. Built so both you and the AI agents can
> reopen it and know exactly where we are and what's next.
>
> **How to use.** Work top-to-bottom. Expo first, then Next.js. Each item has a status box — check
> it when done. Agents: before writing code for a phase, read its linked brief in
> [`docs/research/`](docs/research/README.md) so you copy the _verified current_ pattern, not a guess.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## 0. Decisions locked

| Decision               | Choice                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| CI/CD + Notion         | **Remove cloud ceremony** (GitHub Actions, Notion, Slack). **Keep local gates** (`verify` + pre-commit hooks; consider Lefthook).    |
| Shared UI              | **Lean curated core + `/new-component` generator.** No giant pre-built library.                                                      |
| Supabase (Expo)        | **Full secure reference** — auth, DB, RLS, secure storage, one end-to-end example feature.                                           |
| App categories         | Accounts/auth · **Payments/subscriptions** · **Sensitive personal data** · Consumer/content → **max security + max store scrutiny**. |
| **Payments**           | **RevenueCat** (free ≤ $2,500 MTR, then 1%). Escape hatch: `expo-iap`.                                                               |
| **Entitlement store**  | **Supabase Edge Function → table → RLS** (webhook verifies header secret; client read-only).                                         |
| **Analytics**          | **PostHog** (Expo-Go friendly, ATT-free, self-host/EU).                                                                              |
| **Crash/error**        | **Sentry** `@sentry/react-native` (ATT-free, auto EAS source maps).                                                                  |
| **Push notifications** | In scope, later pass (after security + store + design).                                                                              |
| Order                  | **Expo first**, then mirror into Next.js.                                                                                            |

> The stack choices avoid the ATT prompt entirely (PostHog + Sentry are ATT-free) — one less rejection surface. Evidence: [`06-payments-analytics-stack.md`](docs/research/06-payments-analytics-stack.md).

---

## Sequencing (Expo)

```
Phase 0  Cleanup            → strip cloud CI/CD + Notion/Slack, keep local gates
Phase 1  Security base      → enforced security layer everything builds on
Phase 2  Supabase secure    → auth + RLS + LargeSecureStore + example feature + payments→DB
Phase 3  Store compliance   → Apple+Google rule base + /store-readiness audit skill
Phase 4  Design prompts     → professional brief + token contract + ui-ux-pro-max
Phase 5  Docs for AI        → machine-legible, path-scoped, queryable rule files
Phase 6  Skills             → /daily-report, /security-review, /store-readiness, /new-component
Phase 7  Shared UI core     → lean tokenized primitives + generator
```

Then **Phase N** mirrors this into Next.js.

---

## Phase 0 — Cleanup (both repos)

- [ ] Delete `.github/workflows/*` cloud automation (ci, claude-pr-review, ship-report, e2e-ios, agentic-qa, deploy-preview, release, continuous-deploy).
- [ ] Remove Notion + Slack: `.mcp.json` Notion server, `docs/process/notion-workspace.md`, Notion/Slack refs in `docs/process/workflow.md`, Notion-targeted templates.
- [ ] Keep & verify local gates: `npm run verify` + Husky pre-commit still pass.
- [ ] Rewrite `docs/process/workflow.md` to a **repo-only** operating model (drop the four-surface rule).
- [ ] Prune `.claude/` skills/commands that only drove Notion/GitHub orchestration; keep artifact-producing ones.

## Phase 1 — Security foundation (Expo) → read [`01-mobile-security.md`](docs/research/01-mobile-security.md)

**Principle: the client is hostile; the real boundary is the server.** Everything here is enforced (lint rule / hook / test), not advice.

- [ ] `docs/security/threat-model.md` + `docs/security/checklist.md` as a **queryable rule file** (id | severity | rule | why | verify) and a **MASVS coverage matrix** in `SECURITY.md`.
- [ ] **Three storage modules**: `secureStorage` (expo-secure-store), `fastStorage` (MMKV, key sealed in SecureStore), AsyncStorage deprecated for secrets. **ESLint-ban** raw AsyncStorage/MMKV imports outside the module.
- [ ] SecureStore defaults: `WHEN_UNLOCKED` (or `*_THIS_DEVICE_ONLY` high-sensitivity); **>2KB session adapter** (LargeSecureStore — shared with Phase 2); `deleteItemAsync` on logout; Android backup exclusion; `usesNonExemptEncryption:false`.
- [ ] **Secrets lint rule**: reject `EXPO_PUBLIC_*` names matching `SECRET|PRIVATE|SERVICE_ROLE|TOKEN|PASSWORD`. BFF/proxy template for all third-party secret keys.
- [ ] Transport: ATS on / Android cleartext off via config plugin; enforce TLS.
- [ ] OAuth safety: system browser (`expo-web-browser`/`expo-auth-session`), **ban embedded WebView**; **verified Universal/App Link auth callback** (not custom scheme); redact tokens from logs + Sentry `beforeSend`.
- [ ] **Deep-link allowlist gate** in `+native-intent.tsx`: parse-in-try/catch, host+route allowlist, safe-error fallback, no open redirects.
- [ ] Supply chain: committed lockfile + `--frozen-lockfile` + pnpm `minimumReleaseAge`; `npx expo install` for native deps; **Socket.dev** + `pnpm audit`.
- [ ] **Local gates (Lefthook or keep Husky)**: pre-commit gitleaks + ESLint security stack (`eslint-plugin-security` + `-no-secrets` + `-react-native`) + typecheck; pre-push Semgrep + audit.
- [ ] `expo-screen-capture` on PII/payment screens.
- [ ] Security tests: `__tests__/security/` proving boundaries (deep-link rejection, secret-store usage, validation).
- [ ] **Strongly recommended (dev build):** `@expo/app-integrity` (Play Integrity + App Attest, server-verified) behind a wrapper; **freeRASP** (root/jailbreak/hook/tamper) wired to graduated responses; MobSF + `hermes-dec` secret-string check at release; biometric vault tier.
- [ ] **Nice-to-have:** SPKI cert pinning (`react-native-ssl-public-key-pinning`, ≥2 pins, OTA, toggleable); pre-Hermes obfuscation.

## Phase 2 — Supabase secure reference (Expo) → read [`03-supabase-security.md`](docs/research/03-supabase-security.md)

- [ ] ADR `0007-supabase-backend.md` (RLS-first posture, data boundary).
- [ ] `src/shared/lib/supabase.ts` — typed client, **LargeSecureStore** session, `flowType:'pkce'`, `detectSessionInUrl:false`, `autoRefreshToken`, `persistSession`, `lock:processLock`; AppState refresh.
- [ ] Auth slice `src/features/auth/` — sign up/in/out/session, Zod-validated, all states, testIDs, tests; protected-route guard in expo-router; **PKCE deep-link** callback on a verified link.
- [ ] **RLS reference migrations**: RLS-on-by-default + **auto-enable event trigger**; owner-scoped policy templates (`(select auth.uid())`, `TO authenticated`, `WITH CHECK`); `as restrictive` MFA policy; private `private` schema for security-definer helpers; revoke default grants.
- [ ] Replace painted-door tasks store with one **example feature persisted to Supabase behind RLS** (canonical secure pattern). Split sensitive columns into their own table.
- [ ] **pgTAP RLS tests** in `supabase/tests/database/` + **Security Advisor** (`supabase db lint`) as release gates (block on ERROR lints 0007/0013/0015).
- [ ] Adopt **publishable/secret keys + asymmetric JWT signing** now (legacy sunset end of 2026).
- [ ] **Payments→DB**: RevenueCat webhook → Edge Function (`verify_jwt=false`, verify Authorization header secret, idempotent) → entitlement table (client RLS SELECT-only). MFA (`aal2`), leaked-password protection, CAPTCHA on auth.
- [ ] Build-time grep guard: fail if a Supabase URL pairs with a service_role/secret key in the bundle.
- [ ] `docs/architecture/backend.md`.

## Phase 3 — Store compliance (Apple + Google) → read [`02-store-compliance.md`](docs/research/02-store-compliance.md)

- [ ] `docs/store/apple-app-review.md` + `docs/store/google-play.md` — AI-legible, rule-id → requirement → how-we-comply (exact guideline numbers).
- [ ] `references/store-checklist.md` — the machine-readable rule list (seed in the brief) for the audit skill.
- [ ] `docs/store/submission-runbook.md` — pre-submit steps (build, screenshots, privacy forms, demo account, review notes).
- [ ] **Highest-leverage defenses baked in:**
  - [ ] Mandatory **in-app account deletion** wired to Supabase auth (Apple 5.1.1(v) + Google) + web deletion URL.
  - [ ] **Privacy-manifest + Data-safety generator** that reads installed SDKs so declarations never drift (`ios.privacyManifests`, copy required reasons from node_modules).
  - [ ] **IAP-first** payments with a US external-link toggle; working **Restore Purchases**; subscription paywall with EULA+Privacy + auto-renew disclosure.
  - [ ] `expo-tracking-transparency` only if tracking (this stack is ATT-free → likely omit).
  - [ ] `expo-build-properties` target API ≥35 (≥36 ~Aug 2026); tailored `ios.infoPlist` usage strings; `android.blockedPermissions` strips extras.
- [ ] **"No soon" lint** — fail on placeholder copy ("coming soon", "TODO", lorem) in shipped screens.
- [ ] **Originality gate** — review lens that checks each app isn't a thin re-skin (4.3 / 4.2.6); per-app distinct branding/copy/feature.
- [ ] `/store-readiness` skill (Phase 6) audits the build against both rule bases, citing guideline numbers.

## Phase 4 — Claude Design prompts (professional) → read [`04-design-and-prompting.md`](docs/research/04-design-and-prompting.md)

- [ ] Integrate **`ui-ux-pro-max`** skill into `.claude/skills/`.
- [ ] Rebuild `docs/templates/claude-design-prompt.md` into the **professional brief** (template in the brief): ROLE persona, product surface with **realistic data**, named/cultural reference anchors, **design-token contract**, component constraints, **all required states** (empty/loading/error/onboarding/permission/paywall/account-deletion), motion+haptics, a11y, and an explicit **DO-NOT list** (no Inter/Roboto, no purple-on-white gradients, no Tailwind defaults, no lorem, no shadow soup).
- [ ] `design-prompt` skill: runs `ui-ux-pro-max --design-system` → persists `design-system/MASTER.md` + per-page overrides → emits the brief. Multi-pass + self-critique loop.
- [ ] `docs/design/quality-bar.md` — what "professional, not amateur" means here, with reject-worthy examples + the premium-UI checklist.

## Phase 5 — Docs for AI legibility → read [`05-agent-skill-architecture.md`](docs/research/05-agent-skill-architecture.md)

- [ ] Front-matter on every doc: `id`, `read-when`, `owns`, links (pattern already used in `docs/research/`).
- [ ] `docs/index.md` = a **small pointer table** ("read X when Y"), not a dump (just-in-time over indexes).
- [ ] Convert security + store + UX rules into **queryable rule files** (CSV/MD with rule IDs) loaded on demand.
- [ ] **Path-scoped rules/skills** (`paths:` globs) so guidance auto-loads only when Claude touches matching files.
- [ ] Keep AGENTS.md short; `@AGENTS.md` import stays. One fact = one home.

## Phase 6 — Skills → read [`05-agent-skill-architecture.md`](docs/research/05-agent-skill-architecture.md)

- [ ] **`/daily-report`** — `!`git log --since=midnight`` + `!`git diff --stat`` injection → writes `docs/reports/daily/YYYY-MM-DD.md` (what changed, decisions, open threads, next steps); returns path + summary. (For your "I forget things" need.) Optionally schedulable.
- [ ] **`/security-review`** — forks to read-only Explore; cites rule IDs from `references/security-checklist.md`; verdict + artifact.
- [ ] **`/store-readiness`** — Phase 3 audit skill.
- [ ] **`/new-component`** — generator: `arguments:[name,kind]`, reads `references/component-template.tsx`, tokenized + accessible + dark-mode + testID + test, enforces module boundaries.
- [ ] Ship the harness as a **versioned plugin** (`expo-harness`); audit/delete dead skills.
- [ ] Hooks: PreToolUse blocks writes to protected paths; PostToolUse formats; Stop runs typecheck+lint (guard `stop_hook_active`).

## Phase 7 — Shared UI lean core + generator → read [`04-design-and-prompting.md`](docs/research/04-design-and-prompting.md)

- [ ] Keep curated core (Button, AppText, Screen, TextField) + add only near-universal ones (Icon[Lucide], Card, Sheet/Modal, EmptyState, Skeleton/Loading).
- [ ] Each primitive: design-token-driven (no hardcoded hex), accessible (44pt, labels, reduced-motion), light/dark, testID, unit test.
- [ ] **Design-token pipeline**: 3-tier tokens (primitive→semantic→component) backed by CSS variables; `tailwind.config.js`/NativeWind theme is the contract `/new-component` obeys.
- [ ] `/new-component` generates the rest **on demand** — never pre-build the unused.

---

## Phase N — Next.js mirror (after Expo)

Same spine, web-adapted (read the same briefs):

- [ ] Phase 0 cleanup (shared).
- [ ] **Security**: server-only secrets, Zod at boundaries, secure cookies/session, CSP/HSTS headers, rate-limit pattern, gitleaks/Semgrep/Socket local gates, dependency policy.
- [ ] **Supabase**: SSR auth (server client + cookies), RLS-first (same migrations/policies), protected routes/middleware, the example feature persisted, asymmetric JWT.
- [ ] **Web production readiness** (web equivalent of store compliance): `robots.txt`, `sitemap.xml`, `manifest.json`, `not-found.tsx` + `error.tsx`, full metadata + OG/Twitter, JSON-LD, canonical URLs, **PostHog + Sentry** (web SDKs), Core Web Vitals budget, a11y audit in `verify`.
- [ ] **Design prompts**: same rebuild, web screen inventory (404/500/empty/loading/auth).
- [ ] **Docs + skills**: mirror Phases 5–6; `/daily-report`, `/security-review`, `/new-component` (web); `nextjs-harness` plugin.
- [ ] **Shared UI**: lean core (shadcn/ui already there) + generator; same token pipeline.

---

## Cross-cutting principles

- Every move is **calculated**: a rule, a test, or a doc backs it — never "code and done".
- **Deny by default** (RLS, validation, permissions, deep links).
- **The server is the boundary** — client controls are defense-in-depth.
- **No placeholders in shippable screens** ("no soon"); **innovation gate** — differentiate, don't thin-clone.
- **Token contract** governs all UI; forbid the AI defaults.
- Repo is the only home of truth; docs are AI-legible and path-scoped.

## Open questions / parking lot

- Push notifications — provider + when (expo-notifications; later pass).
- Cert pinning / RASP / attestation — opt-in per app or default-on for the skeleton? (lean: default-on for the secure example, documented toggle).
- Lefthook vs keep Husky — decide in Phase 1.
- Per-app differentiation: how strict should the originality gate be before it blocks a build?
