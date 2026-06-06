# Security

- **No secrets in the repo or the JS bundle.** Only `EXPO_PUBLIC_*`
  variables reach the client and they are _public by definition_. Server
  secrets live in EAS environment variables / GitHub Actions secrets.
- **Report vulnerabilities** to security@yourcompany.com (TODO: set the
  real contact). Do not open public issues for security reports.
- **Dependencies**: `npm audit` runs in CI weekly; Renovate keeps the SDK
  aligned via `npx expo install --fix` PRs.
- **AI agents** operate under least privilege: CI tokens are scoped
  per-workflow, the Claude review job has read-only repo access plus
  comment permissions, and agents never receive store credentials.
- Threat-model checklist for new features:
  [docs/personas/security-engineer.md](docs/personas/security-engineer.md).
