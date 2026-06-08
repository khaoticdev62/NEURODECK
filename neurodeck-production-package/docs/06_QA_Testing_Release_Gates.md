# QA, Testing & Release Gates

## Test Layers

- Rust unit tests
- Rust integration tests
- Electron IPC tests
- Renderer component tests
- Playwright E2E tests
- Steam Deck viewport tests
- Security scans
- Secret scans
- Export leakage tests
- Support bundle redaction tests
- Plugin QA scans

## Hard Blockers

- Sealed memory leaks.
- Credentials export.
- Context sent differs from preview.
- Steam Deck horizontal overflow.
- Workflow runs without permission.
- Plugin bypasses sandbox.
- Support bundle includes DB or private content.
