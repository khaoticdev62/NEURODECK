# Test Data System

## Directory Layout

```
tests/
├── fixtures/           # Production-shaped test data
│   ├── config/         # llm-term.toml variants
│   ├── memory/         # Vector DB JSON snapshots
│   ├── plugins/        # Lua plugin fixtures
│   ├── profiles/       # SSH/FTP profile JSON
│   └── themes/         # Custom theme JSON
├── seeds/              # Database seed scripts (future)
└── data/               # Generated test artifacts (gitignored)
```

## Fixture Policy

### What fixtures are allowed
- **Config files**: Valid, invalid, edge-case `llm-term.toml` variants
- **Memory records**: Chat history with synthetic embeddings (deterministic, no PII)
- **Plugin scripts**: Lua fixtures that exercise sandbox boundaries
- **Profile data**: SSH/FTP profiles with fake hostnames/credentials

### Where fixtures live
All fixtures live under `tests/fixtures/`. No fixtures in source directories.

### How fixtures are generated
- **Hand-crafted** for structural/validation tests
- **Captured** from real app runs for integration tests (sanitized)
- **Programmatically generated** for load/stress tests

### How fixtures are validated
- JSON fixtures must pass schema validation where schemas exist
- TOML fixtures must parse successfully with `toml` crate
- Lua fixtures must load without syntax errors in `mlua` sandbox

### How fixtures are refreshed
- Versioned alongside schema changes
- Updated via explicit PR with validation proof
- Never auto-generated during CI (determinism requirement)

### Schema drift detection
- Config fixtures include `[metadata.schema_version]` field
- Memory fixtures include top-level `"version"` field
- CI validates all fixtures parse before test run

## No-Mocked-Data Rule

Mocks are allowed only for tiny unit isolation.

They are **not** final proof for:
- Database behavior
- API behavior
- File processing
- External integrations
- E2E flows
- Persistence

## Seed/Reset Flow

```bash
# Reset test environment (placeholder — implement per test framework)
# cargo test --test integration_test -- --test-threads=1
```

## Test Environments

| Environment | Use | Data |
|-------------|-----|------|
| Unit tests | Rust inline `#[cfg(test)]` | In-memory fixtures |
| Integration tests | `src-tauri/tests/` | File-based fixtures |
| E2E tests | `e2e/tests/` | Live app instance |
| Load tests | Future | Generated synthetic data |

## Adding New Fixtures

1. Create file under `tests/fixtures/{domain}/`
2. Name descriptively: `{purpose}.{variant}.{ext}`
3. Include edge cases (empty, oversized, malformed)
4. Document in this README if non-obvious
