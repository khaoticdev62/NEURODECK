# Safety

## Secret redaction

Before any data is sent to a provider or saved to disk, PromptFlow redacts likely secrets:

- API keys and tokens
- Passwords and connection strings
- JWTs and authorization headers
- Private keys and SSH keys
- `.env` values

Redacted values are replaced with `[REDACTED_*]` placeholders. The original is never logged.

## Patch modes

### `report-only` (default)

Only saves AI recommendations. No files are modified.

### `patch-review`

Extracts patches into review files but does not apply them.

### `apply-patch`

Applies patches only after:

- Git dirty-tree warning
- Optional checkpoint branch creation
- Explicit user confirmation

```bash
promptflow run --mode apply-patch
```

## Command safety

Verification commands run through an allowlist:

- Commands not in the allowlist are rejected
- Risky commands (e.g., `rm -rf`, `git reset --hard`) are blocked
- Confirmation is required by default
- `shell=True` is forbidden for arbitrary input

## Git safety

When applying patches, PromptFlow:

- Warns if the working tree is dirty
- Can create a `promptflow/<run-id>` checkpoint branch
- Never runs `git reset --hard` or `git clean -fdx` automatically

## Blocker handling

If an AI response contains blocker keywords (e.g., "CRITICAL", "tests fail", "security risk"), the workflow stops by default.

Override with:

```bash
promptflow run --continue-on-blocker
```
