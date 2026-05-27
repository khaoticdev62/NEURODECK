# Testing Guide

## Test Structure

```
src-tauri/src/       — Inline Rust unit tests (#[cfg(test)])
e2e/                 — Playwright end-to-end tests
frontend/src/        — Frontend unit tests (Vitest)
```

## Running Tests

### Rust Unit Tests

```bash
cd src-tauri && cargo test
```

Currently **34 tests** cover:
- Security policy (token generation, script blocklist, path redaction)
- Memory DB operations
- Storage save/load/export
- Sync encryption/decryption
- Transfer path sanitization
- Plugin filename validation
- Self-healing config repair

### Frontend Unit Tests

```bash
cd frontend && npm run test
```

Frontend tests use **Vitest**. Tests live alongside source files or in `__tests__/` subdirectories.

### E2E Tests

```bash
cd e2e && npm run test
```

Playwright E2E tests cover critical user journeys across the 12-tab interface.

## Adding Tests

### Rust

Add `#[cfg(test)]` modules at the bottom of any `.rs` file:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn my_feature_works() {
        assert_eq!(my_function(), expected);
    }
}
```

### Frontend

Create a `.test.js` file alongside the module under test:

```javascript
// icons.test.js
import { describe, it, expect } from "vitest";
import { createIcon } from "./icons.js";

describe("createIcon", () => {
  it("returns empty string for unknown icon", () => {
    expect(createIcon("nonexistent")).toBe("");
  });
});
```

## Coverage Gaps

| Area                | Coverage | Notes                                      |
|---------------------|----------|--------------------------------------------|
| Security policy     | Good     | Blocklist, token gen, path redaction       |
| Memory / Storage    | Good     | Save, load, search, export                 |
| LLM providers       | Minimal  | No network mocks; mostly smoke tests       |
| PTY / Terminal      | None     | Requires OS-level PTY integration          |
| Network (FTP, SFTP) | None     | Requires live server or complex mocking    |
| Frontend modules    | Minimal  | Vitest scaffold added; expand incrementally|

## CI Test Gate

The KFMS CI gate runs:
1. `cargo test --workspace`
2. `npm run --prefix e2e test` (Playwright)

Both must pass for a release to be eligible.
