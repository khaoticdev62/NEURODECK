# NEURODECK Agent GitOps Guide

This guide governs how AI agents contribute to NEURODECK safely and traceably.

---

## Branch policy

Agents may only push to branches with these prefixes:

- `agent/`
- `feature/`
- `ui/`
- `bugfix/`
- `hotfix/`
- `docs/`
- `kfms/`
- `release/`

Direct pushes to `master`, `main`, and `release/*` are prohibited for both humans and agents.

---

## Commit conventions

All commit messages must start with a type prefix:

```
feat: add new chat sidebar
fix: correct PTY session routing
docs: update CI/CD pipeline
style: format CSS variables
refactor: extract bridge dispatch helper
test: add visual regression coverage
chore: bump KFMS metadata
ci: add branch-policy workflow
kfms: update codename registry
agent: apply requested UI changes
```

Large commits (>35 files) require a `MASS-REFACTOR:` or `BREAKING:` token with a justification paragraph.

---

## Pull request requirements

PR titles must begin with one of:

- `[UI]`
- `[AGENT]`
- `[CI]`
- `[HOTFIX]`
- `[BUGFIX]`
- `[FEATURE]`
- `[DOCS]`
- `[KFMS]`
- `[RELEASE]`

PR bodies must include:

- `## What does this PR do?`
- `## Type of change`
- `## Checklist`
- `## Testing`
- `## Agent report` (required for agent-driven PRs)

---

## Agent report format

Every agent PR must include an `## Agent report` section:

```markdown
| Field | Value |
|-------|-------|
| Agent | silk |
| Commit range | a65e6a81..08cff16c |
| Local verification | npm run preflight, npm run ci |
| Tests | cargo test, npm run frontend:test |
| Rollback plan | Yes — checkpoint tag ui-checkpoint-phase-1-aaaa |
```

If no rollback plan exists, explain why and provide manual recovery steps.

---

## Protected paths

Agents may not modify these paths without explicit human approval:

- `.github/workflows/*`
- `infra/meta/meta.json`
- `infra/telemetry/health.json`
- `electron-builder.yml`
- `flatpak/*`
- `aur/*`
- `Cargo.lock` / `package-lock.json` (unless the PR is explicitly a dependency bump)

The `scripts/git/agent-commit-guard.sh` hook enforces these rules on push.

---

## Local preflight

Before committing, agents should run:

```bash
npm run preflight
```

This checks:
- Branch name is allowed
- No forbidden paths are staged
- No obvious secrets in staged changes
- KFMS metadata validates
- Required manifests are present

To install Git hooks that run preflight automatically:

```bash
npm run git:install-hooks
```

---

## Rollback policy

If a CI failure occurs on a `ui/*` branch, the agent should:

1. Run `npm run rollback:ui:list`.
2. Run `npm run rollback:ui:preview <tag>`.
3. Either apply the rollback or create a new clean branch from the checkpoint tag.

For release-level rollbacks, use the **Emergency Rollback** GitHub Actions workflow.

---

## Environment variables

- `AGENT_NAME` — added as `Co-authored-by:` trailer by `agent-commit-guard.sh`.
- `AGENT_MAX_FILES` — override the default 35-file limit (human approval required).
