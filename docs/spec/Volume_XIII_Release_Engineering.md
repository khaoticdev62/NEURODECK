# Volume XIII — Release Engineering & CI/CD Architecture

## Philosophy
Build once, test everywhere, release predictably, rollback safely.

## Repository
Monorepo: apps, packages, prompt-packs, plugins, docs, scripts, .github.

## Branch Strategy
main, develop, release/*. Working branches: feature/*, bugfix/*, hotfix/*, experiment/*. No direct commits to main.

## Commit Standards
Conventional commits: feat, fix, refactor, docs, test, perf, build, ci, chore.

## Versioning
Semantic Versioning MAJOR.MINOR.PATCH.

## Pipeline
Checkout → install → lint → typecheck → unit tests → integration tests → E2E tests → build → package → release.

## GitHub Actions
ci.yml, release.yml, nightly.yml, security.yml, plugin-certification.yml.

## Packaging Targets
Windows installer, Windows portable, Steam Deck AppImage, Linux package. Future: Flatpak, Steam release, Microsoft Store.

## Release Artifacts
Installer, portable build, checksums, release notes, diagnostics bundle. Binaries should be signed.

## Rollback
Previous stable, previous beta, known good build. Triggered by critical bug, security issue, data corruption.

## Certification
Cannot ship unless build/tests/accessibility/Steam Deck/security pass and artifacts, signing, rollback, release notes are complete.
